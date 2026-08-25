# Rationale for 0003. Private roster invitations

## Context

> ⚠️ Premise note: Dino is a SaaS product, but its current customer boundary is one independent Coach rather than a multi user organization. Adding an Organization table or Clerk Organization now would create membership, role, and migration work before team coaching exists. This spec uses the Coach Account as the tenant key and requires every roster and workout ownership query to carry it. Team access must receive its own design before that boundary changes.

Dino has real Account roles and a complete guarded local workout journey, but a hosted Coach still has no owned Athlete target. The workout API correctly returns `ROSTER_REQUIRED` instead of guessing. The next product outcome is therefore not merely sending email. It is establishing private, durable Coach to Athlete ownership that can authorize the first hosted workout.

The pilot is invitation only. Ced authorizes Coaches, and Coaches invite adult Athletes. Each person must register with their own email and create their own credentials. Public signup, billing, team coaching, relationship ending, under 18 access, offline synchronization, and seamless app store continuation are separate decisions.

Clerk already owns hosted registration, credentials, sessions, email verification, and application invitation delivery. Dino owns Account role and status in PostgreSQL. Roster acceptance must join those systems without disclosing whether an email belongs to an Account or another Coach, and without duplicating email after a timeout.

## Options considered

### Option 1: Create a pending Athlete Account when the Coach invites

The Coach invitation would reuse spec 0001 directly by creating a pending Athlete Account before Clerk delivery, then activate it after hosted registration.

**Pros**:

- Reuses the current Account activation metadata and endpoint with the fewest identity changes.
- Gives every invitation an Account identifier immediately.

**Cons**:

- Creates incomplete product Accounts for people who may never accept.
- The current Account requires a display name, which would make the Coach choose it or require a misleading placeholder.
- Conflates permission to register with an active product identity.

### Option 2: Create the roster invitation first, then create or link the Account on acceptance

Dino stores a Coach owned invitation and Clerk delivers registration. After Clerk verifies the exact email, Dino creates a new Athlete Account or links an existing active Athlete that currently has no Coach, then creates the relationship transactionally.

**Pros**:

- The Athlete owns credentials and chooses their own display name.
- Unaccepted invitations do not create ghost Accounts.
- Invitation state and coaching ownership remain explicit and auditable.
- It works for both a new Athlete and an existing eligible Athlete.

**Cons**:

- The identity gate must support a narrow signed in but unlinked acceptance state.
- Clerk delivery and Dino invitation state require deterministic reconciliation.

### Option 3: Create one Clerk Organization for every Coach

Each Coach would become an organization administrator and Athletes would join as organization members through Clerk Organization invitations.

**Pros**:

- Provides a ready made membership and invitation abstraction.
- Could support future staff roles and organization switching.

**Cons**:

- Models a personal coaching relationship as a generic workspace membership.
- Introduces organization roles, switching, and metadata before Dino has team coaching.
- Still requires Dino relationships for workout ownership and one active Coach per Athlete.

### Option 4: Keep basic retry state on the invitation

The invitation row stores the current Clerk invitation id and delivery status. Retry looks for the same Dino invitation in Clerk before sending again.

**Pros**:

- Adds no dedicated retry tables or worker.
- Is enough for a small pilot with occasional manual cleanup.

**Cons**:

- Does not preserve a detailed provider attempt history.
- Rare stale Clerk invitations may need manual cleanup.

## Rationale

Option 2 matches the actual permission boundary. An invitation says who may register and which Coach may gain access. An Account says who the person is after they prove the invited email. A CoachingRelationship says which tenant owns coaching access. Keeping these meanings separate avoids incomplete Accounts and gives the Athlete control over their own name and credentials.

The extra unlinked acceptance state is narrow and fail closed. A verified Clerk session without a Dino Account can discover only an invitation matching its primary email and can either accept it or sign out. Every protected Coach and Athlete product route remains closed until the Account and relationship transaction succeeds.

Individual Coach tenancy is deliberate. Every current private resource already has or can derive a Coach Account owner, including workout assignments. A general Organization layer would not remove the domain relationship and would add behavior the pilot does not need. If shared Coach staff becomes real, that feature should introduce an Organization and migrate ownership explicitly rather than quietly weakening the current boundary.

For the pilot, the invitation row stores the current Clerk id and delivery state. Retry lists Clerk invitations by canonical email and matches Dino invitation metadata before sending again. Revoke is authoritative in PostgreSQL first, followed by one best effort Clerk cleanup call.

This accepts that a rare stale Clerk invitation may need manual cleanup. Delivery attempt tables, replay receipts, audit ledgers, workers, and automated reconciliation wait until real pilot evidence justifies them.
