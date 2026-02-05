import { z } from 'zod';

export const passwordResetStateValues = [
  'not_applicable',
  'requested',
  'email_sent',
  'token_received',
  'awaiting_password',
  'changed',
] as const;

export const uiDensityValues = ['compact', 'spacious', 'comfy'] as const;

export const backgroundColorValues = [
  'red',
  'pink',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'blue',
  'sky',
  'teal',
  'cyan',
  'violet',
  'fuchsia',
  'purple',
  'slate',
  'gray',
  'white',
  'black',
] as const;

export const commandVisualStyleValues = ['text_only', 'icon_only', 'neither', 'both'] as const;
export const themeValues = ['system', 'dark', 'light'] as const;
export const databaseRoleValues = ['admin', 'moderator', 'user'] as const;

export const passwordResetStateSchema = z.enum(passwordResetStateValues);
export const uiDensitySchema = z.enum(uiDensityValues).default('comfy');
export const backgroundColorSchema = z.enum(backgroundColorValues).default('gray');
export const commandVisualStyleSchema = z.enum(commandVisualStyleValues).default('icon_only');
export const themeSchema = z.enum(themeValues).default('system');
export const databaseRoleSchema = z.enum(databaseRoleValues);

export const passwordInfoSchema: z.ZodType<{
  hashedPassword: string;
  createdAt: Date;
  incorrectAttempts: number;
  lockUntil: Date | null;
  passwordResetState: (typeof passwordResetStateValues)[number];
  previousPasswords: Array<{
    hashedPassword: string;
    createdAt: Date;
  }>;
}> = z.lazy(() =>
  z.object({
    hashedPassword: z.string().min(1),
    createdAt: z.date(),
    incorrectAttempts: z.number().int().min(0).max(5).default(0),
    lockUntil: z.date().nullable().default(null),
    passwordResetState: passwordResetStateSchema.default('not_applicable'),
    previousPasswords: z
      .array(
        z.object({
          hashedPassword: z.string().min(1),
          createdAt: z.date(),
        }),
      )
      .default([]),
  }),
);

export const userPreferencesSchema = z.object({
  density: uiDensitySchema,
  backgroundColor: backgroundColorSchema,
  commandVisualStyle: commandVisualStyleSchema,
  theme: themeSchema,
});

export const invitationSchema = z.object({
  id: z.uuid(),
  userId: z.uuid().nullable(),
  recipient: z.string().min(1),
  redeemedAt: z.date().nullable(),
  createdAt: z.date(),
  newUserId: z.uuid().nullable(),
});

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  username: z.string().min(4).max(60),
  dbRoles: z.array(databaseRoleSchema).default(['user']),
  imageUrl: z.url().nullable(),
  preferences: userPreferencesSchema,
  passwordInfo: passwordInfoSchema,
  pronouns: z.string().max(25).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  invitationId: z.uuid().nullable(),
  emailVerified: z.boolean().default(false),
  emailVerifyTokenHash: z.string().nullable(),
  emailVerifyExpiresAt: z.date().nullable(),
  resetTokenHash: z.string().nullable(),
  resetExpiresAt: z.date().nullable(),
});

export const sessionSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  roomId: z.uuid(),
  gameId: z.uuid(),
  createdAt: z.date(),
  expiresAt: z.date(),
});

export const refreshTokenSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  tokenHash: z.string().min(1),
  expiresAt: z.date(),
  revokedAt: z.date().nullable(),
  lastUsedAt: z.date(),
});

export type PasswordInfo = z.infer<typeof passwordInfoSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type Invitation = z.infer<typeof invitationSchema>;
export type User = z.infer<typeof userSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type RefreshToken = z.infer<typeof refreshTokenSchema>;

export type CrudListInput<TFilter> = {
  filter?: TFilter;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};

export type CrudResult<T> = {
  data: T;
  meta?: {
    requestId?: string;
  };
};

export type UserFilter = {
  id?: string;
  email?: string;
  username?: string;
  invitationId?: string | null;
  dbRole?: (typeof databaseRoleValues)[number];
  emailVerified?: boolean;
};

export type SessionFilter = {
  id?: string;
  userId?: string;
  roomId?: string;
  gameId?: string;
  expiresBefore?: Date;
  expiresAfter?: Date;
};

export type RefreshTokenFilter = {
  id?: string;
  userId?: string;
  revoked?: boolean;
  expiresBefore?: Date;
  expiresAfter?: Date;
};

export type InvitationFilter = {
  id?: string;
  recipient?: string;
  userId?: string | null;
  newUserId?: string | null;
  redeemed?: boolean;
};

export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateUserInput = Partial<Omit<User, 'id' | 'createdAt'>>;

export type CreateSessionInput = Omit<Session, 'id' | 'createdAt'> & { createdAt?: Date };
export type UpdateSessionInput = Partial<Omit<Session, 'id' | 'userId'>>;

export type CreateRefreshTokenInput = Omit<RefreshToken, 'id' | 'lastUsedAt'> & { lastUsedAt?: Date };
export type UpdateRefreshTokenInput = Partial<Omit<RefreshToken, 'id' | 'userId'>>;

export type CreateInvitationInput = Omit<Invitation, 'id' | 'createdAt'> & { createdAt?: Date };
export type UpdateInvitationInput = Partial<Omit<Invitation, 'id'>>;

export type UserCrudContract = {
  create(input: CreateUserInput): Promise<CrudResult<User>>;
  list(input?: CrudListInput<UserFilter>): Promise<CrudResult<User[]>>;
  getById(id: string): Promise<CrudResult<User | null>>;
  update(id: string, input: UpdateUserInput): Promise<CrudResult<User>>;
  delete(id: string): Promise<CrudResult<{ id: string }>>;
};

export type SessionCrudContract = {
  create(input: CreateSessionInput): Promise<CrudResult<Session>>;
  list(input?: CrudListInput<SessionFilter>): Promise<CrudResult<Session[]>>;
  getById(id: string): Promise<CrudResult<Session | null>>;
  update(id: string, input: UpdateSessionInput): Promise<CrudResult<Session>>;
  delete(id: string): Promise<CrudResult<{ id: string }>>;
};

export type RefreshTokenCrudContract = {
  create(input: CreateRefreshTokenInput): Promise<CrudResult<RefreshToken>>;
  list(input?: CrudListInput<RefreshTokenFilter>): Promise<CrudResult<RefreshToken[]>>;
  getById(id: string): Promise<CrudResult<RefreshToken | null>>;
  update(id: string, input: UpdateRefreshTokenInput): Promise<CrudResult<RefreshToken>>;
  delete(id: string): Promise<CrudResult<{ id: string }>>;
};

export type InvitationCrudContract = {
  create(input: CreateInvitationInput): Promise<CrudResult<Invitation>>;
  list(input?: CrudListInput<InvitationFilter>): Promise<CrudResult<Invitation[]>>;
  getById(id: string): Promise<CrudResult<Invitation | null>>;
  update(id: string, input: UpdateInvitationInput): Promise<CrudResult<Invitation>>;
  delete(id: string): Promise<CrudResult<{ id: string }>>;
};
