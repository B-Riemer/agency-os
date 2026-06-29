import React, { useEffect, useState } from "react";
import { api, type Agent, type Company, type Department } from "./lib/api";
import { OrgView } from "./views/OrgView";
import { PeopleView } from "./views/PeopleView";
import { AkteView } from "./views/AkteView";
import { GovernanceView } from "./views/GovernanceView";
import { SkillsView } from "./views/SkillsView";
import { OrchestrationView } from "./views/OrchestrationView";
import { OnboardWizard } from "./views/OnboardWizard";

type View = "org" | "people" | "skills" | "orch" | "gov" | "akte" | "onboard";

export function App() {
  const [company, setCompany] = useState<Company | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [view, setView] = useState<View>("org");
  const [selId, setSelId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [auth, setAuth] = useState<{ enabled: boolean; email: string | null }>({ enabled: false, email: null });

  async function refresh(cid?: string) {
    const id = cid ?? company?.id;
    if (!id) return;
    const [a, au] = await Promise.all([api.agents(id), api.audit(id).catch(() => [])]);
    setAgents(a);
    setAudit(au);
  }

  async function logout() {
    await api.logout().catch(() => {});
    window.location.reload();
  }

  async function boot() {
    try {
      const cfg = await api.authConfig().catch(() => ({ enabled: false }));
      const me = await api.me().catch(() => null);
      setAuth({ enabled: cfg.enabled, email: me && me.email !== "local@dev" ? me.email : null });
      const cs = await api.companies();
      if (!cs.length) {
        setErr("Keine Company gefunden — bitte Seed ausführen: pnpm --filter @agency-os/api seed");
        return;
      }
      const c = cs[0];
      setCompany(c);
      const d = await api.departments(c.id).catch(() => []);
      setDepartments(d);
      await refresh(c.id);
      setErr(null);
    } catch (e: any) {
      setErr("API nicht erreichbar — starte das Backend (siehe BOOTSTRAP.md). " + e.message);
    }
  }

  useEffect(() => {
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = agents.find((a) => a.id === selId) ?? null;
  const openAkte = (a: Agent) => {
    setSelId(a.id);
    setView("akte");
  };
  const navItem = (v: View, ic: string, label: string) => (
    <div className={"nav" + (view === v ? " on" : "")} onClick={() => setView(v)}>
      <span className="ic">{ic}</span> {label}
    </div>
  );

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <div className="logo" />
          <div>
            <b>AIgency OS</b>
            <small>Command Center</small>
          </div>
        </div>
        {navItem("org", "▣", "Org")}
        {navItem("people", "◷", "People")}
        {navItem("skills", "✦", "Skills")}
        {navItem("orch", "◆", "Orchestrierung")}
        {navItem("gov", "⚖", "Governance")}
        <div className="spacer" />
        <div className="nav"><span className="ic">⚙</span> Einstellungen</div>
      </aside>
      <div className="main">
        <div className="top">
          <div className="switch">
            <span className="k" /> {company?.name ?? "AIgency OS"} <span style={{ color: "var(--tx3)" }}>▾</span>
          </div>
          <div className="search"><span>⌕</span><input placeholder="Agenten suchen …" /></div>
          <div className="right">
            {auth.enabled &&
              (auth.email ? (
                <span style={{ color: "var(--tx2)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  {auth.email}
                  <a onClick={logout} style={{ cursor: "pointer", color: "var(--tx3)" }}>Logout</a>
                </span>
              ) : (
                <a className="hirebtn" href={api.loginUrl()}>Login</a>
              ))}
            <button className="hirebtn" onClick={() => setView("onboard")}>+ Agent einstellen</button>
          </div>
        </div>
        <div className="stage">
          {err && <div className="banner warn">{err}</div>}
          {company && view === "org" && <OrgView agents={agents} departments={departments} onSelect={openAkte} />}
          {company && view === "people" && <PeopleView agents={agents} onSelect={openAkte} />}
          {company && view === "skills" && <SkillsView companyId={company.id} />}
          {company && view === "orch" && <OrchestrationView companyId={company.id} />}
          {company && view === "gov" && <GovernanceView companyId={company.id} />}
          {company && view === "akte" && selected && (
            <AkteView companyId={company.id} agent={selected} audit={audit} onBack={() => setView("people")} onChanged={() => refresh()} />
          )}
          {company && view === "onboard" && (
            <OnboardWizard
              companyId={company.id}
              departments={departments}
              onClose={() => setView("org")}
              onCreated={(a) => refresh().then(() => openAkte(a))}
            />
          )}
          {!company && !err && <div className="banner">Lade …</div>}
        </div>
      </div>
    </div>
  );
}
