export const Density = {
  Compact: 'compact',
  Spacious: 'spacious',
  Comfy: 'comfy',
} as const;

export type Density = (typeof Density)[keyof typeof Density];

export const densityLabelMap: Record<Density, string> = {
  [Density.Compact]: 'Compact',
  [Density.Spacious]: 'Spacious',
  [Density.Comfy]: 'Comfy',
};

export const BgColorPalette = [
  'red',
  'pink',
  'orange',
  'yellow',
  'green',
  'blue',
  'cyan',
  'lime',
  'sky',
  'teal',
  'violet',
  'purple',
  'fuchsia',
  'slate',
  'gray',
  'white',
  'black',
] as const;

export type BgColor = (typeof BgColorPalette)[number];

export const bgColorLabelMap: Record<BgColor, string> = {
  red: 'Red',
  pink: 'Pink',
  orange: 'Orange',
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  cyan: 'Cyan',
  lime: 'Lime',
  sky: 'Sky',
  teal: 'Teal',
  violet: 'Violet',
  purple: 'Purple',
  fuchsia: 'Fuchsia',
  slate: 'Slate',
  gray: 'Gray',
  white: 'White',
  black: 'Black',
};

export const CommandVisualMode = {
  None: 'none',
  Text: 'text',
  Icon: 'icon',
  TextAndIcon: 'text-and-icon',
} as const;

export type CommandVisualMode = (typeof CommandVisualMode)[keyof typeof CommandVisualMode];

export const commandVisualLabelMap: Record<CommandVisualMode, string> = {
  [CommandVisualMode.None]: 'No text or icon',
  [CommandVisualMode.Text]: 'Text only',
  [CommandVisualMode.Icon]: 'Icon only',
  [CommandVisualMode.TextAndIcon]: 'Text and icon',
};

export const ThemePreference = {
  Light: 'light',
  Dark: 'dark',
  System: 'system',
} as const;

export type ThemePreference = (typeof ThemePreference)[keyof typeof ThemePreference];

export const themePreferenceLabelMap: Record<ThemePreference, string> = {
  [ThemePreference.Light]: 'Light',
  [ThemePreference.Dark]: 'Dark',
  [ThemePreference.System]: 'System (OS setting)',
};

export const PasswordResetState = {
  None: 'none',
  Submitted: 'submitted',
  EmailSent: 'email-sent',
  AwaitingVerification: 'awaiting-verification',
  UserPrompted: 'user-prompted',
  ChangeReceived: 'change-received',
} as const;

export type PasswordResetState =
  (typeof PasswordResetState)[keyof typeof PasswordResetState];

export const passwordResetStateLabelMap: Record<PasswordResetState, string> = {
  [PasswordResetState.None]: 'No reset in progress',
  [PasswordResetState.Submitted]: 'Reset submitted',
  [PasswordResetState.EmailSent]: 'Email sent',
  [PasswordResetState.AwaitingVerification]: 'Awaiting verification',
  [PasswordResetState.UserPrompted]: 'User prompted',
  [PasswordResetState.ChangeReceived]: 'Change confirmed',
};

export const InvitationStatus = {
  Pending: 'pending',
  Redeemed: 'redeemed',
  Revoked: 'revoked',
} as const;

export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus];

export const invitationStatusLabelMap: Record<InvitationStatus, string> = {
  [InvitationStatus.Pending]: 'Pending',
  [InvitationStatus.Redeemed]: 'Redeemed',
  [InvitationStatus.Revoked]: 'Revoked',
};
