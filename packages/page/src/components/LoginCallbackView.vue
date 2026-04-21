<template>
  <div v-if="!LoginStatus.isLoading || !hasURLParam">
    <div>{{ getI18n("VerifyError") }}</div>
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
const hasURLParam = (new URLSearchParams(location.search)).has("token")
onMounted(async () => {
  LoginStatus.onVeirfy();
  await LoginStatus.waitVerify();
  if (LoginStatus.isLog.value) {
    console.log(LoginStatus.isLog)
    router.replace(KvManger.get(KvKeys.tmpVerifyURL) || "/")
  }
})
</script>
<style lang="css" scoped>
.loading {
  animation: loading 1s linear infinite;
  background-color: transparent;
  border: 2px solid gray;
  border-top-color: transparent;
  width: 30px;
  height: 30px;
  position: relative;
  display: flex;
  justify-content: center;
  border-radius: 15px;
}
@keyframes loading {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>