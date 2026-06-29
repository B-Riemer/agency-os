# Contributing to AIgency OS

Thanks for helping build the open control plane for AI agencies. Apache-2.0.

## Dev setup

See the [README quickstart](./README.md#quickstart-local-dev). TL;DR: `docker compose up -d`,
`pnpm install`, migrate, seed, run `@agency-os/api` and `@agency-os/web`.

## Monorepo layout

- `packages/db` — Drizzle schema (the data model) + client factory.
- `packages/adapter-contract` — the unified `AgentAdapter` contract + HTTP adapter.
- `apps/api` — NestJS (Fastify) backend, one module per domain.
- `apps/web` — React + Vite UI.

## Conventions (important)

- **Internal relative imports in `packages/db` are extensionless** (`./org`, not `./org.js`) so
  drizzle-kit and tsx resolve TypeScript directly. App code uses `.js` specifiers (NodeNext).
- **NestJS DI: always use explicit `@Inject(Token)`** on constructor params. The dev runner is
  tsx/esbuild, which does **not** emit decorator metadata — type-only injection will fail at runtime.
- **Secrets never touch prompts or logs.** Inject as env via the secrets sidecar only.
- New DB tables → add to `packages/db/src/schema/*`, export from `index.ts`, then
  `pnpm --filter @agency-os/db db:generate && db:migrate`.

## Add a new agent adapter (bring-your-own)

Implement the `AgentAdapter` contract (`packages/adapter-contract`): `type`, `testEnvironment(config)`,
`execute(ctx, config)`. Register it in `apps/api/src/adapters/adapter.registry.ts`. The core builds
the `ExecutionContext` (allowed tools/skills, injected secrets, budget, audit sink) — your adapter
just translates to the foreign protocol.

## PRs

Small, focused PRs. Describe the change and how you tested it. Be kind. 🙂
