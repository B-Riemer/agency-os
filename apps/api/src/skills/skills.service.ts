import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull, or } from "drizzle-orm";
import { type Db, skills, agentSkills } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";

// Säule 4 — Skills: Katalog (global + company) und Zuweisung an Agenten.
@Injectable()
export class SkillsService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  /** Globaler Katalog (companyId NULL) + company-spezifische Skills. */
  catalog(companyId: string) {
    return this.db
      .select()
      .from(skills)
      .where(or(isNull(skills.companyId), eq(skills.companyId, companyId)));
  }

  /** Skills, die einem Agenten zugewiesen sind (für die Akte). */
  agentSkills(agentId: string) {
    return this.db
      .select({
        skillId: skills.id,
        name: skills.name,
        version: skills.version,
        defaultPolicy: skills.defaultPolicy,
        policy: agentSkills.policy,
        enabled: agentSkills.enabled,
      })
      .from(agentSkills)
      .innerJoin(skills, eq(agentSkills.skillId, skills.id))
      .where(eq(agentSkills.agentId, agentId));
  }

  assign(agentId: string, skillId: string, policy?: "auto" | "approval_required") {
    return this.db
      .insert(agentSkills)
      .values({ agentId, skillId, policy, enabled: true })
      .returning();
  }

  /** Skill-Toggle (an/aus) für einen Agenten. */
  setEnabled(agentId: string, skillId: string, enabled: boolean) {
    return this.db
      .update(agentSkills)
      .set({ enabled })
      .where(and(eq(agentSkills.agentId, agentId), eq(agentSkills.skillId, skillId)))
      .returning();
  }
}
