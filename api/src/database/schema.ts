import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  date,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
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
export const workoutAssignmentStatus = pgEnum('workout_assignment_status', [
  'assigned',
  'completed',
  'reviewed',
]);
export const rosterInvitationStatus = pgEnum('roster_invitation_status', [
  'sending',
  'pending',
  'failed',
  'accepted',
  'revoked',
  'expired',
]);
export const coachingRelationshipStatus = pgEnum(
  'coaching_relationship_status',
  ['active', 'ended'],
);
export const referenceExerciseCatalogStatus = pgEnum(
  'reference_exercise_catalog_status',
  ['active', 'unavailable'],
);
export const exerciseVideoProvider = pgEnum('exercise_video_provider', [
  'youtube',
  'vimeo',
]);

export type ExerciseIllustrationFrame = {
  index: 1 | 2 | 3;
  url: string;
  width: number;
  height: number;
};

export type ExerciseIllustrationAttribution = {
  creator: string;
  creatorUrl: string;
  license: string;
  licenseUrl: string;
  source?: {
    name: string;
    url: string;
    license: string;
    licenseUrl: string;
    changes: string;
  };
};

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

export const rosterInvitations = pgTable(
  'roster_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    coachAccountId: uuid('coach_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    invitedEmail: text('invited_email').notNull(),
    athleteAccountId: uuid('athlete_account_id').references(() => accounts.id, {
      onDelete: 'restrict',
    }),
    clerkInvitationId: text('clerk_invitation_id'),
    status: rosterInvitationStatus('status').notNull().default('sending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    adultConfirmedAt: timestamp('adult_confirmed_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('roster_invitations_clerk_id_unique')
      .on(table.clerkInvitationId)
      .where(sql`${table.clerkInvitationId} is not null`),
    uniqueIndex('roster_invitations_open_email_unique')
      .on(table.invitedEmail)
      .where(sql`${table.status} in ('sending', 'pending', 'failed')`),
    index('roster_invitations_coach_created_idx').on(
      table.coachAccountId,
      table.createdAt,
      table.id,
    ),
    check(
      'roster_invitations_email_canonical',
      sql`${table.invitedEmail} = lower(trim(${table.invitedEmail}))`,
    ),
    check(
      'roster_invitations_lifecycle_fields',
      sql`(${table.status} <> 'accepted' or (${table.athleteAccountId} is not null and ${table.adultConfirmedAt} is not null and ${table.acceptedAt} is not null)) and (${table.status} <> 'revoked' or ${table.revokedAt} is not null) and (${table.status} <> 'pending' or (${table.clerkInvitationId} is not null and ${table.expiresAt} is not null))`,
    ),
  ],
);

export const coachingRelationships = pgTable(
  'coaching_relationships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    coachAccountId: uuid('coach_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    athleteAccountId: uuid('athlete_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    sourceInvitationId: uuid('source_invitation_id')
      .notNull()
      .unique()
      .references(() => rosterInvitations.id, { onDelete: 'restrict' }),
    status: coachingRelationshipStatus('status').notNull().default('active'),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('coaching_relationships_active_athlete_unique')
      .on(table.athleteAccountId)
      .where(sql`${table.status} = 'active'`),
    index('coaching_relationships_coach_started_idx').on(
      table.coachAccountId,
      table.startedAt,
      table.id,
    ),
    check(
      'coaching_relationships_distinct_accounts',
      sql`${table.coachAccountId} <> ${table.athleteAccountId}`,
    ),
    check(
      'coaching_relationships_lifecycle_fields',
      sql`(${table.status} <> 'ended' or ${table.endedAt} is not null)`,
    ),
  ],
);

export const referenceExercises = pgTable(
  'reference_exercises',
  {
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    defaultSets: smallint('default_sets'),
    defaultRepetitions: varchar('default_repetitions', {
      length: 32,
    }),
    catalogSource: varchar('catalog_source', { length: 100 }),
    catalogVersion: varchar('catalog_version', { length: 32 }),
    catalogSlug: varchar('catalog_slug', { length: 160 }),
    catalogStatus: referenceExerciseCatalogStatus('catalog_status')
      .notNull()
      .default('unavailable'),
    exerciseType: varchar('exercise_type', { length: 64 }),
    equipment: varchar('equipment', { length: 100 }),
    primaryMuscle: varchar('primary_muscle', { length: 100 }),
    secondaryMuscles: jsonb('secondary_muscles').$type<string[]>(),
    isStretch: boolean('is_stretch'),
    illustrationFrames: jsonb('illustration_frames').$type<
      ExerciseIllustrationFrame[]
    >(),
    illustrationAttribution: jsonb(
      'illustration_attribution',
    ).$type<ExerciseIllustrationAttribution>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('reference_exercises_name_unique').on(table.name),
    uniqueIndex('reference_exercises_source_slug_unique')
      .on(table.catalogSource, table.catalogSlug)
      .where(
        sql`${table.catalogSource} is not null and ${table.catalogSlug} is not null`,
      ),
    index('reference_exercises_catalog_filter_idx').on(
      table.catalogStatus,
      table.equipment,
      table.primaryMuscle,
      table.name,
    ),
    check(
      'reference_exercises_default_sets_range',
      sql`${table.defaultSets} between 1 and 20`,
    ),
  ],
);

export const coachExerciseVideos = pgTable(
  'coach_exercise_videos',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    coachAccountId: uuid('coach_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    referenceExerciseId: uuid('reference_exercise_id')
      .notNull()
      .references(() => referenceExercises.id, { onDelete: 'restrict' }),
    provider: exerciseVideoProvider('provider').notNull(),
    providerVideoId: varchar('provider_video_id', { length: 128 }).notNull(),
    canonicalSourceUrl: varchar('canonical_source_url', {
      length: 500,
    }).notNull(),
    creatorName: varchar('creator_name', { length: 100 }).notNull(),
    sharingConfirmedAt: timestamp('sharing_confirmed_at', {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('coach_exercise_videos_owner_reference_unique').on(
      table.coachAccountId,
      table.referenceExerciseId,
    ),
  ],
);

export const workoutTemplates = pgTable(
  'workout_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    coachAccountId: uuid('coach_account_id').references(() => accounts.id, {
      onDelete: 'restrict',
    }),
    name: varchar('name', { length: 100 }).notNull(),
    overviewNote: varchar('overview_note', { length: 1000 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('workout_templates_coach_created_idx').on(
      table.coachAccountId,
      table.createdAt,
      table.id,
    ),
    uniqueIndex('workout_templates_starter_name_unique')
      .on(table.name)
      .where(sql`${table.coachAccountId} is null`),
  ],
);

export const workoutTemplateExercises = pgTable(
  'workout_template_exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => workoutTemplates.id, { onDelete: 'cascade' }),
    referenceExerciseId: uuid('reference_exercise_id')
      .notNull()
      .references(() => referenceExercises.id, { onDelete: 'restrict' }),
    position: smallint('position').notNull(),
    sets: smallint('sets').notNull(),
    repetitions: varchar('repetitions', { length: 32 }).notNull(),
  },
  (table) => [
    uniqueIndex('workout_template_exercises_position_unique').on(
      table.templateId,
      table.position,
    ),
    uniqueIndex('workout_template_exercises_reference_unique').on(
      table.templateId,
      table.referenceExerciseId,
    ),
    check(
      'workout_template_exercises_position_range',
      sql`${table.position} between 1 and 12`,
    ),
    check(
      'workout_template_exercises_sets_range',
      sql`${table.sets} between 1 and 20`,
    ),
  ],
);

export const workoutAssignments = pgTable(
  'workout_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    coachAccountId: uuid('coach_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    athleteAccountId: uuid('athlete_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 100 }).notNull(),
    overviewNote: varchar('overview_note', { length: 1000 }),
    assignedDate: date('assigned_date').notNull(),
    creationTimeZone: varchar('creation_time_zone', { length: 64 }).notNull(),
    status: workoutAssignmentStatus('status').notNull().default('assigned'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('workout_assignments_athlete_date_unique').on(
      table.athleteAccountId,
      table.assignedDate,
    ),
    index('workout_assignments_coach_date_idx').on(
      table.coachAccountId,
      table.assignedDate,
      table.createdAt,
      table.id,
    ),
    index('workout_assignments_athlete_date_idx').on(
      table.athleteAccountId,
      table.assignedDate,
      table.createdAt,
      table.id,
    ),
    index('workout_assignments_coach_status_date_idx').on(
      table.coachAccountId,
      table.status,
      table.assignedDate,
      table.createdAt,
      table.id,
    ),
    index('workout_assignments_athlete_status_date_idx').on(
      table.athleteAccountId,
      table.status,
      table.assignedDate,
      table.createdAt,
      table.id,
    ),
    check(
      'workout_assignments_distinct_actors',
      sql`${table.coachAccountId} <> ${table.athleteAccountId}`,
    ),
  ],
);

export const assignmentExercises = pgTable(
  'assignment_exercises',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .references(() => workoutAssignments.id, { onDelete: 'cascade' }),
    referenceExerciseId: uuid('reference_exercise_id').references(
      () => referenceExercises.id,
      { onDelete: 'restrict' },
    ),
    position: smallint('position').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    sets: smallint('sets').notNull(),
    repetitions: varchar('repetitions', { length: 32 }).notNull(),
    illustrationFrames: jsonb('illustration_frames').$type<
      ExerciseIllustrationFrame[]
    >(),
    illustrationAttribution: jsonb(
      'illustration_attribution',
    ).$type<ExerciseIllustrationAttribution>(),
    videoProvider: exerciseVideoProvider('video_provider'),
    videoProviderId: varchar('video_provider_id', { length: 128 }),
    videoCreatorName: varchar('video_creator_name', { length: 100 }),
    videoSourceUrl: varchar('video_source_url', { length: 500 }),
  },
  (table) => [
    uniqueIndex('assignment_exercises_assignment_position_unique').on(
      table.assignmentId,
      table.position,
    ),
    check(
      'assignment_exercises_position_range',
      sql`${table.position} between 1 and 12`,
    ),
    check(
      'assignment_exercises_sets_range',
      sql`${table.sets} between 1 and 20`,
    ),
  ],
);

export const workoutCompletions = pgTable(
  'workout_completions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id')
      .notNull()
      .unique()
      .references(() => workoutAssignments.id, { onDelete: 'restrict' }),
    athleteAccountId: uuid('athlete_account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'restrict' }),
    note: varchar('note', { length: 1000 }),
    completedAt: timestamp('completed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('workout_completions_completed_assignment_idx').on(
      table.completedAt,
      table.assignmentId,
    ),
  ],
);

export const workoutReviews = pgTable('workout_reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id')
    .notNull()
    .unique()
    .references(() => workoutAssignments.id, { onDelete: 'restrict' }),
  coachAccountId: uuid('coach_account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'restrict' }),
  response: varchar('response', { length: 1000 }),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Account = typeof accounts.$inferSelect;
export type AccountRole = Account['role'];
export type AccountStatus = Account['status'];
export type RosterInvitation = typeof rosterInvitations.$inferSelect;
export type CoachingRelationship = typeof coachingRelationships.$inferSelect;
export type ReferenceExercise = typeof referenceExercises.$inferSelect;
export type CoachExerciseVideo = typeof coachExerciseVideos.$inferSelect;
export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
export type WorkoutAssignment = typeof workoutAssignments.$inferSelect;
export type WorkoutAssignmentStatus = WorkoutAssignment['status'];
