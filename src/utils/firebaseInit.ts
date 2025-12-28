import {initializeApp} from 'firebase/app';
import {getAnalytics} from "firebase/analytics";
import {getAuth} from "firebase/auth";
import {getFirestore} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBb6MLKe6b06SJZX_sFX1EkB8JDLiY7j84",
  authDomain: "bp-cat-biometrics.firebaseapp.com",
  projectId: "bp-cat-biometrics",
  storageBucket: "bp-cat-biometrics.firebasestorage.app",
  messagingSenderId: "520580556672",
  appId: "1:520580556672:web:879a559384a512872c4365"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics: ReturnType<typeof getAnalytics> | null = null;
try {
	analytics = getAnalytics(app);
} catch (e) {
	//note:ignore analytics errors in dev/local env
	analytics = null;
}
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };
