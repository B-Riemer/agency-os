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
}
