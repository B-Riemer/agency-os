import { Inject, Injectable } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { type Db, knowledgeFolders, agentKnowledgeFolders } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";

// Säule 4/5 — Wissensordner + Permission-Mirroring.
@Injectable()
export class RagService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  folders(companyId: string) {
    return this.db.select().from(knowledgeFolders).where(eq(knowledgeFolders.companyId, companyId));
  }

  /** Zugriff eines Agenten auf Wissensordner (mit enabled-Flag). */
  agentFolders(agentId: string) {
    return this.db
      .select({
        folderId: knowledgeFolders.id,
        name: knowledgeFolders.name,
        sensitivity: knowledgeFolders.sensitivity,
        enabled: agentKnowledgeFolders.enabled,
      })
      .from(agentKnowledgeFolders)
      .innerJoin(knowledgeFolders, eq(agentKnowledgeFolders.folderId, knowledgeFolders.id))
      .where(eq(agentKnowledgeFolders.agentId, agentId));
  }

  async setAccess(agentId: string, folderId: string, enabled: boolean) {
    const existing = await this.db
      .select()
      .from(agentKnowledgeFolders)
      .where(and(eq(agentKnowledgeFolders.agentId, agentId), eq(agentKnowledgeFolders.folderId, folderId)));
    if (existing.length) {
      const [r] = await this.db
        .update(agentKnowledgeFolders)
        .set({ enabled })
        .where(and(eq(agentKnowledgeFolders.agentId, agentId), eq(agentKnowledgeFolders.folderId, folderId)))
        .returning();
      return r;
    }
    const [r] = await this.db.insert(agentKnowledgeFolders).values({ agentId, folderId, enabled }).returning();
    return r;
  }

  /** Namen der freigeschalteten Ordner — fließt in den ExecutionContext (Mirroring). */
  async allowedFolderNames(agentId: string): Promise<string[]> {
    const rows = await this.db
      .select({ name: knowledgeFolders.name })
      .from(agentKnowledgeFolders)
      .innerJoin(knowledgeFolders, eq(agentKnowledgeFolders.folderId, knowledgeFolders.id))
      .where(and(eq(agentKnowledgeFolders.agentId, agentId), eq(agentKnowledgeFolders.enabled, true)));
    return rows.map((r) => r.name);
  }
}
