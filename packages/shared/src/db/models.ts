import type {
  BgColor,
  CommandVisualMode,
  Density,
  InvitationStatus,
  PasswordResetState,
  ThemePreference,
} from './enums';

export type EntityId = string;

export interface Timestamped {
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  density: Density;
  backgroundColor: BgColor;
  accentColor?: BgColor;
}

export interface CommandVisualPreference {
  mode: CommandVisualMode;
  showText: boolean;
  showIcon: boolean;
}

export interface PasswordInfo {
  hashedPassword: string;
  setAt: string;
  expiresAt: string | null;
  incorrectAttempts: 0 | 1 | 2 | 3 | 4;
  lockoutUntil: string | null;
  passwordResetState: PasswordResetState;
  previousPasswords: string[];
}

export interface User extends Timestamped {
  id: EntityId;
  email: string;
  username: string;
  displayName: string;
  isActive: boolean;
  isEmailVerified: boolean;
  preferences: UserPreferences;
  commandVisual: CommandVisualPreference;
  theme: ThemePreference;
  passwordInfo: PasswordInfo;
  lastLoginAt: string | null;
}

export interface RefreshToken extends Timestamped {
  id: EntityId;
  userId: EntityId;
  token: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedBy: EntityId | null;
  deviceLabel?: string;
  ipAddress?: string;
}

export interface Session extends Timestamped {
  id: EntityId;
  userId: EntityId;
  ipAddress: string;
  userAgent: string;
  lastActivityAt: string;
  expiresAt: string;
  isActive: boolean;
  refreshTokenId: EntityId | null;
}

export interface Invitation extends Timestamped {
  id: EntityId;
  sentByUserId: EntityId;
  recipientEmail: string;
  recipientName: string | null;
  code: string;
  redeemedAt: string | null;
  newUserId: EntityId | null;
  status: InvitationStatus;
  notes?: string;
}

export interface NewUser {
  email: string;
  username: string;
  displayName: string;
  preferences: UserPreferences;
  commandVisual: CommandVisualPreference;
  theme: ThemePreference;
  passwordInfo: PasswordInfo;
  isActive?: boolean;
  isEmailVerified?: boolean;
  lastLoginAt?: string | null;
}

export interface NewRefreshToken {
  userId: EntityId;
  token: string;
  expiresAt: string;
  deviceLabel?: string;
  ipAddress?: string;
}

export interface NewSession {
  userId: EntityId;
  ipAddress: string;
  userAgent: string;
  expiresAt: string;
  refreshTokenId?: EntityId | null;
  isActive?: boolean;
  lastActivityAt?: string;
}

export interface NewInvitation {
  sentByUserId: EntityId;
  recipientEmail: string;
  recipientName?: string | null;
  code: string;
  notes?: string;
  status?: InvitationStatus;
  redeemedAt?: string | null;
  newUserId?: EntityId | null;
}
