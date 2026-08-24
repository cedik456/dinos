# Dino API

NestJS backend for Dino's Coach and Athlete mobile experiences.

## Current scope

This foundation provides:

- validated environment configuration;
- a Drizzle connection to PostgreSQL;
- `GET /health` for API and database readiness;
- focused unit and database-backed end-to-end tests.

Authentication and domain schemas are intentionally deferred to the next
approved gate.

## Requirements

- Node.js 24 LTS
- npm
- Docker Desktop

## Local setup

Run these commands from `api/`:

```sh
npm install
cp .env.example .env
npm run db:up
npm run start:dev
```

The API listens on `0.0.0.0:3000`. PostgreSQL is exposed on host port 5433 to
avoid conflicting with a local PostgreSQL service on port 5432.

Verify the API and database:

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

## Verification

```sh
npm run check
npm run test:e2e
npm audit --omit=dev
```

Stop the database without deleting its named volume:

```sh
npm run db:down
```
