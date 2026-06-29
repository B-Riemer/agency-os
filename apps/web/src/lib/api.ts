const BASE = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:3100/api";

async function j<T = any>(path: string, opts?: RequestInit): Promise<T> {
  // content-type nur bei vorhandenem Body setzen — sonst lehnt Fastify leere JSON-Bodies ab.
  const headers: Record<string, string> = {};
  if (opts?.body != null) headers["content-type"] = "application/json";
  const res = await fetch(BASE + path, {
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

export const api = {
  base: BASE,
  companies: () => j<Company[]>("/companies"),
  departments: (c: string) => j<Department[]>(`/companies/${c}/departments`),
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
