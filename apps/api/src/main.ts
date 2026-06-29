import "reflect-metadata";
import "./env.js"; // .env laden, bevor andere Module evaluiert werden
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./common/all-exceptions.filter.js";

// Agency OS API — NestJS auf Fastify (D6). Self-hosted, model-agnostisch.
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.enableCors();
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true })); // lenient: nur class-DTOs
  app.setGlobalPrefix("api");
  const port = Number(process.env.API_PORT ?? 3100);
  await app.listen(port, "0.0.0.0");
  // eslint-disable-next-line no-console
  console.log(`Agency OS API → http://localhost:${port}/api`);
}
bootstrap();
