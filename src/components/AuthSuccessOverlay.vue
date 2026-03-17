<script setup lang="ts">
import {onBeforeUnmount, watch} from 'vue';
import {useRouter} from 'vue-router';
import {useAuth} from '../utils/useAuth';

const router = useRouter();
const {
	authFeedbackVisible,
	authFeedbackTarget,
	authFeedbackTitle,
	authFeedbackMessage,
	authFeedbackVariant,
	authFeedbackAutoRedirect,
	authFeedbackRequiresAcknowledgement,
	hideAuthFeedback
} = useAuth();

let redirectTimer: number | null = null;

function clearRedirectTimer() {
	if (redirectTimer !== null) {
		window.clearTimeout(redirectTimer);
		redirectTimer = null;
	}
}

watch(
	authFeedbackVisible,
	(isVisible) => {
		clearRedirectTimer();

		if (!isVisible || !authFeedbackAutoRedirect.value) return;

		redirectTimer = window.setTimeout(async () => {
			hideAuthFeedback();
			await router.push(authFeedbackTarget.value);
		}, 1400);
	},
	{ immediate: true }
);

onBeforeUnmount(() => {
	clearRedirectTimer();
});
</script>

<template>
	<transition name="auth-success-fade">
		<div v-if="authFeedbackVisible" class="auth-success-overlay">
			<div class="auth-success-card">
				<button
					v-if="!authFeedbackAutoRedirect && !authFeedbackRequiresAcknowledgement"
					class="auth-success-close"
					type="button"
					@click="hideAuthFeedback"
					aria-label="Close login message"
				>
					<font-awesome-icon icon="xmark" />
				</button>
				<div
					class="auth-success-check"
					:class="{
						'auth-success-check--error': authFeedbackVariant === 'error',
						'auth-success-check--info': authFeedbackVariant === 'info'
					}"
				>
					<span v-if="authFeedbackVariant === 'success'"></span>
					<div v-else-if="authFeedbackVariant === 'info'" class="auth-success-info">i</div>
					<div v-else class="auth-success-cross">
						<span></span>
						<span></span>
					</div>
				</div>
				<h2>{{ authFeedbackTitle }}</h2>
				<p>{{ authFeedbackMessage }}</p>
				<button
					v-if="authFeedbackRequiresAcknowledgement"
					class="auth-success-ok"
					type="button"
					@click="hideAuthFeedback"
				>
					OK
				</button>
			</div>
		</div>
	</transition>
</template>

<style scoped lang="scss">
.auth-success-overlay {
	position: fixed;
	inset: 0;
	z-index: 1200;
	display: grid;
	place-items: center;
	padding: 1.5rem;
	background: rgba(40, 25, 65, 0.45);
	backdrop-filter: blur(12px);
}

.auth-success-card {
	position: relative;
	width: min(420px, 100%);
	padding: 2.4rem 2rem 2rem;
	border-radius: 28px;
	text-align: center;
	color: #2f214b;
	background:
		radial-gradient(circle at top, rgba(255, 255, 255, 0.95), rgba(244, 235, 252, 0.96)),
		linear-gradient(135deg, #f7efff, #eadcf8);
	box-shadow: 0 24px 60px rgba(56, 31, 96, 0.28);
	border: 1px solid rgba(124, 84, 200, 0.18);
}

.auth-success-close {
	position: absolute;
	top: 1rem;
	right: 1rem;
	width: 38px;
	height: 38px;
	border: none;
	border-radius: 999px;
	display: inline-grid;
	place-items: center;
	color: rgba(47, 33, 75, 0.75);
	background: rgba(124, 84, 200, 0.10);
	cursor: pointer;
}

.auth-success-check {
	width: 88px;
	height: 88px;
	margin: 0 auto 1.25rem;
	border-radius: 999px;
	display: grid;
	place-items: center;
	background: linear-gradient(135deg, #6dcf9b, #47b97f);
	box-shadow: 0 18px 36px rgba(71, 185, 127, 0.25);
}

.auth-success-check--error {
	background: linear-gradient(135deg, #ef6f7c, #d84e5d);
	box-shadow: 0 18px 36px rgba(216, 78, 93, 0.25);
}

.auth-success-check--info {
	background: linear-gradient(135deg, #7f8cf2, #5d6fde);
	box-shadow: 0 18px 36px rgba(93, 111, 222, 0.25);
}

.auth-success-check span {
	width: 28px;
	height: 16px;
	border-left: 5px solid #fff;
	border-bottom: 5px solid #fff;
	transform: rotate(-45deg) translateY(-2px);
	display: block;
}

.auth-success-cross {
	position: relative;
	width: 28px;
	height: 28px;
}

.auth-success-cross span {
	position: absolute;
	top: 50%;
	left: 50%;
	width: 28px;
	height: 5px;
	border: none;
	background: #fff;
	border-radius: 999px;
	transform-origin: center;
}

.auth-success-cross span:first-child {
	transform: translate(-50%, -50%) rotate(45deg);
}

.auth-success-cross span:last-child {
	transform: translate(-50%, -50%) rotate(-45deg);
}

.auth-success-info {
	font-size: 2.2rem;
	font-weight: 800;
	line-height: 1;
	color: #fff;
	font-family: Georgia, "Times New Roman", serif;
	transform: translateY(-1px);
}

.auth-success-card h2 {
	margin: 0;
	font-size: 1.9rem;
	font-weight: 800;
	letter-spacing: 0.02em;
}

.auth-success-card p {
	margin: 0.75rem 0 0;
	font-size: 1rem;
	line-height: 1.5;
	color: rgba(47, 33, 75, 0.82);
}

.auth-success-ok {
	margin-top: 1.25rem;
	border: none;
	border-radius: 999px;
	padding: 0.8rem 1.8rem;
	background: #6e5acb;
	color: #fff;
	font-size: 0.98rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	cursor: pointer;
	box-shadow: 0 10px 22px rgba(110, 90, 203, 0.28);
}

.auth-success-fade-enter-active,
.auth-success-fade-leave-active {
	transition: opacity 0.22s ease;
}

.auth-success-fade-enter-from,
.auth-success-fade-leave-to {
	opacity: 0;
}
</style>
