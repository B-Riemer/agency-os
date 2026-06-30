import { Body, Controller, Inject, Post } from "@nestjs/common";
import { ImportService, type ImportManifest } from "./import.service.js";
import { RequirePermission } from "../access/permissions.decorator.js";

// Produkt-Endpoint: ganze Company-Struktur per Manifest einpflegen (nur board/admin).
@Controller()
export class ImportController {
  constructor(@Inject(ImportService) private readonly svc: ImportService) {}

  @Post("companies/import")
  @RequirePermission("company", "manage")
  importCompany(@Body() body: { manifest: ImportManifest; replaceAgents?: boolean }) {
    return this.svc.importCompany(body.manifest, { replaceAgents: body.replaceAgents });
  }
}
