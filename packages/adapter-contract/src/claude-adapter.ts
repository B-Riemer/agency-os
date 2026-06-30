// Claude-Adapter (claude_local) — bindet ein Anthropic-Claude-Modell als Mitarbeiter ein.
// Nutzt die Messages-API (POST /v1/messages). System-Prompt = Persona der Akte.
//
// SICHERHEIT: Der API-Key steht NIE in der Config oder im Prompt — er kommt zur Laufzeit
// aus den gebundenen Secrets (Sidecar) per ENV-Name (apiKeyEnv).
import type {
  AgentAdapter,
  ExecutionContext,
  ExecutionResult,
  HealthResult,
} from "./index.js";

export interface ClaudeAdapterConfig {
  /** Basis-URL (default https://api.anthropic.com). */
  baseUrl?: string;
  /** Modell-ID, z. B. "claude-sonnet-4-6", "claude-opus-4-8", "claude-haiku-4-5". */
  model: string;
  /** ENV-Name des API-Keys (aus gebundenen Secrets). */
  apiKeyEnv?: string;
  /** Pflicht bei Anthropic — Obergrenze der Antwort-Tokens. */
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  /** anthropic-version Header (default 2023-06-01). */
  anthropicVersion?: string;
  /** Optionale Preise zur Kostenbuchung (Cent pro 1.000 Tokens). */
  pricePer1kInputCents?: number;
  pricePer1kOutputCents?: number;
}

const DEFAULT_BASE = "https://api.anthropic.com";
const DEFAULT_TIMEOUT = 120_000;
const DEFAULT_VERSION = "2023-06-01";

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + path;
}

export const claudeAdapter: AgentAdapter<ClaudeAdapterConfig> = {
  type: "claude_local",

  async testEnvironment(config: ClaudeAdapterConfig): Promise<HealthResult> {
    const base = config.baseUrl || DEFAULT_BASE;
    try {
      // GET /v1/models verlangt einen Key → 401 bedeutet "erreichbar, Auth nötig".
      const res = await fetch(joinUrl(base, "/v1/models"), {
        method: "GET",
        headers: { "anthropic-version": config.anthropicVersion ?? DEFAULT_VERSION },
      });
      if (res.status === 200) {
        const body = (await res.json().catch(() => ({}))) as { data?: Array<{ id: string }> };
        const ids = (body.data ?? []).map((m) => m.id);
        return { ok: true, detail: `erreichbar · ${ids.length} Modelle`, discovered: ids.slice(0, 20) };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: true, detail: "erreichbar · API-Key nötig (zur Laufzeit via Secret)" };
      }
      return { ok: false, detail: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, detail: `nicht erreichbar: ${(err as Error).message}` };
    }
  },

  async execute(ctx: ExecutionContext, config: ClaudeAdapterConfig): Promise<ExecutionResult> {
    if (!config.model) return { status: "failed", error: "Kein Modell konfiguriert" };
    const base = config.baseUrl || DEFAULT_BASE;
    const keyEnv = config.apiKeyEnv ?? "ANTHROPIC_API_KEY";
    const apiKey = ctx.injectedEnv[keyEnv];
    if (!apiKey) {
      return { status: "failed", error: `Kein API-Key — binde ein Secret als ENV '${keyEnv}' an diesen Agenten.` };
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error("timeout")), config.timeoutMs ?? DEFAULT_TIMEOUT);
    await ctx.audit.write({ kind: "init", data: { adapter: "claude_local", model: config.model } });

    try {
      const res = await fetch(joinUrl(base, "/v1/messages"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": config.anthropicVersion ?? DEFAULT_VERSION,
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens ?? 1024,
          temperature: config.temperature,
          system: ctx.systemPrompt || undefined, // Persona top-level, nicht als Message
          messages: [{ role: "user", content: ctx.task }],
        }),
        signal: ctrl.signal,
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        const error = json?.error?.message ?? `HTTP ${res.status}`;
        await ctx.audit.write({ kind: "tool_result", tool: "claude", ok: false, output: error });
        return { status: "failed", error };
      }
      const text: string = Array.isArray(json?.content)
        ? json.content.filter((c: any) => c?.type === "text").map((c: any) => c.text).join("\n")
        : "";
      const usage = json?.usage;
      let costCents: number | undefined;
      if (usage && (config.pricePer1kInputCents || config.pricePer1kOutputCents)) {
        costCents = Math.round(
          ((usage.input_tokens ?? 0) / 1000) * (config.pricePer1kInputCents ?? 0) +
            ((usage.output_tokens ?? 0) / 1000) * (config.pricePer1kOutputCents ?? 0),
        );
      }
      await ctx.audit.write({ kind: "result", text, usage });
      return { status: "completed", result: text, costCents };
    } catch (err) {
      const error = (err as Error).message;
      await ctx.audit.write({ kind: "tool_result", tool: "claude", ok: false, output: error });
      return { status: "failed", error };
    } finally {
      clearTimeout(timer);
    }
  },
};
