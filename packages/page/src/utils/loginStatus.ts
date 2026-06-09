import { ref } from 'vue';
interface User {
  uid: number
  name: string
  mail: string
  avatar_url: string
  token: string
}
import config from '../config';
import { fetchAPI } from './fetchAPI';
import { KvKeys, KvManager } from './kvManager';

export class LoginStatus {
	static token: string | null = null;
	static user: Omit<User, 'password'> | null = null;
	static tasks: Promise<void> | null;
	static isLoading = ref(true);
	static isLog = ref(false);
	static refreshToken(newToken: string) {
		this.token = newToken;
		// reset current status while verifying
		this.isLog.value = false;
		this.user = null;
		this.tasks = new Promise<void>((resolve) => {
			fetchAPI('serive/v0/self_info', {}, 'POST', config.packageAPIHost, this.token as string)
				.then((r) => {
					if (r.ok && r.code == 200 && typeof r.data == 'object') {
						this.isLog.value = true;
						KvManager.set(KvKeys.token, this.token as string);
						this.user = r.data;
					} else {
						// invalid token -> remove stored token
						KvManager.rm(KvKeys.token);
						this.token = null;
						this.user = null;
						this.isLog.value = false;
					}
					this.isLoading.value = false;
					resolve();
				})
				.catch(() => {
					KvManager.rm(KvKeys.token);
					this.token = null;
					this.user = null;
					this.isLog.value = false;
					this.isLoading.value = false;
					resolve();
				});
		})
			.then(() => void 0)
			.finally(() => {
				this.tasks = null;
			});
	}
	static waitVerify() {
		return this.tasks ?? Promise.resolve();
	}
	static Init() {
		const token = KvManager.get(KvKeys.token);
		if (token) this.refreshToken(token);
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
		KvManager.set(KvKeys.tmpVerifyURL, href);
		location.href = `https://account.ruanhor.dpdns.org/oauth2?client_id=MmFmMmFhZjQvIls3ZWJlMzAyOC1mMDU3LTQ1YWEtOTBkMC02Zjg3N2E1ZTgxODM=&redirect_uri=${encodeURIComponent('https://pmnx.qzz.io/_callback')}&response_type=code`;
	}
	static async onVerify() {
		const urlParam = new URLSearchParams(location.search);
		const code = urlParam.get('code');
		const token = urlParam.get('token');
		if (code) {
			const client_id = 'MmFmMmFhZjQvIls3ZWJlMzAyOC1mMDU3LTQ1YWEtOTBkMC02Zjg3N2E1ZTgxODM=';
			const redirect_uri = 'https://pmnx.qzz.io/_callback';
			const response = await fetchAPI<{ token: string }>('/oauth/token', { code, client_id, redirect_uri }, 'POST', config.packageAPIHost);
			if (response.ok && response.data?.token) {
				this.refreshToken(response.data.token);
			}
			const newUrl = new URL(location.href);
			newUrl.searchParams.delete('code');
			window.history.replaceState({}, document.title, newUrl.pathname);
		} else if (token) {
			this.refreshToken(token);
		}
	}
}
