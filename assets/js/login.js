import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const loginBtn = document.getElementById("loginBtn");
const errorMessage = document.getElementById("errorMessage");

loginBtn.addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  errorMessage.textContent = "";

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      errorMessage.textContent =
        "This account does not have access to Kushy's.";
      return;
    }
    
    const userData = userSnap.data();
    
    if (!userData.active) {
      errorMessage.textContent =
        "This account is not active. Please contact management.";
      return;
    }
    
    if (
      userData.role === "owner" ||
      userData.role === "manager"
    ) {
      window.location.href = "dashboard.html";
    } else {
      window.location.href = "register.html";
    }

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    console.error("ERROR CODE:", error.code);
    console.error("ERROR MESSAGE:", error.message);
  
    errorMessage.textContent =
      `${error.code || "Unknown error"}: ${error.message || "Login failed"}`;
  }
});