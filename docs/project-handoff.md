# Dino project handoff

Last reviewed: August 24, 2026

## Start here

Dino is a phone-first coaching application for coaches and their athletes. It
is being built first for Ced and one other coach, each with an independent
athlete roster. The MVP aims to replace fragmented workout, nutrition,
recovery, and weekly-report tracking with one connected mobile workflow.

Before changing the project:

1. Read `AGENTS.md` at the repository root for the current engineering and
   review rules.
2. Read this document for project status and sequencing.
3. Read `README.md` and `api/README.md` for local setup and commands.
4. Read `docs/design-direction.md` before changing the mobile interface.
5. Run `git status` before editing. Preserve all existing changes, including
   untracked files, unless Ced explicitly approves changing or removing them.
6. Use Node.js 24 LTS. Explain every NestJS, npm, Docker, Git, database, and
   migration command to Ced before running it, including its purpose, expected
   changes, and meaningful risks or alternatives.

## Product boundaries

- Dino has two exclusive account types: `coach` and `athlete`.
- There is no role toggle or dual-role account in the MVP.
- A coach sees only athletes assigned to that coach.
- An athlete sees only their own plans, logs, and progress.
- Ced and the other initial coach have separate accounts and rosters. Do not
  assume a shared workspace, shared athletes, or a shared exercise library.
- Both account types use one Expo/React Native application with role-specific
  navigation.
- The product is phone-first. A coach web dashboard may be considered later
  only if real phone usage proves too cumbersome.
- The selected backend direction is a manually owned NestJS API with
  PostgreSQL. Do not replace it with Supabase or add Prisma beside Drizzle
  without an explicit architecture decision.

The intended later MVP workflows include coach-assigned workouts, recorded
exercise demonstrations, workout logging, meal plans, calorie/macro/vitamin
targets, sleep and body-weight logging, and portable weekly reporting. Those
features are not part of the current backend-foundation gate.

## Current Git state

Active branch: `main`

Latest committed baseline:

```text
f24604d Merge pull request #1 from cedik456/feat/nest-postgres-foundation
```

The Phase 2 backend foundation was committed as `7478975` and merged into
`main` through pull request 1 as `f24604d` on August 24, 2026. A fresh clone of
`main` includes both the Phase 1 mobile foundation and Phase 2 API foundation.

Always use `git status` for the current working tree. Do not encode temporary
modified or untracked file lists in this handoff because they become stale as
soon as work continues.

Do not run a repository-wide destructive cleanup, discard user changes, or
commit new work without Ced's explicit approval.

## Completed and committed foundation

Phase 1 provides:

- Expo SDK 54, React Native, TypeScript, and Expo Router;
- development-only Coach and Athlete preview entry points;
- role-specific mobile navigation with no role toggle;
- deterministic mock dashboards;
- semantic visual tokens and shared UI primitives;
- a centered floating glass-style tab bar with native safe-area handling; and
- five focused Jest checks.

The committed mobile foundation has passed formatting, Expo lint, strict
TypeScript, Jest, and all 18 Expo Doctor checks.

Phase 2 provides:

- a committed NestJS 11 application under `api/` using npm;
- validated `HOST`, `PORT`, and `DATABASE_URL` configuration;
- PostgreSQL 16 through Docker Compose on host port 5433;
- Drizzle ORM 0.45.2 with the `pg` connection pool;
- `GET /health`, which verifies both the API and database connection;
- two unit tests for healthy and unavailable database behavior;
- a real PostgreSQL-backed end-to-end health test;
- separate Expo and NestJS TypeScript/Jest boundaries; and
- root convenience scripts for API and database development.

## Verification record and known limitations

The merge proves that Ced approved and committed the Phase 2 gate. The local
commit and merge metadata do not preserve whether the real PostgreSQL end-to-end
test and manual `GET /health` request were completed before that approval. Do
not claim that historical verification without another record from Ced.

The August 24, 2026 repository audit confirmed:

- mobile lint, strict TypeScript, and five Jest tests;
- Expo Doctor: 18/18 current checks;
- API formatting, lint, strict TypeScript, two unit tests, and production build;
- tracked application and documentation files pass Prettier; and
- the production API dependency audit reports zero vulnerabilities.

The audit did not rerun the PostgreSQL-backed end-to-end test or manually start
NestJS. The installed `.agents/` skill package is intentionally excluded from
Prettier so upstream skill formatting does not affect Dino's quality gate. The
complete root `npm run check` passes after adding that boundary.

The Expo production dependency graph currently reports 19 advisories, including
9 high severity findings in transitive Expo and Metro dependencies. npm only
offers a forced Expo 57 upgrade, so resolve this through a reviewed Expo upgrade
gate rather than `npm audit fix --force`.

The original Drizzle 0.44 template version had a production SQL-injection
advisory. Dino uses patched Drizzle 0.45.2. Do not downgrade it as part of an
unrelated change.

## Architecture

```text
Expo mobile app at repository root
        |
        | future HTTP API calls
        v
NestJS application under api/
        |
        | Drizzle ORM and pg
        v
PostgreSQL 16 in Docker
```

The mobile application still reads deterministic mock data and is not yet
connected to the API.

Important locations:

| Path                   | Responsibility                                  |
| ---------------------- | ----------------------------------------------- |
| `src/app`              | Thin Expo Router routes and layouts             |
| `src/features`         | Coach- and Athlete-owned mobile features        |
| `src/components/ui`    | Reused mobile UI primitives                     |
| `src/components/shell` | Shared application framing and role navigation  |
| `src/data/mock`        | Disposable Phase 1 dashboard fixtures           |
| `src/theme`            | Semantic mobile design tokens                   |
| `api/src/config`       | Validated API environment configuration         |
| `api/src/database`     | PostgreSQL pool and Drizzle connection boundary |
| `api/src/health`       | API/database readiness endpoint                 |
| `api/test`             | Database-backed API end-to-end checks           |
| `api/compose.yaml`     | Local PostgreSQL 16 service                     |

Keep the Expo application at the repository root and the independently
deployable API under `api/`. Do not add workspace or monorepo tooling until a
repeated cross-package problem justifies it.

## Local setup

From the repository root:

```sh
nvm use 24
npm install
npm --prefix api install
cp api/.env.example api/.env
```

`api/.env` is ignored by Git. Never commit real credentials or production
connection strings.

Open Docker Desktop and wait for the engine to report that it is running. Then
start PostgreSQL:

```sh
npm run db:up
```

The container listens on host port 5433 because Ced already has a separate
machine-wide PostgreSQL service on the default port 5432.

Start the API:

```sh
npm run api:start
```

Verify it from another terminal:

```sh
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "database": "connected"
}
```

Stop the Dino container without deleting its persistent named volume:

```sh
npm run db:down
```

## Required verification

Mobile application:

```sh
npm run check
npx expo-doctor
```

NestJS API:

```sh
npm run api:check
npm --prefix api run test:e2e
npm --prefix api audit --omit=dev
```

When mobile behavior changes, review on native iOS and Android targets. Web is
useful for quick layout review but is not the mobile source of truth.

## Product and experience rules that must not drift

- Product name is `Dino`, not `Dino's`.
- The dinosaur association remains implicit. Do not add mascots, fossils,
  footprints, eggs, scales, or novelty prehistoric imagery.
- Keep the experience clean, modern, athletic, strong, and approachable.
- Athlete screens prioritize today's next action. Coach screens prioritize
  compact review information.
- Status must never rely on color alone, and interactive targets should remain
  at least 48 dp.
- The education-app screenshots are structural inspiration only; they do not
  authorize copying irrelevant course or scheduling features.
- Do not add authentication, account tables, workout schemas, nutrition
  schemas, uploads, offline synchronization, payments, chat, or AI features
  until Ced approves the relevant next gate.
- Work remains review-gated. Implement and verify one approved gate at a time,
  then wait for Ced before committing.

## Next approved sequence

The live PostgreSQL health foundation is committed. No identity implementation
gate is approved yet. The next planning boundary is identity and coach-athlete
relationships:

- decide the authentication approach;
- add users with one exclusive Coach or Athlete role;
- add intentional coach invitation or provisioning behavior; and
- add coach-athlete assignments with strict ownership boundaries.

Do not begin workout, nutrition, sleep, video, or reporting schemas until the
identity and relationship model is approved and verified.

## First-day checklist for the next developer

- Confirm repository access and the intended branch with Ced.
- Read `AGENTS.md`, this handoff, both READMEs, and the design-direction file.
- Inspect `git status` and the complete uncommitted diff before formatting or
  editing anything.
- Use Node.js 24. Confirm Docker Desktop is running before database work.
- Run the PostgreSQL-backed health test before changing database behavior.
- Launch both Coach and Athlete mobile previews and understand that their data
  is still mocked.
- Ask Ced which review gate is approved before adding a module or schema.
- Keep commands transparent and work in one reviewable gate at a time.

## Updating this handoff

This file is the current status and sequencing source of truth for developer
handoff. Update it whenever a gate is approved:

- move finished work into the committed baseline;
- record the branch and commit hash;
- record verification evidence and known limitations;
- state the next approved gate; and
- remove stale blockers or setup instructions.

Do not let this file claim that unfinished or uncommitted work is available on
the remote repository.
