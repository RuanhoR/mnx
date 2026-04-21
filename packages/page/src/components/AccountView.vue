<template>
  <div class="account-vue-root" v-if="true || !LoginStatus.isLoading && LoginStatus.isLog">
    <div class="account-select-content">
      <div class="account-select-item" @click="setSelect(0)">{{ getI18n("AccountSelectProfile") }}</div>
      <div class="account-select-item" @click="setSelect(1)">{{ getI18n("AccountSelectPublishs") }}</div>
      <div class="account-select-item" @click="setSelect(2)">{{ getI18n("AccountSelectTokens") }}</div>
    </div>
    <div v-if="select == 0">
      <div>name: {{ LoginStatus.user?.name }}</div>
    </div>
    <div v-if="select == 1">Publish packages</div>
    <div v-if="select == 2">Token list</div>
  </div>
  <div v-else>
    <div>{{ getI18n("AccountNotLogin") }}</div>
    <div @click="toLogin()">{{ getI18n("AccountGoLogin") }}</div>
  </div>
</template><script setup lang="ts">
import { onMounted, ref } from 'vue';
import { getI18n } from '../i18n';
import { LoginStatus } from '../utils/loginStatus';
const select = ref(0)
onMounted(async () => {
  await LoginStatus.waitVerify();

})
function setSelect(go: number) {
  select.value = go;
}
function toLogin() {
  LoginStatus.startLogin("/account")
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
  padding-top: 14px;
}
.account-select-content {
  align-self: start;
  width: 20%;
  position: relative;
}
.account-vue-root {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: left;
}
</style>