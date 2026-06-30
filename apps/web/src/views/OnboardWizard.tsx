import React, { useState } from "react";
import { api, type Agent, type Department } from "../lib/api";

const TYPES = [
  { k: "http", i: "webhook", t: "HTTP / Webhook", d: "Extern laufender Agent (Aigency-Engine /wake)" },
  { k: "process", i: "terminal-2", t: "Process / CLI", d: "Lokales Skript oder CLI" },
  { k: "mcp", i: "plug-connected", t: "MCP-Server", d: "Model-Context-Protocol" },
  { k: "openai", i: "api", t: "OpenAI-kompatibel", d: "/v1/chat/completions" },
  { k: "claude_local", i: "robot", t: "Claude-Agent", d: "Anthropic / Claude-Code" },
  { k: "internal", i: "sparkles", t: "App-intern", d: "In AIgency OS erstellt" },
];

export function OnboardWizard({
  companyId,
  departments,
  onClose,
  onCreated,
}: {
  companyId: string;
  departments: Department[];
  onClose: () => void;
  onCreated: (a: Agent) => void;
}) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState("http");
  const [url, setUrl] = useState("http://localhost:8900/wake");
  const [taskField, setTaskField] = useState("task");
  // Process / CLI
  const [command, setCommand] = useState("echo");
  const [cmdArgs, setCmdArgs] = useState("");
  const [taskMode, setTaskMode] = useState("stdin");
  // OpenAI-kompatibel (auch "brain" für MCP)
  const [baseUrl, setBaseUrl] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("gpt-4o-mini");
  const [apiKeyEnv, setApiKeyEnv] = useState("OPENAI_API_KEY");
  // MCP-Server
  const [mcpTransport, setMcpTransport] = useState("stdio");
  const [mcpCommand, setMcpCommand] = useState("npx");
  const [mcpArgs, setMcpArgs] = useState("-y @modelcontextprotocol/server-everything");
  const [mcpUrl, setMcpUrl] = useState("http://localhost:3000/mcp");
  // Claude (Anthropic)
  const [claudeModel, setClaudeModel] = useState("claude-sonnet-4-6");
  const [claudeKeyEnv, setClaudeKeyEnv] = useState("ANTHROPIC_API_KEY");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [deptId, setDeptId] = useState<string>(departments[0]?.id ?? "");
  const [budget, setBudget] = useState(20);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testRes, setTestRes] = useState<{ ok: boolean; text: string } | null>(null);

  // Adapter-Config je Typ zusammenbauen (USP: ein Vertrag, mehrere Anschlussarten).
  function buildConfig(): Record<string, unknown> {
    if (type === "http") return { url, taskField, timeoutMs: 300000 };
    if (type === "process")
      return { command, args: cmdArgs.trim() ? cmdArgs.trim().split(/\s+/) : [], taskMode };
    if (type === "openai") return { baseUrl, model, apiKeyEnv };
    if (type === "mcp") {
      const base =
        mcpTransport === "http"
          ? { transport: "http", url: mcpUrl }
          : { transport: "stdio", command: mcpCommand, args: mcpArgs.trim() ? mcpArgs.trim().split(/\s+/) : [] };
      return { ...base, brain: { baseUrl, model, apiKeyEnv } };
    }
    if (type === "claude_local") return { model: claudeModel, apiKeyEnv: claudeKeyEnv, maxTokens: 1024 };
    return {};
  }
  // Welche Typen haben einen funktionierenden Adapter (Verbindungstest + Lauf)?
  const RUNNABLE = ["http", "process", "openai", "mcp", "claude_local"];

  async function testConnection() {
    setTestRes(null);
    try {
      const r = await api.testConfig(type, buildConfig());
      setTestRes({ ok: !!r.ok, text: r.ok ? `✓ erreichbar${r.detail ? " · " + r.detail : ""}` : `⚠ ${r.detail ?? "nicht erreichbar"}` });
    } catch (e: any) {
      setTestRes({ ok: false, text: `⚠ ${e.message}` });
    }
  }

  const ext = type !== "internal";

  async function finish() {
    setBusy(true);
    setMsg(null);
    try {
      const agent = await api.createAgent(companyId, {
        displayName: name || "NEXUS",
        role: role || "Externer Agent",
        departmentId: deptId || undefined,
        kind: ext ? "external" : "internal",
        adapterType: type,
        adapterConfig: buildConfig(),
        budgetMonthlyCents: Math.round(budget * 100),
      });
      let testText = "";
      try {
        const r: any = await api.test(agent.id);
        testText = r?.ok ? "✓ Verbindung ok" : `⚠ ${r?.detail ?? "Test fehlgeschlagen"}`;
      } catch (e: any) {
        testText = `⚠ Test: ${e.message}`;
      }
      await api.setStatus(companyId, agent.id, "active");
      setMsg({ ok: true, text: `Eingestellt & aktiviert. ${testText}` });
      setTimeout(() => onCreated(agent), 600);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }

  const labels = ["Herkunft", "Verbindung", "Identität"];
  return (
    <div>
      <div className="h2">Agent einstellen</div>
      <div className="sub">Bring your own agent — als vollwertiger Mitarbeiter mit Akte, Rechten, Budget und Audit.</div>
      <div className="steps">
        {labels.map((l, i) => (
          <div className={"stp" + (step === i + 1 ? " on" : "")} key={i}>
            <span className="num">{i + 1}</span> {l}
          </div>
        ))}
      </div>

      {step === 1 && (
        <>
          <div className="card2">
            <div className="ct">Herkunft / Adapter-Typ <span className="ln" /></div>
            <div className="tiles">
              {TYPES.map((t) => (
                <div className={"tile" + (type === t.k ? " sel" : "")} key={t.k} onClick={() => setType(t.k)}>
                  <i className={`ti ti-${t.i}`} />
                  <div className="tt">{t.t}</div>
                  <div className="td">{t.d}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="wnav">
            <div className="back" style={{ margin: 0 }} onClick={onClose}>‹ Abbrechen</div>
            <div className="sp" />
            <button className="btn primary" onClick={() => setStep(ext ? 2 : 3)}>Weiter ›</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="card2">
            <div className="ct">Verbindung <span className="ln" /></div>

            {type === "http" && (
              <>
                <div className="fld"><label>Webhook-URL</label><input value={url} onChange={(e) => setUrl(e.target.value)} /></div>
                <div className="fld"><label>Aufgaben-Feld (payloadTemplate)</label><input value={taskField} onChange={(e) => setTaskField(e.target.value)} /></div>
              </>
            )}

            {type === "process" && (
              <>
                <div className="fld"><label>Kommando</label><input placeholder="z. B. python3 oder echo" value={command} onChange={(e) => setCommand(e.target.value)} /></div>
                <div className="fld"><label>Argumente (durch Leerzeichen getrennt)</label><input placeholder="z. B. agent.py --mode run" value={cmdArgs} onChange={(e) => setCmdArgs(e.target.value)} /></div>
                <div className="fld"><label>Aufgabe übergeben via</label>
                  <select value={taskMode} onChange={(e) => setTaskMode(e.target.value)}>
                    <option value="stdin">stdin (Standard)</option>
                    <option value="arg">als letztes Argument</option>
                    <option value="env">ENV AGENCY_TASK</option>
                  </select>
                </div>
                <div className="sub" style={{ marginTop: 6 }}>Ergebnis kommt aus stdout. Secrets werden als ENV injiziert (nie im Prompt).</div>
              </>
            )}

            {type === "openai" && (
              <>
                <div className="fld"><label>Basis-URL</label><input placeholder="https://api.openai.com/v1 · http://localhost:11434/v1" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} /></div>
                <div className="fld"><label>Modell</label><input placeholder="gpt-4o-mini · llama3.1 · mistral" value={model} onChange={(e) => setModel(e.target.value)} /></div>
                <div className="fld"><label>API-Key aus Secret (ENV-Name)</label><input placeholder="OPENAI_API_KEY" value={apiKeyEnv} onChange={(e) => setApiKeyEnv(e.target.value)} /></div>
                <div className="sub" style={{ marginTop: 6 }}>Der Key kommt zur Laufzeit aus einem gebundenen Secret — nicht hier eintragen.</div>
              </>
            )}

            {type === "mcp" && (
              <>
                <div className="fld"><label>Transport</label>
                  <select value={mcpTransport} onChange={(e) => setMcpTransport(e.target.value)}>
                    <option value="stdio">stdio (lokaler Server via Kommando)</option>
                    <option value="http">HTTP (Streamable / Remote)</option>
                  </select>
                </div>
                {mcpTransport === "stdio" ? (
                  <>
                    <div className="fld"><label>Kommando</label><input placeholder="z. B. npx" value={mcpCommand} onChange={(e) => setMcpCommand(e.target.value)} /></div>
                    <div className="fld"><label>Argumente</label><input placeholder="-y @modelcontextprotocol/server-everything" value={mcpArgs} onChange={(e) => setMcpArgs(e.target.value)} /></div>
                  </>
                ) : (
                  <div className="fld"><label>Server-URL</label><input placeholder="https://host/mcp" value={mcpUrl} onChange={(e) => setMcpUrl(e.target.value)} /></div>
                )}
                <div className="ct" style={{ marginTop: 12 }}>Brain (LLM, steuert die MCP-Tools) <span className="ln" /></div>
                <div className="fld"><label>Brain Basis-URL</label><input placeholder="https://api.openai.com/v1 · http://localhost:11434/v1" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} /></div>
                <div className="fld"><label>Brain Modell</label><input placeholder="gpt-4o-mini · llama3.1" value={model} onChange={(e) => setModel(e.target.value)} /></div>
                <div className="fld"><label>API-Key aus Secret (ENV-Name)</label><input placeholder="OPENAI_API_KEY" value={apiKeyEnv} onChange={(e) => setApiKeyEnv(e.target.value)} /></div>
                <div className="sub" style={{ marginTop: 6 }}>Der Verbindungstest listet die Tools des Servers — auch ohne Brain. Für echte Läufe braucht es das Brain-Modell.</div>
              </>
            )}

            {type === "claude_local" && (
              <>
                <div className="fld"><label>Claude-Modell</label><input placeholder="claude-sonnet-4-6 · claude-opus-4-8 · claude-haiku-4-5" value={claudeModel} onChange={(e) => setClaudeModel(e.target.value)} /></div>
                <div className="fld"><label>API-Key aus Secret (ENV-Name)</label><input placeholder="ANTHROPIC_API_KEY" value={claudeKeyEnv} onChange={(e) => setClaudeKeyEnv(e.target.value)} /></div>
                <div className="sub" style={{ marginTop: 6 }}>Der Anthropic-Key kommt zur Laufzeit aus einem gebundenen Secret — nicht hier eintragen.</div>
              </>
            )}

            {!RUNNABLE.includes(type) && (
              <div className="sub">Für diesen Typ gibt es noch keinen lauffähigen Adapter. Der Agent wird angelegt; Läufe folgen in einer späteren Phase.</div>
            )}

            {RUNNABLE.includes(type) && (
              <button className="btn" onClick={testConnection} style={{ marginTop: 10 }}>Verbindung testen</button>
            )}
            {testRes && <div className={"result " + (testRes.ok ? "ok" : "err")}>{testRes.text}</div>}
          </div>
          <div className="wnav">
            <button className="btn" onClick={() => setStep(1)}>‹ Zurück</button>
            <div className="sp" />
            <button className="btn primary" onClick={() => setStep(3)}>Weiter ›</button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <div className="card2">
            <div className="ct">Identität &amp; Org <span className="ln" /></div>
            <div className="fld"><label>Name</label><input placeholder="z. B. NEXUS" value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="fld"><label>Rolle / Titel</label><input placeholder="z. B. SEO-Auditor (extern)" value={role} onChange={(e) => setRole(e.target.value)} /></div>
            <div className="fld"><label>Abteilung</label>
              <select value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                <option value="">— keine —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="fld"><label>Budget / Cost-Cap (€/Monat)</label><input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ maxWidth: 170 }} /></div>
            {msg && <div className={"result " + (msg.ok ? "ok" : "err")}>{msg.text}</div>}
          </div>
          <div className="wnav">
            <button className="btn" onClick={() => setStep(ext ? 2 : 1)}>‹ Zurück</button>
            <div className="sp" />
            <button className="btn primary" disabled={busy} onClick={finish}>{busy ? "Stelle ein …" : "✓ Agent einstellen"}</button>
          </div>
        </>
      )}
    </div>
  );
}
