// HTTP-/Webhook-Adapter — bindet einen extern laufenden Agenten ein.
// Kompatibel zum Contract der Aigency-Engine (`status_app.py::/wake`):
//   Request  : POST { runId, <taskField>, context } (+ optionale payloadTemplate-Felder)
//   Response : 200 { status:"completed", result, final_path?, run_id? }
//              422 { status:"failed", received_keys, hint }  (keine Aufgabe erkannt)
//              5xx { status:"failed", error/details }
import type {
  AgentAdapter,
  ExecutionContext,
  ExecutionResult,
  HealthResult,
} from "./index.js";

export interface HttpAdapterConfig {
  /** Webhook-URL des Agenten, z. B. http://localhost:8900/wake */
  url: string;
  /** Feldname, in dem die Aufgabe gesendet wird (Engine akzeptiert task|instruction|prompt|goal). */
  taskField?: string;
  /** Zusätzliche Header (z. B. Authorization). */
  headers?: Record<string, string>;
  /** Timeout in ms (deliver()-Läufe dauern Minuten → großzügig). */
  timeoutMs?: number;
  /** Optionale Health-URL; default = url mit /wake→/health. */
  healthUrl?: string;
  /** Statische Zusatzfelder fürs Payload (payloadTemplate-Äquivalent). */
  extraPayload?: Record<string, unknown>;
}

const DEFAULT_TIMEOUT = 300_000;

function deriveHealthUrl(cfg: HttpAdapterConfig): string {
  if (cfg.healthUrl) return cfg.healthUrl;
  return cfg.url.replace(/\/wake$/, "/health");
}

/** Verknüpft optionales Abbruch-Signal mit einem Timeout. */
function withTimeout(timeoutMs: number, external?: AbortSignal): {
  signal: AbortSignal;
  cancel: () => void;
} {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error("timeout")), timeoutMs);
  external?.addEventListener("abort", () => ctrl.abort(external.reason), { once: true });
  return { signal: ctrl.signal, cancel: () => clearTimeout(timer) };
}

export const httpAdapter: AgentAdapter<HttpAdapterConfig> = {
  type: "http",

  async testEnvironment(config: HttpAdapterConfig): Promise<HealthResult> {
    // 1) Health-Endpoint versuchen.
    try {
      const res = await fetch(deriveHealthUrl(config), {
        method: "GET",
        headers: config.headers,
      });
      if (res.ok) {
        const body = (await res.json().catch(() => ({}))) as { status?: string };
        return { ok: body.status === "ok" || true, detail: `health ${res.status}` };
      }
    } catch {
      // Health optional — fällt auf den Contract-Probe-Pfad zurück.
    }
    // 2) Contract-Probe: leeres POST sollte 422 mit Diagnose liefern (= erreichbar + /wake aktiv).
    try {
      const res = await fetch(config.url, {
        method: "POST",
        headers: { "content-type": "application/json", ...config.headers },
        body: JSON.stringify({}),
      });
      if (res.status === 422) {
        return { ok: true, detail: "wake erreichbar (422-Diagnose, keine Aufgabe)" };
      }
      return { ok: res.ok, detail: `wake antwortete ${res.status}` };
    } catch (err) {
      return { ok: false, detail: `nicht erreichbar: ${(err as Error).message}` };
    }
  },

  async execute(
    ctx: ExecutionContext,
    config: HttpAdapterConfig,
  ): Promise<ExecutionResult> {
    const taskField = config.taskField ?? "task";
    const body = {
      runId: ctx.runId,
      [taskField]: ctx.task,
      context: { task: ctx.task, allowedTools: ctx.allowedTools },
      ...config.extraPayload,
    };
    const { signal, cancel } = withTimeout(config.timeoutMs ?? DEFAULT_TIMEOUT, ctx.signal);
    await ctx.audit.write({ kind: "init", data: { adapter: "http", url: config.url } });

    try {
      const res = await fetch(config.url, {
        method: "POST",
        headers: { "content-type": "application/json", ...config.headers },
        body: JSON.stringify(body),
        signal,
      });
      const json = (await res.json().catch(() => ({}))) as {
        status?: string;
        result?: string;
        final_path?: string;
        error?: string;
        details?: string;
        received_keys?: string[];
      };

      if (res.ok && json.status === "completed") {
        await ctx.audit.write({ kind: "result", text: json.result });
        return {
          status: "completed",
          result: json.result,
          artifactRef: json.final_path,
        };
      }

      // 422 = Aufgabe nicht erkannt → klare Diagnose ins Audit (Config-Tweak nötig).
      const error =
        res.status === 422
          ? `Aufgabe nicht erkannt; angekommene Keys: ${(json.received_keys ?? []).join(", ")}`
          : (json.error ?? json.details ?? `HTTP ${res.status}`);
      await ctx.audit.write({ kind: "tool_result", tool: "http_wake", ok: false, output: error });
      return { status: "failed", error };
    } catch (err) {
      const error = (err as Error).message;
      await ctx.audit.write({ kind: "tool_result", tool: "http_wake", ok: false, output: error });
      return { status: "failed", error };
    } finally {
      cancel();
    }
  },
};
