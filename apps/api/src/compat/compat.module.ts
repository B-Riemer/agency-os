import { Module } from "@nestjs/common";
import { AdaptersModule } from "../adapters/adapters.module.js";
import { CompatController } from "./compat.controller.js";

@Module({
  imports: [AdaptersModule],
  controllers: [CompatController],
})
export class CompatModule {}
