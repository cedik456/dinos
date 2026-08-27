# 0007. Exercise demonstration media

**Date**: 2026-08-26
**Status**: In Progress

## Summary

Dino will give every newly assigned exercise a reliable demonstration from a shared catalog of 302 exercises. A Coach can privately select one YouTube or Vimeo video while assigning a direct workout or a saved template, while the Athlete receives that video or one centered illustration fallback. Exercise prescriptions contain only sets and repetitions or duration, with no separate instruction field.

## Context

Dino already has a small shared exercise list, reusable templates, and permanent assignment exercise snapshots. The list has only eight seeded exercises and no demonstration media. New assignments also carry exercise names instead of catalog identifiers, so the server cannot safely resolve media by name.

The Athlete needs an understandable exercise demonstration inside the assigned workout. Coaches need a fast catalog picker and a private way to select a useful video without uploading files. Existing templates, assignments, and completed workout history must remain valid while the catalog grows. (basis: `AGENTS.md`, specs 0002, 0004, and 0005)

The catalog source contains exercise metadata and three illustrations, but no prescription or written instruction. Its visual assets require attribution under CC BY SA 4.0. Video providers also remain external systems whose content can disappear, reject embedding, or collect playback data. (basis: the workout guide manifest, asset license, and attribution files)

## Requirements

**User stories**:

- As a Coach, I want to find catalog exercises and select a private demonstration video so that I can build understandable workouts quickly.
- As an Athlete, I want a playable demonstration or clear illustrated fallback inside my assigned exercise so that I know what movement to perform.

**Acceptance criteria**:

- **AC-1**: A retry safe developer import pins `@bryllim/workout-guide` version `1.0.0` and makes all 302 exercises searchable with stable source slugs, metadata, three ordered illustration URLs, attribution, and catalog status. Matching existing seeded exercises keep their IDs.
- **AC-2**: A verified Coach can browse active catalog exercises twenty at a time, search by name, and filter by equipment and primary muscle. An unavailable catalog exercise cannot be added to a new template or assignment.
- **AC-3**: Every new template and assignment exercise carries a reference exercise ID. The Coach must enter sets and a nonempty repetitions or duration text value such as `8 to 12` or `10 to 15 minutes`. Dino does not invent a prescription from catalog data or add another duration field or exercise instruction field.
- **AC-4**: From an exercise detail while assigning a direct workout or assigning a saved template, a Coach can preview and confirm one individual YouTube video, YouTube Short, or individual Vimeo video with a required creator name, canonical source link, and sharing confirmation. Template creation stores workout structure only and does not manage demonstration videos. The API is the only URL parser and returns the normalized preview payload the app renders.
- **AC-5**: Playlists, channels, live streams, arbitrary hosts, malformed links, and previews that do not report ready within ten seconds are rejected without replacing the current saved video. The form keeps its values and shows a useful error.
- **AC-6**: Each Coach has at most one current video per reference exercise. The latest confirmed save creates or replaces it. Removal affects future assignments only.
- **AC-7**: Creating or editing a catalog backed assignment resolves the reference on the server and stores permanent snapshots of the exercise name, prescription, three illustration URLs, illustration credits, video provider, video identifier, creator, and source link.
- **AC-8**: An Athlete opening an assigned exercise sees a tap to play privacy reduced video when the assignment has one and the Athlete still has an active relationship with the assigning Coach. The player never starts automatically.
- **AC-9**: When no video exists, the player reports an error, or playback does not report ready within ten seconds, the Athlete sees the first stored illustration centered in the workout card. A compact Source and credits action exposes illustration and video attribution.
- **AC-10**: After the coaching relationship ends, the Athlete keeps the old prescription and illustrations, but Dino omits the private Coach video. The former Coach also loses access through existing ownership rules.
- **AC-11**: An Athlete cannot browse the Coach catalog or manage video selections. A Coach cannot read or change another Coach's video selection. Inaccessible records return `404` without revealing ownership.
- **AC-12**: Catalog imports, catalog updates, Coach video changes, and video removal never rewrite existing assignment snapshots. A later catalog version is imported only through an explicit reviewed developer run, and removed items become unavailable instead of being deleted.
- **AC-13**: A catalog import commits completely or not at all and may be retried safely. A failed import leaves the last working catalog unchanged.
- **AC-14**: Without internet, existing cached workout data may still show the prescription. Dino adds no offline media download, queued write, or synchronization system.
- **AC-15**: Video URLs, creator names, and media playback details do not enter logs, analytics, traces, or error responses. Structured logs contain stable identifiers, provider name, outcome, duration, and request identifier only.

## Options considered

### Option 1: Import a pinned shared catalog and add private Coach video mappings

Import the package manifest into PostgreSQL, keep the images at versioned CDN URLs, and store one private provider video selection per Coach and exercise. Copy the resolved media into each assignment snapshot. (basis: the existing PostgreSQL catalog and immutable assignment snapshot model, plus the package integration guide)

**Pros**:

- Reuses Dino's existing API, database, template flow, and assignment history.
- Gives Athletes a consistent fallback without adding file storage.
- Keeps each Coach's video choice isolated.

**Cons**:

- Illustration and video playback still require internet.
- External providers can remove or block content.
- Catalog imports and attribution must be maintained deliberately.

### Option 2: Read the package directly in the mobile app

Bundle or load the package in Expo and let the app join catalog media to API data. (basis: package manifest consumption patterns)

**Pros**:

- Avoids importing catalog metadata into PostgreSQL.
- Keeps the API change smaller.

**Cons**:

- The server cannot validate catalog identity or create trustworthy assignment snapshots.
- App releases and API records can disagree about catalog versions.
- All 906 illustrations increase bundle or client loading concerns.

### Option 3: Build Dino uploads and hosted media

Let Coaches upload images and videos to Dino managed storage and process them for playback.

**Pros**:

- Dino controls availability and presentation.
- Private access can cover the media file itself.

**Cons**:

- Requires uploads, storage, transcoding, moderation, deletion, quotas, and operating cost.
- Exceeds the approved MVP gate. (basis: `AGENTS.md`, current phase exclusions)

## Decision

**Chosen option**: Option 1: Import a pinned shared catalog and add private Coach video mappings

Dino will extend its existing reference exercise catalog, templates, assignment snapshots, and workout detail instead of creating a separate media platform. (basis: the project's Tracer Bullet approach and existing NestJS, PostgreSQL, Drizzle, Expo, and Clerk stack)

The catalog import will use `@bryllim/workout-guide` version `1.0.0`. PostgreSQL remains the searchable source of truth. Illustration URLs use the pinned package version on the documented CDN path. The runner up is app side package consumption, but it cannot produce server trusted snapshots.

The import maps manifest fields directly: `slug` to catalog slug, `name` to name, `exerciseType` to exercise type, `equipment` to equipment, `primaryMuscle` to primary muscle, `secondaryMuscles` to secondary muscles, `isStretch` to stretch status, and the three ordered `frames` to versioned URLs plus their supplied attribution. Required missing fields, a frame count other than three, duplicate slugs, or ambiguous seed matches fail the whole transaction. Seed matching trims names, collapses whitespace, and compares case insensitively while preserving punctuation. The command reports matched, inserted, unavailable, reactivated, and rejected counts and lists every matched seed ID for review.

YouTube uses privacy enhanced embeds where supported. Vimeo uses tracking reduction where supported. The app previews an individual provider video before save, while the API independently parses the provider and normalized video identifier. The runner up is opening the provider app, but that breaks the assigned workout flow.

The API accepts `youtube.com/watch?v=<id>`, `youtu.be/<id>`, `youtube.com/shorts/<id>`, and `vimeo.com/<numericId>`. It rejects playlist parameters, channel paths, live paths, nonvideo Vimeo paths, credentials, unexpected ports, and every other host. It returns a canonical source URL and a Dino constructed embed URL. YouTube embeds use `youtube-nocookie.com/embed/<id>` with inline playback. Vimeo embeds use `player.vimeo.com/video/<id>` with tracking reduction enabled. Submitted URLs and HTML are never rendered directly. The required confirmation reads, `I confirm this video is mine or the provider and creator allow me to share or embed it with my Athletes.` A successful save stores the server time in `rights_confirmed_at`.

Native iOS and Android playback uses the Expo compatible `react-native-webview` package installed with `npx expo install`. Web uses a platform specific iframe component behind the same feature interface. Both render only Dino constructed provider embed URLs, never arbitrary submitted HTML or arbitrary origins.

The native WebView loads a small Dino owned HTML wrapper with a stable HTTPS base URL. This supplies the HTTP referrer that YouTube requires to identify embedded player requests. The wrapper still receives only the Dino constructed allowlisted provider URL. Web keeps the direct iframe because the browser already supplies its page referrer.

Exercise instructions are removed completely from reference exercises, template exercises, assignment snapshots, API contracts, Coach forms, and Athlete displays. Existing instruction values are discarded by the migration. Sets and repetitions or duration remain the whole exercise prescription.

No additional community Agent Skills or MCP servers are used. General NestJS, PostgreSQL, and Drizzle skills and the Vimeo MCP server were declined because the existing project conventions cover this slice and Dino does not manage a Vimeo account.

## Rationale

The chosen approach gives the Athlete a real demonstration while staying inside the backend and workout model Dino already operates. A shared catalog prevents every Coach from retyping exercise identity, while a separate Coach video row keeps preferences private. Assignment snapshots preserve history even when the catalog or Coach preference changes. (basis: immutable snapshot and least privilege practices)

The images are a fallback, not a new media platform. Versioned CDN URLs avoid shipping 906 images in the app, and provider embeds avoid upload and transcoding infrastructure. Removing exercise instructions keeps workout creation fast. The tradeoff is that Athletes depend on the video or illustrations for movement guidance. (basis: progressive fallback and explicit external dependency failure handling)

## Feature design

**Data model sketch**:

| Entity                       | Fields and constraints                                                                                                                                                                                                                                                                                                                                                              | Relationships                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `reference_exercises`        | Existing `id` and unique `name`; required `catalog_source`, `catalog_version`, `catalog_slug`, `catalog_status`; required exercise type, equipment, primary muscle, secondary muscles; exactly three ordered frame URLs plus attribution; timestamps. Unique source plus slug. Remove catalog prescription defaults and the old seed instruction after consumers stop reading them. | Shared source for template selection. Existing matched rows retain IDs. Referenced or removed source items stay stored as unavailable. |
| `coach_exercise_videos`      | UUID primary key; required Coach account ID, reference exercise ID, provider, normalized provider video ID, canonical source URL, creator name, rights confirmation time, created time, updated time. Unique Coach account plus reference exercise.                                                                                                                                 | Many videos per Coach, but one per exercise. References one Coach account and one reference exercise.                                  |
| `workout_template_exercises` | Existing template and reference keys, position, sets, and repetitions. The instruction column is removed.                                                                                                                                                                                                                                                                           | Many exercises per template. The reference must be active when added.                                                                  |
| `assignment_exercises`       | Existing snapshot fields plus required `illustration_frames` JSON containing exactly three ordered objects with URL, attribution text, attribution URL, license name, and license URL; nullable video provider, video ID, creator, and source URL snapshot fields. The instruction column is removed.                                                                               | Many permanent exercise snapshots per assignment. No foreign key back to mutable media is needed.                                      |

Existing reference default sets, repetitions, and seed instruction are removed after the Coach builders require explicit sets and repetitions input. Existing instruction values in templates and assignments are intentionally discarded because Dino no longer supports that concept.

**State transitions**:

- Catalog exercise: active to unavailable. A later reviewed import may make it active again. Records are not deleted by import.
- Coach video: absent to current, current to replaced, current to absent. Replacement and removal affect future assignment snapshots only.
- Assignment media: created once from the current catalog and Coach video, then immutable except when the existing assigned workout edit replaces the complete exercise list before completion.

**API surface**:

| Endpoint                             | Method | Key inputs                                                                                                    | Key outputs                                                                             | Auth                                            | Key errors                                                               |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------ |
| `/reference-exercises`               | GET    | `q`, `equipment`, `primaryMuscle`, opaque `cursor`, limit from 1 through 50                                   | Active catalog page with metadata, frames, credits, and the current Coach video summary | Verified Coach                                  | `401`, `403`, `422`                                                      |
| `/reference-exercises/video-preview` | POST   | Provider URL                                                                                                  | Provider, normalized video ID, canonical source URL, and Dino constructed embed URL     | Verified Coach                                  | `401`, `403`, `422`                                                      |
| `/reference-exercises/:id/video`     | PUT    | Provider URL, creator name, `rightsConfirmed: true`                                                           | Current normalized Coach video selection                                                | Owning verified Coach                           | `401`, `403`, `404`, `422`                                               |
| `/reference-exercises/:id/video`     | DELETE | Reference exercise ID                                                                                         | No content, including when already absent                                               | Owning verified Coach                           | `401`, `403`, `404`                                                      |
| `/workout-templates`                 | POST   | Existing template fields; each exercise includes reference ID, explicit sets, and repetitions                 | Existing template detail with catalog identity                                          | Verified Coach                                  | Existing errors plus `422` unavailable reference or missing prescription |
| `/workout-assignments`               | POST   | Existing assignment fields; every exercise includes reference exercise ID and explicit prescription           | Existing detail with immutable media snapshots                                          | Verified Coach with active Athlete relationship | Existing errors plus `422` unavailable reference                         |
| `/workout-assignments/:id`           | PATCH  | Existing editable fields; every replacement exercise includes reference exercise ID and explicit prescription | Replaced detail with newly resolved media snapshots                                     | Owning verified Coach before completion         | Existing `404`, `409`, and `422` rules                                   |
| `/workout-assignments/:id`           | GET    | Assignment ID                                                                                                 | Existing detail plus exercise media allowed for the current actor and relationship      | Owning Coach or assigned Athlete                | Existing `401`, `403`, `404` rules                                       |

There is no public import endpoint and no provider callback. A developer command runs the pinned catalog import inside one database transaction.

Catalog browse defaults to twenty items and allows at most fifty. Results sort by case insensitive name and then ID. The opaque cursor binds that order, the search text, equipment, primary muscle, and authenticated Coach ID. Filter values come from active imported metadata.

**Value sourcing**:

| Action                            | Value produced or displayed                                 | Source                                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Import catalog                    | Stable identity and metadata                                | Pinned package version plus manifest slug and fields                                                                                           |
| Import catalog                    | Existing row identity                                       | Normalized exact name match against the eight seed rows, then preserved database ID                                                            |
| Browse catalog                    | Search and filter result                                    | Active `reference_exercises` rows, Coach ID from verified account context, query inputs                                                        |
| Preview video                     | Provider, video identifier, canonical source, and embed URL | Server parser from the entered individual YouTube or Vimeo URL                                                                                 |
| Preview video                     | Ready or failed result                                      | Official YouTube or Vimeo player ready and error events inside the trusted player wrapper, with a ten second timer starting when preview opens |
| Save video                        | Canonical URL and normalized provider identifier            | Server parser from the submitted URL, using the same contract as preview                                                                       |
| Save video                        | Creator and rights confirmation                             | Required Coach form values, with confirmation time set by the server                                                                           |
| Create template                   | Sets and repetitions or duration                            | Required Coach inputs, never catalog defaults                                                                                                  |
| Assign direct or template workout | Current Coach video selection                               | Video form attached to each assignment exercise, backed by the authenticated Coach and reference exercise row                                  |
| Create or edit assignment         | Exercise name, frames, credits, and optional video          | Active reference row plus the authenticated Coach's current video row at transaction time                                                      |
| Open assigned exercise            | Private video visibility                                    | Snapshot video plus an active relationship between the assigned Athlete and assigning Coach                                                    |
| Open assigned exercise            | Illustration fallback                                       | Permanent assignment exercise snapshot                                                                                                         |
| Show credits                      | Catalog and video attribution                               | Permanent assignment credit, creator, and canonical source snapshots                                                                           |

**Key invariants**:

- Source plus catalog slug identifies one reference exercise. Name remains unique for the current catalog picker.
- Catalog status is exactly `active` or `unavailable`. Default browse returns active rows only. Historical snapshots do not depend on catalog status. The same source slug reappearing in a reviewed import reactivates its row.
- Every imported item has exactly three ordered frame URLs and complete attribution.
- Every new template and assignment exercise has one active reference ID, sets from 1 through 20, and nonempty repetitions or duration. No exercise instruction field exists.
- One Coach has at most one current video per reference exercise.
- Only individual YouTube videos, YouTube Shorts, and individual Vimeo videos are accepted.
- A failed preview or API validation never replaces the current video.
- A player that emits an error or does not become ready within ten seconds switches to the illustration fallback.
- Native YouTube requests carry a stable HTTPS WebView base URL so the provider receives an HTTP referrer. The submitted provider URL never becomes that base URL.
- Original illustration frames render without media edits. Any later adapted asset must keep the required license, attribution, and change notice.
- Assignment creation resolves reference and Coach video data in the same transaction that writes the snapshot.
- Assignment creation reads the Coach video once inside its transaction. It snapshots whichever committed video row is visible at that read, so a concurrent replacement affects either that assignment or the next one, never a partial snapshot.
- Catalog and video edits never update existing assignment snapshots.
- The exercise count remains from 1 through 12 with unique consecutive positions.

**Security model**:

- Existing Clerk authentication and Dino Account roles guard every route.
- Only a Coach can browse the catalog or manage that Coach's video rows.
- Video ownership comes from the authenticated account, never a request body Coach ID.
- Only the assigned Athlete and assigning Coach can read an assignment through existing ownership rules.
- The API omits snapshot video fields when `coaching_relationships` has no row for that assignment's Coach and Athlete with status `active`. It keeps illustration fields and returns illustration credits only.
- Provider source URLs remain external public or unlisted resources. Dino makes their placement private, not the provider content itself.
- Provider players receive network requests only after the Athlete taps play. Privacy reduced provider embed options are used where supported.
- The player receives only Dino constructed allowlisted embed URLs. Submitted provider URLs and HTML are never rendered directly.
- Video URLs and creator names are private content and are excluded from telemetry and errors.
- No new regulated health data category, public content surface, or administrator moderation system is introduced.

**Critical test scenarios**:

- Happy path: import 302 exercises, create a template with explicit prescription, select a Coach video while assigning the template, and play it as the active Athlete, verifies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-7**, and **AC-8**.
- Assignment surfaces: confirm video management is absent from template creation and present in both direct workout assignment and template assignment, verifies **AC-4** and **AC-7**.
- Fallback: assign an exercise without a video and simulate a provider playback failure, then confirm one centered illustration and credits remain usable, verifies **AC-9** and **AC-14**.
- Native YouTube identity: inspect the native player source and confirm its local HTML wrapper uses the stable HTTPS base URL while the iframe receives only the server constructed embed URL, verifies **AC-4**, **AC-5**, and **AC-8**.
- History: replace and remove a Coach video, update the catalog, and confirm existing snapshots stay unchanged while later assignments use current values, verifies **AC-6** and **AC-12**.
- Catalog migration: run the pinned import twice, fail it midway, and import a version that removes one exercise, verifies **AC-1**, **AC-12**, and **AC-13**.
- Validation: reject missing prescriptions, rights confirmation, arbitrary hosts, playlists, live streams, and a preview that does not become ready within ten seconds without losing form values or the current video, verifies **AC-3**, **AC-4**, and **AC-5**.
- Cutover: open an old editable assignment without reference IDs, require the Coach to reselect each exercise before saving, and confirm old unedited history remains readable, verifies **AC-3**, **AC-7**, and **AC-12**.
- Auth and permission: exercise every catalog and video action as an Athlete and another Coach, then end the relationship and confirm old video fields disappear without revealing ownership, verifies **AC-10** and **AC-11**.
- Privacy: inspect API and app logs through success and failure paths and confirm private media values never appear, verifies **AC-15**.

## Build plan

- [x] Add the catalog metadata, Coach video, and exact three frame assignment snapshot schema in a backward compatible migration. Add a retry safe pinned import with deterministic mapping, seed matching, status changes, and a review report, satisfies **AC-1**, **AC-12**, and **AC-13**.
- [x] Extend one reference exercise end to end thread through database search, the existing Coach catalog API, equipment and muscle filters, and the current template picker before broadening to all 302 items, satisfies **AC-1**, **AC-2**, and **AC-3**.
- [x] Add the single server video parser, normalized preview response, trusted provider player wrapper, create or replace, removal, creator and source capture, sharing confirmation, actor isolation, and reference exercise query refresh from the exercise detail, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-11**, and **AC-15**.
- [x] Require catalog references and explicit prescriptions in every new Coach template and assignment flow, then resolve and snapshot current catalog and Coach video data transactionally, satisfies **AC-3**, **AC-7**, and **AC-12**.
- [x] Add the Athlete exercise detail player, inactive relationship video filtering, immediate three illustration fallback, swipe sequence, credits, and accessible loading and error states, satisfies **AC-8**, **AC-9**, **AC-10**, and **AC-14**.
- [x] Add database, API, app, and end to end coverage for import retries, catalog filtering, provider validation, actor isolation, snapshot history, relationship ending, fallback, credits, and private logging, satisfies **AC-1** through **AC-15**.
- [x] Remove exercise instructions from the database, API contracts, Coach forms, Athlete displays, and tests while preserving sets and repetitions or duration, satisfies **AC-3**, **AC-7**, **AC-9**, **AC-10**, **AC-14**, and **AC-15**.
- [x] Move video management out of template creation and into both assignment flows, expose the current Coach video with template detail, render one centered Athlete fallback illustration, and identify native YouTube WebView requests with a stable HTTPS base URL, satisfies **AC-4**, **AC-5**, **AC-7**, **AC-8**, and **AC-9**.

## Consequences

**Positive**:

- Athletes receive a useful demonstration from every newly assigned catalog exercise.
- Coaches stop typing exercise names and may reuse one private video choice across future assignments.
- Existing templates, assignments, and completed history keep stable prescriptions.
- Dino avoids upload, storage, transcoding, and moderation infrastructure.

**Negative and tradeoffs**:

- Video and illustration availability depends on the network, CDN, and provider.
- Athletes no longer receive Coach written movement cues for each exercise.
- Dino must preserve attribution and review catalog upgrades manually.
- A provider video may still be public or unlisted outside Dino.

**Neutral**:

- The app gains `react-native-webview` for a trusted native provider player wrapper and a small web iframe counterpart.
- Existing TanStack Query memory caching may keep prescription data during the current app process. This feature adds no disk cache or query persistence.
- The package is an import source, not a runtime API and not the prescription source of truth.
- Existing manual workout history remains readable, while all new assignment exercises move to catalog identity.

## Follow-up

- [ ] Consider Coach custom exercises only after the 302 item catalog flow is proven with pilot users.
- [ ] Consider Dino hosted video uploads only when provider links fail a demonstrated pilot need.
- [ ] During a later `/sync`, record the declined general backend Agent Skills and Vimeo MCP server so they are not offered again.

## References

**Project sources**:

- `AGENTS.md`, current phase, Tracer Bullet approach, approved stack, and excluded infrastructure
- `api/AGENTS.md`, NestJS, PostgreSQL, Drizzle, and actor scoped API conventions
- Spec 0002, immutable assignment snapshots and private logging
- Specs 0004 and 0005, shared reference exercises, template prescriptions, and dated assignment flow

**Practices and standards**:

- Immutable historical snapshots
- Least privilege and actor scoped ownership
- Retry safe transactional imports
- Progressive media fallback
- Privacy reduced third party embeds

**Links**:

- Workout Guide repository: https://github.com/bryllim/workout-guide
- Workout Guide integration guide: https://bryllim.github.io/workout-guide/guide/
- Workout Guide asset license: https://github.com/bryllim/workout-guide/blob/main/LICENSE-ASSETS
- Workout Guide attribution: https://github.com/bryllim/workout-guide/blob/main/ATTRIBUTION.md
- Workout Guide package: https://www.npmjs.com/package/@bryllim/workout-guide

## Migration plan

**Strategy**: Backward compatible expansion, followed by catalog cutover

**Phases**:

1. Add nullable catalog and snapshot media columns plus the Coach video table. Import and verify the pinned catalog while existing APIs keep working.
2. Deploy catalog backed picker, video management, and assignment snapshot writes. New assignments require reference IDs, sets, and repetitions or duration. Editing an older assignment without reference IDs requires the Coach to reselect its exercises before saving.
3. Verify no consumer reads exercise instructions, then remove instruction columns from reference exercises, templates, and assignment snapshots. Existing instruction values are intentionally discarded.

**Rollback**: Stop new catalog backed writes, restore the previous app and API contract, and leave additive catalog and media rows unused. Do not delete assignment snapshots. The final default column removal occurs only after the cutover is verified.

**Risks**: A name match may enrich the wrong seed row, a package change may alter slugs or assets, and stricter assignment input may reject an outdated client. The import must report every match for review, pin its package version, and land the app and API contract together.
