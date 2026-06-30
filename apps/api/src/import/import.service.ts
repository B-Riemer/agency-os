import { Inject, Injectable, Logger } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { type Db, companies, departments, agents, tasks, routines } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";

// Generischer Company-Import — die produkt-seitige Umsetzung des USP „bring your own agents":
// Nutzer pflegen ganze Strukturen (Company + Abteilungen + Agenten) per Manifest ein, nicht nur
// Einzel-Agenten über den Wizard. Idempotent (upsert per slug/key/displayName), nicht-destruktiv;
// `replaceAgents` ersetzt nur Agenten/Abteilungen EINER Company (lässt User/Rollen/Skills unberührt).

export type AgentKind = "internal" | "external";
export type AgentStatus = "onboarding" | "active" | "paused" | "terminated";
export type Sovereignty = "eu_only" | "eu_plus" | "global" | "global_pii";

export interface ImportAgent {
  displayName: string;
  role?: string;
  department?: string; // Abteilungs-key (referenziert departments[].key)
  manager?: string; // displayName des Vorgesetzten (wird im 2. Pass aufgelöst)
  kind?: AgentKind;
  adapterType?: string;
  adapterConfig?: Record<string, unknown>;
  systemPrompt?: string;
  modelConfig?: Record<string, unknown>;
  status?: AgentStatus;
  budgetMonthlyCents?: number | null;
  sovereignty?: Sovereignty;
}

export interface ImportDepartment {
  key: string;
  name: string;
  description?: string;
}

export interface ImportManifest {
  company: { name: string; slug: string };
  departments?: ImportDepartment[];
  agents?: ImportAgent[];
}

export interface ImportResult {
  companyId: string;
  company: string;
  departments: number;
  agents: number;
  replaced: boolean;
}

function deriveKey(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12) || "DEPT";
}

@Injectable()
export class ImportService {
  private readonly log = new Logger("Import");
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async importCompany(
    manifest: ImportManifest,
    opts: { replaceAgents?: boolean } = {},
  ): Promise<ImportResult> {
    if (!manifest?.company?.slug || !manifest.company?.name) {
      throw new Error("Manifest braucht company.name und company.slug");
    }

    // 1) Company find-or-create (per slug)
    let [company] = await this.db
      .select()
      .from(companies)
      .where(eq(companies.slug, manifest.company.slug));
    if (!company) {
      [company] = await this.db
        .insert(companies)
        .values({ name: manifest.company.name, slug: manifest.company.slug })
        .returning();
    } else if (company.name !== manifest.company.name) {
      [company] = await this.db
        .update(companies)
        .set({ name: manifest.company.name, updatedAt: new Date() })
        .where(eq(companies.id, company.id))
        .returning();
    }
    const cid = company.id;

    // 2) replace: nur Agenten/Abteilungen DIESER Company + verwaiste Tickets/Routinen entfernen.
    //    Agenten-Kinder (Skills/Toggles/Versionen/Wissen) hängen per ON DELETE CASCADE,
    //    Tickets/Routinen/Cost-Events per SET NULL — daher FK-sicher.
    if (opts.replaceAgents) {
      await this.db.delete(tasks).where(eq(tasks.companyId, cid));
      await this.db.delete(routines).where(eq(routines.companyId, cid));
      await this.db.delete(agents).where(eq(agents.companyId, cid));
      await this.db.delete(departments).where(eq(departments.companyId, cid));
    }

    // 3) Abteilungen upsert (per key)
    const deptByKey = new Map<string, string>();
    for (const d of manifest.departments ?? []) {
      const key = deriveKey(d.key || d.name);
      let [existing] = await this.db
        .select()
        .from(departments)
        .where(and(eq(departments.companyId, cid), eq(departments.key, key)));
      if (!existing) {
        [existing] = await this.db
          .insert(departments)
          .values({ companyId: cid, name: d.name, key, description: d.description ?? null })
          .returning();
      } else {
        [existing] = await this.db
          .update(departments)
          .set({ name: d.name, description: d.description ?? existing.description, updatedAt: new Date() })
          .where(eq(departments.id, existing.id))
          .returning();
      }
      deptByKey.set(key, existing.id);
      deptByKey.set(d.key, existing.id); // auch Original-Schreibweise des keys
    }

    // 4) Agenten upsert (per displayName) — Manager erst im 2. Pass (Selbst-/Vorwärtsreferenzen)
    const idByName = new Map<string, string>();
    for (const a of manifest.agents ?? []) {
      const departmentId = a.department
        ? deptByKey.get(a.department) ?? deptByKey.get(deriveKey(a.department)) ?? null
        : null;
      const kind: AgentKind = a.kind ?? "internal";
      const values = {
        companyId: cid,
        displayName: a.displayName,
        role: a.role ?? null,
        departmentId,
        kind,
        adapterType: a.adapterType ?? (kind === "external" ? "http" : "internal"),
        adapterConfig: a.adapterConfig ?? {},
        systemPrompt: a.systemPrompt ?? null,
        modelConfig: a.modelConfig ?? null,
        status: (a.status ?? "active") as AgentStatus,
        budgetMonthlyCents: a.budgetMonthlyCents ?? null,
        sovereignty: (a.sovereignty ?? "eu_plus") as Sovereignty,
      };
      let [existing] = await this.db
        .select()
        .from(agents)
        .where(and(eq(agents.companyId, cid), eq(agents.displayName, a.displayName)));
      if (!existing) {
        [existing] = await this.db.insert(agents).values(values).returning();
      } else {
        [existing] = await this.db
          .update(agents)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(agents.id, existing.id))
          .returning();
      }
      idByName.set(a.displayName, existing.id);
    }

    // 5) Manager-/Reporting-Linien auflösen
    for (const a of manifest.agents ?? []) {
      if (!a.manager) continue;
      const managerId = idByName.get(a.manager);
      const selfId = idByName.get(a.displayName);
      if (managerId && selfId && managerId !== selfId) {
        await this.db.update(agents).set({ managerId, updatedAt: new Date() }).where(eq(agents.id, selfId));
      }
    }

    const result: ImportResult = {
      companyId: cid,
      company: company.name,
      departments: (manifest.departments ?? []).length,
      agents: (manifest.agents ?? []).length,
      replaced: !!opts.replaceAgents,
    };
    this.log.log(
      `Import: ${result.company} — ${result.departments} Abteilungen, ${result.agents} Agenten (replace=${result.replaced})`,
    );
    return result;
  }
}
