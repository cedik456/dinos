# 0005 · Template assignment

**Status**: Assumed
**Date**: 2026-08-25
**Authorized by**: Ced, during /develop

## Owed decision

The full template lifecycle still needs architecture work. This slice decides only how a Coach turns one existing template into one dated Athlete assignment.

## Assumption built on

A Coach starts from the Programs screen by choosing Use template on a shared or Coach owned template.

The assignment screen loads that template from the API. It shows the template name and ordered exercise prescriptions, the Coach's active Athlete roster, an assigned date, and optional prescription adjustments. The first active Athlete may be selected automatically. The assigned date starts as the Coach device's local date.

The Coach can adjust sets, repetitions or duration, and instructions before assigning. Exercise names and order come from the template and are not typed again in this flow.

Saving calls the existing workout assignment endpoint with the selected Athlete, date, device time zone, template name and notes, and the current ordered prescriptions. The existing assignment tables remain the source of truth. No template ID is stored on the assignment in this slice.

The new assignment is a snapshot. Later template edits cannot change it, and assignment adjustments cannot change the template.

The server continues to take Coach identity from the verified account and requires an active coaching relationship for the selected Athlete. A Coach can load only the shared starter template or that Coach's private templates. Athlete, unverified, foreign Coach, inactive roster, and unknown template access fail closed.

The screen shows loading, template unavailable, roster empty, validation, conflict, and request failure states. A failed save keeps the selected Athlete, date, and adjusted prescriptions.

Editing templates, deleting templates, assigning several dates or Athletes at once, and storing template provenance are outside this build.

## Code area

`api/src/templates/`, `api/test/templates.e2e-spec.ts`, `src/features/workouts/`, and `src/app/coach/programs/templates/`

## Requirements

AC 1. A verified Coach can choose Use template and open an assignment screen containing the selected template's ordered prescriptions.

AC 2. The Coach can select one active Athlete, choose an assigned date, and optionally adjust sets, repetitions or duration, and instructions without typing exercise names again.

AC 3. Saving creates one dated assignment through the existing workout assignment endpoint and returns the Coach to Programs.

AC 4. The saved assignment preserves the submitted order and prescriptions as a snapshot. The source template remains unchanged.

AC 5. A Coach cannot load another Coach's private template or assign to an Athlete outside that Coach's active roster. Athlete and unverified access fail closed.

AC 6. Empty roster, unavailable template, invalid input, date conflict, and request failure states are useful, and a failed save keeps the current form values.

## Ratify

This decision was recorded by /develop from Ced's approved small flow. Run `/architect template assignment` later if the full template lifecycle needs deliberation. Until then it stays flagged as an owed decision. It does not block marking the feature done.
