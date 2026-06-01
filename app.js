  import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
  import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
  import {
    getDatabase,
    ref,
    set,
    onValue
  } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

  //  Replace With YOUR Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAPLBQZC1DkzZspa4S6EYKfuV_ZaclQvyw",
  authDomain: "doxaluludaki.firebaseapp.com",
  databaseURL: "https://doxaluludaki-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "doxaluludaki",
  storageBucket: "doxaluludaki.firebasestorage.app",
  messagingSenderId: "323416752199",
  appId: "1:323416752199:web:6cdaff0a6ff6f26121b162"
};

  const test = true; // Set to true to bypass auth for testing

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const auth = getAuth();
  const db = getDatabase(app);

  // UI elements
  const authBox = document.getElementById("authBox");
  const controlBox = document.getElementById("controlBox");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const authMsg = document.getElementById("authMsg");
  const badge = document.getElementById("statusBadge");

  const gpioButtons = {
    gpio1: document.getElementById("gpio1Btn"),
    gpio2: document.getElementById("gpio2Btn"),
    gpio3: document.getElementById("gpio3Btn")
  };

  const gpioLabels = {
    gpio1: document.getElementById("gpio1Status"),
    gpio2: document.getElementById("gpio2Status"),
    gpio3: document.getElementById("gpio3Status")
  };

  // Login
  loginBtn.onclick = async () => {
    authMsg.textContent = "";
    try {
      await signInWithEmailAndPassword(
        auth,
        document.getElementById("emailField").value,
        document.getElementById("passwordField").value
      );
    } catch (e) {
      authMsg.textContent = e.message;
    }
  };

  logoutBtn.onclick = () => signOut(auth);

  // Auth state monitor
  onAuthStateChanged(auth, (user) => {
    if (user || test) {
      authBox.style.display = "none";
      controlBox.style.display = "block";
      badge.className = "status-badge online";
      badge.textContent = "Online";
      startListeners();
    } else {
      authBox.style.display = "block";
      controlBox.style.display = "none";
      badge.className = "status-badge offline";
      badge.textContent = "Offline";
    }
  });

  // Listen to DB
  function startListeners() {
    ["gpio1", "gpio2", "gpio3"].forEach((key) => {
      onValue(ref(db, "/" + key), (snapshot) => {
        let value = snapshot.val() ? 1 : 0;
        updateUI(key, value);
      });
    });

    // Button click
    Object.values(gpioButtons).forEach((btn) => {
      btn.onclick = () => {
        let gpio = btn.dataset.gpio;
        let newState = btn.classList.contains("on") ? 0 : 1;
        set(ref(db, "/" + gpio), newState);
      };
    });
  }

  // Update UI
  function updateUI(key, val) {
    let btn = gpioButtons[key];
    let lab = gpioLabels[key];

    if (val === 1) {
      btn.classList.add("on");
      lab.textContent = "Status: ON";
      lab.style.color = "#9effae";
    } else {
      btn.classList.remove("on");
      lab.textContent = "Status: OFF";
      lab.style.color = "#d1d1d1";
    }
  }

  // tabs behavior in the UI
const tabs = document.querySelectorAll('[data-tab-target]')
const tabContents = document.querySelectorAll('[data-tab-content]')

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const target = document.querySelector(tab.dataset.tabTarget)
    tabContents.forEach(tabContent => {
      tabContent.classList.remove('active')
    })
    tabs.forEach(tab => {
      tab.classList.remove('active')
    })
    tab.classList.add('active')
    target.classList.add('active')
  })
})