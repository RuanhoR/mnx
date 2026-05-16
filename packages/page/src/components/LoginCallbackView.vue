<template>
	<div v-if="!LoginStatus.isLoading || !hasURLParam">
		<div>{{ getI18n('VerifyError') }}</div>
	</div>
	<div class="loading" v-else></div>
</template>
<script setup lang="ts">
import { onMounted } from 'vue';
import { LoginStatus } from '../utils/loginStatus';
import { getI18n } from '../i18n';
import { useRouter } from 'vue-router';
import { KvKeys, KvManger } from '../utils/kvManger';
const router = useRouter();
const hasURLParam = new URLSearchParams(location.search).has('token') || new URLSearchParams(location.search).has('code');
onMounted(async () => {
	LoginStatus.onVeirfy();
	await LoginStatus.waitVerify();
	if (LoginStatus.isLog.value) {
		console.log(LoginStatus.isLog);
		router.push(KvManger.get(KvKeys.tmpVerifyURL) || '/');
	}
});
</script>
