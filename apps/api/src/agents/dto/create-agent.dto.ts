// Eingabe zum Einstellen eines Agenten (intern ODER extern).
export class CreateAgentDto {
  displayName!: string;
  role?: string;
  departmentId?: string;
  managerId?: string;
  kind?: "internal" | "external";
  /** http | process | mcp | openai | claude_local | internal | … (Plugin-erweiterbar) */
  adapterType?: string;
  adapterConfig?: Record<string, unknown>;
  budgetMonthlyCents?: number;
}
