// Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAAr72s0W-sfDT_v9aQui6xKg0ZgRqpupQ",
  authDomain: "kushys-clrp.firebaseapp.com",
  projectId: "kushys-clrp",
  storageBucket: "kushys-clrp.firebasestorage.app",
  messagingSenderId: "978127378669",
  appId: "1:978127378669:web:2dbaef54df28745e9054e4",
  measurementId: "G-G520E33S13"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
const auth = getAuth(app);
const db = getFirestore(app);

// Export
export { auth, db };