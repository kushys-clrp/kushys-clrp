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

    const employeeRef = doc(db, "employees", user.uid);
    const employeeSnap = await getDoc(employeeRef);

    if (!employeeSnap.exists()) {
      errorMessage.textContent =
        "Wrong information received. Please try again.";
      return;
    }

    const employeeData = employeeSnap.data();

    if (!employeeData.active) {
      errorMessage.textContent =
        "This account is not active. Please contact management.";
      return;
    }

    if (
      employeeData.role === "owner" ||
      employeeData.role === "manager"
    ) {
      window.location.href = "dashboard.html";
    } else {
      window.location.href = "register.html";
    }

  } catch (error) {
    errorMessage.textContent =
      "Wrong information received. Please try again.";
  }
});