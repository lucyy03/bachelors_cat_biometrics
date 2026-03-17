import {ref, computed} from 'vue';
import {
	User,
	getAuth,
	signInWithRedirect,
	getRedirectResult,
	GoogleAuthProvider,
	signOut,
	onAuthStateChanged
} from 'firebase/auth';
import {app} from './firebaseInit';

const userAuth = getAuth(app);
const user = ref<User | null>(null);
const role = ref<string | null>(null); //reactive role
const authFeedbackVisible = ref(false);
const authFeedbackTarget = ref('/');
const authFeedbackTitle = ref('Login successful');
const authFeedbackMessage = ref('Redirecting you to the website...');
const authFeedbackVariant = ref<'success' | 'error' | 'info'>('success');
const authFeedbackAutoRedirect = ref(true);
const authFeedbackRequiresAcknowledgement = ref(false);
let googleRedirectInitPromise: Promise<void> | null = null;

import {db} from '../utils/firebaseInit';
import {setDoc, doc, getDoc, serverTimestamp} from 'firebase/firestore';

//auth state listener
onAuthStateChanged(userAuth, async (currentUser) => {
	user.value = currentUser;

	if (currentUser) {
		const userData = await getUserData(currentUser.uid);
		role.value = userData?.role ?? null;
	} else {
		role.value = null;
	}
});

const isAdminRef = computed(() => role.value === 'ADMIN');

function getStoredAuthReturnTo() {
	const savedPath = sessionStorage.getItem('auth_redirect_return_to');
	if (!savedPath || savedPath.startsWith('/login') || savedPath.startsWith('/signup')) {
		return '/';
	}
	return savedPath;
}

function showAuthSuccess(target = '/', title = 'Login successful', message = 'Redirecting you to the website...') {
	authFeedbackTarget.value = target;
	authFeedbackTitle.value = title;
	authFeedbackMessage.value = message;
	authFeedbackVariant.value = 'success';
	authFeedbackAutoRedirect.value = true;
	authFeedbackRequiresAcknowledgement.value = false;
	authFeedbackVisible.value = true;
}

function showAuthError(title = 'Login unsuccessful', message = 'Try again, check your credentials, or create an account.') {
	authFeedbackTarget.value = window.location.pathname + window.location.search + window.location.hash;
	authFeedbackTitle.value = title;
	authFeedbackMessage.value = message;
	authFeedbackVariant.value = 'error';
	authFeedbackAutoRedirect.value = false;
	authFeedbackRequiresAcknowledgement.value = false;
	authFeedbackVisible.value = true;
}

function showAuthInfo(title = 'Please note', message = 'Please read this message carefully.') {
	authFeedbackTarget.value = window.location.pathname + window.location.search + window.location.hash;
	authFeedbackTitle.value = title;
	authFeedbackMessage.value = message;
	authFeedbackVariant.value = 'info';
	authFeedbackAutoRedirect.value = false;
	authFeedbackRequiresAcknowledgement.value = true;
	authFeedbackVisible.value = true;
}

function hideAuthFeedback() {
	authFeedbackVisible.value = false;
}

async function signInWithGoogle() {
	const provider = new GoogleAuthProvider();
	sessionStorage.setItem('auth_redirect_pending', '1');
	sessionStorage.setItem(
		'auth_redirect_return_to',
		window.location.pathname + window.location.search + window.location.hash
	);

	try {
		await signInWithRedirect(userAuth, provider);
	} catch (error) {
		console.error("Authentication error:", error);
		sessionStorage.removeItem('auth_redirect_pending');
		sessionStorage.removeItem('auth_redirect_return_to');
		showAuthError('Login unsuccessful', 'Google sign-in could not be started. Try again or create an account.');
	}
}

async function initGoogleRedirectResult() {
	if (googleRedirectInitPromise) {
		return googleRedirectInitPromise;
	}

	googleRedirectInitPromise = (async () => {
		const hadPendingRedirect = sessionStorage.getItem('auth_redirect_pending') === '1';

		try {
			const result = await getRedirectResult(userAuth);

			if (result?.user) {
				console.log("User signed in:", result.user);
				await setUserData(result.user);
				showAuthSuccess(getStoredAuthReturnTo());
			}
		} catch (error) {
			console.error("Authentication error:", error);
			showAuthError('Login unsuccessful', 'Google sign-in did not complete. Try again or create an account.');
		} finally {
			if (hadPendingRedirect) {
				sessionStorage.removeItem('auth_redirect_pending');
				sessionStorage.removeItem('auth_redirect_return_to');
			}
		}
	})();

	return googleRedirectInitPromise;
}

async function setUserData(user: User) {
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
        // Add user data to "users" collection only if it doesn't already exist
        await setDoc(userDocRef, {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            profilePicture: user.photoURL,
            createdAt: serverTimestamp(),
            blocked: false,
            role: "BREEDER"
        });
    } else {
        console.log("User data already exists, no need to create it again.");
    }
}

export async function getUserData(uid: string) {
    try {
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            return userDoc.data();
        } else {
            console.log("No user data found");
            return null;
        }
    } catch (error) {
        console.error("Error getting user data:", error);
        return null;
    }
}
// Function to check if the user is blocked
// Function to check if the user is blocked
async function isUserPermitted(): Promise<boolean> {
	try {
		//check if logged
		if (!user.value) {
			return false;
		}
		//check if not blocked
		const userData = await getUserData(user.value.uid);
		const isBlocked = userData ? userData.blocked : true;

		return !isBlocked;
	} catch (error) {
		return false;
	}
}

async function getIsAdmin(): Promise<boolean> {
	try {
		if (!user.value) {
			return false;
		}
		//use cached role if we have it
		if (role.value !== null) {
			return role.value === 'ADMIN';
		}
		const userData = await getUserData(user.value.uid);
		return userData ? userData.role === 'ADMIN' : false;
	} catch (error) {
		return false;
	}
}

async function getUserRole(): Promise<string | null> {
	try {
		if (!user.value) {
			return null;
		}
		if (role.value !== null) {
			return role.value;
		}
		const userData = await getUserData(user.value.uid);
		return userData?.role ?? null;
	} catch (error) {
		return null;
	}
}


function signOutUser() {
    signOut(userAuth)
        .then(() => {
            console.log("User signed out successfully");
            window.location.href = '/';
        })
        .catch((error) => {
            console.error("Error signing out:", error);
        });
}

export function useAuth() {
	return {
		user,
		role,
		isAdmin: isAdminRef,
		getUserData,
		getUserRole,
		getIsAdmin,
		signInWithGoogle,
		initGoogleRedirectResult,
		isUserPermitted,
		signOutUser,
		authFeedbackVisible,
		authFeedbackTarget,
		authFeedbackTitle,
		authFeedbackMessage,
		authFeedbackVariant,
		authFeedbackAutoRedirect,
		authFeedbackRequiresAcknowledgement,
		showAuthSuccess,
		showAuthError,
		showAuthInfo,
		hideAuthFeedback
	};
}
