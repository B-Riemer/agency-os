import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { type Db, companies, departments, agents } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";

// Säule 1 — Firmenstruktur.
@Injectable()
export class CompaniesService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /** Säule 8 — Portabilität: ganze Company als Import-Manifest exportieren. */
  async export(companyId: string) {
    const c = await this.get(companyId);
    const deps = await this.db.select().from(departments).where(eq(departments.companyId, companyId));
    const ags = await this.db.select().from(agents).where(eq(agents.companyId, companyId));
    const depKeyById = new Map(deps.map((d) => [d.id, d.key]));
    const nameById = new Map(ags.map((a) => [a.id, a.displayName]));
    return {
      company: { name: c.name, slug: c.slug },
      departments: deps.map((d) => ({ key: d.key, name: d.name, description: d.description ?? undefined })),
      agents: ags.map((a) => ({
        displayName: a.displayName,
        role: a.role ?? undefined,
        department: a.departmentId ? depKeyById.get(a.departmentId) : undefined,
        manager: a.managerId ? nameById.get(a.managerId) : undefined,
        kind: a.kind,
        adapterType: a.adapterType,
        adapterConfig: a.adapterConfig ?? undefined,
        systemPrompt: a.systemPrompt ?? undefined,
        modelConfig: a.modelConfig ?? undefined,
        status: a.status,
        budgetMonthlyCents: a.budgetMonthlyCents ?? undefined,
        sovereignty: a.sovereignty ?? undefined,
      })),
    };
  }

  list() {
    return this.db.select().from(companies);
  }

  async get(id: string) {
    const [c] = await this.db.select().from(companies).where(eq(companies.id, id));
    if (!c) throw new NotFoundException("Company nicht gefunden");
    return c;
  }

  departments(companyId: string) {
    return this.db.select().from(departments).where(eq(departments.companyId, companyId));
  }

  /** Company umbenennen (Säule 1). */
  async rename(companyId: string, name: string) {
    const [c] = await this.db
      .update(companies)
      .set({ name, updatedAt: new Date() })
      .where(eq(companies.id, companyId))
      .returning();
    if (!c) throw new NotFoundException("Company nicht gefunden");
    return c;
  }

  /** Kurzschlüssel aus dem Namen ableiten (A–Z/0–9, max 12), eindeutig pro Company. */
  private deriveKey(name: string): string {
    return name.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12) || "DEPT";
  }

  async createDepartment(companyId: string, name: string, key?: string, description?: string) {
    const base = (key && key.trim()) || this.deriveKey(name);
    const existing = await this.db
      .select({ key: departments.key })
      .from(departments)
      .where(eq(departments.companyId, companyId));
    const taken = new Set(existing.map((e) => e.key));
    let k = base;
    let n = 1;
    while (taken.has(k)) {
      n += 1;
      k = `${base}${n}`.slice(0, 16);
    }
    const [d] = await this.db
      .insert(departments)
      .values({ companyId, name, key: k, description })
      .returning();
    return d;
  }

  async updateDepartment(id: string, patch: { name?: string; key?: string; description?: string }) {
    const [d] = await this.db
      .update(departments)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(departments.id, id))
      .returning();
    if (!d) throw new NotFoundException("Abteilung nicht gefunden");
    return d;
  }

  /** Löschen — zugewiesene Agenten bleiben erhalten (department_id wird per FK auf NULL gesetzt). */
  async deleteDepartment(id: string) {
    await this.db.delete(departments).where(eq(departments.id, id));
    return { ok: true };
  }
}
