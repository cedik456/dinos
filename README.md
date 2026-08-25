# Dino

Dino is a phone-first coaching app for coaches and their athletes. The private
MVP is designed to replace manual workout, nutrition, recovery, and weekly
report consolidation with one connected workflow.

## Current phase

Phase 1 provides the verified mobile foundation:

- Expo and TypeScript application shell
- Role-specific mobile navigation
- Mock dashboards with deterministic data
- Semantic visual tokens and a floating glass-style tab bar

Phase 2 has started with a deliberately small backend foundation:

- NestJS API under `api/`
- Local PostgreSQL 16 through Docker Compose
- Drizzle-backed database connection
- API and database health endpoint
- Clerk backed account identity and recovery
- Exclusive Coach and Athlete roles enforced by the API and router
- Operator controlled invitations and account lifecycle actions

Workout, nutrition, recovery, and report domain schemas remain outside this
gate. Uploads and offline synchronization are also deferred.

## Requirements

- Node.js 24 LTS (`.nvmrc` is included)
- npm
- Docker Desktop
- Xcode or Android Studio for native simulators

The project currently targets Expo SDK 54 for native preview compatibility.
The web target remains useful for quick layout review, but native devices and
simulators are the source of truth for mobile behavior.

## Commands

```sh
npm install
npm start
npm run ios
npm run android
npm run web
npm run check
npx expo-doctor
npm run db:up
npm run api:start
npm run api:check
npm --prefix api run test:e2e
```

Copy `.env.example` to `.env` for the Expo client and `api/.env.example` to
`api/.env` for the API. Replace the Clerk placeholders with keys from the same
Clerk instance. The API example targets Dino's Docker PostgreSQL instance on
host port 5433 so it does not conflict with a local PostgreSQL service on the
default port 5432.

Local development opens the deterministic Coach and Athlete preview launcher by
default. Set `EXPO_PUBLIC_DINO_ACCESS_MODE=clerk` when you want to test the Clerk
journey. Preview mode is ignored outside development, so release builds still
require Clerk.

## Structure

```text
src/
├── app/          # Thin Expo Router routes and layouts
├── components/   # Reused UI primitives and app shell
├── data/mock/    # Disposable deterministic Phase 1 fixtures
├── features/     # Athlete and Coach feature-owned screens
├── hooks/        # Hooks reused by multiple implemented features
└── theme/        # Semantic design tokens
api/              # Independently configured NestJS backend
```

Folders are added only when an implemented feature needs them.

See [docs/design-direction.md](docs/design-direction.md) for the approved Phase
1 visual constraints.

Developers taking over or joining the project should also read
[docs/project-handoff.md](docs/project-handoff.md) for the current branch,
unfinished work, verification state, and next approved sequence.
