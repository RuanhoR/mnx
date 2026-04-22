import { LanguageList, type Language } from "../types";

const language: {
  [key in typeof LanguageList[number]]: Language
} = {
  zh: {
    HeaderToAbout: "关于",
    HeaderToHome: "首页",
    HeaderToDocs: "文档",
    AboutContent: "pmnx 是一个mcbe模组管理平台（由Github @RuanhoR 编写，MIT开源），由同时是mcx dsl的cli mbler作为快速使用的cli，可以以一个cli命令，将模组下载到游戏文件夹，快速地启动和运行在mcbe的游戏里面。想使用？可见导航栏文档和导航栏下载游戏链接。最后，祝你能帮助本社区壮大和找到自己想要的模组，开发顺利",
    AboutTitle: "关于 PMNX",
    HeaderToAccount: "账号",
    Search: "搜索",
    AccountSelectProfile: "账号基础信息",
    AccountSelectPublishs: "所有你的发布包",
    AccountSelectTokens: "Token",
    AccountNotLogin: "未登录",
    AccountGoLogin: "去登录",
    VerifyError: "验证失败，可能是令牌错误",
    AccountName: "名称",
    AccountMail: "邮箱",
    AccountToMore: "更多管理，请前往：",
    This: "这里",
    AccountCreateTime: "创建时间",
    AccountLogout: "登出",
    AccountInfoLogoutToast: "正在登出..."
  },
  en: {
    HeaderToAbout: "About",
    HeaderToHome: "Home",
    HeaderToDocs: "Docs",
    Search: "Search",
    AboutContent: "pmnx is an mcbe mod management platform (written by Github @RuanhoR, MIT open source), and also has a CLI called mbler, which is the CLI for mcx dsl, for quick use. With a single CLI command, you can download mods to the game folder and quickly launch and run them in the mcbe game. Want to use it? See the documentation in the navigation bar and the game download link in the navigation bar.Finally, I wish you can help this community grow, find the mods you want, and have smooth development.",
    AboutTitle: "About PMNX",
    HeaderToAccount: "Account",
    AccountSelectProfile: "Profile",
    AccountSelectPublishs: "All of your publish packages",
    AccountSelectTokens: "Tokens",
    AccountNotLogin: "Not Login",
    AccountGoLogin: "Go to login",
    VerifyError: "Verify failed, maybe token error",
    AccountName: "Name",
    AccountMail: "Mail",
    AccountToMore: "For more mange, plase to : ",
    This: "This",
    AccountCreateTime: "Create Time",
    AccountLogout: "Logout",
    AccountInfoLogoutToast: "Logout..."
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
export {
  currentLanguage
}