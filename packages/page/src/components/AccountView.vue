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
					{{ getI18n('AccountToMore') }} <a href="https://ruanhor.dpdns.org">{{ getI18n('This') }}</a>
				</div>
			</div>
		</div>
		<div v-if="select == 1">Publish packages</div>
		<div v-if="select == 2">Token list</div>
	</div>
	<div v-else>
		<div>{{ getI18n('AccountNotLogin') }}</div>
		<div @click="toLogin()">{{ getI18n('AccountGoLogin') }}</div>
	</div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { getI18n, currentLanguage } from '../i18n';
import { LoginStatus } from '../utils/loginStatus';
import type { User } from '../../../server/src/types';
import { formatTime } from '../i18n/date';
const select = ref(0);
const isLoading = LoginStatus.isLoading;
const isLog = LoginStatus.isLog;
const user = ref<Omit<User, 'password'> | null>(null);
onMounted(async () => {
	await LoginStatus.waitVerify();
	user.value = LoginStatus.user;
});

watch(isLog, (v) => {
	if (v) user.value = LoginStatus.user;
});
function setSelect(go: number) {
	select.value = go;
}
function toLogin() {
	LoginStatus.startLogin('/account');
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
</style>
