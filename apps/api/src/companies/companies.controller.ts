import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";
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

  @Patch(":id")
  rename(@Param("id") id: string, @Body("name") name: string) {
    return this.companies.rename(id, name);
  }

  @Get(":id/departments")
  departments(@Param("id") id: string) {
    return this.companies.departments(id);
  }

  @Post(":id/departments")
  createDepartment(
    @Param("id") companyId: string,
    @Body() dto: { name: string; key?: string; description?: string },
  ) {
    return this.companies.createDepartment(companyId, dto.name, dto.key, dto.description);
  }

  @Patch(":id/departments/:depId")
  updateDepartment(
    @Param("depId") depId: string,
    @Body() patch: { name?: string; key?: string; description?: string },
  ) {
    return this.companies.updateDepartment(depId, patch);
  }

  @Delete(":id/departments/:depId")
  deleteDepartment(@Param("depId") depId: string) {
    return this.companies.deleteDepartment(depId);
  }
}
