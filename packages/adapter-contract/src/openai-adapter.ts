// OpenAI-kompatibler Adapter — bindet jeden Dienst ein, der /v1/chat/completions spricht:
// OpenAI, Azure-OpenAI, Ollama, LM Studio, vLLM, OpenRouter, Groq, lokale Gateways ...
// Model-agnostisch und self-host-freundlich.
//
// SICHERHEIT: Der API-Key steht NIE in der Config oder im Prompt. Er kommt zur Laufzeit
// aus den gebundenen Secrets (Sidecar) — per ENV-Name (apiKeyEnv) referenziert.
import type {
  AgentAdapter,
  ExecutionContext,
  ExecutionResult,
  HealthResult,
} from "./index.js";

export interface OpenAiAdapterConfig {
  /** Basis-URL einer OpenAI-kompatiblen API, z. B. https://api.openai.com/v1 oder http://localhost:11434/v1. */
  baseUrl: string;
  /** Modell-ID, z. B. "gpt-4o-mini", "llama3.1", "mistral". */
  model: string;
  /** Name der ENV-Variable (aus gebundenen Secrets), die den API-Key hält. Lokale Server brauchen keinen. */
  apiKeyEnv?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  /** Optionale Preise zur Kostenbuchung (Cent pro 1.000 Tokens). */
  pricePer1kInputCents?: number;
  pricePer1kOutputCents?: number;
}

const DEFAULT_TIMEOUT = 120_000;

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, "") + path;
}

export const openAiAdapter: AgentAdapter<OpenAiAdapterConfig> = {
  type: "openai",

  async testEnvironment(config: OpenAiAdapterConfig): Promise<HealthResult> {
    if (!config.baseUrl) return { ok: false, detail: "Keine baseUrl angegeben" };
    try {
      const res = await fetch(joinUrl(config.baseUrl, "/models"), { method: "GET" });
      if (res.status === 200) {
        const body = (await res.json().catch(() => ({}))) as { data?: Array<{ id: string }> };
        const ids = (body.data ?? []).map((m) => m.id);
        const found = config.model ? ids.includes(config.model) : true;
        return {
          ok: true,
          detail: found
            ? `erreichbar · Modell '${config.model}' verfügbar`
            : `erreichbar · ${ids.length} Modelle (‘${config.model}’ nicht gelistet)`,
          discovered: ids.slice(0, 20),
        };
      }
      if (res.status === 401 || res.status === 403) {
        return { ok: true, detail: "erreichbar · API-Key nötig (zur Laufzeit via Secret)" };
      }
      return { ok: false, detail: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, detail: `nicht erreichbar: ${(err as Error).message}` };
    }
  },

  async execute(
    ctx: ExecutionContext,
    config: OpenAiAdapterConfig,
  ): Promise<ExecutionResult> {
    if (!config.baseUrl || !config.model) {
      return { status: "failed", error: "baseUrl/model fehlen" };
    }
    const keyEnv = config.apiKeyEnv ?? "OPENAI_API_KEY";
    const apiKey = ctx.injectedEnv[keyEnv];
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (apiKey) headers["authorization"] = `Bearer ${apiKey}`;

    const messages: Array<{ role: string; content: string }> = [];
    if (ctx.systemPrompt) messages.push({ role: "system", content: ctx.systemPrompt });
    messages.push({ role: "user", content: ctx.task });

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(new Error("timeout")), config.timeoutMs ?? DEFAULT_TIMEOUT);
    ctx.signal?.addEventListener("abort", () => ctrl.abort(ctx.signal?.reason), { once: true });

    await ctx.audit.write({
      kind: "init",
      data: { adapter: "openai", baseUrl: config.baseUrl, model: config.model },
    });

    try {
      const res = await fetch(joinUrl(config.baseUrl, "/chat/completions"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        }),
        signal: ctrl.signal,
      });
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) {
        const error = json?.error?.message ?? `HTTP ${res.status}`;
        await ctx.audit.write({ kind: "tool_result", tool: "openai", ok: false, output: error });
        return { status: "failed", error };
      }
      const text: string = json?.choices?.[0]?.message?.content ?? "";
      const usage = json?.usage;
      let costCents: number | undefined;
      if (usage && (config.pricePer1kInputCents || config.pricePer1kOutputCents)) {
        costCents = Math.round(
          ((usage.prompt_tokens ?? 0) / 1000) * (config.pricePer1kInputCents ?? 0) +
            ((usage.completion_tokens ?? 0) / 1000) * (config.pricePer1kOutputCents ?? 0),
        );
      }
      await ctx.audit.write({ kind: "result", text, usage });
      return { status: "completed", result: text, costCents };
    } catch (err) {
      const error = (err as Error).message;
      await ctx.audit.write({ kind: "tool_result", tool: "openai", ok: false, output: error });
      return { status: "failed", error };
    } finally {
      clearTimeout(timer);
    }
  },
};
