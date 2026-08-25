import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const accountRole = pgEnum('account_role', ['Coach', 'Athlete']);
export const accountStatus = pgEnum('account_status', [
  'pending_activation',
  'active',
  'disabled',
  'cancelled',
]);
export const securityEventType = pgEnum('security_event_type', [
  'created',
  'activated',
  'disabled',
  'reactivated',
  'cancelled',
]);
export const securityActorType = pgEnum('security_actor_type', [
  'operator',
  'account',
  'system',
]);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    authSubject: text('auth_subject'),
    email: text('email').notNull(),
    displayName: text('display_name').notNull(),
    role: accountRole('role').notNull(),
    status: accountStatus('status').notNull().default('pending_activation'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('accounts_email_unique').on(table.email),
    uniqueIndex('accounts_auth_subject_unique')
      .on(table.authSubject)
      .where(sql`${table.authSubject} is not null`),
    check(
      'accounts_email_canonical',
      sql`${table.email} = lower(trim(${table.email}))`,
    ),
    check(
      'accounts_subject_by_status',
      sql`((${table.status} in ('active', 'disabled')) and ${table.authSubject} is not null) or ((${table.status} in ('pending_activation', 'cancelled')) and ${table.authSubject} is null)`,
    ),
    check(
      'accounts_lifecycle_timestamps',
      sql`(${table.status} <> 'active' or ${table.activatedAt} is not null) and (${table.status} <> 'disabled' or ${table.disabledAt} is not null) and (${table.status} <> 'cancelled' or ${table.cancelledAt} is not null)`,
    ),
  ],
);

export const accountSecurityEvents = pgTable(
  'account_security_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    eventType: securityEventType('event_type').notNull(),
    actorType: securityActorType('actor_type').notNull(),
    actorIdentifier: text('actor_identifier').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('account_security_events_account_idx').on(table.accountId)],
);

export type Account = typeof accounts.$inferSelect;
export type AccountRole = Account['role'];
export type AccountStatus = Account['status'];
