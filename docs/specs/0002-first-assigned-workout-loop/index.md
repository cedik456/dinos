# 0002. First assigned workout loop

**Date**: 2026-08-25
**Status**: Accepted

## Summary

Dino will prove its core coaching value with one complete real workout journey. A Coach creates and assigns a dated workout, the Athlete completes it with an optional note, and the Coach can respond and mark it reviewed. The app, API, and database will share one authoritative record while local preview access keeps development usable until hosted identity is ready.

## Requirements

**User stories**:

- As a Coach, I want to create and assign one dated workout so that my Athlete knows what to do.
- As an Athlete, I want to see my assigned workout and mark it complete so that my Coach can review my work.
- As a Coach, I want to see completed work, leave an optional response, and mark it reviewed so that the coaching loop has a clear end.

**Acceptance criteria**:

- **AC-1**: A Coach can create one workout from Programs, choose today or a future calendar date, add a title, an optional overview note, and 1 to 12 ordered exercises, then assign it to the preview Athlete in the same action.
- **AC-2**: Each exercise requires a name, sets, and a short repetitions prescription. It may include an optional instruction. Names allow at most 100 characters, repetitions at most 32 characters, notes and instructions at most 1000 characters, and sets must be from 1 through 20.
- **AC-3**: An Athlete can see past, current, and future assignments in Plan and open full workout details. A future workout is readable but cannot be completed before its assigned date in the assignment creation time zone.
- **AC-4**: On or after the assigned date, the assigned Athlete can mark the whole workout complete and may include one optional note. Completion time is recorded by the server and the Coach can see the completed workout on Home as awaiting review.
- **AC-5**: The owning Coach can open a completed workout, add an optional response, and mark it reviewed. Both Coach and Athlete then see the final reviewed state and response.
- **AC-6**: The owning Coach can replace the title, overview, date, and full ordered exercise list while the assignment is still assigned. A completed or reviewed workout cannot be edited.
- **AC-7**: One Athlete can have at most one workout on a calendar date. Ownership, Athlete, and Coach cannot change after creation. Workouts cannot be cancelled or deleted in this slice.
- **AC-8**: The only valid lifecycle is `assigned` to `completed` to `reviewed`. Completion, review, and their status changes commit atomically. A reviewed workout cannot be reopened or changed.
- **AC-9**: Create, edit, complete, and review are safe to retry. An exact retry returns the existing successful result. A retry with different content returns a conflict and never changes the earlier result.
- **AC-10**: Only the owning active Coach can create, list, open, edit, and review their assignments. Only the assigned active Athlete can list, open, and complete theirs. Requests outside ownership appear not found, and pending, disabled, cancelled, unmatched, or wrong role accounts are denied.
- **AC-11**: Workout lists use cursor pagination with a default page size of 20 and a maximum of 50. They support status, assigned date range, relative date, direction, and awaiting review filters. Normal lists order by assigned date, creation time, and identifier. Awaiting review orders by completion time and identifier.
- **AC-12**: Every affected screen has clear loading, populated, empty, stale with retry, validation error, conflict refresh, and unavailable service states. Cached successful data may remain visible offline, but Dino does not queue mutations or claim that an offline change succeeded.
- **AC-13**: In local development only, an explicit preview setting can map a preview role header to fixed seeded Coach and Athlete Accounts. The bypass stays closed unless both development mode and `DINO_PREVIEW_ACCESS_ENABLED=true` are present, and it is unavailable in pilot and production environments.
- **AC-14**: Workout titles, overview notes, exercise names, repetitions, instructions, Athlete notes, and Coach responses never appear in logs, analytics, traces, or error details. Structured API logs contain only durable identifiers, lifecycle status, duration, request identifier, and stable error codes.
- **AC-15**: The new workout screens use Tailwind CSS classes through NativeWind on iOS, Android, and web. They preserve Dino's semantic colors, spacing, radii, 48 dp touch targets, status text, and bottom inset rules without changing existing screens.
- **AC-16**: This feature is usable through the guarded local preview journey. Pilot and production creation remain unavailable until hosted identity and roster ownership are verified, and the API returns a stable `ROSTER_REQUIRED` conflict instead of guessing an Athlete.

## Decision

**Chosen option**: One transactional assignment resource with snapshot exercises and separate completion and review records

Build a thin end to end REST journey on the existing NestJS and PostgreSQL foundation. Keep the workout as an assigned snapshot rather than introducing reusable templates or an exercise library before those later features are designed.

This specification records Ced's approval to make the local workout journey the next development gate. The gate ends at verified local preview behavior. It does not authorize pilot or production access without the identity and roster prerequisites.

**Implementation skills**: `expo-overview` (`expo/skills`, `.agents/skills/expo-overview/`) · `expo-tailwind-setup` (`expo/skills`, `.agents/skills/expo-tailwind-setup/`) · `expo-data-fetching` (`expo/skills`, `.agents/skills/expo-data-fetching/`) · `tanstack-query` (`tanstack-skills/tanstack-skills`, `.agents/skills/tanstack-query/`)

Use Tailwind CSS v4 with NativeWind v5 and `react-native-css` for the new workout surfaces. Configure Metro and PostCSS as defined by the Expo Tailwind setup, import one global CSS entry from the app root, and expose CSS enabled React Native components from `src/components/ui/tw/`. Use `clsx` and `tailwind-merge` through one `cn` helper for conditional classes.

Install the Expo compatible setup with `npx expo install tailwindcss@^4 nativewind@5.0.0-preview.2 react-native-css@0.0.0-nightly.5ce6396 @tailwindcss/postcss tailwind-merge clsx`. Pin the `lightningcss` resolution to `1.30.1`. Tailwind uses Metro and PostCSS configuration and does not add a NativeWind Babel preset.

Adopt Tailwind gradually. Existing screens keep their current `StyleSheet` code until they are deliberately changed. A component uses Tailwind or `StyleSheet` for normal layout and appearance, not both. Platform computed values such as native shadows may remain in `StyleSheet` when a class cannot express them cleanly.

Keep `src/theme/tokens.ts` as Dino's semantic visual contract. Mirror its colors, spacing, and radii as named CSS theme variables in `src/global.css`, then add a focused contract test that fails when the mirrored values drift. Workout components use semantic classes such as `bg-background`, `text-foreground`, and `rounded-card`, not raw palette values.

Use TanStack Query as the mobile server state layer. Create one stable `QueryClient` at the app root, use hierarchical assignment list and detail keys, pass query cancellation signals to fetch, and refetch on reconnect and app foreground. Assignment queries use a 30 second stale time and a 5 minute cache lifetime. Queries retry transient network and server failures twice with bounded delay and never retry client errors. Mutations have no automatic client retry. The interface preserves entered content and offers an explicit retry because the server makes each operation naturally safe to repeat.

Queries may show the last successful cached result during a connection failure with visible stale and retry messaging. There is no persisted offline queue and no optimistic lifecycle change. After successful mutations, the app updates or invalidates assignment detail, Plan, Programs, and Coach Home queries as applicable.

Every workout query key includes the authenticated or preview Account id and role. The root key shape is `['workoutAssignments', accountId, role]`, followed by `list` plus canonical filters or `detail` plus assignment id. When Account id or preview role changes, remove all workout queries from the previous actor before rendering the new role.

## Feature design

**Data model sketch**:

```text
WorkoutAssignment

id                  uuid                         required, primary key
coachAccountId      uuid                         required, foreign key to Account
athleteAccountId    uuid                         required, foreign key to Account
title               varchar(100)                 required
overviewNote        varchar(1000)                nullable
assignedDate        date                         required
creationTimeZone    varchar(64)                  required, validated IANA time zone
status              assigned | completed | reviewed
createdAt           timestamptz                  required
updatedAt           timestamptz                  required

unique athleteAccountId plus assignedDate

AssignmentExercise

id                  uuid                         required, primary key
assignmentId        uuid                         required, foreign key to WorkoutAssignment
position            smallint                     required, 1 through 12
name                varchar(100)                 required
sets                smallint                     required, 1 through 20
repetitions         varchar(32)                  required
instruction         varchar(1000)                nullable

unique assignmentId plus position

WorkoutCompletion

id                  uuid                         required, primary key
assignmentId        uuid                         required, unique foreign key to WorkoutAssignment
athleteAccountId    uuid                         required, foreign key to Account
note                varchar(1000)                nullable
completedAt         timestamptz                  required

WorkoutReview

id                  uuid                         required, primary key
assignmentId        uuid                         required, unique foreign key to WorkoutAssignment
coachAccountId      uuid                         required, foreign key to Account
response            varchar(1000)                nullable
reviewedAt          timestamptz                  required

Account 1  =====  many WorkoutAssignment as Coach
Account 1  =====  many WorkoutAssignment as Athlete
WorkoutAssignment 1  =====  1 to 12 AssignmentExercise
WorkoutAssignment 1  =====  zero or one WorkoutCompletion
WorkoutAssignment 1  =====  zero or one WorkoutReview
```

The first development seed command creates or reconciles fixed Coach and Athlete Accounts with stable UUID values and names `Ced` and `Mika`. It refuses to run outside development and does not live in a migration.

```text
Preview Coach
id             10000000-0000-4000-8000-000000000001
authSubject    preview:coach:ced
displayName    Ced
role           Coach
status         active
header value   coach

Preview Athlete
id             10000000-0000-4000-8000-000000000002
authSubject    preview:athlete:mika
displayName    Mika
role           Athlete
status         active
header value   athlete
```

**State transitions**:

```text
assigned  ->  completed  ->  reviewed
```

Creating a completion or review record and updating assignment status happen in one database transaction. The transaction locks the assignment before it validates the current state. If a Coach edit and Athlete completion race, the first valid commit wins and the other request returns a conflict with instructions to refresh.

**API surface**:

| Endpoint                            | Method | Key inputs                                                                                                                                                                | Key outputs                  | Auth                                    | Key errors                                                                               |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| `/workout-assignments`              | POST   | title, overviewNote optional, assignedDate, creationTimeZone, exercises                                                                                                   | `WorkoutAssignmentDetailDto` | active owning Coach                     | 409 duplicate date or roster required, 422 invalid content or time zone, 503 unavailable |
| `/workout-assignments`              | GET    | cursor optional, limit 1 through 50 optional, one status optional, inclusive dateFrom and dateTo optional, relative optional, awaitingReview optional, direction optional | `WorkoutAssignmentPageDto`   | active Coach or Athlete, actor scoped   | 422 invalid filter or cursor mismatch, 503 unavailable                                   |
| `/workout-assignments/:id`          | GET    | assignment id                                                                                                                                                             | `WorkoutAssignmentDetailDto` | active owning Coach or assigned Athlete | 404 outside ownership, 503 unavailable                                                   |
| `/workout-assignments/:id`          | PATCH  | title, overviewNote optional, assignedDate, full exercises                                                                                                                | `WorkoutAssignmentDetailDto` | active owning Coach                     | 404 outside ownership, 409 lifecycle or duplicate date, 422 invalid content              |
| `/workout-assignments/:id/complete` | POST   | note optional                                                                                                                                                             | `WorkoutAssignmentDetailDto` | active assigned Athlete                 | 404 outside ownership, 409 early or invalid lifecycle, 422 invalid note                  |
| `/workout-assignments/:id/review`   | POST   | response optional                                                                                                                                                         | `WorkoutAssignmentDetailDto` | active owning Coach                     | 404 outside ownership, 409 invalid lifecycle, 422 invalid response                       |

The API resolves the Account from the verified identity subject or guarded local preview mapping. No endpoint accepts a Coach or Athlete Account identifier as actor proof. During this slice the create action derives the single fixed preview Athlete on the server and does not accept an Athlete identifier. A normal authenticated Coach without an approved roster target receives `409 ROSTER_REQUIRED`. Roster owned Athlete selection replaces that rule when the roster feature ships.

Every API error uses the existing `{ code, message, requestId }` envelope. Stable feature codes include `WORKOUT_DATE_TAKEN`, `WORKOUT_TOO_EARLY`, `WORKOUT_STATE_CONFLICT`, `WORKOUT_RETRY_CONFLICT`, `WORKOUT_NOT_FOUND`, `ROSTER_REQUIRED`, `VALIDATION_FAILED`, and `DATABASE_UNAVAILABLE`.

**Response contracts**:

```text
AccountSummaryDto
id, displayName

AssignmentExerciseDto
id, position, name, sets, repetitions, instruction

WorkoutCompletionDto
note, completedAt

WorkoutReviewDto
response, reviewedAt

WorkoutActionsDto
canEdit, canComplete, canReview

WorkoutAssignmentSummaryDto
id, title, assignedDate, dateRelation, status
coach, athlete
exerciseCount
completedAt, reviewedAt
awaitingReview
createdAt, updatedAt
actions

WorkoutAssignmentDetailDto
id, title, overviewNote, assignedDate, creationTimeZone, dateRelation, status
coach, athlete
exercises
completion, review
createdAt, updatedAt
actions

WorkoutAssignmentPageDto
items: WorkoutAssignmentSummaryDto[]
nextCursor: string | null
```

All dates use strict ISO `YYYY-MM-DD`. All timestamps use ISO 8601 UTC strings. `dateRelation` is `past`, `today`, or `future`, computed from the server current instant in the assignment creation time zone. Nullable optional text and absent lifecycle records return `null`, never an omitted field. Action flags are display hints derived from current server state and actor. `canEdit` means owning Coach plus assigned status. `canComplete` means assigned Athlete plus assigned status plus a date relation other than future. `canReview` means owning Coach plus completed status. Every mutation is still authorized and validated again by the server.

**Pagination contract**:

- Default limit is 20. Valid limits are integers from 1 through 50.
- Default direction is ascending. Normal ordering uses assignedDate, createdAt, then id in the selected direction.
- `awaitingReview=true` requires Coach scope and orders by completedAt ascending, then assignment id ascending so the oldest completed work is reviewed first.
- `relative` accepts `today`, `upcoming`, or `past`. The API evaluates each row from the server current instant in its stored creation time zone. It is mutually exclusive with dateFrom and dateTo.
- A cursor is opaque base64url encoded versioned JSON containing the last order tuple, direction, and a SHA 256 fingerprint of the canonical filters plus actor scope. It contains no private text.
- A cursor with changed filters, changed actor scope, invalid data, or an unsupported version returns `422 VALIDATION_FAILED`.
- The final page returns `nextCursor: null`.

**Mutation normalization and retry equality**:

- Trim leading and trailing whitespace from all text. Preserve internal whitespace.
- Reject a required string that is empty after trimming. Convert an absent or blank optional string to `null`.
- Count text limits as Unicode code points, matching PostgreSQL character length behavior.
- Accept assigned dates only as valid calendar values in strict `YYYY-MM-DD` form with no rollover.
- Validate the IANA time zone, store the canonical name returned by the server runtime, and compare that stored value on retries.
- Derive exercise position from request array order. Require integer sets. Compare ordered normalized exercise domain fields.
- Create and PATCH equality compares title, overviewNote, assignedDate, immutable creationTimeZone where applicable, and ordered exercise fields.
- Completion and review equality compares the normalized optional note or response.
- Generated ids, createdAt, updatedAt, completedAt, and reviewedAt never participate in retry equality.

**Value sourcing**:

| Action              | Value produced or displayed      | Source                                                                                        |
| ------------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| Create assignment   | acting Coach                     | verified Clerk subject resolved to Account, or guarded preview role mapping                   |
| Create assignment   | target Athlete                   | fixed preview Athlete Account resolved by the server until roster ownership ships             |
| Create assignment   | title, overview, date, exercises | validated request fields from the Coach form                                                  |
| Create assignment   | creation time zone               | device IANA time zone sent by the Coach app and validated by the API                          |
| Create assignment   | allowed date                     | server current instant formatted in the validated creation time zone                          |
| Create assignment   | identifiers and timestamps       | PostgreSQL UUID generation and transaction time                                               |
| List assignments    | ownership scope                  | authenticated Account id and permanent Account role                                           |
| List assignments    | status and dates                 | WorkoutAssignment columns                                                                     |
| List assignments    | date relation                    | server current instant compared with assignedDate in stored creationTimeZone                  |
| List assignments    | Coach and Athlete names          | related Account displayName columns                                                           |
| List assignments    | awaiting review                  | assignment status equals `completed`                                                          |
| List assignments    | stable order and cursor          | assignedDate, createdAt, and id tuple                                                         |
| List assignments    | direction and filter identity    | validated query fields in canonical order and their SHA 256 fingerprint                       |
| List assignments    | action flags                     | authenticated role, ownership, status, assigned date, and server current day rule             |
| Open assignment     | ordered exercises                | AssignmentExercise rows ordered by position                                                   |
| Open assignment     | completion and review            | related WorkoutCompletion and WorkoutReview rows                                              |
| Open assignment     | full response fields             | assignment rows, related Account displayName values, lifecycle rows, and derived action flags |
| Edit assignment     | replacement content              | validated full PATCH request                                                                  |
| Complete assignment | Athlete and note                 | authenticated Account and validated request note                                              |
| Complete assignment | completion time                  | database transaction time                                                                     |
| Complete assignment | earliest allowed day             | server current instant formatted in stored creationTimeZone compared with assignedDate        |
| Review assignment   | Coach and response               | authenticated Account and validated request response                                          |
| Review assignment   | review time                      | database transaction time                                                                     |
| Render app state    | stale and retry state            | TanStack Query cached data, fetch status, and network or API error                            |
| Render app state    | route and available actions      | authenticated role, assignment ownership, status, and assigned date rule                      |

**Screen state matrix**:

| Surface                | Populated and actions                                                                                   | Empty                                                           | Loading                                                | Stale or unavailable                                                       | Validation or conflict                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Coach Programs         | Today and upcoming assignments in ascending date order, with Create and assigned only Edit entry points | `No workouts assigned yet` plus Create                          | List skeleton, Create remains available                | Last data stays visible with status text and Retry                         | Create or edit form stays open with field messages, conflict offers Refresh |
| Athlete Plan           | Today first, Upcoming ascending, Past descending, with Open and eligible Complete actions               | `No workouts on your plan`                                      | Section skeletons                                      | Last data stays visible with status text and Retry                         | Completion note stays entered, conflict offers Refresh                      |
| Coach Home             | Awaiting review ordered by oldest completedAt first, with Open review action                            | `Nothing awaiting review`                                       | Compact card skeletons                                 | Last data stays visible with status text and Retry                         | Review response stays entered, conflict offers Refresh                      |
| Workout detail         | Full ordered workout, lifecycle text, notes allowed for the actor, and server action flags              | Not applicable, missing or foreign id shows not found           | Detail skeleton                                        | Last detail stays visible as stale, actions disable until refresh succeeds | Mutation text stays entered, conflict offers Refresh                        |
| Create or edit workout | Validated title, date, overview, 1 to 12 exercise editor, Save                                          | One blank exercise row is the initial form, not an empty result | Save shows progress and prevents a second local submit | Form stays intact with Retry, no queued save                               | Inline field messages, duplicate date or lifecycle conflict offers Refresh  |

Plan uses three actor scoped list queries. Today uses `relative=today`. Upcoming uses `relative=upcoming` and ascending direction. Past uses `relative=past` and descending direction. Programs uses today and upcoming queries. The server evaluates relative dates from each assignment creation time zone, so the app does not use its clock for completion permission.

**Key invariants**:

- Each assignment has exactly one immutable Coach and Athlete.
- An Athlete has at most one assignment for each assigned date, enforced by a database unique constraint.
- Each assignment contains 1 through 12 exercises with unique consecutive positions.
- Repetitions are a required short prescription such as `10`, `8 to 12`, or `AMRAP`.
- Assignment date is a calendar date. It is never converted into a timestamp.
- Creation time zone is immutable after creation. A Coach edit may change the date but not the time zone.
- Create and edit reject a date before the server current date in the stored validated time zone.
- Completion rejects a request before the assigned date in the stored creation time zone.
- Completion requires `assigned`. Review requires `completed`. Reviewed is final.
- Status, completion, and review cannot disagree. The relevant rows and transition commit together.
- An exact create retry for the same Athlete and date returns the matching assignment. Different content returns a conflict.
- An exact PATCH retry returns the current detail when the requested replacement already matches, even if a later lifecycle transition has committed. Different content after a transition returns a conflict.
- Repeated completion or review with the same optional text returns the existing successful detail. Different text returns a conflict.
- Normal pagination orders assignedDate, createdAt, then id in the requested direction. Awaiting review uses completedAt ascending then assignment id ascending. Every cursor is bound to actor and canonical filters.
- Outside ownership returns not found so identifiers cannot reveal another coaching relationship.
- New workout components import CSS enabled primitives from `src/components/ui/tw/` and use semantic Tailwind classes. Existing components are not migrated as part of this feature.
- The Tailwind theme mirrors the semantic values in `src/theme/tokens.ts`, and a contract test prevents silent token drift.
- Exercise positions are derived by the service as exactly 1 through N. The database enforces unique assignment and position values.

**Required indexes**:

- Unique `WorkoutAssignment(athleteAccountId, assignedDate)`.
- `WorkoutAssignment(coachAccountId, assignedDate, createdAt, id)` for Coach lists.
- `WorkoutAssignment(athleteAccountId, assignedDate, createdAt, id)` for Athlete lists.
- `WorkoutAssignment(coachAccountId, status, assignedDate, createdAt, id)` for status filtered Coach lists.
- `WorkoutAssignment(athleteAccountId, status, assignedDate, createdAt, id)` for status filtered Athlete lists.
- `WorkoutCompletion(completedAt, assignmentId)` plus the assignment Coach and status index for awaiting review.
- Unique `AssignmentExercise(assignmentId, position)`.

**Security model**:

- All normal access requires an active Account with the correct permanent role from spec 0001.
- A Coach can access only assignments where `coachAccountId` matches their authenticated Account.
- An Athlete can access only assignments where `athleteAccountId` matches their authenticated Account.
- Local preview access requires `NODE_ENV=development`, `DINO_PREVIEW_ACCESS_ENABLED=true`, and a valid `X-Dino-Preview-Role` value. Failure of any check closes access.
- The preview mapping uses server constants and seeded Accounts. The client never supplies an Account identifier.
- Preview access is forbidden in pilot and production configuration. It is a development bridge, not an authentication replacement.
- Overview notes, exercise instructions, Athlete completion notes, and Coach responses are private coaching content. They do not enter logs, analytics, traces, or error details.
- This adult private pilot uses a strong general privacy baseline. This slice makes no claim of medical record compliance.
- Structured logs contain only request id, durable Account and assignment ids, lifecycle status, duration, and stable error code.
- A missing or invalid identity returns `401`. An inactive, pending, cancelled, disabled, or wrong role Account returns `403`. A missing or foreign assignment returns `404`. Lifecycle and retry conflicts return `409`. Invalid fields, filters, and cursors return `422`.
- Workout title, overview, exercise name, repetitions, instruction, Athlete note, and Coach response are all private free text and are excluded from logs, analytics, traces, and error details.

**Configuration required**:

- `DINO_PREVIEW_ACCESS_ENABLED`: enables guarded local preview Account resolution only in development. Default is false.

**Critical test scenarios**:

- Happy path: seed preview Accounts, create a workout as Coach, see it in Athlete Plan, complete it on the assigned date, see it awaiting review on Coach Home, review it, and see the final response in both roles, verifies **AC-1**, **AC-3**, **AC-4**, **AC-5**, **AC-8**, and **AC-13**.
- Validation: reject invalid exercise counts and field limits, past dates, duplicate Athlete dates, and early completion without changing stored state, verifies **AC-2**, **AC-3**, and **AC-7**.
- Retry: repeat create, edit, complete, and review after simulated response loss, return the same result for matching content, and conflict for different content, verifies **AC-9**.
- Concurrency: race Coach edit with Athlete completion, allow only the first valid transaction, and make the loser refresh without partial rows, verifies **AC-6** and **AC-8**.
- Permission: deny wrong role, inactive Account, unmatched identity, and outside ownership while revealing no foreign assignment, verifies **AC-10** and **AC-13**.
- Network failure: keep last successful data visible with a stale warning, preserve unsent form content, and never queue or claim an offline mutation, verifies **AC-12**.
- Privacy: capture API logs through the journey and confirm no coaching text appears, verifies **AC-14**.
- Pagination: cross page boundaries with equal dates and creation times without duplicates or missing assignments, verifies **AC-11**.
- Styling: render Programs, Plan, Coach Home, and workout detail on iOS, Android, and web, confirm semantic token parity and accessibility rules, and confirm untouched screens have no visual regression, verifies **AC-15**.
- Release boundary: deny production preview headers and return `ROSTER_REQUIRED` for a real Coach without an approved Athlete relationship, verifies **AC-16**.
- Cache isolation: switch repeatedly between Ced and Mika and confirm no list or detail from the earlier actor appears, verifies **AC-10**, **AC-12**, and **AC-13**.
- Date boundary: create and complete assignments around midnight in two IANA time zones and confirm the stored time zone controls eligibility, verifies **AC-1** and **AC-3**.
- Response contract: snapshot list, detail, create, edit, complete, and review DTO shapes including explicit null values and action flags, verifies **AC-1**, **AC-3**, **AC-4**, **AC-5**, and **AC-6**.

## Build plan

1. Add the workout assignment, exercise, completion, and review schema with one migration, database constraints, indexes, and the retry safe development preview seed command, satisfies **AC-2**, **AC-7**, **AC-8**, **AC-9**, and **AC-13**.
2. Build the actor scoped create, list, and detail API thread with exact DTOs, normalized retry equality, time zone date validation, filter bound cursors, guarded preview access, error envelopes, required indexes, and focused API tests, satisfies **AC-1**, **AC-3**, **AC-7**, **AC-9**, **AC-10**, **AC-11**, **AC-13**, **AC-14**, and **AC-16**.
3. Install and configure Tailwind CSS v4, NativeWind v5, `react-native-css`, CSS enabled UI primitives, the Dino semantic theme mirror, and its token parity test. Prove a small fixture renders correctly on iOS, Android, and web before building workout screens, satisfies **AC-15**.
4. Add actor isolated TanStack Query state, connect Coach Programs creation and Athlete Plan reading to the real API using the Tailwind primitives, and ship the defined screen states and ordering for that thread, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-10**, **AC-11**, **AC-12**, **AC-15**, and **AC-16**.
5. Build transactional edit and completion APIs, connect Coach edit and Athlete completion UI, and verify retry and edit versus completion races, satisfies **AC-4**, **AC-6**, **AC-8**, **AC-9**, **AC-10**, **AC-12**, and **AC-15**.
6. Build transactional review, connect Coach Home awaiting review and workout detail response UI, refresh every affected query, and prove both roles see the final state, satisfies **AC-4**, **AC-5**, **AC-8**, **AC-9**, **AC-10**, **AC-12**, and **AC-15**.
7. Run the complete app, API, database, privacy log, actor switch, time zone boundary, pagination filter, DTO snapshot, cross platform screen, and real journey checks for every acceptance criterion and record the evidence, satisfies **AC-1** through **AC-16**.

## Consequences

**Positive**:

- Dino gains its first real value loop across every required layer.
- Snapshot exercises keep completed history stable and avoid coupling this slice to later templates and libraries.
- Server owned state and naturally repeatable mutations make mobile retries predictable.
- TanStack Query establishes one consistent pattern for connected mobile data.
- Tailwind makes new client layouts faster to compose while preserving Dino's semantic visual language.

**Negative / tradeoffs**:

- The Coach must retype exercise content until the exercise library and reusable templates ship.
- The temporary preview path adds security sensitive code that must stay visibly guarded and must be removed or disabled before pilot distribution.
- Cached offline reading is useful but completion still requires a connection.
- Storing lifecycle status beside one to one records requires transactional discipline to prevent disagreement.
- Gradual Tailwind adoption temporarily leaves two styling systems in the repository and requires a token parity test.
- NativeWind v5 and `react-native-css` use preview packages in the selected Expo setup, so upgrades need explicit compatibility checks.
- Several list queries support the role specific screen grouping, which increases request count but keeps pagination correct.

**Neutral**:

- This feature adds one PostgreSQL migration, TanStack Query, Tailwind CSS v4, NativeWind v5, `react-native-css`, and small class composition utilities.
- Workout dates follow the Coach device time zone captured at creation. Per person display preferences remain a later feature.
- Identity spec 0001 remains the authority for real Account activation, status, role, and session handling.
- Local preview is the only complete journey for this gate. Pilot creation remains deliberately unavailable until roster ownership ships.

## Follow-up

- [ ] Finish and verify spec 0001 before private pilot distribution. The preview bypass cannot satisfy pilot authentication.
- [ ] Replace the fixed preview Athlete choice with roster owned Athlete selection when private roster invitations ship.
- [ ] Capture `expo-overview`, `expo-tailwind-setup`, `expo-data-fetching`, and `tanstack-query` project wide conventions in root `AGENTS.md` because they affect connected mobile work across the app.
- [ ] Reconcile the project phase and styling guidance after this spec is approved so the root and API instructions name the workout gate and gradual Tailwind adoption as allowed work.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
