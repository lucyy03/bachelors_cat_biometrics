<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../utils/useAuth'
import { useManualAuth } from '../utils/manualAuth'

// firebase auth
const { user, signOutUser, getUserData, isUserPermitted } = useAuth()

// manual auth
const { isLoggedIn: manualLoggedIn, logout: manualLogout } = useManualAuth()

const route = useRoute()
const isHomePage = computed(() => route.path === '/')

// whether ANY login method is active
const isLoggedIn = computed(() => !!user.value || manualLoggedIn.value)

// user role stuff (firebase only)
const userRole = ref<string | null>(null)
const isPermitted = ref<boolean>(false)

watchEffect(async () => {
	if (user.value) {
		const userData = await getUserData(user.value.uid)
		if (userData && userData.role) {
			userRole.value = userData.role
			isPermitted.value = await isUserPermitted()
		}
	} else {
		userRole.value = null
		isPermitted.value = true
	}
})

const isAdmin = computed(() => userRole.value === 'ADMIN')

// logout chooses correct method
function logout() {
	if (user.value) {
		signOutUser()           // firebase logout
	} else if (manualLoggedIn.value) {
		manualLogout()          // manual logout
		alert('Logged out')     // match your manual login alert style
	}
}
</script>


<template>
	<nav class="container">
		<router-link to="/upload-cat">
			<div v-if="!isHomePage && isPermitted" class="nav-item hover-underline-animation">
				Upload your cat
			</div>
		</router-link>

		<router-link to="/analyzer">
			<div class="nav-item hover-underline-animation">Analyzer</div>
		</router-link>

		<router-link to="/users-list" v-if="isAdmin">
			<div class="nav-item hover-underline-animation">Users</div>
		</router-link>

		<router-link to="/analyses" v-if="isAdmin">
			<div class="nav-item hover-underline-animation">Analyses</div>
		</router-link>

		<router-link to="/cats-list">
			<div class="nav-item hover-underline-animation">All cats</div>
		</router-link>

		<a href="/#content" class="nav-item hover-underline-animation">About service</a>

		<router-link to="/profile" v-if="user">
			<div class="nav-item hover-underline-animation">Profile</div>
		</router-link>

		<!-- Ak je user prihlásený, zobraz Log out -->
		<div v-if="isLoggedIn" @click="logout" class="nav-item hover-underline-animation">
			Log out
		</div>

		<!-- Ak nie je prihlásený, zobraz link na /login -->
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