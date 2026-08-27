# 0004 · Minimal workout templates

**Status**: Assumed
**Date**: 2026-08-25
**Authorized by**: Ced, during /develop

## Owed decision

The full private exercise library, media model, reusable program model, and template lifecycle still need architecture work.

## Assumption built on

This build proves only one small template flow.

Dino stores a shared reference exercise list containing the exercises from the supplied Full Body A workout. Dino also stores one shared read only Full Body A starter template. A signed in Coach can list the starter template plus templates owned by that Coach. A Coach never sees another Coach's private templates.

The starter is the Fat Loss and General Fitness Full Body A supplied by Ced. Its ordered prescriptions are Smith Machine Squat, 3 sets of 8 to 10; Smith Flat Bench Press, 3 sets of 8 to 12; Cable Lat Pulldown, 3 sets of 10 to 12; Dumbbell Romanian Deadlift, 2 sets of 10 to 12; Cable Row, 2 sets of 10 to 12; Cable Triceps Pushdown, 2 sets of 12 to 15; Dumbbell Curl, 2 sets of 12 to 15; and Easy walking, 1 set of 10 to 15 minutes.

A Coach creates a private template by entering a name, adding optional notes, and selecting one or more reference exercises in one pass. Each selected exercise starts with the supplied sets and rep or duration prescription. The Coach can adjust that prescription before saving. The saved template preserves exercise order.

The API exposes Coach only list and create operations for exercises and templates. Every list is paginated. The server takes Coach identity and ownership from the verified account, never from request body values.

Exercise search uses case insensitive name matching. An empty query returns the exercise list in name order. Both exercise and template lists return twenty items by default and accept an opaque cursor.

Reference exercises use stable IDs, names, default sets, default repetitions, and optional written instructions. Templates store an optional Coach owner. A missing owner marks the single Dino starter template. Template exercise rows store position, the reference exercise ID, and copied sets, repetitions, and instructions so later reference changes cannot alter a saved prescription.

The Programs screen shows loading, error, empty, starter, and private template states. The create screen uses Dino tokens and existing workout controls. It keeps entered values after a failed request and announces validation or request errors.

Template assignment, editing, deletion, programs containing several templates, custom exercises, demonstration media, analytics, and nutrition data are outside this build.

## Code area

`api/src/database/schema.ts`, `api/src/templates/`, `api/drizzle/`, `src/features/workouts/`, and `src/app/coach/programs/`

## Requirements

AC 1. A verified Coach can see the shared Full Body A starter template with its ordered exercise prescriptions.

AC 2. A verified Coach can search the shared reference exercise list and select several exercises without typing their names.

AC 3. A verified Coach can create a private template with a name, optional notes, ordered exercises, and exercise prescriptions.

AC 4. A Coach can see only the shared starter template and that Coach's private templates.

AC 5. An Athlete or unverified caller cannot read or create templates.

AC 6. Failed saves keep the entered template content and provide a useful retry message.

## Ratify

This decision was recorded by /develop, not deliberated. Run `/architect minimal workout templates` to deliberate and ratify it. Until then it stays flagged as an owed decision. It does not block marking the feature done.
