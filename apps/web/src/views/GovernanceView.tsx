import React, { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { euro } from "../lib/ui";

const HB: Record<string, { c: string; t: string }> = {
  working: { c: "var(--blue)", t: "arbeitet" },
  idle: { c: "var(--green)", t: "bereit" },
  error: { c: "var(--red)", t: "Fehler" },
  budget_warning: { c: "var(--amber)", t: "Budget-Warnung" },
  paused: { c: "var(--amber)", t: "pausiert" },
  unknown: { c: "var(--tx3)", t: "—" },
};

export function GovernanceView({ companyId }: { companyId: string }) {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [beats, setBeats] = useState<any[]>([]);
  const [ins, setIns] = useState<any | null>(null);
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");

  async function load() {
    const [b, ap, au, al, hb, iv] = await Promise.all([
      api.budgets(companyId).catch(() => []),
      api.approvals(companyId).catch(() => []),
      api.audit(companyId).catch(() => []),
      api.alerts(companyId).catch(() => []),
      api.heartbeats(companyId).catch(() => []),
      api.insights(companyId).catch(() => null),
    ]);
    setBudgets(b);
    setApprovals(ap.filter((a: any) => a.status === "pending"));
    setAudit(au);
    setAlerts(al);
    setBeats(hb);
    setIns(iv);
  }
  useEffect(() => {
    load();
  }, [companyId]);

  const nameOf = useMemo(() => {
    const m = new Map<string, string>();
    budgets.forEach((b) => m.set(b.id, b.name));
    return (id: string) => m.get(id) ?? id.slice(0, 8);
  }, [budgets]);

  const spent = budgets.reduce((s, a) => s + (a.spentCents ?? 0), 0);
  const cap = budgets.reduce((s, a) => s + (a.capCents ?? 0), 0);

  function ask(question: string) {
    setQ(question);
    if (!ins) return setAnswer("Lade Daten …");
    const ql = question.toLowerCase();
    let a = "";
    if (/(kost|spend|budget|teuer)/.test(ql))
      a = ins.topSpender ? `Höchste Kosten: ${ins.topSpender.name} — ${euro(ins.topSpender.spentCents)} diesen Monat. Gesamt-Spend der Flotte: ${euro(ins.totalSpendCents)}.` : "Keine Kostendaten.";
    else if (/(aktiv|meiste|busy)/.test(ql))
      a = ins.mostActive ? `Aktivster Agent: ${ins.mostActive.name} (${ins.mostActive.events} Audit-Ereignisse).` : "Keine Aktivität erfasst.";
    else if (/(risk|risiko|gefahr|pausi|kritisch)/.test(ql))
      a = ins.atRisk.length ? `At-risk (${ins.atRisk.length}): ` + ins.atRisk.map((r: any) => `${r.name} (${r.status}${r.pct != null ? `, ${r.pct}%` : ""})`).join(", ") + "." : "Kein Agent ist aktuell at-risk.";
    else if (/(extern|external|byo)/.test(ql)) a = `${ins.externalCount} von ${ins.agentCount} Agenten sind extern eingebunden.`;
    else if (/(viele|anzahl|mitarbeiter|gesamt)/.test(ql)) a = `${ins.agentCount} Agenten — ${ins.activeCount} aktiv, ${ins.externalCount} extern.`;
    else a = `Flotte: ${ins.agentCount} Agenten (${ins.activeCount} aktiv, ${ins.externalCount} extern), Spend ${euro(ins.totalSpendCents)}, ${ins.atRisk.length} at-risk.`;
    setAnswer(a);
  }

  const chips = ["Höchste Kosten?", "Aktivster Agent?", "Wer ist at-risk?", "Wie viele extern?"];

  return (
    <div>
      <div className="h2">Governance</div>
      <div className="sub">Budgets, Approvals, Live-Status und der append-only Audit-Trail — Company-isoliert.</div>
      <div className="mcards">
        <div className="metric"><div className="lab">Spend (Monat)</div><div className="val">{euro(spent)}</div></div>
        <div className="metric"><div className="lab">Budget-Auslastung</div><div className="val">{cap ? Math.round((spent / cap) * 100) : 0}%</div></div>
        <div className="metric"><div className="lab">Budget-Alarme</div><div className="val" style={{ color: alerts.length ? "#ffd98a" : undefined }}>{alerts.length}</div></div>
        <div className="metric"><div className="lab">Offene Approvals</div><div className="val">{approvals.length}</div></div>
      </div>

      <div className="card2" style={{ marginBottom: 14 }}>
        <div className="ct">Fleet-Insights — Chat with your fleet <span className="ln" /></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {chips.map((c) => (
            <span key={c} className="mini-btn" style={{ background: "var(--glass)" }} onClick={() => ask(c)}>{c}</span>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder={"Frag deine Flotte — z. B. hoechste Kosten, aktivster Agent, at-risk"}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(q)}
            style={{ flex: 1, padding: "10px 13px", borderRadius: 10, border: "1px solid var(--stroke2)", background: "rgba(0,0,0,.28)", color: "var(--tx)", outline: "none", fontFamily: "inherit" }}
          />
          <button className="btn primary" onClick={() => ask(q)}>Fragen</button>
        </div>
        {answer && <div className="result ok" style={{ marginTop: 12 }}>{answer}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14, alignItems: "start" }}>
        <div>
          <div className="card2">
            <div className="ct">Approvals <span className="ln" /></div>
            {approvals.length === 0 && <div className="rl">Keine offenen Freigaben.</div>}
            {approvals.map((a) => (
              <div className="approval" key={a.id}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.type}</div>
                  <div className="rl">{a.reason ?? a.subjectType}</div>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <span className="mini-btn ok" onClick={() => api.decide(a.id, "approved").then(load)}>Freigeben</span>
                  <span className="mini-btn no" onClick={() => api.decide(a.id, "rejected").then(load)}>Ablehnen</span>
                </div>
              </div>
            ))}
          </div>

          <div className="card2" style={{ marginTop: 14 }}>
            <div className="ct">Budget-Alarme (≥ 80 %) <span className="ln" /></div>
            {alerts.length === 0 && <div className="rl">Alles im grünen Bereich.</div>}
            {alerts.map((a) => (
              <div key={a.id} style={{ marginBottom: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span>{a.name} {a.level === "over" && <span className="ext" style={{ background: "rgba(255,122,122,.18)", color: "#ffb3b3", boxShadow: "inset 0 0 0 1px rgba(255,122,122,.5)" }}>Auto-Pause</span>}</span>
                  <span style={{ color: a.level === "over" ? "#ffb3b3" : "#ffd98a" }}>{a.pct}% · {euro(a.spentCents)} / {euro(a.capCents)}</span>
                </div>
                <div className="meter" style={{ marginTop: 5 }}><i style={{ width: `${Math.min(100, a.pct)}%`, background: a.level === "over" ? "linear-gradient(90deg,var(--amber),var(--red))" : "linear-gradient(90deg,var(--blue),var(--amber))" }} /></div>
              </div>
            ))}
          </div>

          <div className="card2" style={{ marginTop: 14 }}>
            <div className="ct">Budget je Agent <span className="ln" /></div>
            {budgets.map((a) => {
              const p = a.capCents ? Math.min(100, Math.round(((a.spentCents ?? 0) / a.capCents) * 100)) : 0;
              return (
                <div key={a.id} style={{ marginBottom: 11 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>{a.name}</span>
                    <span style={{ color: "var(--tx3)" }}>{a.capCents == null ? "∞" : `${euro(a.spentCents)} / ${euro(a.capCents)}`}</span>
                  </div>
                  <div className="meter" style={{ marginTop: 5 }}><i style={{ width: `${p}%` }} /></div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="card2">
            <div className="ct">Live-Status (Heartbeats) <span className="ln" /></div>
            {beats.length === 0 && <div className="rl">Noch keine Heartbeats — führe einen Agenten aus.</div>}
            {beats.map((b) => {
              const h = HB[b.state] ?? HB.unknown;
              return (
                <div key={b.agentId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--stroke)" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: h.c, boxShadow: `0 0 10px ${h.c}`, flex: "none" }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{nameOf(b.agentId)}</div>
                    <div className="etime">{h.t}{b.note ? ` · ${b.note}` : ""}</div>
                  </div>
                  <div className="etime" style={{ marginLeft: "auto" }}>{new Date(b.at).toLocaleTimeString("de-DE")}</div>
                </div>
              );
            })}
          </div>

          <div className="card2" style={{ marginTop: 14 }}>
            <div className="ct">Audit-Log (Company-weit) <span className="ln" /></div>
            {audit.slice(0, 14).map((e, i) => (
              <div className="ev" key={i}>
                <div className="eic">•</div>
                <div>
                  <div className="etext">{e.action}</div>
                  <div className="etime">{e.actorType} · {new Date(e.createdAt).toLocaleString("de-DE")}</div>
                </div>
                {e.costCents ? <div className="ecost">{euro(e.costCents)}</div> : null}
              </div>
            ))}
            {audit.length === 0 && <div className="rl">Noch keine Einträge.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
