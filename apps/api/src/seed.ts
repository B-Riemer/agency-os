// Seed: Demo-Company „AIgency" mit voller Mannschaft (wie der Prototyp), idempotent.
// Externe Agenten (RHEA, MORPHEUS, SIRIUS) hängen am HTTP-Adapter → Aigency-Engine /wake.
// Ausführen: pnpm --filter @agency-os/api seed
import {
  createDb,
  companies,
  departments,
  skills,
  agents,
  agentSkills,
  agentToggles,
  approvals,
  knowledgeFolders,
  agentKnowledgeFolders,
  agentVersions,
  tasks,
  routines,
  secrets,
  secretVersions,
  secretBindings,
  users,
  roles,
  userRoles,
} from "@agency-os/db";
import { encryptSecret } from "./secrets/crypto.js";

const WAKE = { url: "http://localhost:8900/wake", taskField: "task", timeoutMs: 300000 };

async function main() {
  const db = createDb();

  // Idempotent: alte Company(s) + globale Users löschen (Cascade entfernt Abhängiges).
  await db.delete(companies);
  await db.delete(users);

  const [company] = await db.insert(companies).values({ name: "AIgency", slug: "aigency" }).returning();
  const cid = company.id;

  const mkDept = async (name: string, key: string) =>
    (await db.insert(departments).values({ companyId: cid, name, key }).returning())[0];
  const str = await mkDept("Strategy", "STR");
  const con = await mkDept("Content", "CON");
  const eng = await mkDept("Engineering", "ENG");
  const sal = await mkDept("Sales", "SAL");

  const mk = async (vals: Record<string, unknown>) =>
    (await db.insert(agents).values({ companyId: cid, status: "active", kind: "internal", adapterType: "internal", ...vals }).returning())[0];

  const ext = (url = WAKE) => ({ kind: "external" as const, adapterType: "http", adapterConfig: url, budgetMonthlyCents: 2000 });

  // CEO
  const ceo = await mk({ displayName: "ASTRA", role: "CEO", systemPrompt: "Artificial Strategic Thinker & Realignment Agent" });

  // Strategy
  const orion = await mk({ displayName: "ORION", role: "VP of Strategy", departmentId: str.id, managerId: ceo.id, budgetMonthlyCents: 8000 });
  await mk({ displayName: "VEGA", role: "Lead Analyst", departmentId: str.id, managerId: orion.id, budgetMonthlyCents: 1500 });
  await mk({ displayName: "SOL", role: "Scenario Planner", departmentId: str.id, managerId: orion.id, budgetMonthlyCents: 1500 });
  await mk({ displayName: "LUNA", role: "Market Researcher", departmentId: str.id, managerId: orion.id, budgetMonthlyCents: 1500 });
  // Echter externer Agent: Natascha (status_app auf :8900, /wake).
  const natascha = await mk({ displayName: "Natascha", role: "Chief of Staff (extern)", departmentId: str.id, managerId: orion.id, systemPrompt: "Persönliche Assistentin & Chief of Staff der Agentur", ...ext(), spentMonthlyCents: 600, sovereignty: "eu_only", budgetFallback: true });

  // Content
  const nova = await mk({ displayName: "NOVA", role: "VP of Content", departmentId: con.id, managerId: ceo.id, budgetMonthlyCents: 8000, spentMonthlyCents: 6800 });
  await mk({ displayName: "ATLAS", role: "Creative Director", departmentId: con.id, managerId: nova.id, budgetMonthlyCents: 1500 });
  await mk({ displayName: "RHEA", role: "Lead Writer (extern)", departmentId: con.id, managerId: nova.id, ...ext() });
  await mk({ displayName: "KAI", role: "Social Media Mgr", departmentId: con.id, managerId: nova.id, budgetMonthlyCents: 1500 });

  // Engineering
  const cypher = await mk({ displayName: "CYPHER", role: "CTO", departmentId: eng.id, managerId: ceo.id, budgetMonthlyCents: 8000, spentMonthlyCents: 5200 });
  await mk({ displayName: "NEO", role: "Lead Architect", departmentId: eng.id, managerId: cypher.id, budgetMonthlyCents: 1500 });
  const morpheus = await mk({ displayName: "MORPHEUS", role: "DevOps Lead (extern)", departmentId: eng.id, managerId: cypher.id, ...ext(), spentMonthlyCents: 1700, sovereignty: "global" });
  await mk({ displayName: "TRINITY", role: "ML Engineer", departmentId: eng.id, managerId: cypher.id, budgetMonthlyCents: 1500 });
  // Process-/CLI-Demo: lokaler Agent ohne externes Setup. `echo` gibt die Aufgabe als Ergebnis zurück.
  const echoAgent = await mk({ displayName: "ECHO", role: "Local Script (Process-Demo)", departmentId: eng.id, managerId: cypher.id, kind: "external", adapterType: "process", adapterConfig: { command: "echo", taskMode: "arg" }, budgetMonthlyCents: 500 });

  // Sales
  const mercury = await mk({ displayName: "MERCURY", role: "VP of Sales", departmentId: sal.id, managerId: ceo.id, budgetMonthlyCents: 8000 });
  await mk({ displayName: "JUNO", role: "Account Executive", departmentId: sal.id, managerId: mercury.id, budgetMonthlyCents: 1500 });
  await mk({ displayName: "SIRIUS", role: "External Partner (extern)", departmentId: sal.id, managerId: mercury.id, ...ext() });
  await mk({ displayName: "MARS", role: "Sales Development Rep", departmentId: sal.id, managerId: mercury.id, status: "paused", budgetMonthlyCents: 1500, spentMonthlyCents: 1500 });

  // Skills-Katalog
  const [seo] = await db.insert(skills).values({ companyId: cid, key: "seo-audit", slug: "seo-audit", name: "SEO-Audit", defaultPolicy: "auto", version: "3.1.0", trustLevel: "bundled", sourceType: "catalog" }).returning();
  const [build] = await db.insert(skills).values({ companyId: cid, key: "build-tickets", slug: "build-tickets", name: "Bau-Tickets", defaultPolicy: "approval_required", version: "1.5.0", trustLevel: "bundled", sourceType: "catalog", inputSchema: { type: "object", properties: { title: { type: "string" } }, required: ["title"] } }).returning();

  // Akte des externen Agenten MORPHEUS: Skill + Toggles (für den USP-Lauf)
  await db.insert(agentSkills).values({ agentId: morpheus.id, skillId: seo.id, enabled: true });
  await db.insert(agentToggles).values([
    { agentId: morpheus.id, targetType: "tool", targetId: "live_url_fetch", enabled: true },
    { agentId: morpheus.id, targetType: "tool", targetId: "page_speed_audit", enabled: true },
    { agentId: morpheus.id, targetType: "tool", targetId: "headless_chromium", enabled: false },
  ]);
  await db.insert(agentSkills).values({ agentId: natascha.id, skillId: seo.id, enabled: true });
  await db.insert(agentToggles).values([
    { agentId: natascha.id, targetType: "tool", targetId: "live_url_fetch", enabled: true },
    { agentId: natascha.id, targetType: "integration", targetId: "vault_rag", enabled: true },
    { agentId: natascha.id, targetType: "tool", targetId: "speak", enabled: false },
  ]);
  await db.insert(approvals).values({ companyId: cid, type: "skill_approval", status: "pending", subjectType: "skill", subjectId: build.id, requestedBy: cypher.id, reason: "Bau-Tickets für CYPHER freigeben" });

  // Wissensordner + Permission-Mirroring (wer sieht was)
  const [fVault] = await db.insert(knowledgeFolders).values({ companyId: cid, name: "Vault (Firmen-Gedächtnis)", sensitivity: "internal" }).returning();
  const [fPublic] = await db.insert(knowledgeFolders).values({ companyId: cid, name: "Public Docs", sensitivity: "public" }).returning();
  const [fKunden] = await db.insert(knowledgeFolders).values({ companyId: cid, name: "Kunden-Daten", sensitivity: "confidential" }).returning();
  const [fHR] = await db.insert(knowledgeFolders).values({ companyId: cid, name: "HR-vertraulich", sensitivity: "confidential" }).returning();
  await db.insert(agentKnowledgeFolders).values([
    { agentId: natascha.id, folderId: fVault.id, enabled: true },
    { agentId: natascha.id, folderId: fPublic.id, enabled: true },
    { agentId: natascha.id, folderId: fHR.id, enabled: false },
    { agentId: morpheus.id, folderId: fPublic.id, enabled: true },
    { agentId: morpheus.id, folderId: fKunden.id, enabled: false },
    { agentId: cypher.id, folderId: fVault.id, enabled: true },
    { agentId: cypher.id, folderId: fKunden.id, enabled: true },
  ]);

  // Basis-Versionen (damit Promote/Rollback etwas zeigt)
  await db.insert(agentVersions).values([
    { agentId: natascha.id, version: 1, snapshot: { role: "Assistentin", budgetMonthlyCents: 1500 }, note: "Initiale Akte" },
    { agentId: morpheus.id, version: 1, snapshot: { role: "DevOps (extern)", budgetMonthlyCents: 2000 }, note: "Initiale Akte" },
  ]);

  // Orchestrierung: Tickets + Routine
  await db.insert(tasks).values([
    { companyId: cid, title: "SEO-Audit b-riemer.dev", description: "Vollständiger Audit der Startseite", status: "backlog", priority: 1, assigneeId: morpheus.id, createdBy: "user" },
    { companyId: cid, title: "LinkedIn-Post Q3-Strategie", status: "in_progress", priority: 2, assigneeId: nova.id, createdBy: "user" },
    { companyId: cid, title: "Wettbewerbsanalyse: 3 Tools", status: "review", priority: 2, assigneeId: orion.id, createdBy: "user" },
    { companyId: cid, title: "Quartals-Briefing erstellen", status: "done", priority: 3, assigneeId: natascha.id, createdBy: "routine" },
  ]);
  await db.insert(routines).values({ companyId: cid, name: "Tägliches SEO-Monitoring", cron: "0 8 * * *", agentId: morpheus.id, taskTitleTemplate: "SEO-Check {{date}}", enabled: true });

  // Secrets (AES-verschlüsselt) + Sidecar-Bindung an Natascha
  const [sec] = await db.insert(secrets).values({ companyId: cid, name: "OpenAI API Key" }).returning();
  await db.insert(secretVersions).values({ secretId: sec.id, version: 1, ciphertext: encryptSecret("sk-demo-not-a-real-key") });
  await db.insert(secretBindings).values({ secretId: sec.id, targetType: "agent", targetId: natascha.id, envKey: "OPENAI_API_KEY" });

  // RBAC: Rollen + Owner-User (API-Key für maschinelle Auth; Web läuft dev-offen)
  const [boardRole] = await db.insert(roles).values({ companyId: cid, key: "board", name: "Board" }).returning();
  await db.insert(roles).values([
    { companyId: cid, key: "admin", name: "Admin" },
    { companyId: cid, key: "member", name: "Member" },
  ]);
  const [owner] = await db.insert(users).values({ email: "ai@b-riemer.dev", displayName: "B. Riemer", apiKey: "agos-owner-demo-key" }).returning();
  await db.insert(userRoles).values({ userId: owner.id, roleId: boardRole.id, companyId: cid });

  // eslint-disable-next-line no-console
  console.log(`Seed fertig. Company-ID: ${cid}\nExterne Agenten — MORPHEUS: ${morpheus.id}\nNatascha (echt, :8900/wake): ${natascha.id}\nECHO (process-Demo, sofort lauffähig): ${echoAgent.id}`);
  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
