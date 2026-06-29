import React, { useState } from "react";
import { api, type Agent, type Department } from "../lib/api";

const TYPES = [
  { k: "http", i: "webhook", t: "HTTP / Webhook", d: "Extern laufender Agent (Aigency-Engine /wake)" },
  { k: "process", i: "terminal-2", t: "Process / CLI", d: "Lokales Skript oder CLI" },
  { k: "mcp", i: "plug-connected", t: "MCP-Server", d: "Model-Context-Protocol" },
  { k: "openai", i: "api", t: "OpenAI-kompatibel", d: "/v1/chat/completions" },
  { k: "claude_local", i: "robot", t: "Claude-Agent", d: "Anthropic / Claude-Code" },
  { k: "internal", i: "sparkles", t: "App-intern", d: "In Agency OS erstellt" },
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
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [deptId, setDeptId] = useState<string>(departments[0]?.id ?? "");
  const [budget, setBudget] = useState(20);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testRes, setTestRes] = useState<{ ok: boolean; text: string } | null>(null);

  async function testConnection() {
    setTestRes(null);
    try {
      const r = await api.testConfig(type, { url, taskField });
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
        adapterConfig: type === "http" ? { url, taskField, timeoutMs: 300000 } : {},
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
            <div className="fld"><label>Webhook-URL</label><input value={url} onChange={(e) => setUrl(e.target.value)} /></div>
            <div className="fld"><label>Aufgaben-Feld (payloadTemplate)</label><input value={taskField} onChange={(e) => setTaskField(e.target.value)} /></div>
            <button className="btn" onClick={testConnection}>Verbindung testen</button>
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
