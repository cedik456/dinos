# 0001. Account identity and exclusive roles

**Date**: 2026-08-24
**Status**: In Progress

## Summary

Dino will give each login exactly one permanent Coach or Athlete role. Clerk's hosted Account Portal will own sign in, invitation completion, Device Trust challenges, and recovery. Dino will own account activation, status, role, routing, and authorization in PostgreSQL, and the app will never ask a person to choose or switch roles.

## Requirements

**User stories**:

- As a Coach, I want to sign in and enter only the Coach experience so that I can use Dino without choosing a role.
- As an Athlete, I want to sign in and enter only the Athlete experience so that my account cannot expose Coach actions.
- As the operator, I want to provision and revoke pilot accounts safely so that access remains controlled before public registration exists.

**Acceptance criteria**:

- **AC-1**: Ced can run a private operator command with an email, display name, and permanent role. The command derives the operator identity from protected configuration, creates one pending Dino Account and one Clerk application invitation, and returns a stable result. Running it again after a partial failure reconciles the same Account and leaves exactly one active invitation without duplicating the creation event.
- **AC-2**: A person can accept the invitation through Clerk's hosted Account Portal, verify the invited email, set a password, return to Dino through hosted authentication, and call `POST /me/activate`. The API binds the Clerk identity through the protected Account identifier in the invitation, also verifies the canonical email, changes the Account to `active`, and records the activation event in one database transaction. Repeating the same activation returns the same successful result.
- **AC-3**: An active Coach and an active Athlete can sign in through Clerk's hosted Account Portal. Each session survives an app restart, and Dino opens only the experience fixed to the server assigned role with no role selector.
- **AC-4**: An authenticated `GET /me` returns only the signed in Account identifier, display name, role, and status. The Account is resolved from the Clerk token subject, never from a client supplied Account identifier.
- **AC-5**: The API returns `403 Forbidden` when a valid account calls a test only endpoint for the other role. The correct role succeeds. No role proof endpoint ships in production.
- **AC-6**: Ced can disable an active account through the private operator command. Dino commits `disabled` status and its security event first, so the next API request is denied even if Clerk session revocation needs a retry. The app clears the local session, shows that access is disabled, and returns the person to sign in.
- **AC-7**: Ced can reactivate a disabled account only after Clerk confirms that earlier sessions are revoked. Old sessions remain invalid, a reactivation event is recorded, and the person must sign in again.
- **AC-8**: A person can recover access through Clerk's hosted Account Portal. Dino never collects the recovery email, verification code, or new password, and does not expose a separate custom recovery flow.
- **AC-9**: Without a network connection, with an unavailable identity dependency, with a disabled Account, or with a Clerk identity that has no matching Dino Account, the app does not enter protected Coach or Athlete routes. Stable API error codes select the sign in, disabled, retry, or support state. Dino never guesses or uses a cached role.
- **AC-10**: Every Account has one immutable `Coach` or `Athlete` role and one case normalized unique email. A person who later purchases Coach access creates a separate Coach account with a different email.
- **AC-11**: Account creation, activation, disabling, reactivation, and cancellation create durable security events containing the Account, event type, actor type, actor identifier, and occurrence time. Retried commands never duplicate the event for an already completed transition.
- **AC-12**: With Clerk Device Trust enabled, a valid password sign in from a new browser or device completes Clerk's required verification inside Account Portal before Dino receives an active session. Dino contains no custom Device Trust factor handling.

## Decision

**Chosen option**: Hosted Clerk authentication with Dino owned identity and authorization

Clerk will own password handling, email verification, password recovery, and sessions. Dino will own the Account record, permanent role, lifecycle status, security events, mobile route selection, and every API authorization decision.

**Implementation skills**: `clerk-expo` (`clerk/skills`, `.agents/skills/clerk-expo/`) · `expo-router` (`expo/skills`, `.agents/skills/expo-router/`) · `expo-data-fetching` (`expo/skills`, `.agents/skills/expo-data-fetching/`)

Native Dino will open Clerk's hosted Account Portal with `useHostedAuth()` from `@clerk/expo/hosted-auth`. Expo web will use Clerk's hosted `SignInButton` redirect. Dino will not render password, invitation completion, Device Trust, or recovery fields. Clerk session tokens will use `tokenCache` from `@clerk/expo/token-cache`. The NestJS API will verify bearer tokens with `@clerk/backend`, then load the matching Dino Account before any protected action.

Public Clerk sign up will remain disabled. The operator command will create a Dino pending Account first, then create a Clerk application invitation whose protected metadata carries the Dino Account identifier. The invitation will omit a custom redirect so Clerk's hosted Account Portal handles email verification and password setup. On retry the command will list invitations for that Account, revoke duplicates, and keep one active invitation. Accepting this invitation creates the Clerk identity. This invitation activates login only and never creates a Coach and Athlete roster relationship.

The first build will use a Clerk development instance with Native API, Account Portal, invitation only access, verified email and password, recovery, and Device Trust enabled. A separate production instance and production secrets are required before private pilot distribution.

Implementation recommendations:

1. Use PostgreSQL random UUID primary keys and UTC `timestamptz` values. The runner up is application generated UUID values, which add no useful benefit for this pilot.
2. Store email in canonical lowercase form and enforce one database unique constraint. The runner up is PostgreSQL `citext`, which adds an extension for a single field.
3. Keep `GET /me` uncached and call it on every cold start after Clerk restores the session. The runner up is a short client cache, which can preserve stale role or disabled status.
4. Allow multiple active devices. Normal sign out ends the current device session, while operator disabling ends every session. Clerk owns recovery session policy inside Account Portal.
5. Let the operator cancel a never activated provisioning attempt by revoking the Clerk invitation, retaining the Account as `cancelled`, and recording the event. The runner up is hard deletion, which contradicts the durable security history.
6. Let Account Portal own authentication errors and recovery disclosure. Dino exposes only stable application access states after Clerk returns a session.
7. Use local Account status on every protected request instead of reading Clerk live each time. Disabling is immediate because Dino denies the Account locally. The runner up is a live Clerk session read on every request, which adds latency and makes all protected API traffic depend on Clerk availability.
8. Let hosted Account Portal handle Device Trust. The runner up is custom factor handling, which duplicates Clerk state and caused the original custom flow to reject valid new device sign ins.

## Feature design

**Data model sketch**:

```text
Account

id                 uuid                         required, primary key
authSubject        text                         nullable only while pending_activation, unique when present
email              text                         required, canonical lowercase, unique
displayName        text                         required
role               Coach | Athlete              required, immutable
status             pending_activation | active | disabled | cancelled
createdAt          timestamptz                  required
activatedAt        timestamptz                  nullable
disabledAt         timestamptz                  nullable
cancelledAt        timestamptz                  nullable
updatedAt          timestamptz                  required

AccountSecurityEvent

id                 uuid                         required, primary key
accountId          uuid                         required, foreign key to Account
eventType          created | activated | disabled | reactivated | cancelled
actorType          operator | account | system
actorIdentifier    text                         required
occurredAt         timestamptz                  required

Relationship

Account 1  =====  many AccountSecurityEvent
```

Clerk stores passwords, verification material, reset material, and sessions. Dino stores none of those values.

**State transitions**:

```text
pending_activation  →  active     verified invitation plus successful POST /me/activate
active              →  disabled   private operator command
disabled            →  active     private operator command, old sessions stay invalid
pending_activation  →  cancelled  private operator cancellation before activation only
```

`POST /me/activate` reads the protected Account identifier from the accepted Clerk invitation. It may only bind the subject when the verified primary Clerk email equals that Account's canonical pending email and both values are otherwise unclaimed. If the Account is already active with the same subject and email, it returns the same success response. A different subject or email returns `409 Conflict`. Role never comes from Clerk profile metadata or the client.

**API surface**:

```text
Surface             Method   Key inputs                         Key outputs                  Auth                 Key errors

/me/activate        POST     Clerk bearer token                id, displayName, role,       valid Clerk session  401 invalid session
                                                                status                                             403 no pending match
                                                                                                                   409 email or subject conflict
                                                                                                                   503 Clerk or database unavailable

/me                 GET      Clerk bearer token                id, displayName, role,       active Account       401 invalid session
                                                                status                                             403 unlinked or disabled
                                                                                                                   503 database unavailable

/__test/role/coach  GET      Clerk bearer token                role: Coach                  Coach only           401 invalid session
/__test/role/       GET      Clerk bearer token                role: Athlete                Athlete only         403 wrong role
athlete

operator command    local    action, email or Account id,      stable result, Account id,   local operator       duplicate email
                             displayName, role                  status, Clerk state, outcome access only          invalid transition
                                                                                                                   Clerk partial failure
```

Every API error uses `{ code, message, requestId }`. Stable application codes include `AUTH_REQUIRED`, `ACCOUNT_DISABLED`, `ACCOUNT_UNLINKED`, `IDENTITY_CONFLICT`, `IDENTITY_UNAVAILABLE`, `DATABASE_UNAVAILABLE`, and `RATE_LIMITED`. The role proof routes live in a Nest test module constructed only by the end to end test harness. Production `AppModule` never imports that module.

Operator commands return JSON with `{ accountId, status, clerkState, outcome }`. Exit `0` means complete or already complete. Exit `2` means invalid input or conflict. Exit `3` means the local fail closed change succeeded but Clerk reconciliation still requires a retry. When both Account id and email are supplied, Account id is authoritative and the email must match.

**Value sourcing**:

```text
Action                  Value produced or displayed     Source

Provision Account       email                           required operator input, canonicalized to lowercase
Provision Account       display name                    required operator input
Provision Account       role                            required operator input, Coach or Athlete
Provision Account       operator identity               protected DINO_OPERATOR_ID configuration
Provision Account       Account id                      PostgreSQL generated UUID
Provision Account       Clerk invitation binding        protected invitation metadata containing Account id
Provision Account       retry target                    canonical email, then existing protected Account id
Provision Account       active invitation               Clerk invitation list filtered by protected Account id
Provision Account       command outcome                 local Account state plus confirmed Clerk invitation state

Activate Account        Clerk subject                   verified Clerk bearer token subject
Activate Account        verified email                  primary verified email from Clerk Backend API lookup
Activate Account        target Account                  protected Account id from the accepted invitation
Activate Account        active role                     existing Account.role, never client or Clerk metadata
Activate Account        activation time                 PostgreSQL transaction time
Activate Account        activation actor                bound Account id

Restore app             current Account                 GET /me lookup by verified token subject
Restore app             destination                     Account.role mapped to the Coach or Athlete route group
Restore app             display name                    Account.displayName
Restore app             access state                    Account.status
Restore app             UI failure state                stable API code from the error envelope
Restore app             support reference               API requestId

Disable Account         target Account                  explicit Account id or exact email operator input
Disable Account         actor                           protected DINO_OPERATOR_ID configuration
Disable Account         session revocation              Clerk Backend API for Account.authSubject
Disable Account         command outcome                 local status plus confirmed or retry required Clerk state

Hosted authentication   Account Portal mode             fixed sign in mode from the Dino entry button
Hosted authentication   native callback                Clerk Expo SDK default from the iOS bundle id or Android package
Hosted authentication   active session                 Clerk hosted auth result, stored through Clerk tokenCache
Hosted authentication   Device Trust challenge          Clerk Account Portal and dashboard Device Trust policy
Hosted recovery         recovery factors and result     Clerk Account Portal and enabled Clerk instance factors

Security event          event type                      completed lifecycle transition
Security event          event id                        PostgreSQL generated UUID
Security event          actor type and identifier       Account id, protected DINO_OPERATOR_ID, or named system action
Security event          occurrence time                 database transaction time
```

**Key invariants**:

- Every active or disabled Account has exactly one unique Clerk subject.
- A pending Account may have no Clerk subject. Every other Account must have one.
- Every Account has exactly one immutable role.
- Role and status are server owned. The client cannot submit either value to change access.
- Email comparison uses canonical lowercase values and a database unique constraint.
- Stored email equals `lower(trim(email))`, enforced by a database check.
- Database checks require `authSubject` for `active` and `disabled`, forbid it for `pending_activation` and `cancelled`, and require the matching lifecycle timestamp for each terminal status.
- A database trigger rejects every role update after Account insertion.
- Lifecycle commands use a locked row and a conditional update from the expected prior status.
- `GET /me` resolves ownership from the verified token subject and returns no other Account.
- Every access control mutation and its security event commit in the same database transaction.
- Disabling commits local denial before Clerk revocation. Retrying an already disabled Account continues Clerk reconciliation without another disabled event.
- Reactivation never restores an old session.
- Reactivation is rejected until Clerk confirms no earlier session remains active.
- One Clerk subject may bind to only one Dino Account, even when Clerk could hold more than one email.
- Credentials, session tokens, Clerk secret keys, and activation material never enter Dino tables or logs.

**Security model**:

- Public access is limited to Clerk hosted authentication and invitation pages protected by Clerk controls.
- Mobile route guards improve navigation only. They are never treated as authorization.
- Every NestJS protected request verifies the Clerk bearer token, resolves the Dino Account, requires `active` status, and applies the endpoint role rule before business logic runs.
- Ownership comes from the authenticated Account context. A client supplied Account id can never replace it.
- The operator command is not an HTTP endpoint. It requires local repository and environment access. Audit identity comes from protected `DINO_OPERATOR_ID` configuration rather than command input.
- Logs use Account ids and stable error codes. They exclude passwords, tokens, invitation tickets, reset material, and email addresses.
- Each Clerk user is configured with one verified primary email. Alternate email addition and Clerk user deletion are prohibited outside an approved operator flow.
- The private adult pilot follows a strong general privacy baseline. Formal regional compliance remains a release review before wider distribution.

**Configuration required**:

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: client safe Clerk key for the selected environment.
- `EXPO_PUBLIC_API_URL`: NestJS API base URL for mobile identity requests.
- `CLERK_SECRET_KEY`: server only Clerk Backend API credential.
- `CLERK_AUTHORIZED_PARTIES`: allowed Clerk token origins or parties used during server verification.
- `DINO_OPERATOR_ID`: protected identifier written to operator security events.
- Clerk dashboard: enable Native applications, Account Portal, verified email and password, password reset, application invitations, invite only access, and Device Trust. Keep public sign up and social providers disabled for this gate.

**Critical test scenarios**:

- Happy path: provision, accept the invitation in Account Portal, sign in through hosted authentication, activate, call `GET /me`, open the correct role experience, restart the app, and restore the same session, verifies **AC-1**, **AC-2**, **AC-3**, and **AC-4**.
- Failure case: interrupt provisioning between PostgreSQL and Clerk, rerun it, and confirm one Account, one creation event, and one active invitation, verifies **AC-1** and **AC-11**.
- Failure case: start without a network connection or with an unmatched Clerk identity and confirm protected content never renders, verifies **AC-9**.
- Lifecycle: make Clerk revocation fail after local disabling, confirm the API still denies access, rerun reconciliation, reactivate only after revocation is confirmed, and confirm each event is durable, verifies **AC-6**, **AC-7**, and **AC-11**.
- Hosted security: recover access in Account Portal and complete a new device password sign in with Device Trust verification before Dino receives a session, verifies **AC-8** and **AC-12**.
- Auth and permission: exercise test only Coach and Athlete routes with both roles and confirm the wrong role receives `403 Forbidden`, verifies **AC-5** and **AC-10**.

## Build plan

The Tracer Bullet approach first proves one real Coach thread through Clerk, mobile, API, and PostgreSQL. It then broadens the same path to Athlete denial, lifecycle control, and failure recovery.

1. [x] Configure the Clerk development instance, add version matched Expo and Clerk packages with `npx expo install`, validate server secrets, add the confirmed Account and AccountSecurityEvent schema, and create one migration, satisfies **AC-1**, **AC-10**, and **AC-11**.
2. [x] Build the retry safe operator provisioning command, protected operator identity, stable command result, and invitation reconciliation, then prove one Coach invitation reaches `pending_activation` with one creation event, satisfies **AC-1** and **AC-11**.
3. [x] Add NestJS Clerk token verification, authenticated Account context, stable error envelope, `POST /me/activate`, and `GET /me`, then prove one invited Coach activates idempotently through protected Account metadata and receives only their own Account, satisfies **AC-2**, **AC-4**, and **AC-9**.
4. [x] Add ClerkProvider, Clerk token cache, Dino styled activation and sign in screens, authenticated API fetching, and the startup gate that routes the Coach from `GET /me`, satisfies **AC-2**, **AC-3**, **AC-4**, and **AC-9**.
5. [x] Replace the development preview launcher with signed out and signed in route groups, preserve the existing role tab layouts, add Athlete provisioning, and prove exclusive navigation through controllers available only from the Nest test module, satisfies **AC-3**, **AC-5**, and **AC-10**.
6. [x] Add sign out, the limited activation resend endpoint, Clerk forgot password and reset flows, generic public responses, and full Clerk session revocation after reset, satisfies **AC-8**.
7. [x] Add retry safe disable, reactivate, inspect, and pending cancellation operator actions. Use fail closed ordering, retain cancelled Accounts, and wire mobile handling from stable disabled and unmatched codes, satisfies **AC-6**, **AC-7**, **AC-9**, and **AC-11**.
8. [x] Add focused mobile tests, NestJS unit tests, and real PostgreSQL end to end tests for every critical scenario in this spec, then run the Beta verification sequence, satisfies **AC-1** through **AC-11**.
9. [x] Install the version matched hosted authentication dependencies, replace the custom native sign in flow with `useHostedAuth()`, add the Expo web Account Portal redirect, and remove the custom recovery surface, satisfies **AC-3**, **AC-8**, **AC-9**, and **AC-12**.
10. [x] Remove the public activation resend API and its limiter, keep operator invitation reconciliation, and add focused tests that prove no Dino surface accepts credentials or recovery factors, satisfies **AC-1**, **AC-8**, and **AC-11**.
11. [ ] Enable and inspect Clerk Device Trust, then prove the existing invited user through Account Portal invitation completion, hosted sign in, Dino activation, exclusive role routing, session restoration, recovery, and a new device challenge, satisfies **AC-2** through **AC-12**.

## Consequences

**Positive**:

- Dino gains real authentication without storing or hashing passwords.
- Clerk maintains the hosted authentication and Device Trust user interface as its security flows evolve.
- The server remains authoritative for role, ownership, and access status.
- The same identity context can support roster ownership in the next feature.
- Account access changes are durable and attributable from the first pilot.

**Negative / tradeoffs**:

- Sign in depends on Clerk availability and an external vendor account.
- Authentication opens a browser session over the native app instead of rendering inside Dino.
- Dino must reconcile one identity across Clerk and PostgreSQL because no transaction can span both systems.
- Separate Coach and Athlete accounts require separate email addresses for the same person.
- Protected content is unavailable during a network outage because offline access is deferred.

**Neutral**:

- The Account role is not a subscription entitlement. Future Coach purchase creates a separate Coach account through its own flow.
- Regional privacy compliance, multiple factor authentication, profile correction, account deletion, and public registration remain later decisions.

## Follow up

- [ ] Connect the official Expo MCP server at `https://mcp.expo.dev/mcp` in Codex settings.
- [ ] Connect the official Clerk MCP server at `https://mcp.clerk.com/mcp` in Codex settings.
- [ ] `expo-router` conventions are not yet named in root `AGENTS.md`. They apply across the mobile app and belong at root level.
- [ ] `expo-data-fetching` conventions are not yet named in root `AGENTS.md`. They apply to every mobile API request and belong at root level.
- [ ] `clerk-expo` conventions are not yet captured. The identity area context should contain them before implementation, with a short pointer from root `AGENTS.md`.
- [ ] Create and verify a separate Clerk production instance before private pilot distribution.
- [ ] Review applicable regional privacy law before expanding the pilot beyond the agreed adult audience.

## Rationale

Reasoning and options: see [rationale.md](rationale.md).
