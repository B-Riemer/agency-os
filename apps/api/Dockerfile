# Agency OS API (NestJS/Fastify). M1: läuft über tsx (kein tsc-Build wegen Monorepo-Auflösung).
FROM node:20-slim
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app
COPY . .
RUN pnpm install
WORKDIR /app/apps/api
EXPOSE 3100
CMD ["pnpm", "start:prod"]
