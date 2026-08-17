# Dino

Dino is a phone-first coaching app for coaches and their athletes. The private
MVP is designed to replace manual workout, nutrition, recovery, and weekly
report consolidation with one connected workflow.

## Current phase

Phase 1 is a frontend-only foundation:

- Expo and TypeScript application shell
- Development-only Coach and Athlete previews
- Role-specific mobile navigation
- Mock dashboards with deterministic data
- Semantic visual tokens and a floating glass-style tab bar

Authentication, Supabase, uploads, and offline synchronization are intentionally
not part of this phase.

## Requirements

- Node.js 24 LTS (`.nvmrc` is included)
- npm
- Xcode or Android Studio for native simulators

Expo SDK 57 may require a development build during the current Expo Go
transition. The web target remains useful for quick layout review, but native
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
```

## Structure

```text
src/
├── app/          # Thin Expo Router routes and layouts
├── components/   # Reused UI primitives and app shell
├── data/mock/    # Disposable deterministic Phase 1 fixtures
├── features/     # Athlete and Coach feature-owned screens
├── hooks/        # Hooks reused by multiple implemented features
└── theme/        # Semantic design tokens
```

Folders are added only when an implemented feature needs them.

See [docs/design-direction.md](docs/design-direction.md) for the approved Phase
1 visual constraints.
