import { Body, Controller, Get, Inject, Param, Patch } from "@nestjs/common";
import { RagService } from "./rag.service.js";

@Controller()
export class RagController {
  constructor(@Inject(RagService) private readonly rag: RagService) {}

  @Get("companies/:companyId/knowledge")
  folders(@Param("companyId") companyId: string) {
    return this.rag.folders(companyId);
  }

  @Get("agents/:id/knowledge")
  agentFolders(@Param("id") id: string) {
    return this.rag.agentFolders(id);
  }

  @Patch("agents/:id/knowledge/:folderId")
  setAccess(
    @Param("id") id: string,
    @Param("folderId") folderId: string,
    @Body("enabled") enabled: boolean,
  ) {
    return this.rag.setAccess(id, folderId, enabled);
  }
}
