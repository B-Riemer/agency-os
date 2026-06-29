// USP-Kern — der einheitliche Agenten-Adapter-Vertrag.
// Jeder fremde Agent (HTTP, Process, MCP, OpenAI-kompatibel, Claude-CLI ...) wird über
// EINE Schnittstelle eingebunden. Der Adapter ERZWINGT die Akte: Der Kern filtert vor
// `execute` Skills/Tools nach Toggles+RBAC, injiziert nur erlaubte Secrets als ENV und
// prüft das Budget; danach landet jede Tool-Aktion im Audit. Ein externer Agent ist damit
// NICHT privilegierter als ein interner.

/** Eintrag im Lauf-Transkript — deckt Tool-Calls und Kosten für das Audit ab. */
export type TranscriptEntry =
  | { kind: "init"; data?: Record<string, unknown> }
  | { kind: "assistant"; text: string }
  | { kind: "thinking"; text: string }
  | { kind: "tool_call"; tool: string; args: Record<string, unknown> }
  | { kind: "tool_result"; tool: string; ok: boolean; output?: unknown }
  | { kind: "result"; text?: string; usage?: Record<string, unknown>; costCents?: number };

/** Senke, in die der Adapter live Audit-/Transkript-Einträge schreibt (append-only). */
export interface AuditSink {
  write(entry: TranscriptEntry): void | Promise<void>;
}

/** Vom Kern vorbereiteter Lauf-Kontext — bereits gefiltert nach Toggles/RBAC/Budget. */
export interface ExecutionContext {
  runId: string;
  agentId: string;
  /** Die eigentliche Aufgabe (z. B. aus einem Issue). */
  task: string;
  /** Persona/System-Prompt des Agenten (für LLM-Adapter wie openai). NIE für Secrets. */
  systemPrompt?: string;
  /** Freigeschaltete Skills (Policy bereits aufgelöst). */
  allowedSkills: Array<{ key: string; policy: "auto" | "approval_required" }>;
  /** Tool-Allowlist = Toggles(agent)=true ∩ Skill-erlaubt. Der Kern erzwingt sie zusätzlich. */
  allowedTools: string[];
  /** Freigeschaltete Wissensordner (Permission-Mirroring): Agent sieht NUR diese RAG-Quellen. */
  knowledgeFolders: string[];
  /** Secrets als ENV (nie in Prompts!). */
  injectedEnv: Record<string, string>;
  /** Verbleibendes Budget in Cents; null = unbegrenzt. */
  budgetRemainingCents: number | null;
  /** Live-Audit-Senke. */
  audit: AuditSink;
  /** Abbruch-Signal (Pause/Budget-Stop/Timeout). */
  signal?: AbortSignal;
}

export type ExecutionStatus = "completed" | "failed" | "needs_approval";

export interface ExecutionResult {
  status: ExecutionStatus;
  /** Menschlich lesbares Ergebnis / Zusammenfassung. */
  result?: string;
  /** Pfad/Referenz auf das Deliverable, falls vorhanden. */
  artifactRef?: string;
  /** Gesamtkosten dieses Laufs in Cents. */
  costCents?: number;
  /** Volles Transkript (zusätzlich zur Live-Senke). */
  transcript?: TranscriptEntry[];
  /** Fehlerdetails bei status="failed". */
  error?: string;
}

export interface HealthResult {
  ok: boolean;
  detail?: string;
  /** Bei MCP: entdeckte Tools/Resources. */
  discovered?: string[];
}

/**
 * Einheitlicher Adapter-Vertrag. `type` ist ein freier String (Plugin-erweiterbar),
 * z. B. "http" | "process" | "mcp" | "openai" | "claude_local" | "a2a".
 */
export interface AgentAdapter<Config = Record<string, unknown>> {
  readonly type: string;
  /** Beim Onboarding: Verbindung/Health/Auth testen. */
  testEnvironment(config: Config): Promise<HealthResult>;
  /** Lauf ausführen — Kontext ist bereits nach Akte gefiltert. */
  execute(ctx: ExecutionContext, config: Config): Promise<ExecutionResult>;
}

// Mitgelieferte Adapter aus dem Haupteinstieg verfügbar machen.
export { httpAdapter, type HttpAdapterConfig } from "./http-adapter.js";
export { processAdapter, type ProcessAdapterConfig } from "./process-adapter.js";
export { openAiAdapter, type OpenAiAdapterConfig } from "./openai-adapter.js";
export { mcpAdapter, type McpAdapterConfig, type McpBrainConfig } from "./mcp-adapter.js";
