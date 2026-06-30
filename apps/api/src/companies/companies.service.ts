import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { type Db, companies, departments } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";

// Säule 1 — Firmenstruktur.
@Injectable()
export class CompaniesService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

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
