import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";
import { GovernanceService } from "./governance.service.js";
import { AuditService } from "./audit.service.js";

@Controller()
export class GovernanceController {
  constructor(
    @Inject(GovernanceService) private readonly gov: GovernanceService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  @Get("companies/:companyId/governance/audit")
  audit_(@Param("companyId") companyId: string) {
    return this.audit.recent(companyId);
  }

  @Get("companies/:companyId/governance/costs")
  costs(@Param("companyId") companyId: string) {
    return this.gov.costs(companyId);
  }

  @Get("companies/:companyId/governance/budgets")
  budgets(@Param("companyId") companyId: string) {
    return this.gov.budgets(companyId);
  }

  @Get("companies/:companyId/governance/alerts")
  alerts(@Param("companyId") companyId: string) {
    return this.gov.alerts(companyId);
  }

  @Get("companies/:companyId/governance/heartbeats")
  heartbeats(@Param("companyId") companyId: string) {
    return this.gov.heartbeats(companyId);
  }

  @Get("companies/:companyId/governance/insights")
  insights(@Param("companyId") companyId: string) {
    return this.gov.insights(companyId);
  }

  @Get("companies/:companyId/governance/approvals")
  approvals(@Param("companyId") companyId: string) {
    return this.gov.approvals(companyId);
  }

  @Post("approvals/:id/decide")
  decide(@Param("id") id: string, @Body("status") status: "approved" | "rejected") {
    return this.gov.decide(id, status);
  }
}
