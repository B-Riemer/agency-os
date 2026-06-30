import React, { useState } from "react";
import { api, setLocalKey } from "../lib/api";

// Anmelde-Gate, wenn Auth aktiv ist und keine gültige Session/Key vorliegt.
// SSO funktioniert im Browser; in der Desktop-App (Webview blockiert OIDC-Cookies)
// nutzt man den API-Key (im Browser unter Einstellungen → Geräte-Zugang erzeugt).
export function LoginGate() {
  const [key, setKey] = useState("");
  function connect() {
    if (!key.trim()) return;
    setLocalKey(key);
    window.location.reload();
  }
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 }}>
      <div className="card2" style={{ maxWidth: 460, width: "100%" }}>
        <div className="ct">Anmelden <span className="ln" /></div>
        <p className="rl" style={{ marginTop: 6 }}>
          AIgency OS ist abgesichert. Melde dich per SSO an — oder hinterlege auf diesem Gerät einen API-Key
          (z. B. für die Desktop-App).
        </p>
        <div style={{ margin: "14px 0" }}>
          <a className="btn" href={api.loginUrl()}>Login per SSO (Browser)</a>
        </div>
        <div className="rl" style={{ marginBottom: 6 }}>
          Oder API-Key (im Browser unter <b>Einstellungen → Geräte-Zugang</b> erzeugen):
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="agos_…"
            style={{ flex: 1, fontFamily: "monospace" }}
            onKeyDown={(e) => e.key === "Enter" && connect()}
          />
          <button className="btn" disabled={!key.trim()} onClick={connect}>
            Verbinden
          </button>
        </div>
      </div>
    </div>
  );
}
