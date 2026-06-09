<template>
	<div v-if="(!isLoading && !isLoging) || !hasURLParam">
		<div>{{ getI18n('VerifyError') }}</div>
	</div>
	<div v-else>
		<div class="loading"></div>
		<div>Plase wait</div>
	</div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import { LoginStatus } from '../utils/loginStatus';
import { getI18n } from '../i18n';
import { useRouter } from 'vue-router';
import { KvKeys, KvManager } from '../utils/kvManager';
const router = useRouter();
const isLoading = LoginStatus.isLoading;
const isLoging = LoginStatus.isLog;
const hasURLParam = new URLSearchParams(location.search).has('token') || new URLSearchParams(location.search).has('code');
onMounted(async () => {
	LoginStatus.onVerify();
	await LoginStatus.waitVerify();
	if (LoginStatus.isLog.value) {
		console.log(LoginStatus.isLog);
		router.push(KvManager.get(KvKeys.tmpVerifyURL) || '/');
	}
});
</script>
