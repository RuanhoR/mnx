export class KvManger {
  static set(key: KvKeys, value: string) {
    return localStorage.setItem(key, value)
  }
  static get(key: KvKeys) {
    return localStorage.getItem(key)
  }
  static rm(key: KvKeys) {
    return localStorage.removeItem(key)
  }
}
export enum KvKeys {
  token = "token",
  tmpVerifyURL = "tmp_verify_url_che"
}