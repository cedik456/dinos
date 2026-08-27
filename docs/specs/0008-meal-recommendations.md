# 0008. Meal recommendations

**Date**: 2026-08-27
**Status**: In Progress

## Summary

Dino will give Coaches one simple weekly meal recommendation editor and Athletes one read only daily view. Recommendations contain only meals and food amounts. Nutrition targets, calculations, logging, recipes, imports, and AI remain separate later work.

## Context

Coaches need a lightweight way to tell an Athlete what to eat without turning meals into tasks or building a nutrition tracking product. Athletes need a clear daily reference that does not imply completion, adherence, or review.

The existing app already has verified Coach and Athlete roles, active coaching relationships, a NestJS API, PostgreSQL, and role specific navigation. This feature must reuse those boundaries and remain small enough for the current Tracer Bullet build approach.

Meal guidance may remain useful after a coaching relationship ends, but a former Coach must not retain access. The model therefore needs permanent relationship ownership, historical Athlete visibility, current Coach write protection, and deterministic handling when an Athlete changes Coaches during a week.

## Requirements

**User stories**:

- As a Coach, I want to create one weekly set of meal recommendations for an active Athlete so that the Athlete has practical daily guidance.
- As an Athlete, I want to browse my recommendations one day at a time so that I can understand the plan without logging or completing anything.
- As a Coach, I want failed or conflicting saves to preserve my work so that I can recover safely.

**Acceptance criteria**:

- **AC-1**: A verified Coach can select an active roster Athlete and any week, edit a current or future week one day at a time, add meals and food items, and save the complete week in one action.
- **AC-2**: An Athlete can view only their own recommendations for the previous, current, and next week, one selected day at a time, with no edit, complete, skip, review, or logging controls.
- **AC-3**: Weeks run Monday through Sunday. Empty days are shown without stored day records, and a week may omit any meal or day.
- **AC-4**: A meal uses Breakfast, Lunch, Dinner, Snack, or a custom name. Default order is Breakfast, Lunch, Snack, Dinner, while a custom meal remains where the Coach created it.
- **AC-5**: Each food item contains only a name, a positive decimal amount with at most three decimal places, a controlled unit, and an entry position. A Coach can move items up or down. One day allows at most eight meals and one meal at most twenty items.
- **AC-6**: A Coach can edit current and future weeks. Past weeks are view only. Deleting a week requires an explicit confirmation, and saving an empty week never silently deletes it.
- **AC-7**: A successful save or delete immediately refreshes the Coach and Athlete meal recommendation queries without restarting the app.
- **AC-8**: Saving uses a version check. A stale save is rejected without partial changes, preserves the local draft, and asks the Coach to reload. After an uncertain timeout, the app reloads the server plan before offering another save.
- **AC-9**: Leaving the editor or changing Athlete or week with unsaved changes requires the Coach to save or discard them.
- **AC-10**: Plans belong to the coaching relationship that created them. Only the active Coach may read or change that relationship's plans. The Athlete keeps plans for dates when that relationship was active, except unused future recommendations after it ends. A former Coach has no access.
- **AC-11**: If an Athlete changes Coaches during a week, each day displays the plan from the relationship active on that day. The API identifies the Coach for the displayed day without exposing another relationship's private data.
- **AC-12**: Cached recommendations may remain visible with a stale message and Retry action when the network fails. Creating, editing, and deleting require a connection and never queue offline writes.
- **AC-13**: Missing authentication returns `401`, the wrong role returns `403`, inaccessible Athlete data returns privacy safe `404`, stale versions return `409`, and invalid dates, time zones, names, amounts, units, ordering, or limits return `422`.
- **AC-14**: Athlete navigation becomes Home, Workouts, Meals, Progress, Profile. Coach navigation becomes Home, Athletes, Programs, Meals, Reports. Both Meals screens use Dino styling, one day selector, lightweight sections, dividers, accessible labels, and enough bottom space for the floating navigation.

## Options considered

### Option 1: Store the week as one JSON value

The API could store the complete editable week inside one database column.

**Pros**:

- It has the fewest tables and the quickest initial write path.

**Cons**:

- Database constraints cannot reliably protect amounts, units, limits, ordering, or individual relationships.
- Later reads and safe changes become harder without replacing and validating an opaque document.

### Option 2: Store a relational weekly plan with meals and food items

The week is one plan owned by a coaching relationship. Meals and food items are ordered child records saved together.

**Pros**:

- PostgreSQL can enforce ownership, ordering, valid values, and cascade deletion.
- The model matches the real Week to Meal to Food item structure without storing empty days.

**Cons**:

- It requires three tables and transactional replacement logic.

### Option 3: Save each day and meal through separate mutations

Every edit could be sent immediately through small create, update, reorder, and delete endpoints.

**Pros**:

- Small edits can persist without saving the whole week.

**Cons**:

- It adds many endpoints, intermediate states, and more difficult recovery from partial failure.
- It conflicts with the confirmed explicit Save week experience.

## Decision

**Chosen option**: Option 2: Store a relational weekly plan with meals and food items

Dino will store one versioned plan per coaching relationship and Monday date, with ordered meal and food item children replaced atomically by one Save week action.

## Rationale

The relational model is slightly larger than a JSON column but keeps important rules visible and enforceable. It fits the existing PostgreSQL and Drizzle stack and avoids a second storage pattern for ordinary structured data.

Whole week replacement matches the Coach experience and gives one clear success or failure boundary. A version field prevents one session from silently overwriting another, while a reload after an uncertain timeout avoids adding retry records or background reconciliation.

## Feature design

**Data model sketch**:

| Record                      | Required fields                                                                                                  | Relationships and constraints                                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `meal_recommendation_plans` | `id` UUID, `coachingRelationshipId` UUID, `weekStart` date, `version` positive integer, `createdAt`, `updatedAt` | Relationship uses `restrict` on deletion. One plan per relationship and `weekStart`. `weekStart` must be Monday.                                                                                                                                 |
| `meal_recommendation_meals` | `id` UUID, `planId` UUID, `dayOffset` small integer, `kind`, nullable `customName`, `position` small integer     | Plan uses cascade deletion. `dayOffset` is 0 through 6. `kind` is `breakfast`, `lunch`, `dinner`, `snack`, or `custom`. `customName` is required only for `custom` and is at most 60 trimmed characters. Position is unique within plan and day. |
| `meal_recommendation_items` | `id` UUID, `mealId` UUID, `name` varchar 100, `amount` decimal 10,3, `unit` varchar 8, `position` small integer  | Meal uses cascade deletion. Name is 1 through 100 trimmed characters. Amount is greater than zero. Unit is `g`, `kg`, `ml`, `L`, `pc`, `pcs`, `tbsp`, `tsp`, or `cup`. Position is unique within a meal.                                         |

There is no day table. The API always returns seven derived days and attaches stored meals to their `dayOffset`.

**State transitions**:

- Weekly plan: absent to saved, saved version N to saved version N plus one, saved to deleted.
- Past plan: editable to view only when the selected week becomes earlier than the current week in the validated viewer time zone.
- Coaching access: active relationship allows its Coach to read and write. Ended relationship removes Coach access immediately and limits Athlete visibility to eligible dates.

**API surface**:

| Endpoint                                           | Method | Key inputs                                                                            | Key outputs                                                                                                                     | Auth                              | Key errors                                     |
| -------------------------------------------------- | ------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------- |
| `/meal-recommendations`                            | GET    | `weekStart` Monday date, `timeZone` IANA name                                         | Seven Athlete days with eligible meals, source Coach display name per populated day, plan versions, stale capable response data | Verified Athlete                  | `401`, `403`, `422`                            |
| `/meal-recommendations/athletes/:athleteAccountId` | GET    | Athlete UUID, `weekStart`, `timeZone`                                                 | Seven days from the requesting Coach relationship, current plan version, editable flag                                          | Active verified Coach for Athlete | `401`, `403`, privacy safe `404`, `422`        |
| `/meal-recommendations/athletes/:athleteAccountId` | PUT    | `weekStart`, `timeZone`, `expectedVersion` nullable, complete ordered meals and items | Saved weekly plan and next version                                                                                              | Active verified Coach for Athlete | `401`, `403`, privacy safe `404`, `409`, `422` |
| `/meal-recommendations/athletes/:athleteAccountId` | DELETE | `weekStart`, `timeZone`, `expectedVersion`                                            | No content                                                                                                                      | Active verified Coach for Athlete | `401`, `403`, privacy safe `404`, `409`, `422` |

The PUT request replaces the plan's meals and items inside one database transaction. `expectedVersion` is null only when creating an absent plan. Saving a new or existing plan with zero meals returns `422`; the Coach uses explicit Delete week for an existing plan.

**Value sourcing**:

| Action                         | Value produced or displayed     | Source                                                                                                                          |
| ------------------------------ | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Select Athlete                 | Active roster choices           | Existing authenticated Coach roster query from spec 0003                                                                        |
| Select week                    | Monday and Sunday dates         | Selected `weekStart`, with Monday validation in the API                                                                         |
| Select day                     | Day label and date              | `weekStart` plus `dayOffset` from 0 through 6, formatted in the device locale                                                   |
| Determine current or past      | Editability                     | Server current time interpreted in the validated request `timeZone`, compared by week                                           |
| Show Athlete meals             | Eligible plan for each day      | Athlete account from verified identity plus the coaching relationship active on that local calendar day                         |
| Resolve a transition day       | One relationship for that day   | Eligible relationship with the latest `startedAt` not after the local day end, provided it has not ended before that day begins |
| Show Coach meals               | Owned weekly plan               | Active relationship between authenticated Coach and path Athlete plus requested `weekStart`                                     |
| Show meal name                 | Preset or custom label          | Meal `kind`, or `customName` when kind is `custom`                                                                              |
| Insert a preset meal           | Initial meal position           | Canonical Breakfast, Lunch, Snack, Dinner order while preserving the relative order of existing custom meals                    |
| Show food row                  | Name, amount, and unit          | Stored food item columns ordered by `position`                                                                                  |
| Save week                      | New version and normalized plan | Complete request body validated and committed atomically, with version incremented by the server                                |
| Delete week                    | Absent plan                     | Confirmed app action plus matching `expectedVersion`, committed by the server                                                   |
| Show Coach identity to Athlete | Coach display name              | Account joined through the eligible coaching relationship                                                                       |
| Show stale message             | Cached status                   | TanStack Query cached data plus a failed refresh state                                                                          |

**Key invariants**:

- A relationship has at most one plan for a Monday `weekStart`.
- A plan has at most eight meals for each `dayOffset`. A meal has at most twenty items.
- Positions are zero based, consecutive, and unique inside their parent order.
- A preset meal has no custom name. A custom meal has one valid custom name.
- Displayed meal names are unique within one day without regard to letter case. A custom name cannot duplicate a preset or another custom meal.
- The server accepts only the controlled unit values and normalized trimmed names.
- Save and delete require the exact current version. A conflict changes nothing.
- One PUT either replaces every meal and item and increments the version, or changes nothing.
- An ended relationship immediately blocks its former Coach from every meal recommendation route.
- Athlete reads never accept an Athlete ID from the client. Identity comes from the verified session.
- Future days owned by an ended relationship are omitted. Historical days remain visible only where that relationship was active.
- Meals are recommendations. No completion, adherence, review, nutrition total, or derived target is stored.

**Security model**:

- Existing Clerk authentication and permanent Dino roles guard every route.
- Coach ownership comes from the authenticated Account and active coaching relationship, never a submitted Coach ID.
- Only an active Coach can read, create, change, or delete plans for that Coach relationship.
- An Athlete can read only their own eligible plan days and cannot mutate them.
- Former Coaches receive privacy safe `404` for Athlete scoped routes and cannot read historical plan content.
- Meal and food content is private coaching data. Request bodies, names, amounts, and units are excluded from logs, telemetry, and error messages.
- This feature does not collect allergies, diagnoses, medical instructions, calorie targets, or other new regulated health fields.

No new environment variables or third party credentials are required.

**Critical test scenarios**:

- Happy path: an active Coach creates a current week with preset and custom meals, saves it once, and the Athlete immediately reads the same ordered day content, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, and **AC-7**.
- Empty content: days without meals display a clear empty state, while a completely empty save is rejected and explicit deletion removes the week, verifies **AC-3** and **AC-6**.
- Concurrent edit: two Coach sessions load the same version, one saves, and the other receives `409` while retaining its draft, verifies **AC-8**.
- Uncertain timeout: commit a save but lose its response, then reload and compare the returned plan before allowing another save, verifies **AC-8**.
- Unsaved navigation: change Athlete, week, tab, or route with a dirty editor and require Save or Discard, verifies **AC-9**.
- Relationship end: end a relationship and confirm the former Coach receives `404`, the Athlete retains eligible historical days, and unused future days disappear, verifies **AC-10** and **AC-13**.
- Coach transition: change Coaches during one week and confirm each Athlete day resolves to the correct relationship without leaking the other Coach plan, verifies **AC-11**.
- Offline read: lose the network after loading a plan and confirm cached content, stale messaging, and Retry remain available while writes stay disabled, verifies **AC-12**.
- Validation and limits: reject invalid Mondays, time zones, names, amounts, units, duplicate positions, more than eight meals, and more than twenty items without partial writes, verifies **AC-5** and **AC-13**.
- Navigation and access: verify both five destination tab bars, labels, touch targets, screen reader names, and read only Athlete controls, verifies **AC-2** and **AC-14**.

## Build plan

1. [x] Add the three confirmed tables, constraints, indexes, and one migration, then prove one relationship owned Monday plan with one meal and one item through the database, satisfies **AC-1**, **AC-3**, **AC-4**, **AC-5**, **AC-10**, and **AC-11**.
2. [x] Add the smallest authenticated Athlete and Coach read path with Monday and time zone validation, seven derived days, active relationship ownership, past visibility, and transition day resolution, satisfies **AC-2**, **AC-3**, **AC-10**, **AC-11**, and **AC-13**.
3. [x] Add atomic whole week Save and explicit Delete with validation, limits, version conflicts, past week protection, and privacy safe errors, satisfies **AC-1**, **AC-4**, **AC-5**, **AC-6**, **AC-8**, and **AC-13**.
4. [x] Add shared meal recommendation queries, cache keys, post mutation refresh, stale cached reads, Retry, and no offline writes, satisfies **AC-7**, **AC-8**, and **AC-12**.
5. [x] Add the Coach Meals destination with active Athlete selection, week and day navigation, lightweight meal and food editors, reordering, Save week, Delete week, preserved drafts, and leave protection, satisfies **AC-1**, **AC-4**, **AC-5**, **AC-6**, **AC-8**, **AC-9**, and **AC-14**.
6. [x] Add the Athlete Meals destination with previous, current, and next week navigation, selected day sections, Coach attribution, empty states, and no mutation controls, satisfies **AC-2**, **AC-3**, **AC-10**, **AC-11**, **AC-12**, and **AC-14**.
7. [ ] Add database, API, app, and end to end coverage for the complete active Coach to Athlete thread, validation, concurrency, timeouts, relationship end, Coach transition, offline reads, navigation, and private logs, satisfies **AC-1** through **AC-14**.

## Consequences

**Positive**:

- Coaches get useful meal guidance without building a nutrition tracker.
- Athletes receive one clear daily plan that never behaves like a required task.
- Relationship ownership keeps access consistent with Dino roster privacy.
- Atomic weekly saves avoid partial plans.

**Negative and tradeoffs**:

- Editing a large week means sending and replacing the complete plan.
- A stale session must reload before it can save again.
- The controlled unit list requires an app and API update when Dino adds another unit.
- A week spanning a Coach change can show recommendations from different Coaches on different days.

**Neutral**:

- The migration adds three relational tables but no new service, package, environment variable, or infrastructure.
- Past recommendations are historical guidance, not a record of what the Athlete ate.
- The navigation gains a fifth destination for both roles and keeps the existing floating tab treatment.

## Follow-up

- [ ] Consider copy day, copy week, and reusable meal templates only after pilot Coaches show repeated entry is a real problem.
- [ ] Consider JSON import and export only after the normal editor is proven.
- [ ] Keep calorie, macro, vitamin, protein, body weight, sleep, recovery, food databases, barcode scanning, recipes, meal completion, adherence, chat, and AI in separate future decisions.
