<template>
  <div>{{ getI18n("Search") }}</div>
  <div>
    <input type="text" v-model="searchKeyWord">
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';
import { getI18n } from '../i18n';
const searchKeyWord = ref("");
watch(searchKeyWord, (v) => {
  console.log(v)
})
</script>