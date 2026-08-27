# 0006 · Weekly progress and review status

**Date**: 2026-08-26
**Status**: In Progress

## Summary

Dino will calculate one live weekly coaching record from existing workout and roster data. The Athlete and active Coach will see the same assignment, completion, review, and missed information. No database migration or new infrastructure is needed.

## Context

The current Athlete and Coach weekly summaries use deterministic mock data. Real assignments, completions, reviews, Accounts, and active coaching relationships now exist, so the mock weekly layer can be replaced without creating another source of truth.

## Requirements

**User stories**:

1. As an Athlete, I want to see my previous, current, and next training week so I know what is due and what happened.
2. As a Coach, I want a compact weekly roster view so I can find Athletes who need review or follow up.

**Acceptance criteria**:

1. **AC-1**: Athlete Progress shows a Monday to Sunday record for the previous, current, or next week from real workout records.
2. **AC-2**: Coach Reports shows the same weekly record for every active roster Athlete, with paged results and actionable ordering.
3. **AC-3**: Daily states are rest, scheduled, today, missed, awaiting review, or reviewed, and each workout opens the existing detail screen.
4. **AC-4**: Due, completed, awaiting review, reviewed, missed, and progress values follow the confirmed derivations and show “No workouts due” when due is zero.
5. **AC-5**: Athlete and Coach Home replace only their weekly mock information with live summaries. Nutrition, sleep, weight, and recovery mocks remain outside this feature.
6. **AC-6**: An Athlete reads only their own record. A Coach reads only Athletes in an active coaching relationship. Former and unrelated Coaches are denied without Athlete disclosure.
7. **AC-7**: Invalid week dates and time zones return validation errors. Missing authentication and wrong roles use the existing API error contract.
8. **AC-8**: Assignment, completion, and review refresh weekly query data. Cached data may remain visible while offline with a stale message and Retry, but no offline write is queued.

## Options considered

### Option 1: Calculate from existing records

Read the existing workout and roster tables and derive the weekly view for each request.

### Option 2: Store weekly summary rows

Create another table and keep summary values synchronized with workout changes.

## Decision

**Chosen option**: Option 1, calculate from existing records.

Use the existing NestJS, PostgreSQL, Drizzle, Expo Router, `expo/fetch`, and TanStack Query patterns. Add no schema, package, environment, analytics, or audit change.

**Implementation skills**: `expo-overview` (`.agents/skills/expo-overview/`) · `expo-data-fetching` (`.agents/skills/expo-data-fetching/`) · `expo-router` (`.agents/skills/expo-router/`) · `expo-native-ui` (`.agents/skills/expo-native-ui/`)

## Rationale

The source records already enforce workout ownership and lifecycle. Live calculation avoids synchronization failures and keeps this Alpha slice small. Stored summaries can be reconsidered only after measured query performance requires them.

## Feature design

**Data model sketch**:

Use `accounts`, active `coachingRelationships`, `workoutAssignments`, `workoutCompletions`, and `workoutReviews` as read only sources. Add no table or column.

**API surface**:

1. `GET /weekly-progress` accepts required `weekStart` and `timeZone`. Athlete callers receive their own detail. Coach callers receive an aggregate summary plus active roster rows. Coach input accepts an opaque `cursor`, default limit 20, and maximum limit 50.
2. `GET /weekly-progress/athletes/:athleteAccountId` accepts required `weekStart` and `timeZone`. It returns Athlete detail only to the active Coach.

Both detail responses include week dates, Athlete identity, summary counts, and seven ordered days. Each assigned day includes workout id, title, and stored assignment status.

**Value sourcing**:

1. Week start comes from the request and must be a real Monday in `YYYY-MM-DD` form. Week end is six calendar days later.
2. Viewer today comes from the server clock expressed in the validated request IANA time zone.
3. Due includes assignments on or before viewer today. Completed includes every assignment with a completion exactly once. Awaiting review means completion exists and review does not. Reviewed means review exists. Missed means the assigned date is before viewer today and completion does not exist.
4. Progress is completed divided by due, rounded to the nearest whole percent. It is null when due is zero.
5. Day state is reviewed when a review exists, awaiting review when a completion exists, missed for an unfinished past assignment, today for an unfinished assignment today, scheduled for an unfinished future assignment, and rest when no assignment exists.
6. Coach ordering uses awaiting review count descending, missed count descending, defined lower progress first, then Athlete display name and id. Rows with nothing due come after actionable rows.

**Key invariants**:

1. Completed and reviewed are not added together for progress. A reviewed workout counts once.
2. Future assignments never lower progress.
3. Athlete and Coach detail use the same summary and day derivation.
4. The mobile app exposes only previous, current, and next navigation, while the API accepts any valid Monday.

**Security model**:

The existing Account guard resolves the caller. Athlete detail always uses the caller Account id. Coach overview joins only active relationships owned by the caller. Selected Athlete detail requires the same active relationship and returns `404` when inaccessible. Wrong role returns `403`, missing authentication returns `401`, and invalid input returns `422`.

**Screen design**:

1. Athlete Progress contains a compact week navigator, summary card, and seven day list. Athlete Home replaces its weekly card and strip with the current live week.
2. Coach Reports contains the week navigator, aggregate summary, paged roster rows, and an Athlete detail route. Coach Home shows progress, awaiting review, and missed tiles.
3. Loading, empty, unavailable, saved stale, and retry states use existing Dino workout surfaces. Touch targets remain at least 48 dp and status always includes text.

**Critical test scenarios**:

1. A completed then reviewed assignment counts once and appears identically for Athlete and Coach, verifies **AC-1**, **AC-3**, and **AC-4**.
2. Time zone and Monday boundary tests derive due, today, scheduled, and missed correctly, verifies **AC-1**, **AC-4**, and **AC-7**.
3. Active, former, and unrelated Coach requests prove private access, verifies **AC-6**.
4. Offline cached data, retry, and mutation invalidation prove refresh behavior, verifies **AC-8**.

## Build plan

1. [x] Add the shared weekly API derivation, validation, private routes, pagination, and focused API tests, satisfies **AC-1**, **AC-2**, **AC-4**, **AC-6**, and **AC-7**.
2. [x] Add the typed mobile client, query keys, offline behavior, and mutation invalidation, satisfies **AC-4** and **AC-8**.
3. [x] Build Athlete Progress and its live Home summary, satisfies **AC-1**, **AC-3**, **AC-4**, **AC-5**, and **AC-8**.
4. [x] Build Coach Reports, Athlete detail, and live Home metrics, satisfies **AC-2**, **AC-3**, **AC-4**, **AC-5**, and **AC-8**.
5. [x] Run the complete project checks and remove replaced weekly mock code, satisfies **AC-1** through **AC-8**.

## Consequences

**Positive**:

1. Both roles use one calculation and the existing sources of truth.
2. The slice stays small and carries no migration risk.

**Negative and tradeoffs**:

1. Coach overview performs aggregate queries at read time.
2. A device supplied time zone is required for correct due and missed meaning.

**Neutral**:

1. Body weight, nutrition, sleep, recovery, exports, and long term analytics remain later features.

## Migration plan

**Strategy**: no migration needed.
