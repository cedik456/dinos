# Scope: Dino

Dino is a phone first coaching app for independent coaches and their athletes. The private MVP proves one complete coaching loop for adults across multiple countries, with no billing yet and with account ownership that can support subscriptions later.

**Build approach:** Tracer Bullet (prove one real thread through every required layer before broadening it).
**Workflow:** Alpha (`/check verify` after `/develop`). Identity, roster ownership, and privacy use Beta, which adds `/test`.

_These are recommendations to keep your build orderly, not requirements. Skip anything that does not fit. If you already know how to build a feature, you may use `/develop` and skip `/architect`. You decide when a feature is `done`._

## At a glance

| #   | Feature                                          | Phase           | Status      |
| --- | ------------------------------------------------ | --------------- | ----------- |
| 1   | Mobile experience foundation                     | Foundation      | existing    |
| 2   | API and database health foundation               | Foundation      | existing    |
| 3   | Account identity and exclusive roles             | Foundation      | in-progress |
| 4   | Private roster invitations                       | Slice 1         | in-progress |
| 5   | First assigned workout loop                      | Slice 1         | done        |
| 6   | Private exercise library and demonstration media | Slice 2         | planned     |
| 7   | Reusable workout templates and dated assignments | Slice 2         | in-progress |
| 8   | Weekly progress and review status                | Slice 3         | in-progress |
| 9   | Privacy and account lifecycle                    | Slice 3         | planned     |
| 10  | International units and dates                    | Slice 3         | planned     |
| 11  | Product monitoring                               | Pilot readiness | planned     |
| 12  | Private pilot distribution                       | Pilot readiness | planned     |

## Foundations

### 1. Mobile experience foundation · existing

The Expo application provides separate Coach and Athlete previews, role specific navigation, deterministic dashboards, shared visual tokens, accessible primitives, and a floating tab bar. Code in `src/`.

### 2. API and database health foundation · existing

The NestJS application validates its environment, connects to PostgreSQL through Drizzle, and exposes a database backed health endpoint. Code in `api/`.

### 3. Account identity and exclusive roles · in-progress · Beta

Give every person a secure account with exactly one Coach or Athlete role. Keep authentication and server authorization real from the first connected slice.
**Done when:** a Coach and an Athlete can sign in, each sees only the correct experience, and the API rejects access outside that account's role and ownership.

- **Spec:** [0001](../specs/0001-account-identity-exclusive-roles/index.md)
- **Code:** `api/src/identity/`, `api/src/database/schema.ts`, and `src/features/identity/`
- [x] Design it (spec): `/architect account identity and exclusive roles`
- [x] Build it: `/develop account identity and exclusive roles`
  - [x] Add the Account lifecycle schema, security events, migration, and retry safe provisioning command, covers **AC-1**, **AC-10**, and **AC-11**.
  - [x] Add Clerk token verification, invitation activation, authenticated Account context, `GET /me`, and server role guards, covers **AC-2**, **AC-4**, **AC-5**, and **AC-9**.
  - [x] Add the native Clerk flows, secure session restoration, exclusive Coach and Athlete routing, sign out, and account recovery, covers **AC-2**, **AC-3**, **AC-4**, **AC-8**, and **AC-9**.
  - [x] Add disable, reactivate, cancellation, reconciliation, and focused identity tests, covers **AC-6**, **AC-7**, **AC-8**, **AC-9**, and **AC-11**.
- [ ] Verify it: `/check verify account identity and exclusive roles`
- [ ] Test it: `/test account identity and exclusive roles`

## Slice 1: First real coaching loop

### 4. Private roster invitations · in-progress · Beta

Let Ced authorize Coach signup for the pilot, then let each Coach invite an adult Athlete with a basic code or link. Each person creates and owns their credentials.
**Done when:** an authorized Coach can create an account, invite an Athlete, and see that Athlete in a private roster after acceptance, while every other Coach is denied access.

- **Spec:** [0003](../specs/0003-private-roster-invitations/index.md)
- **Code:** `api/src/roster/`, `api/src/database/schema.ts`, `api/src/workouts/`, and `src/features/roster/`
- [x] Design it (spec): `/architect private roster invitations`
- [x] Build it: `/develop private roster invitations`
  - [x] Add the roster invitation, relationship, audit, retry, and provider reconciliation foundation, then prove one Coach can send and list a pending invitation, covers **AC-1**, **AC-4**, **AC-5**, **AC-6**, **AC-9**, **AC-11**, and **AC-12**.
  - [x] Add exact email Athlete acceptance for new and eligible existing Accounts, then change the owning Coach roster from Pending to Active, covers **AC-2**, **AC-3**, **AC-4**, **AC-6**, **AC-7**, **AC-10**, **AC-11**, **AC-13**, and **AC-14**.
  - [x] Add resend, revoke, expiry, rate limits, race handling, generic privacy responses, and every required failure state, covers **AC-5**, **AC-6**, **AC-7**, **AC-9**, **AC-10**, **AC-11**, and **AC-12**.
  - [x] Replace the fixed hosted workout target with active roster Athlete selection and prove the complete private journey, covers **AC-4**, **AC-8**, **AC-13**, and **AC-14**.
- [ ] Verify it: `/check verify private roster invitations`
- [ ] Test it: `/test private roster invitations`

### 5. First assigned workout loop · done

Prove the whole product with one narrow real path. A Coach creates one simple workout, assigns it to an Athlete on a date, the Athlete marks it complete, and the Coach leaves one response and marks it reviewed.
**Done when:** the full action moves through the mobile app, API, and database with clear loading, retry, empty, and error states, and both people can see the final review status.

- **Spec:** [0002](../specs/0002-first-assigned-workout-loop/index.md)
- **Code:** `api/src/workouts/`, `api/src/database/schema.ts`, and `src/features/workouts/`
- [x] Design it (spec): `/architect first assigned workout loop`
- [x] Build it: `/develop first assigned workout loop`
  - [x] Add the workout schema, fixed preview Accounts, actor scoped API, response contracts, retry rules, pagination, and privacy safeguards, covers **AC-1**, **AC-2**, **AC-3**, **AC-7**, **AC-8**, **AC-9**, **AC-10**, **AC-11**, **AC-13**, **AC-14**, and **AC-16**.
  - [x] Add Tailwind, NativeWind, semantic theme parity, actor isolated TanStack Query state, Coach Programs, and Athlete Plan, covers **AC-1**, **AC-2**, **AC-3**, **AC-10**, **AC-11**, **AC-12**, **AC-15**, and **AC-16**.
  - [x] Add Coach editing and Athlete completion with transactional conflict handling and preserved form state, covers **AC-4**, **AC-6**, **AC-8**, **AC-9**, **AC-10**, **AC-12**, and **AC-15**.
  - [x] Add Coach Home review, final status visibility for both roles, and the complete cross platform journey evidence, covers **AC-4**, **AC-5**, **AC-8**, **AC-9**, **AC-10**, **AC-12**, and **AC-15**.
- [x] Verify it: `/check verify first assigned workout loop`

## Slice 2: Reusable coaching work

### 6. Private exercise library and demonstration media · needs a decision

Give each Coach a private exercise library with optional reference exercises and private custom entries. Show video when available, then an image fallback, with written instructions always present.
**Done when:** a Coach can find or create an exercise without changing another Coach's library, and the Athlete always receives an understandable demonstration in an assigned workout.

- [ ] Design it (spec): `/architect private exercise library and demonstration media`

### 7. Reusable workout templates and dated assignments · in-progress

Let a Coach save a workout once, reuse it, and assign dated copies to Athletes without rebuilding repeated work.
**Done when:** a Coach can create, edit, reuse, and assign a template, while edits never change an Athlete's completed workout history.

- [ ] Ratify the built slices and decide template editing (spec): `/architect reusable workout templates and dated assignments`
- **Assumed slice spec:** [0004](../specs/0004-minimal-workout-templates.md)
- **Assumed assignment spec:** [0005](../specs/0005-template-assignment.md)
- **Decision debt:** assumed decisions in specs 0004 and 0005 are built and awaiting ratification.
- **Code:** `api/src/templates/`, `api/src/database/schema.ts`, `src/features/workouts/`, and `src/app/coach/programs/templates/`
- [x] Build the minimal template slice: `/develop minimal workout templates`
- [x] Build the template assignment slice: `/develop template assignment`

## Slice 3: Trust and visibility

### 8. Weekly progress and review status · in-progress

Replace the mock weekly views with real assignment, completion, and review information for both account types.
**Done when:** the Athlete and assigned Coach see the same weekly coaching record, including what was assigned, completed, awaiting review, and reviewed.

- **Spec:** [0006](../specs/0006-weekly-progress-review.md)
- **Code:** `api/src/weekly-progress/` and `src/features/weekly-progress/`
- [x] Design it (spec): `/architect weekly progress and review status`
- [x] Build it: `/develop weekly progress and review status`
  - [x] Add the role scoped weekly API and derivations, covers **AC-1**, **AC-2**, **AC-4**, **AC-6**, and **AC-7**.
  - [x] Add the weekly mobile queries and refresh behavior, covers **AC-4** and **AC-8**.
  - [x] Replace the Athlete and Coach weekly mock surfaces, covers **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, and **AC-8**.
- [ ] Verify it: `/check verify weekly progress and review status`

### 9. Privacy and account lifecycle · needs a decision · Beta

Give Athletes practical control over personal data and end Coach access when a coaching relationship ends.
**Done when:** an Athlete can view and correct profile data, request account deletion, and leave a coaching relationship without the former Coach retaining active access.

- [ ] Design it (spec): `/architect privacy and account lifecycle`

### 10. International units and dates · needs a decision

Serve an English first audience across countries with selectable kilograms or pounds and dates shown in the person's locale.
**Done when:** each person can choose weight units, stored values remain consistent, and workout dates display correctly for that person's locale and time zone.

- [ ] Design it (spec): `/architect international units and dates`

## Pilot readiness

### 11. Product monitoring · needs a decision

Capture app failures and a small set of events so the pilot can reveal where the core loop breaks or loses people.
**Done when:** errors are visible to the operator and Dino records invitation acceptance, workout assignment, workout completion, and Coach review without collecting unnecessary personal content.

- [ ] Design it (spec): `/architect product monitoring`

### 12. Private pilot distribution · needs a decision

Give the two Coaches and their adult Athletes a reliable way to install and update Dino on real iPhone and Android devices.
**Done when:** approved pilot members can install a private build, receive a tested update, and use the complete coaching loop without depending on a developer machine.

- [ ] Design it (spec): `/architect private pilot distribution`

## Deferred

These features stay outside the first private pilot build pass. You may enroll one later with `/scope <feature>` when evidence or product need makes it timely.

- **Seamless invitation continuation:** open an invitation in Dino when installed, or continue it after store installation · needs a decision
- **Push and email notifications:** remind Athletes and notify Coaches after key activity · needs a decision
- **Structured Athlete intake:** collect the coaching questions both pilot Coaches repeatedly need · needs a decision · Beta
- **Advanced workout logging:** record sets, repetitions, weight, effort, notes, substitutions, and progression · needs a decision
- **Body weight and recovery:** record body weight, sleep, and recovery trends · needs a decision · Beta
- **Nutrition coaching:** manage meal guidance, calorie, macro, vitamin, and protein targets · needs a decision · Beta
- **Portable weekly reports:** export or share a weekly coaching summary · needs a decision
- **Full program builder:** schedule reusable multiweek programs and progression · needs a decision
- **Subscription billing and plan limits:** let Coaches purchase plans that govern roster capacity · needs a decision · GA
- **Open Coach signup:** replace pilot authorization with public Coach registration and subscription entry · needs a decision · GA
- **Multiple languages:** translate the interface and coaching content · needs a decision
- **Offline synchronization:** log workouts without internet and reconcile changes safely · needs a decision · Beta
- **Athletes under 18:** add guardian consent and child privacy behavior · needs a decision · GA

## Legend

**The decision box.** Every planned feature currently needs a product or technical decision, so `/architect` is the recommended first step. Once a spec is captured, `/architect` will expand that feature into a small build and verification sequence.

**Feature lifecycle:** `planned` moves to `in-progress`, then `done`. `existing` means the feature predates this workflow and remains enrolled only for context.

**Workflow:** Alpha normally runs `/check verify` after `/develop`. A Beta tag adds `/test`. A GA tag adds a fresh `/check review` and `/document` after testing.

**Next step:** the first unticked box is the recommended command to run next. Atomic build tasks belong in the feature spec, not in this scope.
