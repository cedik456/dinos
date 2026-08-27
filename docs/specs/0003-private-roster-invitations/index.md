# 0003. Private roster invitations

**Date**: 2026-08-25
**Status**: In Progress

## Summary

Dino will let each authorized Coach invite adult Athletes into a private roster. The invitation is permission to register, so a new Athlete Account is created only after the invited person verifies the exact email and accepts. Each Coach remains isolated from every other Coach, and only an active roster Athlete can receive a workout.

Clerk owns registration, login, credentials, sessions, and invitation email delivery. PostgreSQL stores only Dino profiles, permanent roles, roster invitations, coaching relationships, and workouts. Each Dino profile links to one Clerk user id. Invitation failures use basic retry and occasional manual cleanup. Advanced audit, reconciliation, and lifecycle automation remain deferred until pilot evidence requires them.

## Requirements

**User stories**:

- As an authorized Coach, I want to invite an Athlete by email so that they can register and join my private roster.
- As an invited Athlete, I want to create my own credentials and confirm my own name so that I own my Dino account.
- As a Coach, I want to see pending invitations and active Athletes so that I know who can receive a workout.
- As a SaaS customer, I want my roster isolated from every other Coach so that private coaching access cannot cross tenant boundaries.

**Acceptance criteria**:

- **AC-1**: Public registration remains disabled. Ced authorizes each pilot Coach through spec 0001, and only an active Coach can create a roster invitation for one canonical email. A successful send creates one seven day Clerk application invitation and shows the email as `Pending` in that Coach's roster.
- **AC-2**: A new Athlete cannot activate or enter protected Athlete routes without one valid, unexpired, unrevoked roster invitation for their verified primary Clerk email. After hosted registration, Dino asks the Athlete for their own display name and adult confirmation, then creates the active Athlete Account and active CoachingRelationship in one database transaction.
- **AC-3**: An existing active Athlete with the exact verified invited email may accept only when they have no active CoachingRelationship. Acceptance links the existing Account without changing its role or credentials and creates the relationship in one database transaction.
- **AC-4**: The Coach Athletes screen shows separately paginated `Pending` invitations and `Active` Athletes. Pending rows show the invited email, delivery state, expiry, Resend, and Revoke. Active rows show the Athlete display name and can be selected for workout assignment.
- **AC-5**: A Coach can retry a failed invitation, resend a pending invitation, or revoke it before acceptance. Retry checks Clerk for an invitation carrying the Dino invitation identifier before creating another one. Resend replaces the known Clerk link and restarts the seven day expiry. Revoked and expired invitations cannot activate an Account or relationship.
- **AC-6**: One Athlete may have at most one active Coach and one email may have at most one open roster invitation across Dino. One Coach may own many invitations and active Athlete relationships. Database constraints and transactions enforce these rules during concurrent sends and accepts.
- **AC-7**: Every roster read and mutation derives the Coach or Athlete from the verified Clerk session. A Coach can access only rows owned by their Account. Foreign identifiers return `404 Not Found`, and unavailable emails return one generic response that reveals no Account, role, invitation, or other Coach.
- **AC-8**: Hosted workout creation requires an explicit `athleteAccountId` selected from the Coach's active roster. The API verifies an active relationship before creating the assignment. Pending, expired, revoked, foreign, or ended relationships return `409 ROSTER_REQUIRED`. The guarded local preview may continue deriving the fixed preview Athlete.
- **AC-9**: Invitation delivery uses a basic retry. Dino stores the invitation before calling Clerk, marks delivery `failed` when it cannot confirm the email, and checks Clerk by email plus Dino invitation metadata before another send. The Coach sees `Not sent` with Try Again. Rare provider leftovers may be cleaned up manually during the pilot.
- **AC-10**: The Coach roster, invitation form, and Athlete acceptance surface provide loading, populated, empty, offline, stale with retry, validation, conflict refresh, not sent, expired, revoked, and unavailable service states. Dino preserves unsent form input, does not queue offline mutations, and never claims an unconfirmed change succeeded.
- **AC-11**: Invitation and relationship rows retain their lifecycle status and timestamps. Emails, Clerk invitation links, tokens, display names, and other private content never enter logs, analytics, traces, or errors. Advanced roster audit history and automatic reconciliation remain deferred until pilot evidence requires them.
- **AC-12**: Invitation creation is limited to twenty attempts per Coach per day during the pilot. Resend is limited to once per minute and five times per hour per invitation. A limited request returns `429 RATE_LIMITED` without changing local or Clerk state.
- **AC-13**: The complete hosted journey proves one authorized Coach registration, Athlete invitation, Athlete registration or sign in with the exact email, acceptance, automatic roster change from `Pending` to `Active`, active Athlete selection, and successful workout assignment. Another Coach is denied every invitation, roster, relationship, and workout access attempt.
- **AC-14**: All new mobile surfaces follow `design.md`, use Dino semantic tokens, provide text with every status color, keep touch targets at least 48 dp, include accessible labels, and clear the floating navigation on iOS, Android, and web.

## Decision

**Chosen option**: Roster invitation first, then Account creation or linking on acceptance

Use Clerk for hosted registration and invitation email delivery. Use Dino's PostgreSQL roster invitation as the permission record and CoachingRelationship as the durable tenant ownership record. The Coach Account is the tenant boundary for this independent Coach SaaS phase, so no Clerk Organization or separate organization table is added.

Coach onboarding continues through Ced's operator authorization in spec 0001. Athlete onboarding extends the hosted flow: Clerk proves the invited email, then Dino finds the matching open roster invitation and creates or links the Athlete Account. A client never supplies the accepted email, role, Coach identity, or relationship ownership.

The existing `POST /me/activate` flow remains the Coach activation path. A hosted Clerk session with no Dino Account may access only the narrow invitation discovery and acceptance endpoints. Successful Athlete acceptance creates the Account with role `Athlete`, records the existing Account activation history, creates the active relationship, and accepts the invitation in one transaction.

Roster screens use the existing TanStack Query client and actor isolated keys. The Coach Athletes route replaces its placeholder with independently paginated Pending and Active sections. The Athlete invitation completion state extends the existing identity access gate. New roster surfaces use the existing semantic tokens and established styling conventions without redesigning unrelated screens.

**Retry decision**: keep one Clerk invitation identifier and delivery state on the Dino invitation. Retry checks Clerk for the same Dino invitation before sending again. Revoke denies access in PostgreSQL first, then makes one best effort Clerk cleanup call. Rare leftovers are handled manually during the pilot.

Implementation recommendations:

1. Keep individual Coach ownership as the tenant key. A separate organization model is deferred until team coaching is a real requirement.
2. Store the invitation before calling Clerk and put `dinoRosterInvitationId` in Clerk public metadata set by the Dino server. Set Clerk `ignoreExisting` so an eligible existing Athlete can receive the same invitation, while Dino still enforces relationship ownership.
3. Reuse the existing Clerk adapter and simple lookup pattern from account provisioning. Do not add a queue, worker, receipt table, delivery attempt table, or roster event ledger.
4. Derive effective expiry from `expiresAt` on every read and mutation. Persist the `expired` transition when the row is touched so history and uniqueness remain explicit without a scheduler.
5. Use two paginated roster reads rather than one mixed cursor. Pending invitations and active relationships have different fields and ordering.
6. Retain invitation and relationship history. Ending a relationship is intentionally reserved for the privacy and account lifecycle feature.

## Feature design

**Data model sketch**:

```text
RosterInvitation

id                    uuid                         required, primary key
coachAccountId        uuid                         required, foreign key to Account
invitedEmail          text                         required, canonical lowercase
athleteAccountId      uuid                         nullable, foreign key to Account after acceptance
clerkInvitationId     text                         nullable, unique when present
status                sending | pending | failed | accepted | revoked | expired
expiresAt             timestamptz                  nullable
adultConfirmedAt      timestamptz                  nullable until acceptance
acceptedAt            timestamptz                  nullable
revokedAt             timestamptz                  nullable
createdAt             timestamptz                  required
updatedAt             timestamptz                  required

one open invitation per invitedEmail where status is sending, pending, or failed

CoachingRelationship

id                    uuid                         required, primary key
coachAccountId        uuid                         required, foreign key to Account
athleteAccountId      uuid                         required, foreign key to Account
sourceInvitationId    uuid                         required, unique foreign key to RosterInvitation
status                active | ended
startedAt             timestamptz                  required
endedAt               timestamptz                  nullable
createdAt             timestamptz                  required
updatedAt             timestamptz                  required

one active relationship per athleteAccountId

Account 1  =====  many RosterInvitation as Coach
Account 1  =====  many CoachingRelationship as Coach
Account 1  =====  zero or one active CoachingRelationship as Athlete
RosterInvitation 1  =====  zero or one CoachingRelationship
```

The database cannot enforce Account roles through a row check across tables. The service locks and validates active `Coach` and `Athlete` Accounts in every transaction. Partial unique indexes enforce one open invitation per canonical email and one active relationship per Athlete.

**State transitions**:

```text
invitation
 sending  ->  pending    Clerk delivery is confirmed
 sending  ->  failed     Clerk delivery cannot be confirmed
 failed   ->  pending    Retry finds or creates the matching Clerk invitation
pending  ->  accepted   exact verified email accepts
pending  ->  revoked    owning Coach revokes locally
failed   ->  revoked    owning Coach revokes locally
pending  ->  expired    server observes current delivery expiry in the past

active relationship  ->  ended  reserved for the privacy lifecycle feature
```

No PostgreSQL transaction remains open during a Clerk call. Create stores a `sending` invitation first. Retry lists Clerk invitations for the canonical email and accepts only one carrying `dinoRosterInvitationId` equal to the Dino invitation id. It stores that provider id when found, otherwise it creates one invitation. If Clerk remains unavailable, the row stays `failed` for another explicit retry.

Resend revokes the currently known Clerk invitation on a best effort basis, sends a replacement for the same Dino invitation, and stores the replacement id and expiry. Revoke is local first. Acceptance is denied as soon as PostgreSQL stores `revoked`; one best effort Clerk cleanup follows. Rare provider leftovers are cleaned manually during the pilot.

Before any create, list, discovery, resend, revoke, or accept action, the server uses PostgreSQL transaction time to conditionally expire past due pending invitations.

Acceptance, Account creation when needed, invitation acceptance, and relationship creation commit in one PostgreSQL transaction. The transaction locks the invitation and any matching Account or relationship. Conditional updates make acceptance versus revocation and competing Coach acceptance races allow only one winner.

**API surface**:

| Endpoint                         | Method | Key inputs                                                            | Key outputs                                                          | Auth                                         | Key errors                                                                                               |
| -------------------------------- | ------ | --------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `/roster-invitations`            | POST   | `email:string` required                                               | invitation id, email, status, expiry                                 | active Coach                                 | 409 unavailable, 422 invalid email, 429 limited, 503 database unavailable                                |
| `/roster-invitations`            | GET    | `cursor:string` optional, `limit:number` optional                     | invitation items, next cursor                                        | active Coach, owner scoped                   | 422 invalid cursor, 503 unavailable                                                                      |
| `/roster-invitations/:id/resend` | POST   | none                                                                  | invitation id, status, expiry                                        | active owning Coach                          | 404 foreign, 409 terminal state, 429 limited, 503 database unavailable                                   |
| `/roster-invitations/:id/revoke` | POST   | none                                                                  | invitation id, revoked status, revoked time                          | active owning Coach                          | 404 foreign, 409 accepted, 503 database unavailable                                                      |
| `/roster-invitations/mine`       | GET    | none                                                                  | matching invitation id, Coach display name, expiry, acceptance state | valid Clerk session, Account optional        | 404 no usable invitation, 503 unavailable                                                                |
| `/roster-invitations/:id/accept` | POST   | `displayName:string` required for new Account, `adultConfirmed:true`  | active Account summary, Coach summary, relationship id               | valid Clerk session with exact primary email | 403 email mismatch, 409 unavailable or owned, 410 expired or revoked, 422 invalid input, 503 unavailable |
| `/roster/athletes`               | GET    | `cursor:string` optional, `limit:number` optional                     | active Athlete items, next cursor                                    | active Coach, owner scoped                   | 422 invalid cursor, 503 unavailable                                                                      |
| `/workout-assignments`           | POST   | existing workout fields plus `athleteAccountId:uuid` for hosted Coach | assignment detail                                                    | active owning Coach                          | 409 roster required or duplicate date, 422 invalid content, 503 unavailable                              |

Invitation mutation responses use this stable shape:

```text
RosterInvitationMutationDto

id                         invitation UUID
email                      owning Coach only, canonical invited email
status                     sending | pending | failed | accepted | revoked | expired
expiresAt                  ISO 8601 UTC string or null
```

Create returns `201` with the stored invitation. If Clerk delivery cannot be confirmed, its status is `failed` and the Coach sees Not Sent with Try Again. Resend returns `200` with the current stored status. Revoke returns `200` as soon as local status is `revoked`; provider cleanup does not delay or reopen local access.

List limits default to 20 and allow 1 through 50. Invitation lists order by creation time then identifier, newest first. Active Athletes order by case folded display name then Account identifier. Cursors are opaque, versioned, and bound to the authenticated Coach and canonical filters.

Every API error uses `{ code, message, requestId }`. Stable roster codes include `INVITATION_UNAVAILABLE`, `INVITATION_NOT_SENT`, `INVITATION_EXPIRED`, `INVITATION_REVOKED`, `INVITATION_STATE_CONFLICT`, `ROSTER_REQUIRED`, `RATE_LIMITED`, `IDENTITY_UNAVAILABLE`, `DATABASE_UNAVAILABLE`, and `VALIDATION_FAILED`.

**Value sourcing**:

| Action               | Value produced or displayed            | Source                                                                                          |
| -------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Create invitation    | acting Coach                           | verified Clerk subject resolved to active Coach Account                                         |
| Create invitation    | invited email                          | Coach input, trimmed and canonicalized to lowercase                                             |
| Create invitation    | invitation identifier                  | PostgreSQL generated UUID                                                                       |
| Create invitation    | Clerk binding                          | server set Clerk public metadata containing the Dino invitation identifier                      |
| Create invitation    | delivery state                         | invitation status plus Clerk create or matching metadata lookup result                          |
| Create invitation    | expiry                                 | confirmed server send time plus seven days                                                      |
| List invitations     | ownership scope                        | authenticated Coach Account id                                                                  |
| List invitations     | email and lifecycle                    | RosterInvitation with effective expiry from PostgreSQL transaction time                         |
| List invitations     | available actions                      | ownership, invitation status, and expiry                                                        |
| Resend invitation    | replacement link and expiry            | Clerk response matched by invitation metadata and confirmed server send time plus seven days    |
| Resend invitation    | old link cleanup                       | stored Clerk invitation id, handled on a best effort basis                                      |
| Revoke invitation    | target and owner                       | route id plus authenticated Coach Account id                                                    |
| Revoke invitation    | immediate denial                       | local invitation status committed as revoked before Clerk cleanup                               |
| Discover invitation  | verified email                         | primary email from Clerk Backend API for the verified session subject                           |
| Discover invitation  | Coach name                             | Account displayName joined through RosterInvitation.coachAccountId                              |
| Accept invitation    | target invitation                      | route id matched to the verified primary Clerk email                                            |
| Accept invitation    | Athlete display name                   | required Athlete input for a new Account, existing Account value otherwise                      |
| Accept invitation    | adult confirmation time                | database transaction time after explicit `adultConfirmed:true`                                  |
| Accept invitation    | Athlete role                           | fixed server value `Athlete` for a new Account, immutable Account role otherwise                |
| Accept invitation    | Athlete Account                        | new Account from verified Clerk subject and email, or existing active Athlete by the same email |
| Accept invitation    | relationship ownership                 | invitation Coach and accepted Athlete, never client input                                       |
| Accept invitation    | lifecycle times                        | PostgreSQL transaction time and completed state transitions                                     |
| List active Athletes | roster ownership                       | active CoachingRelationship rows scoped by authenticated Coach Account id                       |
| List active Athletes | Athlete name and id                    | related active Athlete Account columns                                                          |
| Assign workout       | target Athlete                         | explicit Coach selection from active roster                                                     |
| Assign workout       | ownership permission                   | active CoachingRelationship for authenticated Coach and selected Athlete                        |
| Render mobile state  | fresh, stale, offline, and retry state | actor isolated TanStack Query data, fetch state, and API error code                             |
| Render acceptance    | invitation required message            | no matching usable invitation for the verified Clerk email                                      |

**Key invariants**:

- Public Coach and Athlete signup remains disabled for the pilot.
- A new Athlete Account can be created only from a valid accepted roster invitation for the exact verified primary Clerk email.
- Every Account keeps one immutable role from spec 0001.
- One canonical email has at most one open roster invitation across all Coaches.
- One Athlete has at most one active CoachingRelationship. A Coach may have many.
- Only an active relationship authorizes a hosted workout assignment.
- Invitation and relationship Coach ownership never comes from client input.
- Retry always reuses the same Dino invitation row and checks Clerk for matching `dinoRosterInvitationId` metadata before sending another email.
- `clerkInvitationId` is the current known provider link. Dino does not keep delivery attempt or replay receipt tables during the pilot.
- Local revoke is the permission boundary. It denies acceptance before Clerk cleanup and remains revoked even when cleanup needs retry.
- Effective expiry is checked before every invitation create, list, resend, revoke, discovery, and acceptance.
- Accepted invitations require athleteAccountId, adultConfirmedAt, and acceptedAt. Revoked invitations require revokedAt. Only pending invitations may be accepted or resent. Pending and failed invitations may be revoked.
- No transaction stays open while Clerk is called. Every provider result is applied later through a conditional update under an invitation row lock.
- No delete endpoint exists. Revoked, expired, accepted, and ended history remains retained.
- Preview identity remains development only and does not create hosted roster authority.

**Security model**:

- The individual active Coach Account is Dino's current SaaS tenant boundary. Every invitation, relationship, roster query, and hosted workout query filters by that Account id.
- Clerk proves session subject and primary email. Dino owns role, Account status, invitation state, relationship state, and authorization.
- A valid Clerk session without a Dino Account can access only `GET /roster-invitations/mine`, `POST /roster-invitations/:id/accept`, identity activation, and sign out.
- A Coach sees email only for invitations they own. An Athlete sees the inviting Coach display name only after Clerk proves the exact invited email.
- Foreign durable identifiers return Not Found. Email conflicts use the same generic unavailable response for unknown Accounts, Coach Accounts, pending Accounts, existing relationships, and invitations owned by another Coach.
- Rate limits use Account and invitation identifiers. Stored limiter keys and logs never contain raw email.
- Invitation links, Clerk tokens, emails, display names, and free text do not enter logs, analytics, traces, event metadata, or error details.
- Adult confirmation is required for this pilot. Guardian consent and under 18 Accounts remain outside scope.
- This feature follows a strong general privacy baseline and makes no claim of medical record compliance. Regional compliance remains a release review before broader distribution.

**Configuration required**:

No new environment variable is required. The existing Clerk instance and credentials from spec 0001 must keep application invitations and invite only access enabled. Roster invitations set Clerk `expiresInDays` to 7 and use the existing hosted Account Portal.

**Critical test scenarios**:

- Happy path: an authorized Coach sends an invitation, a new Athlete registers with the exact email, confirms their own name and adult status, appears Active, and receives a workout selected from the roster, verifies **AC-1**, **AC-2**, **AC-4**, **AC-8**, and **AC-13**.
- Existing Athlete: an active Athlete with no relationship accepts an exact email invitation without changing credentials or role, verifies **AC-3** and **AC-6**.
- Failure case: lose the Clerk create response, retry the same Dino invitation, find the matching Clerk invitation by email and metadata, and confirm no second email is sent, verifies **AC-5** and **AC-9**.
- Delivery failure: leave the invitation failed when Clerk is unavailable, show Not Sent, retry later, and confirm one stored Clerk link and expiry, verifies **AC-9** and **AC-10**.
- Resend failure: show Not Sent and allow another explicit retry. Confirm rare Clerk leftovers do not grant Dino access and can be cleaned manually, verifies **AC-5** and **AC-9**.
- Concurrency: race two Coaches inviting or accepting the same Athlete and confirm one open invitation or active relationship wins while the loser receives the generic unavailable response, verifies **AC-6** and **AC-7**.
- Expiry and revocation: expire or locally revoke an invitation while acceptance starts and confirm only the first valid transition commits. A failed Clerk cleanup never reopens access, verifies **AC-5** and **AC-6**.
- Auth and permission: exercise every roster identifier as another Coach and confirm Not Found with no email or ownership disclosure, verifies **AC-7** and **AC-13**.
- Release boundary: try public signup and an uninvited Athlete session and confirm no protected Athlete route opens, verifies **AC-1** and **AC-2**.
- Offline: disconnect during invite or acceptance, preserve input, show retry, and confirm no queued or claimed mutation, verifies **AC-10**.
- Privacy: inspect API logs, analytics, and errors through create, resend, revoke, expire, and accept and confirm no private values appear, verifies **AC-11**.
- Rate limits: exceed create and resend limits and confirm `429` without a database or Clerk mutation, verifies **AC-12**.
- Cross platform: render the roster and acceptance states on iOS, Android, and web and verify Dino accessibility and layout rules, verifies **AC-14**.

## Build plan

The Tracer Bullet starts with one real Coach invitation through Clerk, PostgreSQL, API, and the existing Athletes route, then completes Athlete acceptance and unlocks hosted workout assignment. Broader lifecycle and failure cases thicken that proven thread.

1. Add the invitation and relationship schema with one migration, partial unique indexes, lifecycle constraints, and focused database tests, satisfies **AC-5**, **AC-6**, **AC-9**, and **AC-11**.
2. Build the active Coach create and paginated invitation list API through Clerk delivery and reconciliation, then replace the Coach Athletes placeholder with Pending rows, invite entry, loading, empty, Not Sent, offline, and retry states, satisfies **AC-1**, **AC-4**, **AC-9**, **AC-10**, **AC-12**, and **AC-14**.
3. Extend the identity gate for invitation only Athlete completion, add exact Clerk email discovery and transactional acceptance for a new Athlete, and make the Coach roster change from Pending to Active, satisfies **AC-2**, **AC-4**, **AC-6**, **AC-7**, **AC-11**, **AC-13**, and **AC-14**.
4. Add existing active Athlete acceptance, resend, revoke, effective expiry, race handling, rate limits, generic conflict behavior, and the remaining lifecycle screen states, satisfies **AC-3**, **AC-5**, **AC-6**, **AC-7**, **AC-9**, **AC-10**, **AC-11**, and **AC-12**.
5. Add the paginated active Athlete API and selection UI, require roster owned `athleteAccountId` for hosted workout creation, preserve the guarded preview path, and prove one accepted Athlete receives the assignment, satisfies **AC-4**, **AC-8**, **AC-13**, and **AC-14**.
6. Add focused mobile, NestJS, Clerk adapter, PostgreSQL end to end, concurrency, privacy log, pagination, and cross platform tests, then run the Beta verification sequence for every scenario, satisfies **AC-1** through **AC-14**.

## Consequences

**Positive**:

- Dino gains a real SaaS tenant boundary through Coach owned relationships.
- Athletes own their credentials and choose their own display name.
- Hosted workout assignment can replace the pilot `ROSTER_REQUIRED` block safely.
- Explicit invitation and relationship history supports later privacy lifecycle work.

**Negative / tradeoffs**:

- Dino must reconcile invitation state across Clerk and PostgreSQL because no transaction spans both systems.
- Basic retry may leave a rare stale Clerk invitation that needs manual cleanup during the pilot.
- A valid Clerk session may temporarily exist without a Dino Account while invitation acceptance finishes.
- Relationship transfer and team coaching remain unavailable.
- Pending invitation email is private data that the owning Coach can see and Dino must protect.

**Neutral**:

- No organization, subscription, webhook, job queue, background expiry service, retry receipt, delivery attempt table, or audit ledger is added. Expiry and provider cleanup run when the related path is used.
- Coach authorization remains a private operator action until open Coach signup and billing are designed.
- Relationship ending is represented in the target model but ships later with privacy and account lifecycle.
- Seamless continuation after an app store install remains deferred. An invited Athlete may need to install Dino and sign in with the invited email after completing the hosted page.

## Follow up

- [ ] Finish and verify the remaining hosted Account Portal and Device Trust work in spec 0001 before private pilot distribution.
- [ ] Design relationship ending, profile correction, deletion, and retention execution in the privacy and account lifecycle feature.
- [ ] Design an Organization boundary only if Dino adds Coach teams, shared staff access, or organization billing. Individual Coach Accounts are sufficient for the current SaaS phase.
- [ ] Design open Coach signup and paid roster limits before general availability. The pilot daily invitation limit is abuse protection only.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
