<script setup lang="ts">
import { onMounted, ref } from 'vue';
import Header from './components/Header.vue';
import Toast from './components/Toast.vue';
import { ToastManger } from './utils/toastManger';
const toast = ref<InstanceType<typeof Toast>>();
onMounted(() => {
	if (!toast.value) return;
	ToastManger.init(toast.value);
});
</script>

<template>
	<Header></Header>
	<RouterView></RouterView>
	<Toast ref="toast"></Toast>
</template>
