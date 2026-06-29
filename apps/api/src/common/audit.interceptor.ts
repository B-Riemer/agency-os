import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { AuditService } from "../governance/audit.service.js";

// Säule 7 — globaler, additiver Audit-Trail für mutierende, company-gescopte Requests.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req: any = ctx.switchToHttp().getRequest();
    const method: string = req?.method ?? "GET";
    return next.handle().pipe(
      tap(() => {
        if (method === "GET" || method === "OPTIONS" || method === "HEAD") return;
        const companyId = req.params?.companyId;
        if (!companyId) return; // nur company-gescopte Mutationen
        const user = req.user;
        void Promise.resolve(
          this.audit.write({
            companyId,
            actorType: user ? "user" : "system",
            actorId: user?.id,
            action: `${method} ${String(req.url).split("?")[0]}`.slice(0, 120),
          }),
        ).catch(() => {});
      }),
    );
  }
}
