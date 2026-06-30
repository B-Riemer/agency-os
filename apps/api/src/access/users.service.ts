import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, eq } from "drizzle-orm";
import { type Db, users, roles, userRoles } from "@agency-os/db";
import { DRIZZLE } from "../database/drizzle.constants.js";

// Säule 3 — Nutzer & Rollen (UI-Pendant zum grant-role-CLI).
@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async list() {
    const us = await this.db.select().from(users);
    const urs = await this.db.select().from(userRoles);
    const rs = await this.db.select().from(roles);
    const roleKeyById = new Map(rs.map((r) => [r.id, r.key]));
    return us.map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      roleKeys: urs
        .filter((x) => x.userId === u.id)
        .map((x) => roleKeyById.get(x.roleId))
        .filter((k): k is string => !!k),
    }));
  }

  rolesFor(companyId: string) {
    return this.db
      .select({ id: roles.id, key: roles.key, name: roles.name })
      .from(roles)
      .where(eq(roles.companyId, companyId));
  }

  async grant(userId: string, roleKey: string) {
    const [u] = await this.db.select().from(users).where(eq(users.id, userId));
    if (!u) throw new NotFoundException("Nutzer nicht gefunden");
    const targets = (await this.db.select().from(roles)).filter((r) => r.key === roleKey);
    if (!targets.length) throw new NotFoundException(`Rolle '${roleKey}' nicht gefunden`);
    let granted = 0;
    for (const role of targets) {
      const dup = await this.db
        .select()
        .from(userRoles)
        .where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)));
      if (dup.length) continue;
      await this.db.insert(userRoles).values({ userId, roleId: role.id, companyId: role.companyId });
      granted++;
    }
    return { ok: true, roleKey, granted };
  }

  async revoke(userId: string, roleKey: string) {
    const targets = (await this.db.select().from(roles)).filter((r) => r.key === roleKey);
    for (const role of targets) {
      await this.db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)));
    }
    return { ok: true, roleKey };
  }
}
