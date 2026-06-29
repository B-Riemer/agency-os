// MCP-Adapter — bindet einen Model-Context-Protocol-Server als Mitarbeiter ein.
// Ein MCP-Server liefert WERKZEUGE (tools); ein LLM ("brain", OpenAI-kompatibel) STEUERT
// sie in einer Tool-Use-Schleife. So wird ein MCP-Server zum vollwertigen Agenten.
//
// Akte-Enforcement: Tools werden gegen ctx.allowedTools gefiltert (Toggles∩Skills), Secrets
// nur als ENV in den stdio-Server injiziert (nie im Prompt), jeder Tool-Call landet im Audit.
//
// Transporte: "stdio" (lokaler Server via command/args, JSON-RPC newline-delimited) und
// "http" (Streamable-HTTP/JSON-RPC). Der Verbindungstest listet Tools OHNE LLM.
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type {
  AgentAdapter,
  ExecutionContext,
  ExecutionResult,
  HealthResult,
} from "./index.js";

export interface McpBrainConfig {
  /** OpenAI-kompatible Basis-URL, z. B. https://api.openai.com/v1 oder http://localhost:11434/v1. */
  baseUrl: string;
  model: string;
  /** ENV-Name des API-Keys (aus gebundenen Secrets). Lokale Server brauchen keinen. */
  apiKeyEnv?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface McpAdapterConfig {
  /** "stdio" (default, wenn command gesetzt) oder "http" (wenn url gesetzt). */
  transport?: "stdio" | "http";
  // stdio
  command?: string;
  args?: string[];
  cwd?: string;
  // http
  url?: string;
  headers?: Record<string, string>;
  /** LLM, das die MCP-Tools steuert. Ohne brain liefert nur der Verbindungstest Tools. */
  brain?: McpBrainConfig;
  /** Max. Tool-Use-Runden. */
  maxSteps?: number;
  timeoutMs?: number;
  pricePer1kInputCents?: number;
  pricePer1kOutputCents?: number;
}

type Json = any;
const DEFAULT_TIMEOUT = 60_000;
const PROTOCOL_VERSION = "2024-11-05";

/** Minimaler JSON-RPC-Client für MCP über stdio ODER http. */
class McpClient {
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: Json) => void; reject: (e: Error) => void }>();
  private child?: ChildProcessWithoutNullStreams;
  private buf = "";
  private sessionId?: string;
  private closed = false;

  constructor(
    private readonly config: McpAdapterConfig,
    private readonly childEnv?: Record<string, string>,
    private readonly timeoutMs = DEFAULT_TIMEOUT,
  ) {}

  get transport(): "stdio" | "http" {
    return this.config.transport ?? (this.config.url ? "http" : "stdio");
  }

  async start(): Promise<void> {
    if (this.transport !== "stdio") return; // http ist verbindungslos (POST je Request)
    if (!this.config.command) throw new Error("stdio: kein command konfiguriert");
    const child = spawn(this.config.command, this.config.args ?? [], {
      cwd: this.config.cwd,
      env: this.childEnv,
      stdio: ["pipe", "pipe", "pipe"],
    }) as ChildProcessWithoutNullStreams;
    this.child = child;
    child.stdout.on("data", (d: Buffer) => this.onData(d.toString()));
    child.on("error", (e) => this.failAll(e instanceof Error ? e : new Error(String(e))));
    child.on("close", () => {
      if (!this.closed) this.failAll(new Error("MCP-Server-Prozess beendet"));
    });
  }

  private onData(chunk: string): void {
    this.buf += chunk;
    let idx: number;
    while ((idx = this.buf.indexOf("\n")) >= 0) {
      const line = this.buf.slice(0, idx).trim();
      this.buf = this.buf.slice(idx + 1);
      if (line) this.handleMessage(line);
    }
  }

  private handleMessage(line: string): void {
    let msg: Json;
    try {
      msg = JSON.parse(line);
    } catch {
      return; // Nicht-JSON (Server-Logging) ignorieren
    }
    if (msg && typeof msg.id === "number" && this.pending.has(msg.id)) {
      const p = this.pending.get(msg.id)!;
      this.pending.delete(msg.id);
      if (msg.error) p.reject(new Error(msg.error.message ?? JSON.stringify(msg.error)));
      else p.resolve(msg.result);
    }
    // Server-initiierte Requests/Notifications (z. B. sampling) werden bewusst ignoriert.
  }

  private failAll(err: Error): void {
    for (const p of this.pending.values()) p.reject(err);
    this.pending.clear();
  }

  private async request(method: string, params: Json): Promise<Json> {
    const id = this.nextId++;
    const payload = { jsonrpc: "2.0", id, method, params };
    if (this.transport === "stdio") {
      if (!this.child) throw new Error("MCP-Client nicht gestartet");
      const promise = new Promise<Json>((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        setTimeout(() => {
          if (this.pending.delete(id)) reject(new Error(`MCP-Timeout bei ${method}`));
        }, this.timeoutMs);
      });
      this.child.stdin.write(JSON.stringify(payload) + "\n");
      return promise;
    }
    // HTTP: POST je Request (Streamable HTTP / JSON-RPC)
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error("timeout")), this.timeoutMs);
    try {
      const res = await fetch(this.config.url!, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          ...(this.sessionId ? { "mcp-session-id": this.sessionId } : {}),
          ...this.config.headers,
        },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      const sid = res.headers.get("mcp-session-id");
      if (sid) this.sessionId = sid;
      const ct = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      const json = ct.includes("text/event-stream") ? parseSse(raw) : safeParse(raw);
      if (!res.ok) throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
      if (json?.error) throw new Error(json.error.message ?? JSON.stringify(json.error));
      return json?.result;
    } finally {
      clearTimeout(timer);
    }
  }

  private notify(method: string, params: Json): void {
    const payload = { jsonrpc: "2.0", method, params };
    if (this.transport === "stdio" && this.child) {
      this.child.stdin.write(JSON.stringify(payload) + "\n");
    } else if (this.transport === "http") {
      void fetch(this.config.url!, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(this.sessionId ? { "mcp-session-id": this.sessionId } : {}),
          ...this.config.headers,
        },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  }

  async initialize(): Promise<Json> {
    const result = await this.request("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: "agency-os", version: "0.1" },
    });
    this.notify("notifications/initialized", {});
    return result;
  }

  async listTools(): Promise<Array<{ name: string; description?: string; inputSchema?: Json }>> {
    const result = await this.request("tools/list", {});
    return (result?.tools ?? []) as Array<{ name: string; description?: string; inputSchema?: Json }>;
  }

  async callTool(name: string, args: Json): Promise<{ content?: Json[]; isError?: boolean }> {
    return (await this.request("tools/call", { name, arguments: args })) ?? {};
  }

  async close(): Promise<void> {
    this.closed = true;
    this.failAll(new Error("geschlossen"));
    if (this.child) {
      try {
        this.child.stdin.end();
      } catch {
        /* noop */
      }
      this.child.kill("SIGTERM");
    }
  }
}

function safeParse(s: string): Json {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/** Extrahiert das letzte JSON aus einem SSE-Body (Zeilen mit "data:"). */
function parseSse(raw: string): Json {
  const datas = raw
    .split(/\r?\n/)
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5).trim());
  for (let i = datas.length - 1; i >= 0; i--) {
    const j = safeParse(datas[i]);
    if (j) return j;
  }
  return undefined;
}

/** MCP-Tool-Result → Text. */
function contentToText(result: { content?: Json[] }): string {
  if (!result?.content) return "";
  return result.content
    .map((c) => (c?.type === "text" ? c.text : typeof c === "string" ? c : JSON.stringify(c)))
    .join("\n");
}

function minimalEnv(): Record<string, string> {
  return {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    LANG: process.env.LANG ?? "C.UTF-8",
  };
}

async function brainChat(
  brain: McpBrainConfig,
  apiKey: string | undefined,
  messages: Json[],
  tools: Json[],
  timeoutMs: number,
): Promise<Json> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (apiKey) headers["authorization"] = `Bearer ${apiKey}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), timeoutMs);
  try {
    const res = await fetch(brain.baseUrl.replace(/\/+$/, "") + "/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: brain.model,
        messages,
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? "auto" : undefined,
        temperature: brain.temperature,
        max_tokens: brain.maxTokens,
      }),
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.error?.message ?? `Brain HTTP ${res.status}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

export const mcpAdapter: AgentAdapter<McpAdapterConfig> = {
  type: "mcp",

  async testEnvironment(config: McpAdapterConfig): Promise<HealthResult> {
    const transport = config.transport ?? (config.url ? "http" : "stdio");
    if (transport === "stdio" && !config.command) return { ok: false, detail: "Kein Kommando angegeben" };
    if (transport === "http" && !config.url) return { ok: false, detail: "Keine URL angegeben" };
    const client = new McpClient(config, minimalEnv(), 10_000);
    try {
      await client.start();
      await client.initialize();
      const tools = await client.listTools();
      return {
        ok: true,
        detail: `verbunden (${transport}) · ${tools.length} Tools${config.brain ? "" : " · brain fehlt für Läufe"}`,
        discovered: tools.map((t) => t.name).slice(0, 30),
      };
    } catch (err) {
      return { ok: false, detail: `nicht verbunden: ${(err as Error).message}` };
    } finally {
      await client.close();
    }
  },

  async execute(ctx: ExecutionContext, config: McpAdapterConfig): Promise<ExecutionResult> {
    const childEnv: Record<string, string> = { ...minimalEnv(), ...ctx.injectedEnv };
    const client = new McpClient(config, childEnv, config.timeoutMs ?? DEFAULT_TIMEOUT);
    await ctx.audit.write({ kind: "init", data: { adapter: "mcp", transport: client.transport } });
    try {
      await client.start();
      await client.initialize();
      const allTools = await client.listTools();
      // Akte-Enforcement: nur freigeschaltete Tools (falls Toggles gesetzt).
      const usable = ctx.allowedTools.length
        ? allTools.filter((t) => ctx.allowedTools.includes(t.name))
        : allTools;
      await ctx.audit.write({
        kind: "init",
        data: { discovered: allTools.map((t) => t.name), usable: usable.map((t) => t.name) },
      });

      if (!config.brain) {
        return {
          status: "failed",
          error:
            "Kein 'brain' (LLM) konfiguriert. Der MCP-Server liefert Tools, aber es fehlt das Modell, das sie steuert. (Verbindungstest listet Tools auch ohne brain.)",
        };
      }

      const apiKey = ctx.injectedEnv[config.brain.apiKeyEnv ?? "OPENAI_API_KEY"];
      const oaTools = usable.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description ?? "", parameters: t.inputSchema ?? { type: "object" } },
      }));
      const messages: Json[] = [];
      if (ctx.systemPrompt) messages.push({ role: "system", content: ctx.systemPrompt });
      messages.push({ role: "user", content: ctx.task });

      let costCents = 0;
      const maxSteps = config.maxSteps ?? 6;
      for (let step = 0; step < maxSteps; step++) {
        if (ctx.signal?.aborted) return { status: "failed", error: "abgebrochen" };
        const resp = await brainChat(config.brain, apiKey, messages, oaTools, config.timeoutMs ?? DEFAULT_TIMEOUT);
        const usage = resp?.usage;
        if (usage && (config.pricePer1kInputCents || config.pricePer1kOutputCents)) {
          costCents += Math.round(
            ((usage.prompt_tokens ?? 0) / 1000) * (config.pricePer1kInputCents ?? 0) +
              ((usage.completion_tokens ?? 0) / 1000) * (config.pricePer1kOutputCents ?? 0),
          );
        }
        const msg = resp?.choices?.[0]?.message;
        if (!msg) return { status: "failed", error: "Leere Antwort vom Modell" };
        messages.push(msg);
        const calls = msg.tool_calls as Array<{ id: string; function: { name: string; arguments: string } }> | undefined;
        if (!calls || calls.length === 0) {
          await ctx.audit.write({ kind: "result", text: msg.content ?? "" });
          return { status: "completed", result: msg.content ?? "", costCents: costCents || undefined };
        }
        for (const call of calls) {
          const name = call.function.name;
          let args: Json = {};
          try {
            args = JSON.parse(call.function.arguments || "{}");
          } catch {
            /* leere Args */
          }
          // Doppelte Absicherung: nicht erlaubte Tools hart blocken.
          if (ctx.allowedTools.length && !ctx.allowedTools.includes(name)) {
            await ctx.audit.write({ kind: "tool_result", tool: name, ok: false, output: "durch Akte gesperrt" });
            messages.push({ role: "tool", tool_call_id: call.id, content: `Tool '${name}' ist für diesen Agenten gesperrt.` });
            continue;
          }
          await ctx.audit.write({ kind: "tool_call", tool: name, args });
          let text = "";
          let ok = true;
          try {
            const r = await client.callTool(name, args);
            text = contentToText(r);
            ok = !r.isError;
          } catch (e) {
            ok = false;
            text = (e as Error).message;
          }
          await ctx.audit.write({ kind: "tool_result", tool: name, ok, output: text.slice(0, 2000) });
          messages.push({ role: "tool", tool_call_id: call.id, content: text || (ok ? "(leer)" : "Fehler") });
        }
      }
      return { status: "completed", result: "(max. Schritte erreicht)", costCents: costCents || undefined };
    } catch (err) {
      const error = (err as Error).message;
      await ctx.audit.write({ kind: "tool_result", tool: "mcp", ok: false, output: error });
      return { status: "failed", error };
    } finally {
      await client.close();
    }
  },
};
