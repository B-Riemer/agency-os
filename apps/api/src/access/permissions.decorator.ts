import { SetMetadata } from "@nestjs/common";

// Markiert eine Route mit benötigter Permission (resource:action) für den RbacGuard.
export const PERM_KEY = "required_permission";
export const RequirePermission = (resource: string, action: string) =>
  SetMetadata(PERM_KEY, { resource, action });
