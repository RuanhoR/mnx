import { LanguageList, type Language } from "../types";

const language: {
  [key in typeof LanguageList[number]]: Language
} = {
  zh: {
    HeaderToAbout: "关于",
    HeaderToHome: "首页"
  },
  en: {
    HeaderToAbout: "About",
    HeaderToHome: "Home"
  }
};
let currentLanguage: typeof LanguageList[number];
const broLanguage = navigator.language.split("-")[0] as string;
if (LanguageList.includes(broLanguage as typeof LanguageList[number])) currentLanguage = broLanguage as typeof LanguageList[number];
export function getI18n(key: keyof Language) {
  return language[currentLanguage][key]
}
export function seLanguage(language: typeof LanguageList[number]) {
  currentLanguage = language;
}