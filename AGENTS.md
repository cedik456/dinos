# Dino project instructions

## Product and current phase

Dino is a phone-first coaching app with exclusive Coach and Athlete account
types. Phase 1 is a verified frontend foundation with deterministic mock
personas. Phase 2 is the approved NestJS/PostgreSQL backend foundation.

The current Phase 2 gate is limited to local PostgreSQL connectivity and an API
health endpoint. Do not add authentication, domain schemas, uploads, SQLite,
offline synchronization, payments, chat, AI features, or other later-phase
infrastructure unless Ced approves the relevant gate.

## Stack

- Node.js 24 LTS for local work
- Expo SDK 54, React Native, TypeScript, and Expo Router
- Stable JavaScript tabs from `expo-router`
- React Native StyleSheet with semantic tokens from `src/theme/tokens.ts`
- Jest with the `jest-expo` preset for focused non-visual checks
- NestJS 11, PostgreSQL 16, Drizzle ORM, and npm under `api/`

Read the version-matched Expo documentation before changing framework APIs.
Use `npx expo install` for Expo-managed native dependencies.

## Architecture

- Keep route files in `src/app` thin.
- Keep feature-owned UI and logic in `src/features/<feature>`.
- Put only genuinely reused primitives in `src/components/ui` and shared app
  framing in `src/components/shell`.
- Keep deterministic Phase 1 fixtures in `src/data/mock`.
- Do not create empty architectural folders. Add a layer only when a real
  feature or integration requires it.
- Do not introduce a universal repository or global feature-hooks file.
- Keep the Expo app at the repository root and the independently deployable
  NestJS application under `api/`; do not add monorepo tooling until repeated
  cross-package work justifies it.

## Experience rules

- Product name is `Dino`.
- Keep the experience clean, modern, athletic, strong, and approachable.
- Do not use literal dinosaurs, mascots, fossils, footprints, eggs, scales, or
  novelty prehistoric icons.
- The supplied education-app screenshots are structural inspiration only:
  modular cards, compact date navigation, visible progress, and a floating
  glass-style tab bar.
- Athlete screens emphasize today's next action. Coach screens prioritize
  compact review information.
- Use accessible labels, 48 dp touch targets, text alongside status color, and
  enough bottom inset to clear the floating navigation.

## Workflow

Use review-gated phases. Implement and verify only the currently approved
phase, report it to Ced, and do not commit until Ced approves the result.

Before handoff, run:

```sh
npm run check
npx expo-doctor
npm run api:check
```

When PostgreSQL behavior changes, also run `npm run db:up` followed by
`npm --prefix api run test:e2e`. Do not commit until Ced approves the gate.
