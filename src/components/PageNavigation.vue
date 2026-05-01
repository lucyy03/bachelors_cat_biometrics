<script setup lang="ts">
import {ref, computed, watchEffect} from 'vue';
import {useRoute} from 'vue-router';
import {useAuth} from '../utils/useAuth';
import {useManualAuth} from '../utils/manualAuth';

// firebase auth
const {user, signOutUser, isAdmin, isUserPermitted} = useAuth();

// manual auth
const {isLoggedIn: manualLoggedIn, logout: manualLogout} = useManualAuth();

const route = useRoute();
const isHomePage = computed(() => route.path === '/');

// whether ANY login method is active
const isLoggedIn = computed(() => !!user.value || manualLoggedIn.value);

// permission flag for actions like "Upload your cat"
const isPermitted = ref<boolean>(false);

watchEffect(async () => {
	if (user.value) {
		isPermitted.value = await isUserPermitted();
	} else {
		isPermitted.value = true;
	}
});

// logout chooses correct method
function logout() {
	if (user.value) {
		signOutUser();           // firebase logout
	} else if (manualLoggedIn.value) {
		manualLogout();          // manual logout
		alert('Logged out');
	}
}
</script>

<template>
	<nav class="container">
		<!-- navigation for normal users (non-admins) -->
		<template v-if="!isAdmin">
			<router-link to="/upload-cat">
				<div
					v-if="!isHomePage && isPermitted"
					class="nav-item hover-underline-animation"
				>
					Upload your cat
				</div>
			</router-link>

			<router-link to="/analyzer">
				<div class="nav-item hover-underline-animation">Analyzer</div>
			</router-link>

			<router-link to="/cats-list">
				<div class="nav-item hover-underline-animation">All cats</div>
			</router-link>

			<a href="/#content" class="nav-item hover-underline-animation">
				About service
			</a>

			<router-link to="/profile" v-if="user">
				<div class="nav-item hover-underline-animation">Profile</div>
			</router-link>
		</template>

		<!-- navigation for admin -->
		<template v-else>
			<router-link to="/admin">
				<div class="nav-item hover-underline-animation">
					Admin dashboard
				</div>
			</router-link>

			<router-link to="/admin/breeders">
				<div class="nav-item hover-underline-animation">
					Breeders
				</div>
			</router-link>

			<router-link to="/admin/certificates">
				<div class="nav-item hover-underline-animation">
					Certificates
				</div>
			</router-link>

			<router-link to="/admin/reports">
				<div class="nav-item hover-underline-animation">
					Reports
				</div>
			</router-link>

			<!-- optional: keep analyzer visible for admin too -->
			<router-link to="/analyzer">
				<div class="nav-item hover-underline-animation">Analyzer</div>
			</router-link>
		</template>

		<!-- login / logout, shown for everyone -->
		<div
			v-if="isLoggedIn"
			@click="logout"
			class="nav-item hover-underline-animation"
		>
			Log out
		</div>

		<router-link v-else to="/login">
			<div class="nav-item hover-underline-animation">Log in</div>
		</router-link>
	</nav>
</template>

<style scoped lang="scss">
nav {
	@apply uppercase absolute top-5 flex flex-row text-xl gap-8 m-auto right-0 left-0 justify-end tracking-wide;
	z-index: 10;
}

.nav-item {
	@apply cursor-pointer text-slate-200;
}
</style>
