import React, { useLayoutEffect, useRef, useState } from "react";
import { api, type Agent, type Department } from "../lib/api";
import { Avatar } from "../lib/ui";

const EMBLEM = `
<svg class="emblem" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb0ff"/><stop offset="1" stop-color="#9b6bff"/></linearGradient></defs>
  <g class="spin"><circle cx="80" cy="80" r="74" fill="none" stroke="rgba(150,170,220,.55)" stroke-width="2" stroke-dasharray="2 6"/><circle cx="80" cy="18" r="3.6" fill="#7fffd8"/></g>
  <circle cx="80" cy="80" r="62" fill="none" stroke="url(#eg)" stroke-width="2.6" opacity=".95"/>
  <circle cx="80" cy="80" r="50" fill="rgba(10,14,24,.75)" stroke="rgba(120,150,220,.4)" stroke-width="1"/>
</svg>
<i class="ti ti-brain emblem-brain"></i>`;

function Node({ agent, onSelect, vp }: { agent: Agent; onSelect: (a: Agent) => void; vp?: boolean }) {
  return (
    <div className={"node" + (vp ? " vpnode" : "")} onClick={() => onSelect(agent)}>
      <Avatar agent={agent} size={vp ? 52 : 44} />
      <div className="lab">
        <div className="t">{agent.role ?? ""}</div>
        <div className="n">
          {agent.displayName} {agent.kind === "external" && <span className="ext">extern</span>}
        </div>
      </div>
    </div>
  );
}

export function OrgView({
  agents,
  departments,
  onSelect,
  companyId,
  companyName,
  onChanged,
}: {
  agents: Agent[];
  departments: Department[];
  onSelect: (a: Agent) => void;
  companyId: string;
  companyName: string;
  onChanged: () => void;
}) {
  const [newDept, setNewDept] = useState("");
  const [busy, setBusy] = useState(false);

  async function addDept() {
    const name = newDept.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      await api.createDepartment(companyId, name);
      setNewDept("");
      onChanged();
    } finally {
      setBusy(false);
    }
  }
  async function renameDept(d: Department) {
    const name = window.prompt("Neuer Name der Abteilung:", d.name);
    if (!name || name === d.name) return;
    await api.updateDepartment(companyId, d.id, { name });
    onChanged();
  }
  async function removeDept(d: Department) {
    if (!window.confirm(`Abteilung „${d.name}" löschen? Zugewiesene Agenten bleiben erhalten.`)) return;
    await api.deleteDepartment(companyId, d.id);
    onChanged();
  }
  async function renameCompany() {
    const name = window.prompt("Name der Company:", companyName);
    if (!name || name === companyName) return;
    await api.renameCompany(companyId, name);
    onChanged();
  }

  const wrapRef = useRef<HTMLDivElement>(null);
  const emblemRef = useRef<HTMLDivElement>(null);
  const deptRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [svg, setSvg] = useState("");
  const [dims, setDims] = useState({ w: 0, h: 0 });

  // CEO robust erkennen: Rolle/Name enthält „CEO"/„Chief Executive", sonst der Agent ohne Vorgesetzten (Org-Wurzel).
  const ceo =
    agents.find((a) => {
      const r = (a.role ?? "").toLowerCase();
      const n = (a.displayName ?? "").toLowerCase();
      return r.includes("chief executive") || r.includes("ceo") || n === "ceo";
    }) ?? agents.find((a) => !a.managerId && a.kind === "internal");
  const ceoId = ceo?.id;
  const deptData = departments.map((d) => {
    // CEO nicht zusätzlich in seiner Abteilung listen (steht schon oben an der Spitze).
    const inDept = agents.filter((a) => a.departmentId === d.id && a.id !== ceoId);
    const vp = inDept.find((a) => a.managerId === ceoId) ?? inDept[0];
    const reports = inDept.filter((a) => a !== vp);
    return { d, vp, reports };
  });

  function draw() {
    const wrap = wrapRef.current,
      em = emblemRef.current;
    if (!wrap || !em) return;
    const o = wrap.getBoundingClientRect();
    setDims({ w: wrap.scrollWidth, h: wrap.scrollHeight });
    const ec = em.getBoundingClientRect();
    const ex = ec.left - o.left + wrap.scrollLeft + ec.width / 2;
    const eb = ec.bottom - o.top + wrap.scrollTop;
    const busY = eb + 30;
    // Vom CEO-Emblem nach oben/unten: eine deutliche Leitung zum CEO + Verteiler-Bus.
    let g = `<path d="M ${ex} ${eb} L ${ex} ${busY}" stroke="url(#wg)" stroke-width="2.4" fill="none"/>`;
    let dots = `<circle cx="${ex}" cy="${busY}" r="3.4" fill="#bcd3ff"/>`;
    deptRefs.current.forEach((el) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left - o.left + wrap.scrollLeft + r.width / 2;
      const ty = r.top - o.top + wrap.scrollTop;
      // Volle Leuchtkraft — die Verdeckung „hinter der Karte" macht das deckende Karten-Panel.
      g += `<path d="M ${ex} ${busY} C ${cx} ${busY}, ${cx} ${busY}, ${cx} ${ty}" stroke="url(#wg)" stroke-width="2" fill="none"/>`;
      dots += `<circle cx="${cx}" cy="${ty}" r="3.2" fill="#9bbcff"/>`;
    });
    setSvg(
      `<defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb0ff" stop-opacity="1"/><stop offset="1" stop-color="#9b6bff" stop-opacity=".75"/></linearGradient><filter id="gl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#gl)">${g}${dots}</g>`,
    );
  }

  useLayoutEffect(() => {
    draw();
    const t = setTimeout(draw, 120);
    const on = () => draw();
    window.addEventListener("resize", on);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", on);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agents, departments]);

  return (
    <div className="orgwrap" ref={wrapRef}>
      <svg id="wires" width={dims.w} height={dims.h} dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="h2">Firmenstruktur</div>
      <div className="sub">Eine Company aus KI-Mitarbeitern — intern erstellt und extern eingebunden. Klick einen Agenten für die Personalakte.</div>
      <div className="ceorow" style={{ cursor: ceo ? "pointer" : "default" }} onClick={() => ceo && onSelect(ceo)}>
        <div className="emblem-wrap" ref={emblemRef} dangerouslySetInnerHTML={{ __html: EMBLEM }} />
        <div className="ceolab">
          <div className="role">CEO: {ceo?.displayName ?? "—"}</div>
          <div className="nm">{ceo?.displayName ?? "—"}</div>
          <div className="desc">{ceo?.systemPrompt ?? ceo?.role ?? "Chief Executive Agent"}</div>
        </div>
      </div>
      <div className="depts">
        {deptData.map((x, i) => (
          <div className="dept" key={x.d.id} ref={(el) => (deptRefs.current[i] = el)}>
            <div className="depttitle">{x.d.name.toUpperCase()}</div>
            {x.vp && (
              <div className="vp">
                <Node agent={x.vp} vp onSelect={onSelect} />
              </div>
            )}
            <div className="reports">
              {x.reports.map((a) => (
                <Node key={a.id} agent={a} onSelect={onSelect} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card2" style={{ marginTop: 18 }}>
        <div className="ct">Abteilungen verwalten <span className="ln" /></div>
        <div className="kv" style={{ marginBottom: 10 }}>
          <span className="k">Company</span>
          <span className="v">{companyName} <span className="mini-btn" style={{ marginLeft: 8 }} onClick={renameCompany}>umbenennen</span></span>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={newDept}
            placeholder="Neue Abteilung, z. B. LinkedIn"
            onChange={(e) => setNewDept(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDept()}
            style={{ flex: 1 }}
          />
          <button className="btn" disabled={busy} onClick={addDept}>+ Anlegen</button>
        </div>
        {departments.map((d) => (
          <div className="acc" key={d.id}>
            <span>{d.name} <span className="etime">· {d.key} · {agents.filter((a) => a.departmentId === d.id).length} Agenten</span></span>
            <span style={{ display: "flex", gap: 10 }}>
              <span className="mini-btn" onClick={() => renameDept(d)}>Umbenennen</span>
              <span className="mini-btn" onClick={() => removeDept(d)}>Löschen</span>
            </span>
          </div>
        ))}
        <div className="rl" style={{ marginTop: 8 }}>Beim Löschen bleiben zugewiesene Agenten erhalten (dann „ohne Abteilung"). Agenten fügst du über „+ Agent einstellen" hinzu und ordnest sie der Abteilung zu.</div>
      </div>
    </div>
  );
}
