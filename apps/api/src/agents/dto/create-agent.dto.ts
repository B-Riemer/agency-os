import { IsIn, IsInt, IsObject, IsOptional, IsString } from "class-validator";

// Eingabe zum Einstellen eines Agenten (intern ODER extern). Validiert (lenient).
export class CreateAgentDto {
  @IsString()
  displayName!: string;

  @IsOptional() @IsString()
  role?: string;

  @IsOptional() @IsString()
  departmentId?: string;

  @IsOptional() @IsString()
  managerId?: string;

  @IsOptional() @IsIn(["internal", "external"])
  kind?: "internal" | "external";

  /** http | process | mcp | openai | claude_local | internal | … (Plugin-erweiterbar) */
  @IsOptional() @IsString()
  adapterType?: string;

  @IsOptional() @IsObject()
  adapterConfig?: Record<string, unknown>;

  @IsOptional() @IsInt()
  budgetMonthlyCents?: number;
}
