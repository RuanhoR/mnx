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
    ,
    // token management
    TokenListTitle: "Token 列表",
    TokenGenerate: "生成 Token",
    TokenName: "Token 名称",
    TokenDelete: "删除",
    TokenDeleteConfirm: "确认删除 Token",
    TokenCreated: "Token 已创建",
    TokenDeleted: "Token 已删除",
    TokenPlaceholderName: "请输入 token 名称",
    TokenGenerateSuccess: "生成成功",
    TokenPermission: "权限",
    TokenScope: "作用域",
    TokenPublishPermission: "发布权限 (publish)",
    TokenUnpublishPermission: "取消发布权限 (unpublish)",
    TokenScopePlaceholder: "作用域",
    TokenScopeAdd: "添加",
    TokenScopeRemove: "移除",
    TokenNoPermissionError: "请至少选择一项权限",
    TokenGenerated: "生成的令牌",
    TokenExpiration: "过期时间",
    TokenExpirationPlaceholder: "选择过期时间（可选）",
    TokenExpiresAt: "过期于",
    TokenSecurityNote: "请妥善保管此令牌，它在生成后只会显示一次。",
    TokenScopeEmpty: "全部",
    TokenPermissionPublish: "发布 (publish)",
    TokenPermissionUnpublish: "取消发布 (unpublish)",
    TokenPermissionNone: "无"
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
    ,
    // token management
    TokenListTitle: "Token List",
    TokenGenerate: "Generate Token",
    TokenName: "Token Name",
    TokenDelete: "Delete",
    TokenDeleteConfirm: "Confirm delete token",
    TokenCreated: "Token created",
    TokenDeleted: "Token deleted",
    TokenPlaceholderName: "Enter token name",
    TokenGenerateSuccess: "Generate success",
    TokenPermission: "Permission",
    TokenScope: "Scope",
    TokenPublishPermission: "Publish permission (publish)",
    TokenUnpublishPermission: "Unpublish permission (unpublish)",
    TokenScopePlaceholder: "Scope",
    TokenScopeAdd: "Add",
    TokenScopeRemove: "Remove",
    TokenNoPermissionError: "Please select at least one permission",
    TokenGenerated: "Generated Token",
    TokenExpiration: "Expiration",
    TokenExpirationPlaceholder: "Select expiration time (optional)",
    TokenExpiresAt: "Expires At",
    TokenSecurityNote: "Please keep this token safe, it will only be displayed once after generation.",
    TokenScopeEmpty: "All",
    TokenPermissionPublish: "Publish (publish)",
    TokenPermissionUnpublish: "Unpublish (unpublish)",
    TokenPermissionNone: "None"
  }
};
let currentLanguage: typeof LanguageList[number] = 'zh';
const broLanguage = navigator.language.split("-")[0] as string;
if (LanguageList.includes(broLanguage as typeof LanguageList[number])) currentLanguage = broLanguage as typeof LanguageList[number];

export type I18nKey = keyof Language;
export function getI18n(key: I18nKey) {
  return language[currentLanguage][key]
}
export function seLanguage(language: typeof LanguageList[number]) {
  currentLanguage = language;
}
export {
  currentLanguage
}