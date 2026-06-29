import React from "react";
import type { Agent } from "./api";

function hue(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

// Motiv je Rolle (Platzhalter — finales Set via Stitch, D8).
export function iconFor(a: Pick<Agent, "role" | "kind">): string {
  if (a.kind === "external") return "server-bolt";
  const r = (a.role ?? "").toLowerCase();
  if (r.includes("ceo")) return "brain";
  if (r.includes("cto") || r.includes("eng") || r.includes("architect")) return "cpu";
  if (r.includes("content") || r.includes("writer") || r.includes("creative")) return "feather";
  if (r.includes("sales") || r.includes("account")) return "trending-up";
  if (r.includes("seo")) return "server-bolt";
  if (r.includes("research") || r.includes("analyst")) return "zoom-scan";
  return "sparkles";
}

export function Avatar({ agent, size = 42 }: { agent: Agent; size?: number }) {
  const ext = agent.kind === "external";
  const h = ext ? 28 : hue(agent.displayName || "x");
  const rt = ext ? "#ffb877" : `hsl(${h},96%,75%)`;
  const rb = ext ? "#ff8a3d" : `hsl(${(h + 40) % 360},90%,62%)`;
  const gl = ext ? "rgba(255,150,70,.9)" : `hsla(${h},95%,62%,.85)`;
  const ic = ext ? "#ffd0a8" : `hsl(${h},92%,82%)`;
  const dot = Math.max(9, Math.round(size * 0.21));
  const st = agent.status === "active" ? "active" : agent.status === "paused" ? "paused" : "onb";
  const photo = (agent.adapterConfig as any)?.photo as string | undefined;
  return (
    <span className="ava" style={{ width: size, height: size, ["--rt" as any]: rt, ["--rb" as any]: rb, ["--g" as any]: gl }}>
      <span className="halo" />
      <span className="face">
        {photo ? (
          <img src={photo} alt="" />
        ) : (
          <i className={`ti ti-${iconFor(agent)}`} style={{ color: ic, fontSize: Math.round(size * 0.46), textShadow: `0 0 14px ${gl}` }} />
        )}
      </span>
      <span className={`sd ${st}`} style={{ width: dot, height: dot }} />
    </span>
  );
}

export const euro = (cents?: number | null) => `${((cents ?? 0) / 100).toFixed(2)}€`;
export const statusText = (s: string) =>
  s === "active" ? "Aktiv" : s === "paused" ? "Pausiert" : s === "onboarding" ? "Im Onboarding" : "Beendet";
