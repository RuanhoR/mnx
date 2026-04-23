<template>
	<div class="account-vue-root" v-if="!isLoading && isLog">
		<div class="account-select-content">
			<div class="account-select-item" @click="setSelect(0)">{{ getI18n('AccountSelectProfile') }}</div>
			<div class="account-select-item" @click="setSelect(1)">{{ getI18n('AccountSelectPublishs') }}</div>
			<div class="account-select-item" @click="setSelect(2)">{{ getI18n('AccountSelectTokens') }}</div>
		</div>
		<div v-if="select == 0">
			<div class="profile-root-card">
				<div class="small">UID {{ user?.uid }}</div>
				<div>{{ getI18n('AccountName') }}: {{ user?.name }}</div>
				<div>{{ getI18n('AccountMail') }}: {{ user?.mail }}</div>
				<div>{{ getI18n('AccountCreateTime') }}: {{ formatTime(user?.ctime as string, currentLanguage) }}</div>
				<div>
					{{ getI18n('AccountToMore') }} <a href="https://ruanhor.dpdns.org/account">{{ getI18n('This') }}</a>
				</div>
			</div>
			<div class="profile-root-card">
				<div @click="logout">{{ getI18n('AccountLogout') }}</div>
			</div>
		</div>
		<div v-if="select == 1">Publish packages</div>
		<div v-if="select == 2">
			<div class="profile-root-card">
				<div class="small">{{ getI18n('TokenListTitle') }}</div>
				<div class="token-form">
					<div class="form-group">
						<label>{{ getI18n('TokenName') }}</label>
						<input v-model="newTokenName" :placeholder="getI18n('TokenPlaceholderName')" class="token-input" />
					</div>
					<div class="form-group">
						<label>{{ getI18n('TokenPermission') }}</label>
						<div class="permissions-group">
							<label class="checkbox-label">
								<input type="checkbox" v-model="permissions.publish" />
								<svg class="checkbox-svg" width="16" height="16" viewBox="0 0 16 16">
									<rect
										v-if="!permissions.publish"
										x="1"
										y="1"
										width="14"
										height="14"
										rx="2"
										stroke="currentColor"
										fill="none"
										stroke-width="2"
									/>
									<rect v-else x="1" y="1" width="14" height="14" rx="2" fill="currentColor" />
									<path
										v-if="permissions.publish"
										d="M4 8L7 11L12 5"
										stroke="white"
										stroke-width="2"
										fill="none"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
								<span>{{ getI18n('TokenPublishPermission') }}</span>
							</label>
							<label class="checkbox-label">
								<input type="checkbox" v-model="permissions.unpublish" />
								<svg class="checkbox-svg" width="16" height="16" viewBox="0 0 16 16">
									<rect
										v-if="!permissions.unpublish"
										x="1"
										y="1"
										width="14"
										height="14"
										rx="2"
										stroke="currentColor"
										fill="none"
										stroke-width="2"
									/>
									<rect v-else x="1" y="1" width="14" height="14" rx="2" fill="currentColor" />
									<path
										v-if="permissions.unpublish"
										d="M4 8L7 11L12 5"
										stroke="white"
										stroke-width="2"
										fill="none"
										stroke-linecap="round"
										stroke-linejoin="round"
									/>
								</svg>
								<span>{{ getI18n('TokenUnpublishPermission') }} (unpublish)</span>
							</label>
						</div>
					</div>
					<div class="form-group">
						<label>{{ getI18n('TokenScope') }}</label>
						<div class="scopes-group">
							<div v-for="(scope, index) in scopes" :key="index" class="scope-input-row">
								<input
									:value="scope"
									v-model="scopes[index]"
									:placeholder="getI18n('TokenScopePlaceholder') + ' ' + (index + 1)"
									class="scope-input"
								/>
								<button v-if="scopes.length > 1" @click="removeScope(index)" type="button" class="scope-remove">×</button>
							</div>
							<button @click="addScope" type="button" class="scope-add">+</button>
						</div>
					</div>
					<div class="form-group">
						<label>{{ getI18n('TokenExpiration') }}</label>
						<input
							type="datetime-local"
							v-model="expirationLocal"
							:placeholder="getI18n('TokenExpirationPlaceholder')"
							class="token-input"
						/>
					</div>
					<button @click="genToken" class="generate-button" :disabled="!permissions.publish && !permissions.unpublish">
						{{ getI18n('TokenGenerate') }}
					</button>
				</div>
			</div>
			<div v-if="generatedToken" class="profile-root-card generated-token">
				<div class="small">{{ getI18n('TokenGenerated') }}</div>
				<div class="token-display">
					<div class="token-name">{{ generatedToken.name }}</div>
					<div class="token-value">{{ generatedToken.token }}</div>
					<small class="token-note">{{ getI18n('TokenSecurityNote') }}</small>
				</div>
			</div>
			<div class="profile-root-card token-list" style="margin-top: 12px">
				<div class="small">{{ getI18n('TokenListTitle') }}</div>
				<div v-if="tokenList.length === 0">—</div>
				<div v-for="t in tokenList" :key="t.id" class="token-item">
					<div class="token-item-left">
						<div>
							<strong>{{ t.name }}</strong>
						</div>
						<div class="token-meta">
							{{ getI18n('TokenPermission') }}: {{ formatPermissions(t.permissions) }} | {{ getI18n('TokenScope') }}:
							{{ t.scopes.length > 0 ? t.scopes.join(', ') : getI18n('TokenScopeEmpty') }}
						</div>
						<div class="token-meta">{{ t.createdAt.toLocaleString() }}</div>
					</div>
					<div class="token-item-right">
						<button @click="deleteToken(t.name)">{{ getI18n('TokenDelete') }}</button>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div v-else-if="isLoading">
		<div class="loading"></div>
	</div>
	<div v-else>
		<div>{{ getI18n('AccountNotLogin') }}</div>
		<div @click="toLogin()">{{ getI18n('AccountGoLogin') }}</div>
	</div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { getI18n, currentLanguage } from '../i18n';
import { LoginStatus } from '../utils/loginStatus';
import type { User } from '../../../server/src/types';
import { formatTime } from '../i18n/date';
import { ToastManger } from '../utils/toastManger';
import { fetchAPI } from '../utils/fetchAPI';
import config from '../config';
import { KvKeys, KvManger } from '../utils/kvManger';
import type { TokenListResult } from '../types';
import { array, number, object, string } from 'zod';
const select = ref(0);
const isLoading = LoginStatus.isLoading;
const isLog = LoginStatus.isLog;
const user = ref<Omit<User, 'password'> | null>(null);
const tokenList = ref<TokenListResult[]>([]);
const newTokenName = ref('');
const generatedToken = ref<{ name: string; token: string } | null>(null);
const expirationLocal = ref('');
const permissions = ref({
	publish: true,
	unpublish: false,
});
const scopes = ref(['']);
const router = useRouter();
onMounted(async () => {
	await LoginStatus.waitVerify();
	user.value = LoginStatus.user;
});
async function logout() {
	if (ToastManger.isLoading) return;
	const toast = ToastManger.useToast();
	if (!toast) return;
	toast.toast('info', getI18n('AccountInfoLogoutToast'));
	const logoutResult = await fetchAPI('/serive/v0/logout', {}, 'POST', config.accountAPIHost, LoginStatus.token as string);
	if (!logoutResult.ok) {
		return toast.toast('error', `${getI18n('AccountLogout')}: Error: ${logoutResult.data}`);
	}
	KvManger.rm(KvKeys.token);
	// re-init
	LoginStatus.Init();

	// clear local reactive state
	user.value = null;
	tokenList.value = [];
	generatedToken.value = null;

	// navigate to home
	router.push('/');
	toast.toast('success', `${getI18n('AccountLogout')}: OK`);
}
watch(isLog, (v) => {
	if (v) {
		user.value = LoginStatus.user;
	} else {
		user.value = null;
		tokenList.value = [];
		generatedToken.value = null;
	}
});
function setSelect(go: number) {
	select.value = go;
	if (go == 2) requestTokenList();
}

function addScope() {
	scopes.value.push('');
}

function removeScope(index: number) {
	scopes.value.splice(index, 1);
}

function formatPermissions(permissions: number): string {
	const permissionList: string[] = [];
	if (permissions & 1) permissionList.push(getI18n('TokenPermissionPublish'));
	if (permissions & 2) permissionList.push(getI18n('TokenPermissionUnpublish'));
	return permissionList.length > 0 ? permissionList.join(', ') : getI18n('TokenPermissionNone');
}
function toLogin() {
	LoginStatus.startLogin('/account');
}
async function requestTokenList() {
	if (ToastManger.isLoading) return;
	const toast = ToastManger.useToast();
	if (!toast) return;
	if (!isLog.value) return;
	const listResult = await fetchAPI('/account/publish/token/list', {}, 'GET', config.packageAPIHost, LoginStatus.token as string);
	if (!listResult.ok) {
		return toast.toast('error', `GET ${config.packageAPIHost}/account/publish/token/list error: ${listResult.data}`);
	}
	const listResultScheme = array(
		object({
			id: number(),
			name: string(),
			scopes: array(string()),
			permissions: number(),
			createdAt: string(),
			expiresAt: number(),
		}),
	);
	const data = listResultScheme.parse(listResult.data);
	tokenList.value = data.map((i) => {
		return {
			...i,
			createdAt: new Date(i.createdAt),
		};
	});
}

async function genToken() {
	if (ToastManger.isLoading) return;
	const toast = ToastManger.useToast();
	if (!toast) return;
	if (!isLog.value) return toast.toast('error', getI18n('AccountNotLogin'));
	if (!newTokenName.value) return toast.toast('error', getI18n('TokenPlaceholderName'));
	if (!permissions.value.publish && !permissions.value.unpublish) return toast.toast('error', '请至少选择一项权限');

	const selectedPermissions: string[] = [];
	if (permissions.value.publish) selectedPermissions.push('publish');
	if (permissions.value.unpublish) selectedPermissions.push('unpublish');

	const filteredScopes = scopes.value.filter((scope) => scope.trim() !== '');

	const body: any = { name: newTokenName.value, permissions: selectedPermissions, scopes: filteredScopes };
	if (expirationLocal.value) {
		const ts = Math.floor(new Date(expirationLocal.value).getTime() / 1000);
		body.expirationTime = ts;
	}

	const res = await fetchAPI('/account/publish/token/gen', body, 'POST', config.packageAPIHost, LoginStatus.token as string);
	if (!res.ok) return toast.toast('error', `Error: ${res.data}`);
	// res.data should contain token and metadata
	generatedToken.value = { name: newTokenName.value, token: res.data.token };
	newTokenName.value = '';
	permissions.value = { publish: true, unpublish: false };
	scopes.value = [''];
	expirationLocal.value = '';
	toast.toast('success', getI18n('TokenGenerateSuccess'));
	await requestTokenList();
}

async function deleteToken(name: string) {
	if (ToastManger.isLoading) return;
	const toast = ToastManger.useToast();
	if (!toast) return;
	if (!confirm(getI18n('TokenDeleteConfirm') + ': ' + name)) return;
	const res = await fetchAPI(
		`/account/publish/token/delete/${encodeURIComponent(name)}`,
		{},
		'DELETE',
		config.packageAPIHost,
		LoginStatus.token as string,
	);
	if (!res.ok) return toast.toast('error', `Error: ${res.data}`);
	toast.toast('success', getI18n('TokenDeleted'));
	await requestTokenList();
}
</script>
<style lang="css" scoped>
.account-select-item {
	position: relative;
	width: 90%;
	height: 60px;
	border-radius: 10px;
	border: solid var(--gray-light);
	margin-bottom: 20px;
	display: flex;
	justify-content: center;
	font-size: 130%;
	padding: 5px;
	padding-top: 14px;
	cursor: pointer;
}
.account-select-content {
	align-self: start;
	max-width: 30%;
	position: relative;
}
.account-vue-root {
	position: relative;
	width: 100%;
	display: flex;
	justify-content: left;
}
.profile-root-card {
	border: solid var(--gray-light);
	width: 280px;
	border-radius: 10px;
	padding: 20px;
}

.token-list {
	max-height: 300px;
	overflow: auto;
}
.token-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 6px 0;
	border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}
.token-item-left {
	display: flex;
	flex-direction: column;
}
.token-meta {
	font-size: 12px;
	color: gray;
}
.token-item-right button {
	background: transparent;
	border: 1px solid var(--gray-light);
	padding: 4px 8px;
	border-radius: 4px;
	cursor: pointer;
}

.token-form {
	display: grid;
	gap: 16px;
	margin-top: 12px;
}

.form-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.form-group label {
	font-weight: 500;
	color: var(--text-h);
	font-size: 14px;
}

.token-input {
	padding: 8px 12px;
	border: 1px solid var(--border);
	border-radius: 6px;
	font-size: 14px;
	transition: border-color 0.2s;
}

.token-input:focus {
	outline: none;
	border-color: var(--accent);
}

.permissions-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.checkbox-label {
	display: flex;
	align-items: center;
	gap: 8px;
	cursor: pointer;
	font-size: 14px;
	color: var(--text);
}

.checkbox-label input[type='checkbox'] {
	display: none;
}

.checkbox-svg {
	flex-shrink: 0;
	color: var(--text);
	transition: color 0.2s;
}

.checkbox-label:hover .checkbox-svg {
	color: var(--accent);
}

.scopes-group {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.scope-input-row {
	display: flex;
	gap: 8px;
	align-items: center;
}

.scope-input {
	flex: 1;
	padding: 8px 12px;
	border: 1px solid var(--border);
	border-radius: 6px;
	font-size: 14px;
	transition: border-color 0.2s;
}

.scope-input:focus {
	outline: none;
	border-color: var(--accent);
}

.scope-remove {
	width: 24px;
	height: 24px;
	border: 1px solid #ff4444;
	background: transparent;
	color: #ff4444;
	border-radius: 50%;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.2s;
}

.scope-remove:hover {
	background: #ff4444;
	color: white;
}

.scope-add {
	align-self: flex-start;
	padding: 6px 12px;
	border: 1px solid var(--border);
	background: var(--accent-bg);
	color: var(--accent);
	border-radius: 6px;
	cursor: pointer;
	transition: all 0.2s;
	font-size: 14px;
}

.scope-add:hover {
	background: var(--accent);
	color: white;
}

.generate-button {
	padding: 10px 16px;
	background: var(--accent);
	color: white;
	border: none;
	border-radius: 6px;
	font-weight: 500;
	cursor: pointer;
	transition: background-color 0.2s;
}

.generate-button:hover:not(:disabled) {
	background: #8a2be2;
}

.generate-button:disabled {
	background: #ccc;
	cursor: not-allowed;
	opacity: 0.6;
}

.generated-token {
	margin-top: 12px;
	border-color: var(--accent) !important;
}

.token-display {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.token-name {
	font-weight: 600;
	color: var(--text-h);
}

.token-value {
	font-family: monospace;
	background: #f5f5f5;
	padding: 8px 12px;
	border-radius: 4px;
	font-size: 12px;
	word-break: break-all;
}

.token-note {
	color: var(--gray-light);
	font-style: italic;
}
</style>
