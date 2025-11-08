import {ref} from 'vue';
import {User, getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged} from 'firebase/auth';
import {app} from './firebaseInit';

const userAuth = getAuth(app);
const user = ref<User | null>(null);
import {db} from '../utils/firebaseInit';
import {setDoc, doc, getDoc, serverTimestamp} from "firebase/firestore";

onAuthStateChanged(userAuth, (currentUser) => {
    user.value = currentUser;
});

function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(userAuth, provider)
        .then(async (result) => {
            console.log("User signed in:", result.user);
            await setUserData(result.user)
        })
        .catch((error) => {
            console.error("Authentication error:", error);
        });
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
async function isUserPermitted(): Promise<boolean> {
    try {
        // check if logged
        if (!user.value) {
            return false
        }
        // check if not blocked
        const userData = await getUserData(user.value.uid);
        const isBlocked = userData ? userData.blocked : true;

        return !isBlocked
    } catch (error) {
        return false;
    }
}

// Function to check if the user is blocked
async function getIsAdmin(): Promise<boolean> {
    try {
        if (!user.value) {
            return false
        }
        const userData = await getUserData(user.value.uid)
        return userData ? userData.role === 'ADMIN' : false
    } catch (error) {
        return false
    }
}

async function getUserRole(): Promise<string | null> {
    try {
        if (!user.value) {
            return null
        }
        const userData = await getUserData(user.value.uid)
        return userData?.role ?? null
    } catch (error) {
        return null
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
        getUserData,
        getUserRole,
        getIsAdmin,
        signInWithGoogle,
        isUserPermitted,
        signOutUser
    };
}
