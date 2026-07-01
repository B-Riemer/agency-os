import React, { useEffect, useState } from "react";
import { api, getLocalKey, setLocalKey, clearLocalKey, type Me, type UserRow } from "../lib/api";

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
  const [keyInfo, setKeyInfo] = useState<{ hasKey: boolean; hint: string | null } | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [onDevice, setOnDevice] = useState(!!getLocalKey());
  const [copied, setCopied] = useState(false);

  function copyKey() {
    if (!newKey) return;
    navigator.clipboard?.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

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
    await Promise.all([
      loadUsers(),
      api.systemInfo().then(setSys).catch(() => setSys(null)),
      api.apiKeyInfo().then(setKeyInfo).catch(() => setKeyInfo(null)),
    ]);
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

  async function generateKey() {
    if (busy) return;
    if (keyInfo?.hasKey && !window.confirm("Es existiert bereits ein API-Key. Neu erzeugen macht den alten ungültig. Fortfahren?")) return;
    setBusy(true);
    try {
      const { apiKey } = await api.issueApiKey();
      setNewKey(apiKey);
      await api.apiKeyInfo().then(setKeyInfo).catch(() => {});
      flash("Neuer API-Key erzeugt — jetzt kopieren, er wird nur einmal angezeigt.");
    } catch (e: any) {
      flash("Fehler: " + (e?.message ?? "unbekannt"));
    } finally {
      setBusy(false);
    }
  }
  async function revokeKey() {
    if (!window.confirm("API-Key serverseitig zurückziehen? Geräte mit diesem Key verlieren den Zugang.")) return;
    await api.revokeApiKey().catch(() => {});
    clearLocalKey();
    setOnDevice(false);
    setNewKey(null);
    await api.apiKeyInfo().then(setKeyInfo).catch(() => {});
    flash("API-Key zurückgezogen.");
  }
  function saveOnDevice() {
    if (!newKey) return;
    setLocalKey(newKey);
    setOnDevice(true);
    flash("API-Key auf diesem Gerät gespeichert.");
  }
  function removeFromDevice() {
    clearLocalKey();
    setOnDevice(false);
    flash("API-Key von diesem Gerät entfernt.");
  }

  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(companyName);
  async function saveCompanyName() {
    const name = nameDraft.trim();
    if (!name || name === companyName) {
      setRenaming(false);
      return;
    }
    await api.renameCompany(companyId, name);
    setRenaming(false);
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

      {/* 1b) Geräte-Zugang (API-Key) */}
      <div className="card2" style={{ marginTop: 18 }}>
        <div className="ct">Geräte-Zugang (API-Key) <span className="ln" /></div>
        <p className="rl" style={{ marginTop: 6 }}>
          Für die <b>Desktop-App</b> (wo SSO-Cookies im Fenster blockiert sind) oder Automatisierung: Key erzeugen,
          kopieren und im Anmelde-Fenster der Desktop-App einfügen.
        </p>
        <div className="kv"><span className="k">Status</span><span className="v">{keyInfo?.hasKey ? `aktiv (${keyInfo.hint})` : "kein Key"}</span></div>
        <div className="kv"><span className="k">Auf diesem Gerät</span><span className="v">{onDevice ? "ja" : "nein"}</span></div>
        {newKey && (
          <div style={{ margin: "10px 0" }}>
            <div className="rl" style={{ marginBottom: 4 }}>Neuer Key (nur jetzt sichtbar):</div>
            <input readOnly value={newKey} onFocus={(e) => e.currentTarget.select()} style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button className={"mini-btn" + (copied ? " copied" : "")} onClick={copyKey}>{copied ? "Kopiert ✓" : "Kopieren"}</button>
              <button className="mini-btn" onClick={saveOnDevice}>Auf diesem Gerät speichern</button>
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <button className="btn" disabled={busy} onClick={generateKey}>{keyInfo?.hasKey ? "Neuen Key erzeugen" : "API-Key erzeugen"}</button>
          {onDevice && <button className="mini-btn" onClick={removeFromDevice}>Von diesem Gerät entfernen</button>}
          {keyInfo?.hasKey && <button className="mini-btn" onClick={revokeKey}>Key zurückziehen</button>}
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
        <div className="kv">
          <span className="k">Company</span>
          <span className="v">
            {renaming ? (
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input
                  value={nameDraft}
                  autoFocus
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => (e.key === "Enter" ? saveCompanyName() : e.key === "Escape" ? setRenaming(false) : null)}
                  style={{ minWidth: 180 }}
                />
                <span className="mini-btn" onClick={saveCompanyName}>Speichern</span>
                <span className="mini-btn" onClick={() => { setRenaming(false); setNameDraft(companyName); }}>Abbrechen</span>
              </span>
            ) : (
              <>
                {companyName}{" "}
                <span className="mini-btn" style={{ marginLeft: 8 }} onClick={() => { setNameDraft(companyName); setRenaming(true); }}>umbenennen</span>
              </>
            )}
          </span>
        </div>
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
