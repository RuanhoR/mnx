import { ref } from "vue";
import type { User } from "../../../server/src/types"
import config from "../config";
import { fetchAPI } from "./fetchAPI";
import { KvKeys, KvManger } from "./kvManger";

export class LoginStatus {
  static token: string | null = null
  static user: Omit<User, "password"> | null = null;
  static tasks: Promise<void> | null;
  static isLoading = ref(true);
  static isLog = ref(false)
  static refurshToken(newToken: string) {
    this.token = newToken;
    // reset current status while verifying
    this.isLog.value = false;
    this.user = null;
    this.tasks = new Promise<void>((resolve) => {
      fetchAPI("serive/v0/self_info",
        {},
        "POST",
        config.accountAPIHost, this.token as string
      ).then((r) => {
        if (r.ok) {
          this.isLog.value = true;
          KvManger.set(KvKeys.token, this.token as string)
          this.user = r.data;
        } else {
          // invalid token -> remove stored token
          KvManger.rm(KvKeys.token);
          this.token = null;
          this.user = null;
          this.isLog.value = false;
        }
        this.isLoading.value = false;
        resolve()
      }).catch(() => {
        KvManger.rm(KvKeys.token);
        this.token = null;
        this.user = null;
        this.isLog.value = false;
        this.isLoading.value = false;
        resolve();
      })
    }).then(() => void 0).finally(() => {
      this.tasks = null;
    });
  }
  static waitVerify() {
    return this.tasks ?? Promise.resolve();
  }
  static Init() {
    const token = KvManger.get(KvKeys.token);
    if (token) this.refurshToken(token);
    else {
      this.token = null;
      this.user = null;
      this.isLog.value = false;
      this.isLoading.value = false;
    }
  }
  static async startLogin(href: string) {
    if (this.isLoading.value) await this.waitVerify();
    if (this.isLog.value) return true;
    KvManger.set(KvKeys.tmpVerifyURL, href)
    location.href = `https://account.ruanhor.dpdns.org/oauth2?client_id=MmFmMmFhZjQvIls3ZWJlMzAyOC1mMDU3LTQ1YWEtOTBkMC02Zjg3N2E1ZTgxODM=&redirect_uri=${encodeURIComponent('https://pmnx.qzz.io/_callback')}&response_type=code`;
  }
  static async onVeirfy() {
    const urlParam = new URLSearchParams(location.search);
    const code = urlParam.get('code');
    const token = urlParam.get('token');
    if (code) {
      const client_id = "MmFmMmFhZjQvIls3ZWJlMzAyOC1mMDU3LTQ1YWEtOTBkMC02Zjg3N2E1ZTgxODM=";
      const redirect_uri = "https://pmnx.qzz.io/_callback";
      const response = await fetchAPI<{ token: string }>(
        "/oauth/token",
        { code, client_id, redirect_uri },
        "POST",
        config.accountAPIHost
      );
      if (response.ok && response.data?.token) {
        this.refurshToken(response.data.token);
      }
      const newUrl = new URL(location.href);
      newUrl.searchParams.delete("code");
      window.history.replaceState({}, document.title, newUrl.pathname);
    } else if (token) {
      this.refurshToken(token);
    }
  }
}