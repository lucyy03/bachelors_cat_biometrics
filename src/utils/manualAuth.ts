// src/utils/manualAuth.ts
//assumptions: manual login does not actually verify email/password, just sets a local flag

import { ref } from 'vue';

const MANUAL_AUTH_KEY = 'manualLoggedIn';

//global ref shared across components
const isLoggedIn = ref(localStorage.getItem(MANUAL_AUTH_KEY) === 'true');

//accept optional email/password so Login.vue can pass them
function login(email?: string, password?: string) {
	//note:we ignore email/password here; this is just a local "logged in" flag
	isLoggedIn.value = true;
	localStorage.setItem(MANUAL_AUTH_KEY, 'true');
}

function logout() {
	isLoggedIn.value = false;
	localStorage.removeItem(MANUAL_AUTH_KEY);
}

export function useManualAuth() {
	return {
		isLoggedIn,
		login,
		logout
	};
}