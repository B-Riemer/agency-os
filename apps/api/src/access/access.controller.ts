import { Body, Controller, Get, Inject, Param, Patch } from "@nestjs/common";
import { TogglesService } from "./toggles.service.js";

@Controller()
export class AccessController {
  constructor(@Inject(TogglesService) private readonly toggles: TogglesService) {}

  @Get("agents/:id/toggles")
  list(@Param("id") id: string) {
    return this.toggles.list(id);
  }

  @Patch("agents/:id/toggles")
  set(@Param("id") id: string, @Body() b: { targetType: string; targetId: string; enabled: boolean }) {
    return this.toggles.setToggle(id, b.targetType, b.targetId, b.enabled);
  }
}
