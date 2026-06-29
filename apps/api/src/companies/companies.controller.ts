import { Controller, Get, Inject, Param } from "@nestjs/common";
import { CompaniesService } from "./companies.service.js";

@Controller("companies")
export class CompaniesController {
  constructor(@Inject(CompaniesService) private readonly companies: CompaniesService) {}

  @Get()
  list() {
    return this.companies.list();
  }

  @Get(":id")
  get(@Param("id") id: string) {
    return this.companies.get(id);
  }

  @Get(":id/departments")
  departments(@Param("id") id: string) {
    return this.companies.departments(id);
  }
}
