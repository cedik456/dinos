# Verify account identity and exclusive roles

## Setup

1. Use a Clerk development instance with Native applications, verified email and password, application invitations, password reset, and invite only access enabled.
2. Start PostgreSQL with `npm run db:up`.
3. Apply the identity migration.
4. Start the NestJS API and the Expo app with test environment keys.
5. Use unique controlled email addresses for one Coach and one Athlete.

## Account activation and routing

1. Provision the Coach with the operator command.
2. Run the same command again and confirm it reports the same pending Account, one creation event, and exactly one active invitation.
3. Accept the invitation in Clerk's hosted Account Portal, verify the email, set the password, return to Dino through hosted authentication, and complete `POST /me/activate`.
4. Confirm `GET /me` returns that Account with `Coach` and `active`.
5. Restart the app and confirm the session survives and opens the Coach experience without a role choice.
6. Repeat for the Athlete and confirm only the Athlete experience opens.

Expected result: **AC-1**, **AC-2**, **AC-3**, **AC-4**, and **AC-10** pass.

## Role and ownership denial

1. Call the test only Coach route with the Coach token and confirm success.
2. Call it with the Athlete token and confirm `403 Forbidden`.
3. Repeat in the opposite direction for the test only Athlete route.
4. Confirm no role proof route exists in the production application.
5. Confirm `GET /me` accepts no Account id and returns only the token subject's Account.
6. Confirm the role proof controllers are created only by the Nest end to end test module and are absent from production `AppModule`.

Expected result: **AC-4** and **AC-5** pass.

## Lifecycle, recovery, and Device Trust

1. Sign in on two devices or two independent test sessions.
2. Disable the Account with the protected operator configuration loaded.
3. Make Clerk revocation fail after the local transaction. Confirm both sessions are denied by Dino, the app clears local state, and the disabled message appears.
4. Confirm the command returns retry required, rerun it, and verify Clerk has no active sessions.
5. Reactivate the Account and confirm neither old session works.
6. Sign in again and confirm access returns.
7. Use Account Portal recovery and confirm Dino never renders or receives the recovery email, verification code, or new password.
8. Start a password sign in from a new browser or device and complete Clerk's Device Trust verification before Dino receives the session.

Expected result: **AC-6**, **AC-7**, **AC-8**, **AC-11**, and **AC-12** pass.

## Failure recovery

1. Interrupt provisioning after the Dino Account is stored but before Clerk finishes.
2. Rerun the command and confirm one Account and one active invitation remain.
3. Start the app without a network connection and confirm no protected role route renders.
4. Use a valid Clerk identity with no Dino Account and confirm `ACCOUNT_UNLINKED` produces a support state containing the API request id.
5. Make Clerk verification unavailable during `POST /me/activate` and confirm the pending Account remains unchanged.
6. Repeat a completed `POST /me/activate` and confirm the same success response with no second activation event.
7. Cancel a never activated Account and confirm the invitation is revoked, the Account is `cancelled`, and its security history remains.

Expected result: **AC-1**, **AC-2**, and **AC-9** pass.

## Security evidence

1. Inspect AccountSecurityEvent rows for creation, activation, disabling, reactivation, and cancellation.
2. Confirm each event has the correct Account, actor type, actor identifier, and occurrence time.
3. Search application logs and database values for test passwords, bearer tokens, invitation tickets, and reset material.
4. Confirm none are present.

Expected result: **AC-11** passes.

## Required checks

1. Run `npm run check`.
2. Run `npx expo-doctor`.
3. Run `npm run api:check`.
4. Run `npm run db:up`.
5. Run `npm --prefix api run test:e2e`.
