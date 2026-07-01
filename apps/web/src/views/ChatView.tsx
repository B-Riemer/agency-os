import React, { useMemo, useRef, useState, useEffect } from "react";
import { api, type Agent } from "../lib/api";
import { Avatar } from "../lib/ui";

type Msg = { who: "you" | "agent"; text: string; agent?: Agent; status?: string; cost?: number; error?: boolean };

// Auftrags-/Chat-Leiste: du beschreibst eine Aufgabe und wählst das Ziel
// (CEO = Auftrag/Orchestrierung, Natascha = Gespräch, oder ein einzelner Agent).
export function ChatView({ agents }: { agents: Agent[] }) {
  // Ziel-Reihenfolge: CEO zuerst, dann Natascha/Front-Desk, dann der Rest.
  const ordered = useMemo(() => {
    const score = (a: Agent) => {
      const r = (a.role ?? "").toLowerCase();
      const n = (a.displayName ?? "").toLowerCase();
      if (r.includes("chief executive") || n === "ceo") return 0;
      if (n.includes("natascha") || r.includes("chief of staff")) return 1;
      return 2;
    };
    return [...agents].sort((a, b) => score(a) - score(b) || a.displayName.localeCompare(b.displayName));
  }, [agents]);

  const [target, setTarget] = useState<string>("");
  const [input, setInput] = useState("");
  const [thread, setThread] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!target && ordered.length) setTarget(ordered[0].id);
  }, [ordered, target]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread, busy]);

  const targetAgent = agents.find((a) => a.id === target);

  async function send() {
    const task = input.trim();
    if (!task || !targetAgent || busy) return;
    setThread((t) => [...t, { who: "you", text: task }]);
    setInput("");
    setBusy(true);
    try {
      const res: any = await api.run(targetAgent.id, task);
      const text = res?.result || (res?.status === "completed" ? "(kein Text zurückgegeben)" : `Status: ${res?.status ?? "unbekannt"}`);
      setThread((t) => [...t, { who: "agent", agent: targetAgent, text, status: res?.status, cost: res?.costCents }]);
    } catch (e: any) {
      setThread((t) => [
        ...t,
        {
          who: "agent",
          agent: targetAgent,
          error: true,
          text:
            "Konnte nicht ausgeführt werden: " +
            (e?.message ?? "unbekannt") +
            ". Dieser Agent ist noch nicht live angebunden (Runtime/Adapter fehlt) — das ist Phase 2.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="orgwrap" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="h2">Auftrag an die Firma</div>
      <div className="sub">
        Beschreibe die Aufgabe und wähle das Ziel: <b>CEO</b> triagiert &amp; delegiert ans Team, <b>Natascha</b> fürs Gespräch,
        oder direkt ein einzelner Agent.
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 2px", display: "flex", flexDirection: "column", gap: 12 }}>
        {thread.length === 0 && (
          <div className="rl" style={{ opacity: 0.7 }}>
            Noch keine Nachrichten. Beispiel: „Erstelle ein technisches SEO-Audit von b-riemer.dev" (an den CEO).
          </div>
        )}
        {thread.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 10, flexDirection: m.who === "you" ? "row-reverse" : "row" }}>
            {m.who === "agent" && m.agent && <Avatar agent={m.agent} size={34} />}
            <div
              className="card2"
              style={{
                maxWidth: "72%",
                margin: 0,
                padding: "10px 13px",
                background: m.who === "you" ? "rgba(91,140,255,.16)" : m.error ? "rgba(255,122,122,.10)" : undefined,
                borderColor: m.error ? "rgba(255,122,122,.4)" : undefined,
              }}
            >
              {m.who === "agent" && m.agent && (
                <div className="etime" style={{ marginBottom: 4 }}>
                  {m.agent.displayName} · {m.agent.role ?? ""}
                </div>
              )}
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.text}</div>
              {m.status && !m.error && (
                <div className="etime" style={{ marginTop: 6 }}>
                  {m.status}
                  {typeof m.cost === "number" ? ` · ${(m.cost / 100).toFixed(2)}€` : ""}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="rl">… {targetAgent?.displayName} arbeitet</div>}
        <div ref={endRef} />
      </div>

      <div className="card2" style={{ marginTop: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="etime">Ziel</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)} style={{ minWidth: 190 }}>
              {ordered.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName}
                  {a.role ? ` — ${a.role.length > 34 ? a.role.slice(0, 34) + "…" : a.role}` : ""}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Aufgabe beschreiben …  (Enter = senden, Shift+Enter = Zeile)"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            style={{ flex: 1, minHeight: 46, maxHeight: 160 }}
          />
          <button className="hirebtn" disabled={busy || !input.trim() || !targetAgent} onClick={send}>
            Senden
          </button>
        </div>
      </div>
    </div>
  );
}
