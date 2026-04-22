export const HeaderLanguageKey = ['HeaderToAccount', 'HeaderToHome', 'Search', 'HeaderToAbout', 'HeaderToDocs'] as const;
export const AboutLanguageKey = ['AboutTitle', 'AboutContent'] as const;
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
  "AccountCreateTime"
] as const;
export type Language = {
  [key in (typeof HeaderLanguageKey)[number] | (typeof AboutLanguageKey)[number] | (typeof AccountLanguageKeys)[number]]: string;
};
export const LanguageList = ['zh', 'en'] as const;
