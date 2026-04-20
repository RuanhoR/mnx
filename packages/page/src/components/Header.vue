<template>
	<div class="tool">
		<div class="logo"></div>
		<dv class="toolbar">
			<div class="item" @click="go('/')">{{ getI18n('HeaderToHome') }}</div>
			<div class="item" @click="go('/about')">{{ getI18n('HeaderToAbout') }}</div>
			<a class="item" href="https://mbler-docs.ruanhor.dpdns.org/guide/mnx">{{ getI18n("HeaderToDocs") }}</a>
		</dv>
		<div @click="go('/search')">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				fill="none"
				stroke="currentColor"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				viewBox="0 0 24 24"
			>
				<path d="m21 21-4.34-4.34"></path>
				<circle cx="11" cy="11" r="8"></circle>
			</svg>
		</div>
	</div>
</template>
<script setup lang="ts">
import { useRouter } from 'vue-router';
import { getI18n } from '../i18n';

const router = useRouter();
function go(point: string) {
	router.replace(point);
}
</script>
<style lang="css" scoped>
.logo {
	position: relative;
}
.tool * {
	font-size: 20px;
}
.toolbar {
	position: relative;
	justify-content: center;
	align-content: start;
	display: flex;
	width: 100%;
}
.tool {
	position: relative;
	justify-content: left;
	align-content: start;
	display: flex;
	width: 90%;
	left: 5%;
}
.logo::before {
	content: 'pnmx';
	color: var(--text-h);
	font-size: 150%;
	-webkit-text-stroke: 1px var(--gray-light);
	text-shadow:
		1px 1px 0 var(--gray-light),
		-1px 1px 0 var(--gray-light),
		1px -1px 0 var(--gray-light),
		-1px -1px 0 var(--gray-light);
}
.item {
	margin: 10px;
	color: var(--text-b)
}
a {
	text-decoration: none;
}
</style>
