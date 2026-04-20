export const HeaderLanguageKey = ["HeaderToHome", "Search", "HeaderToAbout", "HeaderToDocs"] as const;
export const AboutLanguageKey = ["AboutTitle", "AboutContent"] as const;
export type Language = {
  [key in typeof HeaderLanguageKey[number] | typeof AboutLanguageKey[number]]: string;
}
export const LanguageList = ["zh", "en"] as const