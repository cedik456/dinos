# Dino API context

## Overview

This area is the independently deployable NestJS API for Dino. Its approved local boundary includes Account identity and the first assigned workout loop. Pilot and production workout creation remain blocked until hosted identity and roster ownership are verified.

## Key files

| File                               | Owns                                                            |
| ---------------------------------- | --------------------------------------------------------------- |
| `src/app.module.ts`                | Global configuration plus database and health module wiring     |
| `src/config/env.validation.ts`     | Required API environment values and defaults                    |
| `src/database/database.service.ts` | PostgreSQL pool, Drizzle client, connection check, and shutdown |
| `src/database/migrate.ts`          | Drizzle migration runner                                        |
| `src/database/schema.ts`           | Account, security event, and workout persistence                |
| `src/health/health.service.ts`     | API and database readiness result                               |
| `src/identity/`                    | Account lifecycle, Clerk identity, and server role enforcement  |
| `src/workouts/`                    | Preview seed and actor scoped workout lifecycle                 |
| `test/app.e2e-spec.ts`             | Real PostgreSQL backed health endpoint check                    |
| `compose.yaml`                     | Local PostgreSQL 16 service on host port 5433                   |

## Commands

Run these from the repository root.

```sh
npm --prefix api install
npm run db:up
npm --prefix api run db:migrate
npm --prefix api run workout:seed-preview
npm run api:start
npm run api:check
npm --prefix api run test:e2e
```

## Conventions

1. You may keep `ConfigModule` global and validate environment values with Joi before modules start.
2. You may keep PostgreSQL access behind `DatabaseService`, using Drizzle with the `pg` pool.
3. You may return HTTP 503 when the database check fails, while keeping the successful response stable.
4. You may keep API tests and TypeScript settings separate from the Expo application.
5. Keep workout preview access closed unless development mode and `DINO_PREVIEW_ACCESS_ENABLED=true` are both present.
6. Keep pilot and production workout creation closed until roster ownership supplies the target Athlete.

## Gotchas

The API requires `DATABASE_URL` even for unit startup. Copy `api/.env.example` to the ignored `api/.env` for local work. The end to end test requires the Docker PostgreSQL service to be healthy on host port 5433.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
