<template>
	<Teleport to="body">
		<Transition name="toast">
			<div v-if="visible" :class="['toast-container', `toast-${location}`, `toast-${type}`]">
				<div class="toast-content">
					<div class="toast-icon">
						<svg v-if="type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M20 6L9 17l-5-5" />
						</svg>
						<svg v-else-if="type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<path d="M15 9l-6 6M9 9l6 6" />
						</svg>
						<svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10" />
							<path d="M12 16v-4M12 8h.01" />
						</svg>
					</div>
					<div class="toast-messages">
						<div v-for="(msg, index) in messages" :key="index" class="toast-message">
							{{ msg }}
						</div>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';

type ToastType = 'success' | 'error' | 'info';
type ToastLocation = 'centre' | 'bottom' | 'left' | 'right';

const visible = ref(false);
const type = ref<ToastType>('info');
const location = ref<ToastLocation>('centre');
const messages = ref<string[]>([]);
const duration = ref(3000);

const toast = (toastType: ToastType, ...toastMessages: string[]) => {
	type.value = toastType;
	messages.value = toastMessages;
	visible.value = true;

	if (duration.value > 0) {
		setTimeout(() => {
			hide();
		}, duration.value);
	}
};

const show = () => {
	visible.value = true;
	if (duration.value > 0) {
		setTimeout(() => {
			hide();
		}, duration.value);
	}
};

const hide = () => {
	visible.value = false;
};

defineExpose({
	toast,
	show,
	hide,
	duration,
	location,
});
</script>

<style scoped>
.toast-container {
	position: fixed;
	z-index: 9999;
	display: flex;
	align-items: center;
	padding: 16px 24px;
	border-radius: 8px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	max-width: 400px;
	min-width: 280px;
}

.toast-content {
	display: flex;
	align-items: flex-start;
	gap: 12px;
}

.toast-icon {
	flex-shrink: 0;
	width: 24px;
	height: 24px;
}

.toast-icon svg {
	width: 100%;
	height: 100%;
}

.toast-messages {
	flex: 1;
}

.toast-message {
	font-size: 14px;
	line-height: 1.5;
	margin-bottom: 4px;
}

.toast-message:last-child {
	margin-bottom: 0;
}

/* Location styles */
.toast-centre {
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}

.toast-bottom {
	bottom: 24px;
	left: 50%;
	transform: translateX(-50%);
}

.toast-left {
	top: 24px;
	left: 24px;
}

.toast-right {
	top: 24px;
	right: 24px;
}

/* Type styles */
.toast-success {
	background-color: #f0fdf4;
	border: 1px solid #22c55e;
	color: #15803d;
}

.toast-success .toast-icon {
	color: #22c55e;
}

.toast-error {
	background-color: #fef2f2;
	border: 1px solid #ef4444;
	color: #b91c1c;
}

.toast-error .toast-icon {
	color: #ef4444;
}

.toast-info {
	background-color: #eff6ff;
	border: 1px solid #3b82f6;
	color: #1d4ed8;
}

.toast-info .toast-icon {
	color: #3b82f6;
}

/* Transition */
.toast-enter-active,
.toast-leave-active {
	transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
	opacity: 0;
}

.toast-enter-from.toast-centre,
.toast-leave-to.toast-centre {
	transform: translate(-50%, -50%) scale(0.9);
}

.toast-enter-from.toast-bottom,
.toast-leave-to.toast-bottom {
	transform: translateX(-50%) translateY(20px);
}

.toast-enter-from.toast-left,
.toast-leave-to.toast-left {
	transform: translateX(-20px);
}

.toast-enter-from.toast-right,
.toast-leave-to.toast-right {
	transform: translateX(20px);
}
</style>
