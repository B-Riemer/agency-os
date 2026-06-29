import React, { useEffect, useState } from "react";
import { api, type Agent } from "../lib/api";
import { Avatar } from "../lib/ui";

const COLS: [string, string][] = [
  ["backlog", "Backlog"],
  ["in_progress", "In Arbeit"],
  ["review", "Review"],
  ["done", "Fertig"],
];
const NEXT: Record<string, string> = { backlog: "in_progress", in_progress: "review", review: "done", done: "backlog", blocked: "in_progress" };

export function OrchestrationView({ companyId }: { companyId: string }) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [title, setTitle] = useState("");
  const [assignee, setAssignee] = useState("");

  async function load() {
    setTasks(await api.tasks(companyId).catch(() => []));
    setRoutines(await api.routines(companyId).catch(() => []));
    setAgents(await api.agents(companyId).catch(() => []));
  }
  useEffect(() => {
    load();
  }, [companyId]);

  const agentOf = (id: string) => agents.find((a) => a.id === id);
  async function create() {
    if (!title.trim()) return;
    await api.createTask(companyId, { title, assigneeId: assignee || undefined });
    setTitle("");
    setAssignee("");
    load();
  }
  async function run(id: string) {
    await api.runTask(id).catch(() => {});
    load();
  }
  async function advance(t: any) {
    await api.setTaskStatus(t.id, NEXT[t.status] ?? "in_progress");
    load();
  }

  return (
    <div>
      <div className="h2">Orchestrierung</div>
      <div className="sub">Tickets, Zuweisung und Routinen — die Firma arbeitet Aufgaben ab. „Ausführen" gibt das Ticket an den zugewiesenen Agenten (echter Lauf).</div>

      <div className="card2" style={{ marginBottom: 14 }}>
        <div className="ct">Neue Aufgabe <span className="ln" /></div>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder="Titel der Aufgabe" value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()}
            style={{ flex: 1, padding: "10px 13px", borderRadius: 10, border: "1px solid var(--stroke2)", background: "rgba(0,0,0,.28)", color: "var(--tx)", outline: "none", fontFamily: "inherit" }} />
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)}
            style={{ padding: "10px 13px", borderRadius: 10, border: "1px solid var(--stroke2)", background: "rgba(0,0,0,.28)", color: "var(--tx)", fontFamily: "inherit" }}>
            <option value="">— Assignee —</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.displayName}</option>)}
          </select>
          <button className="btn primary" onClick={create}>Anlegen</button>
        </div>
      </div>

      <div className="board">
        {COLS.map(([key, label]) => {
          const items = tasks.filter((t) => t.status === key);
          return (
            <div className="tcol" key={key}>
              <div className="tcolhead">{label} <span className="ct-count">{items.length}</span></div>
              {items.map((t) => {
                const a = t.assigneeId ? agentOf(t.assigneeId) : null;
                return (
                  <div className="tcard" key={t.id}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{t.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      {a ? <Avatar agent={a} size={22} /> : <span className="etime">nicht zugewiesen</span>}
                      {a && <span className="etime">{a.displayName}</span>}
                      <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                        {t.assigneeId && t.status !== "done" && <span className="mini-btn ok" onClick={() => run(t.id)}>▶</span>}
                        <span className="mini-btn" onClick={() => advance(t)}>›</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {items.length === 0 && <div className="rl" style={{ fontSize: 11 }}>—</div>}
            </div>
          );
        })}
      </div>

      <div className="card2" style={{ marginTop: 14 }}>
        <div className="ct" style={{ display: "flex" }}>Routinen (cron) <span className="ln" />
          <span className="mini-btn" style={{ marginLeft: 8 }} onClick={async () => { await api.tickRoutines(companyId); load(); }}>Tick jetzt ↻</span>
        </div>
        {routines.length === 0 && <div className="rl">Keine Routinen.</div>}
        {routines.map((r) => (
          <div className="acc" key={r.id}>
            <span>{r.name} <span className="etime">· {r.cron} · {r.taskTitleTemplate}</span></span>
            <span className={"onoff " + (r.enabled ? "on" : "off")} onClick={async () => { await api.setRoutineEnabled(r.id, !r.enabled); load(); }}>{r.enabled ? "AN" : "AUS"}</span>
          </div>
        ))}
        <div className="rl" style={{ marginTop: 8 }}>„Tick jetzt" erzeugt für jede aktive Routine ein Ticket (echte cron-Auswertung folgt mit dem Scheduler).</div>
      </div>
    </div>
  );
}
