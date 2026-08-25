# Rationale for account identity and exclusive roles

## Context

Dino currently exposes deterministic Coach and Athlete previews without accounts or saved identity. The first connected foundation needs real sign in, persistent mobile sessions, and server enforced access before private roster or workout data exists.

The private pilot has a controlled operator and a small adult audience. Public registration, roster invitations, billing, profile management, deletion, offline synchronization, and formal regional compliance are separate gates. The identity foundation must therefore stay narrow while remaining safe enough for later private coaching data.

Expo SDK 54 owns the phone experience. NestJS 11 and PostgreSQL 16 own the API and application data. One identity must pass through Clerk, the mobile app, the API, and PostgreSQL without allowing any client to choose a role or claim another Account.

## Options considered

### Option 1: Clerk hosted Account Portal with Dino owned authorization

Clerk hosts sign in, invitation completion, Device Trust, recovery, and session creation. Dino stores the application Account and makes every role, status, routing, and ownership decision.

**Pros**:

- Clerk has a current Expo hosted authentication hook that transfers the Account Portal session into the native app.
- Hosted authentication follows new Clerk security states such as Device Trust without Dino rebuilding factor handling.
- Dino avoids operating password hashing, token rotation, and recovery delivery.
- PostgreSQL remains authoritative for product access and later domain ownership.

**Cons**:

- Authentication depends on a hosted vendor.
- Provisioning and lifecycle changes must reconcile Clerk and PostgreSQL safely.
- Sign in temporarily opens a browser surface over the app.

### Option 2: Better Auth inside Dino

Better Auth would run with Dino and use the existing TypeScript and PostgreSQL stack.

**Pros**:

- Dino controls authentication data and operating location.
- It avoids a hosted identity dependency.

**Cons**:

- Dino must operate session storage, email delivery, recovery, upgrades, and security response.
- NestJS integration and mobile authentication become part of Dino's own operational burden.

### Option 3: Auth0 hosted authentication

Auth0 would provide mature hosted identity and mobile token support.

**Pros**:

- It has established enterprise identity capabilities.
- It separates credential security from Dino's application database.

**Cons**:

- Its configuration and product surface are heavier than this private pilot needs.
- Dino would still need the same application Account mapping and reconciliation boundary.

### Option 4: Custom Dino authentication

Dino would store password hashes and build verification, recovery, session rotation, and revocation itself.

**Pros**:

- Dino would control every authentication detail and dependency.

**Cons**:

- It creates the largest security and maintenance surface in the project.
- It delays the coaching loop while rebuilding solved identity infrastructure.

## Rationale

Clerk's hosted Account Portal is the best fit because the private pilot needs secure mobile identity quickly, including recovery and Device Trust states that evolve outside Dino's release cycle. Its Expo hosted authentication hook transfers the completed session back into the phone app, while Dino's PostgreSQL Account keeps role and access decisions under product control.

The split is deliberate. Clerk proves who signed in. Dino decides what that identity may do. A role stored only in client state or editable Clerk profile metadata would make authorization easier to bypass and harder to extend into roster ownership.

Controlled application invitations keep public registration and roster relationships outside this gate. Account Portal handles invitation completion, then the synchronous `POST /me/activate` flow gives the person an immediate Dino result and avoids webhook delay, signing secrets, and retry infrastructure for the first slice. A Clerk webhook is the runner up if future identity changes must synchronize without an active client.

The design uses deterministic reconciliation instead of a general identity operation ledger. PostgreSQL commits local access denial first, then the operator command reconciles Clerk and reports when a retry remains. This is enough for a controlled pilot and avoids a new state machine whose main purpose would be coordinating one operator.

The API also avoids a live Clerk session lookup on every request. Dino's local Account status makes operator disabling immediate. Clerk owns recovery and Device Trust policy, while Dino treats every returned session the same and still denies disabled or unlinked accounts. A live Clerk lookup on every request is the runner up, but it adds latency and makes all protected API traffic depend on Clerk availability.
