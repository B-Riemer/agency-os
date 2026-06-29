import { CanActivate, Injectable } from "@nestjs/common";

// Säule 3 — RBAC-Guard (Gerüst). M1: permissiv (lokaler Single-User).
// M4: gegen OIDC-Subject → User → Rolle → Permission (resource:action) prüfen.
@Injectable()
export class RbacGuard implements CanActivate {
  canActivate(): boolean {
    // TODO M4: Request-User aus OIDC, Permission-Matrix auswerten.
    return true;
  }
}
