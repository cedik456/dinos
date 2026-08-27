# Verify 0003. Private roster invitations

Use this after implementation. Record app screenshots, API results, database evidence, Clerk invitation state, and test output beside each section.

## Setup

1. Finish the hosted Account Portal work in spec 0001.
2. Start PostgreSQL, apply every migration, and start the NestJS API.
3. Use a Clerk development instance with invite only access and application invitations enabled.
4. Provision and activate two Coaches through the private operator command.
5. Prepare one new Athlete email and one existing active Athlete with no relationship.

## New Athlete journey

1. Sign in as the first Coach and open Athletes.
2. Invite the new Athlete email.
3. Confirm one Pending row appears with a seven day expiry.
4. Complete Clerk hosted registration with the exact invited email.
5. Open Dino and confirm protected Athlete routes remain closed until acceptance.
6. Confirm the inviting Coach name, enter the Athlete's own display name, confirm adult status, and accept.
7. Confirm the Account is active with permanent Athlete role and the roster row changes to Active.
8. Select that Athlete during workout creation and confirm the assignment succeeds and appears in Athlete Plan.

Expected result: **AC-1**, **AC-2**, **AC-4**, **AC-8**, **AC-13**, and **AC-14** pass.

## Existing Athlete journey

1. Invite the existing active Athlete email while it has no active relationship.
2. Sign in as that Athlete and accept.
3. Confirm the existing Account identifier, role, credentials, and display name remain unchanged.
4. Confirm exactly one active relationship is created.

Expected result: **AC-3** and **AC-6** pass.

## Delivery, resend, revoke, and expiry

1. Lose the response after Clerk creates an invitation, then press Try Again on the same Dino invitation.
2. Confirm Dino finds the Clerk invitation by canonical email and `dinoRosterInvitationId`, stores its id, and does not send a second email.
3. Make Clerk unavailable and confirm the invitation shows Not Sent and remains available for explicit retry.
4. Restore Clerk, retry, and confirm one Pending row with one stored Clerk id and a seven day expiry.
5. Resend and confirm the stored Clerk id and expiry move to the replacement invitation.
6. Revoke while Clerk is unavailable and confirm local acceptance fails immediately. Record any rare provider leftover for manual cleanup.
7. Confirm no database transaction remains open during any Clerk call.
8. Advance beyond expiry, open the link, and confirm Dino refuses acceptance.

Expected result: **AC-5**, **AC-9**, **AC-10**, **AC-11**, and **AC-12** pass.

## Tenant ownership and races

1. Try every first Coach invitation and relationship identifier as the second Coach.
2. Confirm Not Found and no email, Athlete, or Coach disclosure.
3. Race both Coaches while inviting the same canonical email and confirm only one open invitation remains.
4. Race acceptance against revocation and confirm only the first valid transition commits.
5. Race two relationship acceptances for one Athlete and confirm only one active Coach remains.
6. Try inviting an email that belongs to a Coach, pending Account, existing relationship, or another Coach's invitation and confirm the same generic unavailable response each time.
7. Try assigning a pending, expired, revoked, ended, or foreign Athlete and confirm `ROSTER_REQUIRED`.

Expected result: **AC-6**, **AC-7**, **AC-8**, and **AC-13** pass.

## Offline, privacy, and limits

1. Disconnect during invitation entry and confirm the email remains entered without a queued mutation or success state.
2. Disconnect during acceptance and confirm name and adult confirmation remain available for explicit retry.
3. Confirm stale roster data stays visible with status text and Retry while actions remain safe.
4. Exceed twenty invitation attempts for one Coach in a day and confirm `429 RATE_LIMITED` with no Clerk or database mutation.
5. Exceed one resend per minute and five per hour and confirm the same.
6. Search logs, analytics, traces, and errors for test emails, display names, invitation links, and tokens. Confirm none appear.
7. Render all roster and acceptance states on iOS, Android, and web. Confirm status text, accessible labels, 48 dp targets, and floating navigation clearance.

Expected result: **AC-10**, **AC-11**, **AC-12**, and **AC-14** pass.

## Required checks

```sh
npm run check
npx expo-doctor
npm run api:check
npm run db:up
npm --prefix api run test:e2e
```
