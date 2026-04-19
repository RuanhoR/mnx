export const HeaderLanguageKey = ["HeaderToHome", "HeaderToAbout"] as const;
export type Language = {
  [key in typeof HeaderLanguageKey[number]]: string;
}
export const LanguageList = ["zh", "en"] as const