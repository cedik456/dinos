# Rationale for 0002. First assigned workout loop

## Context

> ⚠️ Premise note: This feature normally follows completed identity and roster ownership, but those foundations are not fully verified. Building against an unguarded fake identity would create authorization assumptions that later fail in production. The right framing is a local only preview bridge over real Account rows, with production access still dependent on spec 0001 and roster ownership enrolled as explicit follow up work.

Dino has a polished deterministic frontend and a PostgreSQL backed NestJS foundation, but its central Coach and Athlete exchange is still mock data. The first useful product proof must cross the mobile app, API, and database without pulling the later exercise library, templates, detailed set logging, or offline synchronization into the same slice.

The workout is collaborative and stateful. Coach edits, Athlete completion, retries after a mobile timeout, and Coach review can race or repeat. The system must preserve ownership and final history while making failures understandable on a phone.

The current identity build already defines permanent roles and Account status, but the user chose to postpone the full hosted journey so the rest of the app can become usable. Local preview access therefore needs a narrow fail closed boundary. It cannot weaken the eventual pilot path.

Ced approved this workout journey as the next local development gate. The repository phase instructions still describe the earlier health only gate and must be reconciled before implementation begins. Pilot and production creation remain blocked until identity and roster ownership can supply a real target Athlete.

## Options considered

### Option 1: Keep deterministic frontend mocks

Continue refining the existing Coach and Athlete screens without adding workout tables or API behavior.

**Pros**:

- Fastest route to visual iteration.
- No new database or network failure states.

**Cons**:

- Does not prove Dino's core value or ownership model.
- Delays the highest risk integration work until more screens depend on it.

### Option 2: One assignment snapshot with transactional lifecycle records

Store each assigned workout and its ordered exercises as a durable snapshot, with separate completion and review rows. Connect the complete journey through REST and TanStack Query.

**Pros**:

- Proves the full product thread with few domain concepts.
- Completed history cannot change through a later template edit.
- Database constraints and transactions make ownership and lifecycle behavior explicit.

**Cons**:

- Coaches must retype repeated workouts in this slice.
- The app and API must handle real network, retry, and conflict states now.

### Option 3: Build exercise library and reusable templates first

Model reusable exercises, media, templates, scheduling, assignment copies, completion, and review as one larger workout platform.

**Pros**:

- Gives Coaches a more efficient authoring workflow immediately.
- Avoids temporary repeated text entry.

**Cons**:

- Combines several independent product decisions before the core loop is proven.
- Increases schema, UI, and migration risk and delays Athlete feedback.

## Rationale

Option 2 matches Dino's Tracer Bullet approach because it proves one real coaching journey across every layer and stops at the smallest durable boundary. Snapshot exercises are intentionally simple. They preserve history today and can later be produced from a library or template without changing completion and review semantics.

TanStack Query is appropriate now because the journey spans several screens that share assignment state and need consistent caching, refresh, and failure behavior. A custom hook cache is the runner up and would save one dependency, but it would recreate cancellation, invalidation, reconnection, and test behavior that the chosen library already provides.

Natural repeatability is preferred over a general idempotency receipt table for this slice. Unique Athlete dates and one to one completion and review rows provide stable retry anchors, while exact content comparison distinguishes a retry from a conflicting second intent. A receipt table is the runner up if future mutations trigger notifications, payments, or other external effects.

Tailwind is introduced only on the new workout surfaces. A full visual rewrite would delay the core journey and create broad regression risk, while mixing Tailwind and `StyleSheet` inside each component would make ownership unclear. Gradual adoption keeps existing screens stable, gives the new client work a faster composition model, and preserves Dino's current semantic tokens through a tested CSS theme mirror. The runner up is continuing with `StyleSheet` everywhere, which has fewer dependencies but does not provide the utility based client workflow the user selected.
