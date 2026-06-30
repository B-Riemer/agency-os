import React, { useEffect, useState } from "react";
import { api, type Me, type UserRow } from "../lib/api";

const ROLE_KEYS = ["board", "admin", "member"] as const;

export function SettingsView({
  companyId,
  companyName,
  companySlug,
  onChanged,
}: {
  companyId: string;
  companyName: string;
  companySlug: string;
  onChanged: () => void;
}) {
  const [me, setMe] = useState<Me>(null);
  const [authEnabled, setAuthEnabled] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sys, setSys] = useState<any | null>(null);
  const [usersError, setUsersError] = useState(false);
  const [importText, setImportText] = useState("");
  const [importReplace, setImportReplace] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isBoard = !authEnabled || (me?.roleKeys ?? []).some((r) => r === "board" || r === "admin");

  async function loadUsers() {
    try {
      setUsers(await api.users());
      setUsersError(false);
    } catch {
      setUsersError(true);
    }
  }

  async function load() {
    const [cfg, who] = await Promise.all([
      api.authConfig().catch(() => ({ enabled: false })),
      api.me().catch(() => null),
    ]);
    setAuthEnabled(cfg.enabled);
    setMe(who);
    await Promise.all([loadUsers(), api.systemInfo().then(setSys).catch(() => setSys(null))]);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  function flash(t: string) {
    setMsg(t);
    setTimeout(() => setMsg(null), 4000);
  }

  async function toggleRole(u: UserRow, roleKey: string) {
    if (busy) return;
    setBusy(true);
    try {
      if (u.roleKeys.includes(roleKey)) await api.revokeRole(u.id, roleKey);
      else await api.grantRole(u.id, roleKey);
      await loadUsers();
    } catch (e: any) {
      flash("Fehler: " + (e?.message ?? "unbekannt"));
    } finally {
      setBusy(false);
    }
  }

  async function renameCompany() {
    const name = window.prompt("Name der Company:", companyName);
    if (!name || name === companyName) return;
    await api.renameCompany(companyId, name);
    onChanged();
    flash("Company umbenannt.");
  }

  async function doExport() {
    try {
      const data = await api.exportCompany(companyId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${companySlug || "company"}.import.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      flash("Export fehlgeschlagen: " + (e?.message ?? "nur für board/admin"));
    }
  }

  async function doImport() {
    if (busy) return;
    let manifest: any;
    try {
      manifest = JSON.parse(importText);
    } catch {
      flash("Kein gültiges JSON.");
      return;
    }
    if (!window.confirm(importReplace ? "Import MIT Ersetzen ausführen? Bestehende Agenten/Abteilungen dieser Company werden ersetzt." : "Import ausführen (zusammenführen)?")) return;
    setBusy(true);
    try {
      const res = await api.importCompany(manifest, importReplace);
      setImportText("");
      onChanged();
      flash(`Import: ${res.company} — ${res.departments} Abteilungen, ${res.agents} Agenten.`);
    } catch (e: any) {
      flash("Import fehlgeschlagen: " + (e?.message ?? "nur für board/admin"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="orgwrap">
      <div className="h2">Einstellungen</div>
      <div className="sub">Konto, Nutzer &amp; Rollen, Company-Portabilität und System-Status.</div>
      {msg && <div className="banner">{msg}</div>}

      {/* 1) Konto & Login */}
      <div className="card2" style={{ marginTop: 14 }}>
        <div className="ct">Konto &amp; Login <span className="ln" /></div>
        <div className="kv"><span className="k">Angemeldet als</span><span className="v">{me?.email ?? "—"}</span></div>
        <div className="kv"><span className="k">Rollen</span><span className="v">{(me?.roleKeys ?? []).join(", ") || "—"}</span></div>
        <div className="kv"><span className="k">SSO (OIDC)</span><span className="v">{authEnabled ? "aktiv" : "aus (dev-offen)"}</span></div>
        <div style={{ marginTop: 10 }}>
          {authEnabled &&
            (me && me.email !== "local@dev" ? (
              <a className="mini-btn" onClick={() => api.logout().then(() => window.location.reload())} style={{ cursor: "pointer" }}>Logout</a>
            ) : (
              <a className="btn" href={api.loginUrl()}>Login</a>
            ))}
        </div>
      </div>

      {/* 2) Nutzer & Rollen */}
      <div className="card2" style={{ marginTop: 18 }}>
        <div className="ct">Nutzer &amp; Rollen <span className="ln" /></div>
        {!isBoard ? (
          <div className="rl">Nur für <b>board</b>/<b>admin</b> sichtbar. Bitte einen Admin um die Rolle bitten.</div>
        ) : usersError ? (
          <div className="rl">Konnte Nutzer nicht laden (fehlende Berechtigung?).</div>
        ) : (
          <>
            {users.map((u) => (
              <div className="acc" key={u.id}>
                <span>{u.email} <span className="etime">· {u.displayName ?? ""} · [{u.roleKeys.join(", ") || "—"}]</span></span>
                <span style={{ display: "flex", gap: 8 }}>
                  {ROLE_KEYS.map((rk) => (
                    <span
                      key={rk}
                      className="mini-btn"
                      onClick={() => toggleRole(u, rk)}
                      style={{ opacity: u.roleKeys.includes(rk) ? 1 : 0.45 }}
                      title={u.roleKeys.includes(rk) ? `${rk} entziehen` : `${rk} vergeben`}
                    >
                      {u.roleKeys.includes(rk) ? "✓ " : "+ "}{rk}
                    </span>
                  ))}
                </span>
              </div>
            ))}
            <div className="rl" style={{ marginTop: 8 }}>Klick eine Rolle zum Vergeben/Entziehen. <b>board</b> = volle Verwaltung, <b>member</b> = nur ansehen.</div>
          </>
        )}
      </div>

      {/* 3) Company & Portabilität */}
      <div className="card2" style={{ marginTop: 18 }}>
        <div className="ct">Company &amp; Portabilität <span className="ln" /></div>
        <div className="kv"><span className="k">Company</span><span className="v">{companyName} <span className="mini-btn" style={{ marginLeft: 8 }} onClick={renameCompany}>umbenennen</span></span></div>
        <div style={{ marginTop: 10, marginBottom: 12 }}>
          <button className="btn" onClick={doExport}>⤓ Export (Manifest-JSON)</button>
        </div>
        <div className="rl" style={{ marginBottom: 6 }}>Import: Manifest-JSON einfügen (Company · Abteilungen · Agenten).</div>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder='{ "company": { "name": "…", "slug": "…" }, "departments": [...], "agents": [...] }'
          style={{ width: "100%", minHeight: 120, fontFamily: "monospace", fontSize: 12 }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={importReplace} onChange={(e) => setImportReplace(e.target.checked)} />
            Bestehende Agenten/Abteilungen ersetzen
          </label>
          <button className="btn" disabled={busy || !importText.trim()} onClick={doImport}>Importieren</button>
        </div>
      </div>

      {/* 4) System & Sicherheit */}
      <div className="card2" style={{ marginTop: 18 }}>
        <div className="ct">System &amp; Sicherheit <span className="ln" /></div>
        {sys ? (
          <>
            <div className="kv"><span className="k">Version</span><span className="v">{sys.version}</span></div>
            <div className="kv"><span className="k">Auth-Modus</span><span className="v">{sys.authMode}{sys.authMode === "strict" ? " (verriegelt)" : ""}</span></div>
            <div className="kv"><span className="k">SSO / OIDC</span><span className="v">{sys.oidcEnabled ? "aktiv" : "aus"}{sys.oidcIssuer ? ` · ${sys.oidcIssuer}` : ""}</span></div>
            <div className="kv"><span className="k">Scheduler</span><span className="v">{sys.schedulerEnabled ? "an" : "aus"}</span></div>
            <div className="kv"><span className="k">Cookie Secure</span><span className="v">{sys.cookieSecure ? "ja" : "nein"}</span></div>
          </>
        ) : (
          <div className="rl">System-Status nur für <b>board</b>/<b>admin</b>.</div>
        )}
      </div>
    </div>
  );
}
