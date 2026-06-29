// Process-/CLI-Adapter — bindet ein lokales Skript/Kommando als Mitarbeiter ein.
// Beispiel: ein Python-Agent, ein Shell-Skript, eine selbstgebaute CLI.
// Die Aufgabe wird per stdin (default), als letztes Argument oder als ENV AGENCY_TASK
// übergeben; das Ergebnis kommt aus stdout (roh, letzte Zeile oder JSON {status,result}).
//
// SICHERHEIT: Das Kind erbt NICHT die volle Server-Umgebung (kein DATABASE_URL /
// SECRETS_MASTER_KEY). Es bekommt nur PATH/HOME + die explizit gebundenen Secrets
// (Sidecar-Injection) + AGENCY_*-Kontext.
import { spawn } from "node:child_process";
import type {
  AgentAdapter,
  ExecutionContext,
  ExecutionResult,
  HealthResult,
} from "./index.js";

export interface ProcessAdapterConfig {
  /** Auszuführendes Kommando, z. B. "python3" oder "/usr/local/bin/mein-agent". */
  command: string;
  /** Feste Argumente. Bei taskMode "arg" wird die Aufgabe als letztes Argument angehängt. */
  args?: string[];
  /** Arbeitsverzeichnis. */
  cwd?: string;
  /** Wie die Aufgabe übergeben wird: stdin (default) | arg | env (AGENCY_TASK). */
  taskMode?: "stdin" | "arg" | "env";
  /** Ergebnis-Parsing: stdout (default, getrimmt) | lastline | json ({status,result,final_path,costCents}). */
  resultMode?: "stdout" | "lastline" | "json";
  /** Timeout in ms. */
  timeoutMs?: number;
  /** Optionale Argumente für den Verbindungstest (z. B. ["--version"]). */
  healthArgs?: string[];
}

const DEFAULT_TIMEOUT = 300_000;

/** Minimal-Umgebung: kein Leak der Server-Secrets an beliebige lokale Agenten. */
function childEnv(ctx: ExecutionContext, taskMode: string): Record<string, string> {
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? "",
    HOME: process.env.HOME ?? "",
    LANG: process.env.LANG ?? "C.UTF-8",
    ...ctx.injectedEnv, // gebundene Secrets (nie geloggt)
    AGENCY_RUN_ID: ctx.runId,
    AGENCY_AGENT_ID: ctx.agentId,
    AGENCY_ALLOWED_TOOLS: ctx.allowedTools.join(","),
  };
  if (taskMode === "env") env.AGENCY_TASK = ctx.task;
  return env;
}

export const processAdapter: AgentAdapter<ProcessAdapterConfig> = {
  type: "process",

  async testEnvironment(config: ProcessAdapterConfig): Promise<HealthResult> {
    if (!config.command) return { ok: false, detail: "Kein Kommando angegeben" };
    return new Promise<HealthResult>((resolve) => {
      let settled = false;
      const done = (r: HealthResult) => {
        if (!settled) {
          settled = true;
          resolve(r);
        }
      };
      let child: ReturnType<typeof spawn>;
      try {
        child = spawn(config.command, config.healthArgs ?? [], {
          cwd: config.cwd,
          stdio: "ignore",
        });
      } catch (err) {
        return done({ ok: false, detail: String((err as Error).message) });
      }
      child.on("error", (err: NodeJS.ErrnoException) => {
        done({
          ok: false,
          detail:
            err?.code === "ENOENT"
              ? `Kommando nicht gefunden: ${config.command}`
              : String(err?.message ?? err),
        });
      });
      child.on("spawn", () => {
        // Erfolgreich gestartet. Ohne healthArgs reicht der Existenz-Check → sofort beenden.
        if (!config.healthArgs) {
          child.kill("SIGTERM");
          done({ ok: true, detail: `Kommando gefunden: ${config.command}` });
        }
      });
      child.on("close", (code) => {
        done({ ok: code === 0, detail: `${config.command} beendete mit Code ${code}` });
      });
      setTimeout(() => {
        if (!settled) {
          child.kill("SIGKILL");
          done({ ok: true, detail: "Kommando gestartet (Test-Timeout)" });
        }
      }, 4000);
    });
  },

  async execute(
    ctx: ExecutionContext,
    config: ProcessAdapterConfig,
  ): Promise<ExecutionResult> {
    if (!config.command) return { status: "failed", error: "Kein Kommando konfiguriert" };
    const taskMode = config.taskMode ?? "stdin";
    const args = [...(config.args ?? [])];
    if (taskMode === "arg") args.push(ctx.task);

    await ctx.audit.write({
      kind: "init",
      data: { adapter: "process", command: config.command, taskMode },
    });

    return new Promise<ExecutionResult>((resolve) => {
      let child: ReturnType<typeof spawn>;
      try {
        child = spawn(config.command, args, { cwd: config.cwd, env: childEnv(ctx, taskMode) });
      } catch (err) {
        return resolve({ status: "failed", error: String((err as Error).message) });
      }
      let out = "";
      let err = "";
      const timer = setTimeout(() => child.kill("SIGKILL"), config.timeoutMs ?? DEFAULT_TIMEOUT);
      ctx.signal?.addEventListener("abort", () => child.kill("SIGKILL"), { once: true });

      child.stdout?.on("data", (d) => {
        out += d.toString();
      });
      child.stderr?.on("data", (d) => {
        err += d.toString();
      });

      child.on("error", (e: NodeJS.ErrnoException) => {
        clearTimeout(timer);
        const error =
          e?.code === "ENOENT"
            ? `Kommando nicht gefunden: ${config.command}`
            : String(e?.message ?? e);
        void ctx.audit.write({ kind: "tool_result", tool: "process", ok: false, output: error });
        resolve({ status: "failed", error });
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          const error = err.trim() || `Exit-Code ${code}`;
          void ctx.audit.write({ kind: "tool_result", tool: "process", ok: false, output: error });
          return resolve({ status: "failed", error });
        }
        let result = out.trim();
        let artifactRef: string | undefined;
        let costCents: number | undefined;
        if (config.resultMode === "lastline") {
          const lines = out.trim().split(/\r?\n/);
          result = lines[lines.length - 1] ?? "";
        } else if (config.resultMode === "json") {
          try {
            const j = JSON.parse(out.trim()) as {
              status?: string;
              result?: string;
              final_path?: string;
              costCents?: number;
              error?: string;
            };
            if (j.status === "failed") {
              void ctx.audit.write({ kind: "tool_result", tool: "process", ok: false, output: j.error });
              return resolve({ status: "failed", error: j.error ?? "failed" });
            }
            result = j.result ?? out.trim();
            artifactRef = j.final_path;
            costCents = j.costCents;
          } catch {
            /* kein JSON → roher stdout */
          }
        }
        void ctx.audit.write({ kind: "result", text: result });
        resolve({ status: "completed", result, artifactRef, costCents });
      });

      if (taskMode === "stdin") {
        child.stdin?.write(ctx.task);
      }
      child.stdin?.end();
    });
  },
};
