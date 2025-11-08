import {initializeApp} from 'firebase/app';
import {getAnalytics} from "firebase/analytics";
import {getAuth} from "firebase/auth";
import {getFirestore} from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBszElq8N5yguSdq5eWBNh1b0grtbl09_w",
    authDomain: "catbiometric-3116f.firebaseapp.com",
    projectId: "catbiometric-3116f",
    storageBucket: "catbiometric-3116f.appspot.com",
    messagingSenderId: "1055398534798",
    appId: "1:1055398534798:web:10a108a85f0895a847b3df",
    measurementId: "G-2D1ZJ0G2QC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };
