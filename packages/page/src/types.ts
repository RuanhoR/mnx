export const HeaderLanguageKey = ['HeaderToAccount', 'HeaderToHome', 'Search', 'HeaderToAbout', 'HeaderToDocs'] as const;
export const AboutLanguageKey = ['AboutTitle', 'AboutContent'] as const;
export const PackageLanguageKeys = [
  'Searching',
  'Found',
  'results',
  'NoResultsFound',
  'SearchWelcome',
  'Readme',
  'Version',
  'SelectVersion',
  'Downloads',
  'Package',
  'LastUpdated',
  'Description',
  'InstallCommand',
  'Loading',
  "NotFound",
  'BackToSearch'
] as const;

export const AccountLanguageKeys = [
  'AccountSelectProfile',
  'AccountSelectPublishs',
  'AccountSelectTokens',
  'AccountNotLogin',
  'AccountGoLogin',
  'VerifyError',
  'AccountName',
  "AccountMail",
  "AccountToMore",
  "This",
  "AccountCreateTime",
  "AccountLogout",
  "AccountInfoLogoutToast",
  // token management
  "TokenListTitle",
  "TokenGenerate",
  "TokenName",
  "TokenDelete",
  "TokenDeleteConfirm",
  "TokenCreated",
  "TokenDeleted",
  "TokenPlaceholderName",
  "TokenGenerateSuccess",
  "TokenPermission",
  "TokenScope",
  "TokenPublishPermission",
  "TokenUnpublishPermission",
  "TokenScopePlaceholder",
  "TokenScopeAdd",
  "TokenScopeRemove",
  "TokenNoPermissionError",
  "TokenGenerated",
  "TokenSecurityNote",
  "TokenExpiration",
  "TokenExpirationPlaceholder",
  "TokenExpiresAt",
  "TokenScopeEmpty",
  "TokenPermissionPublish",
  "TokenPermissionUnpublish",
  "TokenPermissionNone",
  "Copied"
] as const;
export type Language = {
  [key in (typeof HeaderLanguageKey)[number] | (typeof AboutLanguageKey)[number] | (typeof AccountLanguageKeys)[number] | (typeof PackageLanguageKeys)[number]]: string;
};
export const LanguageList = ['zh', 'en'] as const;
export interface TokenListResult {
  id: number;
  name: string;
  scopes: string[];
  permissions: number;
  createdAt: Date;
  expiresAt: number;
}
export interface PackageProfile {
  id: string;
  downloaded: number;
}