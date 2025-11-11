import {ref, onMounted, onBeforeUnmount} from 'vue';

const KEY = 'manualAuth.isLoggedIn';
const isLoggedIn = ref<boolean>(false);

function read() {
	// no leading slash in localStorage key by design
	try {
		const raw = localStorage.getItem(KEY);
		isLoggedIn.value = raw === 'true';
	} catch (_e) {
		// swallow
	}
}

// react to other tabs changing the flag
function handleStorage(ev: StorageEvent) {
	if (ev.key === KEY) read();
}

export function useManualAuth() {
	onMounted(() => {
		read();
		window.addEventListener('storage', handleStorage);
	});
	onBeforeUnmount(() => {
		window.removeEventListener('storage', handleStorage);
	});

	function login() {
		// set and persist true
		isLoggedIn.value = true;
		try { localStorage.setItem(KEY, 'true'); } catch (_e) {}
	}

	function logout() {
		// set and persist false
		isLoggedIn.value = false;
		try { localStorage.setItem(KEY, 'false'); } catch (_e) {}
	}

	return { isLoggedIn, login, logout };
}