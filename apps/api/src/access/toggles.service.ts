import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { type Db, agentToggles, agentSkills, skills } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";

// Säule 3 — Durchsetzung der Toggle-/Skill-Allowlist (default-deny).
@Injectable()
export class TogglesService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /** Tools/Integrationen, die für DIESEN Agenten zur Laufzeit erlaubt sind. */
  async allowedTools(agentId: string): Promise<string[]> {
    const rows = await this.db
      .select()
      .from(agentToggles)
      .where(and(eq(agentToggles.agentId, agentId), eq(agentToggles.enabled, true)));
    return rows
      .filter((r) => r.targetType === "tool" || r.targetType === "integration")
      .map((r) => r.targetId);
  }

  /** Alle Toggles eines Agenten (für die Akte-Ansicht). */
  list(agentId: string) {
    return this.db.select().from(agentToggles).where(eq(agentToggles.agentId, agentId));
  }

  /** Toggle setzen (Upsert). */
  async setToggle(agentId: string, targetType: string, targetId: string, enabled: boolean) {
    const existing = await this.db
      .select()
      .from(agentToggles)
      .where(and(eq(agentToggles.agentId, agentId), eq(agentToggles.targetType, targetType as any), eq(agentToggles.targetId, targetId)));
    if (existing.length) {
      const [r] = await this.db
        .update(agentToggles)
        .set({ enabled })
        .where(and(eq(agentToggles.agentId, agentId), eq(agentToggles.targetType, targetType as any), eq(agentToggles.targetId, targetId)))
        .returning();
      return r;
    }
    const [r] = await this.db
      .insert(agentToggles)
      .values({ agentId, targetType: targetType as any, targetId, enabled })
      .returning();
    return r;
  }

  /** Freigeschaltete Skills inkl. effektiver Policy (Override vor Default). */
  async allowedSkills(agentId: string) {
    const rows = await this.db
      .select({
        key: skills.key,
        defaultPolicy: skills.defaultPolicy,
        override: agentSkills.policy,
      })
      .from(agentSkills)
      .innerJoin(skills, eq(agentSkills.skillId, skills.id))
      .where(and(eq(agentSkills.agentId, agentId), eq(agentSkills.enabled, true)));
    return rows.map((r) => ({
      key: r.key,
      policy: (r.override ?? r.defaultPolicy) as "auto" | "approval_required",
    }));
  }
}
