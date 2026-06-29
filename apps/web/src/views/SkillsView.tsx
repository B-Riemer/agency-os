import React, { useEffect, useState } from "react";
import { api } from "../lib/api";

export function SkillsView({ companyId }: { companyId: string }) {
  const [cat, setCat] = useState<any[]>([]);
  useEffect(() => {
    api.skills(companyId).then(setCat).catch(() => setCat([]));
  }, [companyId]);

  const auto = cat.filter((s) => s.defaultPolicy === "auto").length;
  const appr = cat.filter((s) => s.defaultPolicy === "approval_required").length;

  return (
    <div>
      <div className="h2">Skills</div>
      <div className="sub">Katalog mit Version &amp; Policy (auto / approval). Pro Skill optional ein typsicheres input_schema.</div>
      <div className="mcards">
        <div className="metric"><div className="lab">Skills im Katalog</div><div className="val">{cat.length}</div></div>
        <div className="metric"><div className="lab">auto</div><div className="val good">{auto}</div></div>
        <div className="metric"><div className="lab">approval-required</div><div className="val">{appr}</div></div>
        <div className="metric"><div className="lab">mit input_schema</div><div className="val">{cat.filter((s) => s.inputSchema).length}</div></div>
      </div>
      <div className="pgrid">
        {cat.map((s) => (
          <div className="card2" key={s.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <b style={{ fontWeight: 600 }}>{s.name}</b>
              <span style={{ color: "var(--tx3)", fontFamily: "ui-monospace,monospace", fontSize: 11 }}>v{s.version}</span>
              <span
                className="pol"
                style={{
                  marginLeft: "auto",
                  fontSize: 9.5,
                  fontWeight: 800,
                  letterSpacing: ".4px",
                  padding: "3px 8px",
                  borderRadius: 6,
                  textTransform: "uppercase",
                  background: s.defaultPolicy === "auto" ? "rgba(62,229,163,.16)" : "rgba(255,194,75,.16)",
                  color: s.defaultPolicy === "auto" ? "#8df0c6" : "#ffd98a",
                }}
              >
                {s.defaultPolicy === "auto" ? "auto" : "approval"}
              </span>
            </div>
            <div className="rl" style={{ marginTop: 8 }}>
              Trust: {s.trustLevel ?? "—"} · Schema: {s.inputSchema ? "input_schema ✓" : "—"}
            </div>
          </div>
        ))}
        {cat.length === 0 && <div className="banner">Noch keine Skills im Katalog.</div>}
      </div>
    </div>
  );
}
