import { Body, Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";
import { TasksService } from "./tasks.service.js";

@Controller()
export class TasksController {
  constructor(@Inject(TasksService) private readonly tasks: TasksService) {}

  @Get("companies/:companyId/tasks")
  list(@Param("companyId") companyId: string) {
    return this.tasks.list(companyId);
  }

  @Post("companies/:companyId/tasks")
  create(@Param("companyId") companyId: string, @Body() dto: { title: string; description?: string; priority?: number; assigneeId?: string }) {
    return this.tasks.create(companyId, dto);
  }

  @Patch("tasks/:id/status")
  setStatus(@Param("id") id: string, @Body("status") status: "backlog" | "in_progress" | "review" | "done" | "blocked") {
    return this.tasks.setStatus(id, status);
  }

  @Patch("tasks/:id/assign")
  assign(@Param("id") id: string, @Body("assigneeId") assigneeId: string | null) {
    return this.tasks.assign(id, assigneeId);
  }

  @Post("tasks/:id/run")
  run(@Param("id") id: string) {
    return this.tasks.run(id);
  }
}
