# Dino API

NestJS backend for Dino's Coach and Athlete mobile experiences.

## Current scope

This foundation provides:

- validated environment configuration;
- a Drizzle connection to PostgreSQL;
- `GET /health` for API and database readiness;
- Clerk backed account activation and session verification;
- hosted Clerk Account Portal invitation acceptance;
- exclusive Coach and Athlete authorization;
- account lifecycle controls and generic recovery responses;
- an operator command for account provisioning and lifecycle changes;
- focused unit and database-backed end-to-end tests.

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
npm run db:migrate
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

Provision an invited account from `api/`:

```sh
npm run identity:operator -- provision --email athlete@example.com --display-name "Avery Cruz" --role athlete
```

The other actions are `inspect`, `disable`, `reactivate`, and `cancel`. Resolve
their target with either `--account-id` or `--email`.

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
