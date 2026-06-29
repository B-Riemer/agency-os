import React from "react";
import type { Agent } from "../lib/api";
import { Avatar } from "../lib/ui";

export function PeopleView({ agents, onSelect }: { agents: Agent[]; onSelect: (a: Agent) => void }) {
  const m = [
    ["Mitarbeiter", agents.length],
    ["Aktiv", agents.filter((a) => a.status === "active").length],
    ["Extern eingebunden", agents.filter((a) => a.kind === "external").length],
    ["Im Onboarding", agents.filter((a) => a.status === "onboarding").length],
  ] as const;
  return (
    <div>
      <div className="h2">People</div>
      <div className="sub">Alle Agenten der Company — Personalakte per Klick.</div>
      <div className="mcards">
        {m.map(([lab, val], i) => (
          <div className="metric" key={i}>
            <div className="lab">{lab}</div>
            <div className={"val" + (lab === "Aktiv" ? " good" : "")}>{val}</div>
          </div>
        ))}
      </div>
      <div className="pgrid">
        {agents.map((a) => (
          <div className="prow" key={a.id} onClick={() => onSelect(a)}>
            <Avatar agent={a} size={40} />
            <div style={{ minWidth: 0 }}>
              <div className="nm" style={{ fontSize: 13.5 }}>
                {a.displayName} {a.kind === "external" && <span className="ext">extern</span>}
              </div>
              <div className="rl">{a.role ?? "—"}</div>
            </div>
            <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--tx3)" }}>
              {a.kind === "external" ? a.adapterType : "intern"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
