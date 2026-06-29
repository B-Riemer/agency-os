import { Inject, Injectable } from "@nestjs/common";
import { desc, eq } from "drizzle-orm";
import { type Db, auditLog } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";

export interface AuditEntryInput {
  companyId: string;
  actorType: string; // user | agent | system
  actorId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  data?: unknown;
  costCents?: number;
}

// Säule 7 — append-only Audit-Trail.
@Injectable()
export class AuditService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  write(e: AuditEntryInput) {
    return this.db.insert(auditLog).values({
      companyId: e.companyId,
      actorType: e.actorType,
      actorId: e.actorId,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      data: (e.data ?? null) as Record<string, unknown> | null,
      costCents: e.costCents,
    });
  }

  recent(companyId: string, limit = 50) {
    return this.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.companyId, companyId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }
}
