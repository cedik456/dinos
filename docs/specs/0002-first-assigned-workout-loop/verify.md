# Verify 0002. First assigned workout loop

Use this after implementation. Record screenshots, API results, and test output beside each section.

## Setup

1. Start PostgreSQL and apply migrations.
2. Run the development preview Account seed twice and confirm the second run reconciles without duplicates.
3. Confirm the seed created the exact Ced and Mika Account identifiers, subjects, roles, names, and active statuses from the spec.
4. Start the API with development mode and `DINO_PREVIEW_ACCESS_ENABLED=true`.
5. Start the Expo app against that API.

## Complete journey

1. Open Coach Programs as Ced.
2. Create a workout for Mika today with a title, an overview note, and at least two exercises.
3. Confirm the assignment appears in Coach Programs.
4. Switch to Mika and confirm the workout appears in Athlete Plan with the same date and ordered content.
5. Complete it with an Athlete note.
6. Switch to Ced and confirm Coach Home shows it awaiting review.
7. Add a Coach response and mark it reviewed.
8. Confirm both roles show reviewed status and the response.

This proves **AC-1**, **AC-3**, **AC-4**, **AC-5**, **AC-8**, and **AC-13**.

## Rules and retries

1. Reject zero and thirteen exercises, invalid sets, oversized fields, a past date, and a duplicate Athlete date.
2. Create a future assignment and confirm it is readable but cannot be completed early.
3. Repeat each successful mutation with identical content and confirm the same assignment state returns.
4. Repeat completion and review with different text and confirm a conflict without stored changes.
5. Race Coach edit against Athlete completion and confirm one transaction wins while the other refreshes.
6. Confirm completed and reviewed assignments cannot be edited, deleted, cancelled, or reopened.
7. Edit an assigned workout successfully and confirm the full replacement, immutable ownership and time zone, updated timestamp, and ordered exercises.
8. Retry normalized inputs using blank versus absent optional text and leading or trailing whitespace. Confirm matching domain content returns the same result.

This proves **AC-2**, **AC-3**, **AC-6**, **AC-7**, **AC-8**, and **AC-9**.

## Ownership and failure states

1. Try wrong role, inactive Account, unmatched identity, and foreign assignment access. Confirm denial and no identifier disclosure.
2. Disable the preview setting and confirm the preview header stops working.
3. Set a production environment with the preview setting present and confirm the preview header still stops working.
4. Disconnect the app after a successful read. Confirm cached data stays visible with stale and retry messaging.
5. Try a mutation offline. Confirm entered content remains and no success or queued mutation is shown.
6. Exercise loading, empty, validation, conflict refresh, and unavailable service states on Programs, Plan, Coach Home, and workout detail.
7. Cross cursor page boundaries with tied dates and creation times and confirm no duplicate or missing item.
8. Inspect structured logs and confirm no title, overview, exercise, instruction, Athlete note, or Coach response text appears.
9. Render every new workout surface on iOS, Android, and web. Confirm the semantic colors, spacing, radii, 48 dp touch targets, status text, and floating navigation clearance match Dino's existing visual rules.
10. Run the Tailwind token parity test and confirm untouched screens have no visual regression.
11. Switch between Ced and Mika repeatedly and confirm the previous actor's cached list and detail never render.
12. Test a date boundary around midnight in two IANA time zones and confirm the stored creation time zone controls completion.
13. Change a filter while reusing a cursor and confirm validation rejects the mismatch. Confirm the final page returns a null cursor.
14. Snapshot every list and detail response shape, including null lifecycle values and server action flags.
15. Exercise status, date range, direction, and awaiting review filters alone and in valid combinations.
16. Disable preview access, use a normal Coach with no roster target, and confirm creation returns `ROSTER_REQUIRED`.

This proves **AC-10**, **AC-11**, **AC-12**, **AC-13**, **AC-14**, **AC-15**, and **AC-16**.

## Required checks

```sh
npm run check
npx expo-doctor
npm run api:check
npm run db:up
npm --prefix api run test:e2e
```
