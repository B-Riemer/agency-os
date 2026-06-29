import React, { useEffect, useState } from "react";
import { api, type Agent } from "../lib/api";
import { Avatar, euro, statusText } from "../lib/ui";

const TABS = ["IDENTITY", "SKILLS", "ACCESS", "PROPERTIES", "ORIGIN"];

export function AkteView({
  companyId,
  agent,
  audit,
  onBack,
  onChanged,
}: {
  companyId: string;
  agent: Agent;
  audit: any[];
  onBack: () => void;
  onChanged: () => void;
}) {
  const [task, setTask] = useState("SEO-Audit https://b-riemer.dev");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [toggles, setToggles] = useState<any[]>([]);
  const [tab, setTab] = useState("IDENTITY");

  async function reload() {
    setVersions(await api.versions(companyId, agent.id).catch(() => []));
    setFolders(await api.agentKnowledge(agent.id).catch(() => []));
    setSkills(await api.agentSkills(agent.id).catch(() => []));
    setToggles(await api.agentToggles(agent.id).catch(() => []));
  }
  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, agent.id]);

  const ext = agent.kind === "external";
  const mc = (agent.modelConfig as any) ?? {};
  const cap = agent.budgetMonthlyCents;
  const spent = agent.spentMonthlyCents ?? 0;
  const pct = cap ? Math.min(100, Math.round((spent / cap) * 100)) : 0;
  const mine = audit.filter((e) => e.entityId === agent.id).slice(0, 12);
  const tools = toggles.filter((t) => t.targetType === "tool" || t.targetType === "integration");
  const secrets = toggles.filter((t) => t.targetType === "secret" || t.targetType === "dataroom");
  const created = (agent as any).createdAt ? new Date((agent as any).createdAt).toLocaleDateString("de-DE") : "—";

  async function run() {
    setBusy(true);
    setResult(null);
    try {
      const r: any = await api.run(agent.id, task);
      setResult({ ok: r.status === "completed", text: JSON.stringify(r, null, 2) });
      onChanged();
    } catch (e: any) {
      setResult({ ok: false, text: e.message });
    } finally {
      setBusy(false);
    }
  }
  async function toggleStatus() {
    await api.setStatus(companyId, agent.id, agent.status === "active" ? "paused" : "active");
    onChanged();
  }
  async function snapshot() {
    await api.snapshot(companyId, agent.id, "Manueller Snapshot");
    setVersions(await api.versions(companyId, agent.id));
  }
  async function promote(vid: string) {
    await api.promote(companyId, agent.id, vid);
    onChanged();
    setVersions(await api.versions(companyId, agent.id));
  }
  async function toggleFolder(folderId: string, enabled: boolean) {
    await api.setKnowledge(agent.id, folderId, enabled);
    setFolders(await api.agentKnowledge(agent.id));
  }
  async function toggleSkill(skillId: string, enabled: boolean) {
    await api.setSkill(agent.id, skillId, enabled);
    setSkills(await api.agentSkills(agent.id));
  }
  async function toggleAccess(t: any, enabled: boolean) {
    await api.setToggle(agent.id, t.targetType, t.targetId, enabled);
    setToggles(await api.agentToggles(agent.id));
  }
  function goTab(t: string) {
    setTab(t);
    document.getElementById("c-" + t)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  const hl = (t: string) => (tab === t ? " hl" : "");

  return (
    <div>
      <div className="back" onClick={onBack}>‹ Zurück</div>

      <div className="card2" style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 14 }}>
        <Avatar agent={agent} size={60} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 650 }}>
            {agent.displayName} {ext && <span className="ext">extern</span>}
          </div>
          <div className="rl" style={{ marginTop: 4 }}>
            <b style={{ color: "var(--tx2)", fontWeight: 600 }}>Rolle:</b> {agent.role ?? "—"} &nbsp;·&nbsp;
            <b style={{ color: "var(--tx2)", fontWeight: 600 }}>Reporting:</b> {(agent.role ?? "").toUpperCase().includes("CEO") ? "Board" : "CEO ASTRA"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <span className={"runpill" + (agent.status === "paused" ? " paused" : "")}>
            <span className="d" /> {statusText(agent.status).toUpperCase()}
          </span>
          <button className="btn" onClick={toggleStatus}>{agent.status === "active" ? "Pausieren" : "Aktivieren"}</button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <div key={t} className={"tab" + (tab === t ? " on" : "")} onClick={() => goTab(t)}>{t}</div>
        ))}
      </div>

      <div className="agrid">
        <div>
          <div className={"card2" + hl("IDENTITY")} id="c-IDENTITY">
            <div className="ct">Identity <span className="ln" /></div>
            <div className="two">
              <div>
                <div className="subh">Basis-Information</div>
                <div className="kv"><span className="k">Agent-ID</span><span className="v mono">{agent.id.slice(0, 8)}</span></div>
                <div className="kv"><span className="k">Erstellt</span><span className="v">{created}</span></div>
                <div className="kv"><span className="k">Modell</span><span className="v mono">{mc.model ?? (ext ? "eigener Stack" : "—")}</span></div>
                <div className="kv"><span className="k">Status</span><span className="v">{statusText(agent.status)}</span></div>
              </div>
              <div>
                <div className="subh">Kontaktpunkte</div>
                <div className="kv"><span className="k">Primär-Interface</span><span className="v">{ext ? "HTTP Endpoint" : "API (intern)"}</span></div>
                <div className="kv"><span className="k">Adapter</span><span className="v mono">{agent.adapterType}</span></div>
                <div className="kv"><span className="k">Eskalation</span><span className="v">{(agent.role ?? "").toUpperCase().includes("CEO") ? "Board" : "Abteilungs-VP"}</span></div>
              </div>
            </div>
          </div>

          <div className="four">
            <div className={"card2" + hl("SKILLS")} id="c-SKILLS">
              <div className="ct">Skills <span className="ln" /></div>
              {skills.length === 0 && <div className="rl">Keine Skills zugewiesen.</div>}
              {skills.map((s) => {
                const pol = s.policy ?? s.defaultPolicy;
                return (
                  <div key={s.skillId} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
                      <span>{s.name} <span style={{ color: "var(--tx3)", fontFamily: "ui-monospace,monospace", fontSize: 11 }}>v{s.version}</span></span>
                      <span className={"bd " + (pol === "auto" ? "bd-auto" : "bd-appr")}>{pol === "auto" ? "auto" : "approval"}</span>
                      <span className={"onoff " + (s.enabled ? "on" : "off")} style={{ marginLeft: "auto" }} onClick={() => toggleSkill(s.skillId, !s.enabled)}>{s.enabled ? "AN" : "AUS"}</span>
                    </div>
                    <div className="meter" style={{ marginTop: 6 }}><i style={{ width: s.enabled ? "100%" : "35%" }} /></div>
                  </div>
                );
              })}
            </div>

            <div className={"card2" + hl("ACCESS")} id="c-ACCESS">
              <div className="ct">Access <span className="ln" /></div>
              <div className="subh">Tools &amp; Integrationen</div>
              {tools.length === 0 && <div className="rl">Keine Tools.</div>}
              {tools.map((t) => (
                <div className="acc" key={t.targetType + t.targetId}>
                  <span>{t.targetId}</span>
                  <span className={"onoff " + (t.enabled ? "on" : "off")} onClick={() => toggleAccess(t, !t.enabled)}>{t.enabled ? "AN" : "AUS"}</span>
                </div>
              ))}
              {secrets.length > 0 && <div className="subh" style={{ marginTop: 12 }}>Secrets &amp; Daten</div>}
              {secrets.map((t) => (
                <div className="acc" key={t.targetType + t.targetId}>
                  <span>{t.targetId}</span>
                  <span className={"onoff " + (t.enabled ? "on" : "off")} onClick={() => toggleAccess(t, !t.enabled)}>{t.enabled ? "AN" : "AUS"}</span>
                </div>
              ))}
            </div>

            <div className={"card2" + hl("PROPERTIES")} id="c-PROPERTIES">
              <div className="ct">Properties <span className="ln" /></div>
              <div className="subh">Modell-Konfiguration</div>
              <div className="kv"><span className="k">Temperature</span><span className="v mono">{mc.temperature ?? "0.7"}</span></div>
              <div className="kv"><span className="k">Max Tokens</span><span className="v mono">{mc.maxTokens ?? "4096"}</span></div>
              <div className="kv"><span className="k">Top P</span><span className="v mono">{mc.topP ?? "1.0"}</span></div>
              <div className="budget">
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "1px", color: "var(--tx3)" }}>BUDGET-METER</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 6 }}>
                  <span>{euro(spent)}</span><span style={{ color: "var(--tx3)" }}>{cap == null ? "∞" : "Cap " + euro(cap)}</span>
                </div>
                <div className="meter" style={{ marginTop: 7 }}><i style={{ width: `${pct}%` }} /></div>
                <svg width="100%" height="32" viewBox="0 0 240 32" preserveAspectRatio="none" style={{ marginTop: 8 }}>
                  <polyline points="0,24 30,18 60,22 90,12 120,16 150,9 180,15 210,7 240,11" fill="none" stroke="#7fb0ff" strokeWidth="2" />
                </svg>
              </div>
            </div>

            <div className={"card2" + hl("ORIGIN")} id="c-ORIGIN">
              <div className="ct">Origin <span className="ln" /></div>
              <div className="subh">Agent-Herkunft</div>
              <div className="kv"><span className="k">Typ</span><span className="v" style={{ color: ext ? "#ffcb96" : "#bcd3ff" }}>{ext ? "Extern" : "App-intern"}</span></div>
              <div className="kv"><span className="k">Provider</span><span className="v">{ext ? "Eigene Runtime" : "Agency OS Runtime"}</span></div>
              <div className="kv"><span className="k">Endpoint</span><span className="v mono" style={{ fontSize: 10 }}>{String((agent.adapterConfig as any)?.url ?? "—")}</span></div>
              <div className="kv"><span className="k">Auth</span><span className="v">{ext ? "Bearer / Token" : "Session"}</span></div>
            </div>
          </div>

          <div className="card2" style={{ marginTop: 14 }}>
            <div className="ct">Ausführen (echter Lauf) <span className="ln" /></div>
            <div className="fld"><label>Aufgabe</label><textarea rows={2} value={task} onChange={(e) => setTask(e.target.value)} /></div>
            <button className="btn primary" disabled={busy || agent.status !== "active"} onClick={run}>{busy ? "Läuft …" : "▶ Agent ausführen"}</button>
            {agent.status !== "active" && <div className="rl" style={{ marginTop: 8 }}>Agent muss aktiv sein.</div>}
            {result && <div className={"result " + (result.ok ? "ok" : "err")}>{result.text}</div>}
          </div>

          <div className="card2" style={{ marginTop: 14 }}>
            <div className="ct">Versionen (Promote / Rollback) <span className="ln" /></div>
            <button className="btn" onClick={snapshot}>Snapshot speichern</button>
            <div style={{ marginTop: 10 }}>
              {versions.length === 0 && <div className="rl">Noch keine Versionen.</div>}
              {versions.map((v) => (
                <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid var(--stroke)" }}>
                  <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 12, color: "#bcd3ff" }}>v{v.version}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5 }}>{v.note ?? "—"}</div>
                    <div className="etime">{new Date(v.createdAt).toLocaleString("de-DE")}</div>
                  </div>
                  <span className="mini-btn" style={{ marginLeft: "auto" }} onClick={() => promote(v.id)}>Promote</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card2" style={{ marginTop: 14 }}>
            <div className="ct">Wissensordner (RAG · Permission-Mirroring) <span className="ln" /></div>
            {folders.length === 0 && <div className="rl">Keine Ordner zugewiesen.</div>}
            {folders.map((f) => (
              <div className="acc" key={f.folderId}>
                <span>{f.name} <span className="etime">· {f.sensitivity}</span></span>
                <span className={"onoff " + (f.enabled ? "on" : "off")} onClick={() => toggleFolder(f.folderId, !f.enabled)}>{f.enabled ? "AN" : "AUS"}</span>
              </div>
            ))}
            <div className="rl" style={{ marginTop: 8 }}>Der Agent sieht zur Laufzeit nur AN-geschaltete Ordner.</div>
          </div>
        </div>

        <div className="card2">
          <div className="ct">Activity-Stream &amp; Audit-Log <span className="ln" /></div>
          {mine.length === 0 && <div className="rl">Noch keine Aktionen.</div>}
          {mine.map((e, i) => (
            <div className="ev" key={i}>
              <div className="eic">•</div>
              <div>
                <div className="etext">{e.action}</div>
                <div className="etime">{new Date(e.createdAt).toLocaleString("de-DE")}</div>
              </div>
              {e.costCents ? <div className="ecost">{euro(e.costCents)}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
