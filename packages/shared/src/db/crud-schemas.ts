import { z } from 'zod';
import type {
  Invitation,
  NewInvitation,
  NewRefreshToken,
  NewSession,
  NewUser,
  RefreshToken,
  Session,
  User,
} from './models';
import {
  BgColorPalette,
  CommandVisualMode,
  Density,
  InvitationStatus,
  PasswordResetState,
  ThemePreference,
} from './enums';

const zId = z.string().uuid();

const densityValues = [
  Density.Compact,
  Density.Spacious,
  Density.Comfy,
] as const;

export const zDensity = z.enum(densityValues);

const commandVisualValues = [
  CommandVisualMode.None,
  CommandVisualMode.Text,
  CommandVisualMode.Icon,
  CommandVisualMode.TextAndIcon,
] as const;

export const zCommandVisualMode = z.enum(commandVisualValues);

export const zBgColor = z.enum(BgColorPalette);

const themePreferenceValues = [
  ThemePreference.Light,
  ThemePreference.Dark,
  ThemePreference.System,
] as const;

export const zThemePreference = z.enum(themePreferenceValues);

const passwordResetStateValues = [
  PasswordResetState.None,
  PasswordResetState.Submitted,
  PasswordResetState.EmailSent,
  PasswordResetState.AwaitingVerification,
  PasswordResetState.UserPrompted,
  PasswordResetState.ChangeReceived,
] as const;

export const zPasswordResetState = z.enum(passwordResetStateValues);

const invitationStatusValues = [
  InvitationStatus.Pending,
  InvitationStatus.Redeemed,
  InvitationStatus.Revoked,
] as const;

export const zInvitationStatus = z.enum(invitationStatusValues);

export const zUserPreferences = z
  .object({
    density: zDensity,
    backgroundColor: zBgColor,
    accentColor: zBgColor.optional(),
  })
  .strict();

export const zCommandVisualPreference = z
  .object({
    mode: zCommandVisualMode,
    showText: z.boolean(),
    showIcon: z.boolean(),
  })
  .strict();

export const zPasswordInfo = z
  .object({
    hashedPassword: z.string().min(1),
    setAt: z.string(),
    expiresAt: z.string().nullable(),
    incorrectAttempts: z.number().int().min(0).max(4),
    lockoutUntil: z.string().nullable(),
    passwordResetState: zPasswordResetState,
    previousPasswords: z.array(z.string()),
  })
  .strict();

export const zUser = z
  .object({
    id: zId,
    email: z.string().email(),
    username: z.string().min(1),
    displayName: z.string().min(1),
    isActive: z.boolean(),
    isEmailVerified: z.boolean(),
    preferences: zUserPreferences,
    commandVisual: zCommandVisualPreference,
    theme: zThemePreference,
    passwordInfo: zPasswordInfo,
    lastLoginAt: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict() satisfies z.ZodType<User>;

export const zInsertUser = z
  .object({
    email: z.string().email(),
    username: z.string().min(1),
    displayName: z.string().min(1),
    preferences: zUserPreferences,
    commandVisual: zCommandVisualPreference,
    theme: zThemePreference,
    passwordInfo: zPasswordInfo,
    isActive: z.boolean().optional(),
    isEmailVerified: z.boolean().optional(),
    lastLoginAt: z.string().nullable().optional(),
  })
  .strict() satisfies z.ZodType<NewUser>;

export const zRefreshToken = z
  .object({
    id: zId,
    userId: zId,
    token: z.string().min(1),
    expiresAt: z.string(),
    revokedAt: z.string().nullable(),
    revokedBy: zId.nullable(),
    deviceLabel: z.string().optional(),
    ipAddress: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict() satisfies z.ZodType<RefreshToken>;

export const zInsertRefreshToken = z
  .object({
    userId: zId,
    token: z.string().min(1),
    expiresAt: z.string(),
    deviceLabel: z.string().optional(),
    ipAddress: z.string().optional(),
  })
  .strict() satisfies z.ZodType<NewRefreshToken>;

export const zSession = z
  .object({
    id: zId,
    userId: zId,
    ipAddress: z.string(),
    userAgent: z.string(),
    lastActivityAt: z.string(),
    expiresAt: z.string(),
    isActive: z.boolean(),
    refreshTokenId: zId.nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict() satisfies z.ZodType<Session>;

export const zInsertSession = z
  .object({
    userId: zId,
    ipAddress: z.string(),
    userAgent: z.string(),
    expiresAt: z.string(),
    refreshTokenId: zId.nullable().optional(),
    isActive: z.boolean().optional(),
    lastActivityAt: z.string().optional(),
  })
  .strict() satisfies z.ZodType<NewSession>;

export const zInvitation = z
  .object({
    id: zId,
    sentByUserId: zId,
    recipientEmail: z.string().email(),
    recipientName: z.string().nullable(),
    code: z.string().min(1),
    redeemedAt: z.string().nullable(),
    newUserId: zId.nullable(),
    status: zInvitationStatus,
    notes: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict() satisfies z.ZodType<Invitation>;

export const zInsertInvitation = z
  .object({
    sentByUserId: zId,
    recipientEmail: z.string().email(),
    recipientName: z.string().nullable().optional(),
    code: z.string().min(1),
    notes: z.string().optional(),
    status: zInvitationStatus.optional(),
    redeemedAt: z.string().nullable().optional(),
    newUserId: zId.nullable().optional(),
  })
  .strict() satisfies z.ZodType<NewInvitation>;

type CrudSchemaSet<Entity extends object, Insert extends object> = {
  zGetAllInput: z.ZodObject<z.ZodRawShape>;
  zGetAllOutput: z.ZodArray<z.ZodType<Entity>>;
  zGetByIdInput: z.ZodObject<z.ZodRawShape>;
  zGetByIdOutput: z.ZodType<Entity>;
  zFilterByInput: z.ZodObject<z.ZodRawShape>;
  zFilterByOutput: z.ZodArray<z.ZodType<Entity>>;
  zUpdateOneInput: z.ZodObject<z.ZodRawShape>;
  zUpdateOneOutput: z.ZodType<Entity>;
  zDeleteOneInput: z.ZodObject<z.ZodRawShape>;
  zDeleteOneOutput: z.ZodType<Entity>;
  zDeleteManyInput: z.ZodObject<z.ZodRawShape>;
  zDeleteManyOutput: z.ZodObject<z.ZodRawShape>;
  zInsertOneInput: z.ZodObject<z.ZodRawShape, 'strip', { data: Insert }>;
  zInsertOneOutput: z.ZodType<Entity>;
};

export const zDeleteManyOutput = z
  .object({
    deletedCount: z.number().int().nonnegative(),
  })
  .strict();

export const createCrudSchemas = <Entity extends object, Insert extends object>(
  zEntity: z.ZodObject<z.ZodRawShape, any, Entity>,
  zInsert: z.ZodObject<z.ZodRawShape, any, Insert>,
): CrudSchemaSet<Entity, Insert> => {
  const zFilter = zEntity.deepPartial();
  const zChanges = zEntity
    .omit({
      id: true,
      createdAt: true,
      updatedAt: true,
    })
    .deepPartial()
    .refine((value) => Object.keys(value).length > 0, {
      message: 'At least one field must be provided to update',
    });

  return {
    zGetAllInput: z.object({}).strict(),
    zGetAllOutput: z.array(zEntity),
    zGetByIdInput: z.object({ id: zId }),
    zGetByIdOutput: zEntity,
    zFilterByInput: z.object({ filter: zFilter.optional() }).strict(),
    zFilterByOutput: z.array(zEntity),
    zUpdateOneInput: z.object({
      id: zId,
      changes: zChanges,
    }),
    zUpdateOneOutput: zEntity,
    zDeleteOneInput: z.object({ id: zId }),
    zDeleteOneOutput: zEntity,
    zDeleteManyInput: z.object({ filter: zFilter.optional() }).strict(),
    zDeleteManyOutput,
    zInsertOneInput: z.object({ data: zInsert }).strict(),
    zInsertOneOutput: zEntity,
  };
};

const refreshTokenCrud = createCrudSchemas(zRefreshToken, zInsertRefreshToken);
export const {
  zGetAllInput: zRefreshTokenGetAllInput,
  zGetAllOutput: zRefreshTokenGetAllOutput,
  zGetByIdInput: zRefreshTokenGetByIdInput,
  zGetByIdOutput: zRefreshTokenGetByIdOutput,
  zFilterByInput: zRefreshTokenFilterByInput,
  zFilterByOutput: zRefreshTokenFilterByOutput,
  zUpdateOneInput: zRefreshTokenUpdateOneInput,
  zUpdateOneOutput: zRefreshTokenUpdateOneOutput,
  zDeleteOneInput: zRefreshTokenDeleteOneInput,
  zDeleteOneOutput: zRefreshTokenDeleteOneOutput,
  zDeleteManyInput: zRefreshTokenDeleteManyInput,
  zDeleteManyOutput: zRefreshTokenDeleteManyOutput,
  zInsertOneInput: zRefreshTokenInsertOneInput,
  zInsertOneOutput: zRefreshTokenInsertOneOutput,
} = refreshTokenCrud;

const sessionCrud = createCrudSchemas(zSession, zInsertSession);
export const {
  zGetAllInput: zSessionGetAllInput,
  zGetAllOutput: zSessionGetAllOutput,
  zGetByIdInput: zSessionGetByIdInput,
  zGetByIdOutput: zSessionGetByIdOutput,
  zFilterByInput: zSessionFilterByInput,
  zFilterByOutput: zSessionFilterByOutput,
  zUpdateOneInput: zSessionUpdateOneInput,
  zUpdateOneOutput: zSessionUpdateOneOutput,
  zDeleteOneInput: zSessionDeleteOneInput,
  zDeleteOneOutput: zSessionDeleteOneOutput,
  zDeleteManyInput: zSessionDeleteManyInput,
  zDeleteManyOutput: zSessionDeleteManyOutput,
  zInsertOneInput: zSessionInsertOneInput,
  zInsertOneOutput: zSessionInsertOneOutput,
} = sessionCrud;

const userCrud = createCrudSchemas(zUser, zInsertUser);
export const {
  zGetAllInput: zUserGetAllInput,
  zGetAllOutput: zUserGetAllOutput,
  zGetByIdInput: zUserGetByIdInput,
  zGetByIdOutput: zUserGetByIdOutput,
  zFilterByInput: zUserFilterByInput,
  zFilterByOutput: zUserFilterByOutput,
  zUpdateOneInput: zUserUpdateOneInput,
  zUpdateOneOutput: zUserUpdateOneOutput,
  zDeleteOneInput: zUserDeleteOneInput,
  zDeleteOneOutput: zUserDeleteOneOutput,
  zDeleteManyInput: zUserDeleteManyInput,
  zDeleteManyOutput: zUserDeleteManyOutput,
  zInsertOneInput: zUserInsertOneInput,
  zInsertOneOutput: zUserInsertOneOutput,
} = userCrud;

const invitationCrud = createCrudSchemas(zInvitation, zInsertInvitation);
export const {
  zGetAllInput: zInvitationGetAllInput,
  zGetAllOutput: zInvitationGetAllOutput,
  zGetByIdInput: zInvitationGetByIdInput,
  zGetByIdOutput: zInvitationGetByIdOutput,
  zFilterByInput: zInvitationFilterByInput,
  zFilterByOutput: zInvitationFilterByOutput,
  zUpdateOneInput: zInvitationUpdateOneInput,
  zUpdateOneOutput: zInvitationUpdateOneOutput,
  zDeleteOneInput: zInvitationDeleteOneInput,
  zDeleteOneOutput: zInvitationDeleteOneOutput,
  zDeleteManyInput: zInvitationDeleteManyInput,
  zDeleteManyOutput: zInvitationDeleteManyOutput,
  zInsertOneInput: zInvitationInsertOneInput,
  zInsertOneOutput: zInvitationInsertOneOutput,
} = invitationCrud;
