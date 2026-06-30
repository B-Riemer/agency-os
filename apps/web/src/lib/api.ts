const BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3100/api";

async function j<T = any>(path: string, opts?: RequestInit): Promise<T> {
  // content-type nur bei vorhandenem Body setzen — sonst lehnt Fastify leere JSON-Bodies ab.
  const headers: Record<string, string> = {};
  if (opts?.body != null) headers["content-type"] = "application/json";
  const res = await fetch(BASE + path, {
    credentials: "include", // Session-Cookie cross-origin mitsenden
    ...opts,
    headers: { ...headers, ...((opts?.headers as Record<string, string>) ?? {}) },
  });
  if (!res.ok) throw new Error((await res.text().catch(() => res.statusText)) || res.statusText);
  return res.status === 204 ? (null as T) : ((await res.json()) as T);
}

export type Agent = {
  id: string;
  companyId: string;
  displayName: string;
  role?: string | null;
  departmentId?: string | null;
  managerId?: string | null;
  kind: "internal" | "external";
  adapterType: string;
  adapterConfig?: Record<string, unknown>;
  modelConfig?: Record<string, unknown> | null;
  status: "onboarding" | "active" | "paused" | "terminated";
  systemPrompt?: string | null;
  budgetMonthlyCents?: number | null;
  spentMonthlyCents?: number | null;
  sovereignty?: "eu_only" | "eu_plus" | "global" | "global_pii";
  budgetFallback?: boolean;
};
export type Company = { id: string; name: string; slug: string };
export type Department = { id: string; name: string; key: string };

export type Me = { id: string; email: string; roleKeys: string[] } | null;
export type UserRow = { id: string; email: string; displayName: string | null; roleKeys: string[] };

export const api = {
  base: BASE,
  // Auth / OIDC
  authConfig: () => j<{ enabled: boolean }>("/auth/config"),
  me: () => j<Me>("/auth/me"),
  logout: () => j("/auth/logout", { method: "POST" }),
  loginUrl: () => BASE + "/auth/login",
  companies: () => j<Company[]>("/companies"),
  departments: (c: string) => j<Department[]>(`/companies/${c}/departments`),
  createDepartment: (c: string, name: string, key?: string, description?: string) =>
    j<Department>(`/companies/${c}/departments`, { method: "POST", body: JSON.stringify({ name, key, description }) }),
  updateDepartment: (c: string, depId: string, patch: { name?: string; key?: string; description?: string }) =>
    j<Department>(`/companies/${c}/departments/${depId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteDepartment: (c: string, depId: string) =>
    j(`/companies/${c}/departments/${depId}`, { method: "DELETE" }),
  renameCompany: (c: string, name: string) =>
    j<Company>(`/companies/${c}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  // Settings — Portabilität, Nutzer/Rollen, System
  exportCompany: (c: string) => j<any>(`/companies/${c}/export`),
  importCompany: (manifest: any, replaceAgents?: boolean) =>
    j<{ companyId: string; company: string; departments: number; agents: number; replaced: boolean }>(
      "/companies/import",
      { method: "POST", body: JSON.stringify({ manifest, replaceAgents }) },
    ),
  users: () => j<UserRow[]>("/users"),
  companyRoles: (c: string) => j<{ id: string; key: string; name: string }[]>(`/companies/${c}/roles`),
  grantRole: (userId: string, roleKey: string) =>
    j(`/users/${userId}/roles`, { method: "POST", body: JSON.stringify({ roleKey }) }),
  revokeRole: (userId: string, roleKey: string) =>
    j(`/users/${userId}/roles/${roleKey}`, { method: "DELETE" }),
  systemInfo: () =>
    j<{ version: string; authMode: string; schedulerEnabled: boolean; oidcEnabled: boolean; oidcIssuer: string | null; cookieSecure: boolean }>(
      "/system/info",
    ),
  agents: (c: string) => j<Agent[]>(`/companies/${c}/agents`),
  agent: (c: string, id: string) => j<Agent>(`/companies/${c}/agents/${id}`),
  createAgent: (c: string, body: Record<string, unknown>) =>
    j<Agent>(`/companies/${c}/agents`, { method: "POST", body: JSON.stringify(body) }),
  setStatus: (c: string, id: string, status: Agent["status"]) =>
    j<Agent>(`/companies/${c}/agents/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  setSovereignty: (c: string, id: string, level: string) =>
    j<Agent>(`/companies/${c}/agents/${id}/sovereignty`, { method: "PATCH", body: JSON.stringify({ level }) }),
  setBudgetFallback: (c: string, id: string, enabled: boolean) =>
    j<Agent>(`/companies/${c}/agents/${id}/budget-fallback`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  rotateToken: (c: string, id: string) =>
    j<{ token: string; hint: string }>(`/companies/${c}/agents/${id}/rotate-token`, { method: "POST" }),
  versions: (c: string, id: string) => j<any[]>(`/companies/${c}/agents/${id}/versions`),
  snapshot: (c: string, id: string, note?: string) =>
    j(`/companies/${c}/agents/${id}/versions`, { method: "POST", body: JSON.stringify({ note }) }),
  promote: (c: string, id: string, vid: string) =>
    j(`/companies/${c}/agents/${id}/versions/${vid}/promote`, { method: "POST" }),
  agentSkills: (id: string) => j<any[]>(`/agents/${id}/skills`),
  setSkill: (id: string, skillId: string, enabled: boolean) =>
    j(`/agents/${id}/skills/${skillId}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  agentToggles: (id: string) => j<any[]>(`/agents/${id}/toggles`),
  setToggle: (id: string, targetType: string, targetId: string, enabled: boolean) =>
    j(`/agents/${id}/toggles`, { method: "PATCH", body: JSON.stringify({ targetType, targetId, enabled }) }),
  agentKnowledge: (id: string) => j<any[]>(`/agents/${id}/knowledge`),
  setKnowledge: (id: string, folderId: string, enabled: boolean) =>
    j(`/agents/${id}/knowledge/${folderId}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  agentSecrets: (id: string) => j<{ envKey: string; secretId: string; name: string }[]>(`/agents/${id}/secrets`),
  createSecret: (c: string, name: string, value: string) =>
    j<{ id: string; name: string }>(`/companies/${c}/secrets`, { method: "POST", body: JSON.stringify({ name, value }) }),
  bindSecret: (secretId: string, agentId: string, envKey: string) =>
    j(`/secrets/${secretId}/bind`, { method: "POST", body: JSON.stringify({ agentId, envKey }) }),
  test: (id: string) => j(`/agents/${id}/test`, { method: "POST" }),
  run: (id: string, task: string) =>
    j(`/agents/${id}/run`, { method: "POST", body: JSON.stringify({ task }) }),
  adapters: () => j<{ types: string[] }>("/adapters"),
  testConfig: (type: string, config: Record<string, unknown>) =>
    j<{ ok: boolean; detail?: string }>("/adapters/test", { method: "POST", body: JSON.stringify({ type, config }) }),
  skills: (c: string) => j<any[]>(`/companies/${c}/skills`),
  budgets: (c: string) => j<any[]>(`/companies/${c}/governance/budgets`),
  alerts: (c: string) => j<any[]>(`/companies/${c}/governance/alerts`),
  heartbeats: (c: string) => j<any[]>(`/companies/${c}/governance/heartbeats`),
  insights: (c: string) => j<any>(`/companies/${c}/governance/insights`),
  approvals: (c: string) => j<any[]>(`/companies/${c}/governance/approvals`),
  audit: (c: string) => j<any[]>(`/companies/${c}/governance/audit`),
  decide: (id: string, status: "approved" | "rejected") =>
    j(`/approvals/${id}/decide`, { method: "POST", body: JSON.stringify({ status }) }),
  tasks: (c: string) => j<any[]>(`/companies/${c}/tasks`),
  createTask: (c: string, dto: Record<string, unknown>) =>
    j(`/companies/${c}/tasks`, { method: "POST", body: JSON.stringify(dto) }),
  setTaskStatus: (id: string, status: string) =>
    j(`/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  runTask: (id: string) => j(`/tasks/${id}/run`, { method: "POST" }),
  routines: (c: string) => j<any[]>(`/companies/${c}/routines`),
  setRoutineEnabled: (id: string, enabled: boolean) =>
    j(`/routines/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  tickRoutines: (c: string) => j(`/companies/${c}/routines/tick`, { method: "POST" }),
};
