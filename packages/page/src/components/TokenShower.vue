<template>
	<div class="token-shower-root">
		<div>Token</div>
		<div>{{ $props.name }}</div>
		<div>{{ $props.token }}</div>
	</div>
</template>
<script setup lang="ts">
defineProps<{
	name: string;
	token: string;
}>();
defineEmits<['delete']>();
</script>
<style scoped>
.token-shower-root {
	width: 100%;
	border-color: var(--gray-light);
	border-style: solid;
	border-radius: 5px;
	padding: 5px;
	margin-bottom: 5px;
}
</style>
