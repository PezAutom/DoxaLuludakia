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

  const test = false; // Set to true to bypass auth for testing

  // Initialize Firebase app, authentication and realtime database references
  const app = initializeApp(firebaseConfig);
  const auth = getAuth();
  const db = getDatabase(app);

  // Wait for the DOM to be ready before querying elements and wiring event handlers
  window.addEventListener("DOMContentLoaded", () => {
    const authBox = document.getElementById("authBox");
    const controlBox = document.getElementById("controlBox");
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const authMsg = document.getElementById("authMsg");
    const badge = document.getElementById("statusBadge");
    const buttons = document.querySelectorAll(".gpio-button");
    const waterChart = document.getElementById("waterChart");
    const waterChartMsg = document.getElementById("waterChartMsg");
    // Pump timer slider elements (allow remote configuration of pumpTimer in Arduino sketch)
    const pumpSlider = document.getElementById("pumpSlider");
    const pumpSliderValue = document.getElementById("pumpSliderValue");

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

    // Auth state monitor: show control UI only when signed in or test mode is enabled
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

    // Start realtime listeners for buttons and chart data
    function startListeners() {
      buttons.forEach((btn) => {
        const key = btn.dataset.gpio;
        if (!key) return;

        // Keep button UI synced with its Firebase path value
        onValue(ref(db, "/" + key), (snapshot) => {
          const value = snapshot.val() ? 1 : 0;
          updateUI(btn, value);
        });

        // Toggle the remote GPIO state when the button is clicked
        btn.onclick = () => {
          const newState = btn.classList.contains("on") ? 0 : 1;
          set(ref(db, "/" + key), newState);
        };
      });

      if (waterChart) {
        const moistureRef = ref(db, "/sensori/moisture");
        onValue(moistureRef, (snapshot) => {
          updateWaterChart(snapshot.val());
        });
      }

      // Listen for pumpTimer changes from the database and update slider
      if (pumpSlider) {
        const pumpRef = ref(db, "/settings/pumpTimer");
        // Read pumpTimer stored in milliseconds in the database
        // Convert to seconds for the UI slider and display
        onValue(pumpRef, (snapshot) => {
          const v = Number(snapshot.val()); // v is milliseconds
          if (Number.isFinite(v)) {
            const sec = Math.round(v / 1000);
            pumpSlider.value = sec; // slider works in seconds
            if (pumpSliderValue) pumpSliderValue.textContent = sec + "s";
          }
        });

        // Update displayed value while sliding (client-side only)
        pumpSlider.oninput = (e) => {
          if (pumpSliderValue) pumpSliderValue.textContent = e.target.value + "s";
        };

        // Commit new value to Firebase when user releases the slider
        // Convert seconds -> milliseconds before writing to DB
        pumpSlider.onchange = (e) => {
          const newSec = Number(e.target.value);
          const newMs = newSec * 1000; // Arduino expects ms
          set(ref(db, "/settings/pumpTimer"), newMs);
        };
      }
    }

    // Update the button appearance and status label based on the current GPIO state
    function updateUI(btn, val) {
      const lab = btn.nextElementSibling;
      if (!lab) return;

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

    // Build and render moisture chart data from Firebase payload
    function updateWaterChart(data) {
      if (!waterChart) return;
      const points = [];
      const now = Date.now();
      const cutoff = now - 48 * 60 * 60 * 1000;

      if (data && typeof data === "object") {
        Object.keys(data).forEach((key) => {
          const date = parseTimestampKey(key);
          if (!date) return;
          const value = Number(data[key]);
          if (!Number.isFinite(value)) return;
          points.push({ date, value });
        });
      }

      // If no datapoints exist at all, show a placeholder message
      if (!points.length) {
        drawNoChartMessage("No moisture data available.");
        return;
      }

      points.sort((a, b) => a.date - b.date);
      const recentPoints = points.filter((point) => point.date.getTime() >= cutoff);
      let chartPoints = [];
      let message = "";

      if (recentPoints.length) {
        chartPoints = recentPoints;
      } else {
        const latestCount = Math.min(24, points.length);
        chartPoints = points.slice(-latestCount);
        message = "Data shown are older than 48hrs.";
      }

      const labels = chartPoints.map((point) => formatChartLabel(point.date));
      const values = chartPoints.map((point) => point.value);
      drawWaterChart(labels, values, chartPoints);
      waterChartMsg.textContent = message;
    }

    // Parse Firebase timestamp keys like YYYY-MM-DD_HH-MM into Date objects
    function parseTimestampKey(key) {
      const [datePart, timePart] = key.split("_");
      if (!datePart || !timePart) return null;
      const [year, month, day] = datePart.split("-").map(Number);
      const [hour, minute] = timePart.split("-").map(Number);
      if ([year, month, day, hour, minute].some((value) => !Number.isFinite(value))) {
        return null;
      }
      return new Date(year, month - 1, day, hour, minute);
    }

    // Create a human-readable label for a chart datapoint
    function formatChartLabel(date) {
      const pad = (number) => number.toString().padStart(2, "0");
      return `${pad(date.getDate())}/${pad(date.getMonth() + 1)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    // Display a message on the chart when there is no data available
    function drawNoChartMessage(message) {
      const ctx = waterChart.getContext("2d");
      ctx.clearRect(0, 0, waterChart.width, waterChart.height);
      ctx.fillStyle = "rgba(230, 25, 25, 0.7)";
      ctx.font = "14px Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(message, waterChart.width / 2, waterChart.height / 2);
      waterChartMsg.textContent = message;
    }

    // Render the moisture line chart using canvas drawing commands
    function drawWaterChart(labels, values, chartPointsData) {
      const ctx = waterChart.getContext("2d");
      const width = waterChart.width;
      const height = waterChart.height;
      const margin = 36;
      const chartWidth = width - margin * 2;
      const chartHeight = height - margin * 2;

      ctx.clearRect(0, 0, width, height);

      const maxValue = Math.max(100, Math.max(...values));
      const minValue = 0;
      const valueRange = maxValue - minValue || 1;

      // background grid
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = margin + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(width - margin, y);
        ctx.stroke();
      }

      // axes
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(margin, margin);
      ctx.lineTo(margin, height - margin);
      ctx.lineTo(width - margin, height - margin);
      ctx.stroke();

      // y-axis labels
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = "12px Segoe UI, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (let i = 0; i <= 4; i++) {
        const value = minValue + ((maxValue - minValue) / 4) * (4 - i);
        const y = margin + (chartHeight / 4) * i;
        ctx.fillText(Math.round(value), margin - 8, y);
      }

      const pointCount = values.length;
      const stepX = pointCount > 1 ? chartWidth / (pointCount - 1) : chartWidth;
      const chartPoints = values.map((value, index) => {
        return {
          x: margin + stepX * index,
          y: margin + chartHeight - ((value - minValue) / valueRange) * chartHeight,
        };
      });

      const timeSpan = chartPointsData && chartPointsData.length > 1
        ? chartPointsData[chartPointsData.length - 1].date.getTime() - chartPointsData[0].date.getTime()
        : 0;

      if (timeSpan > 0) {
        const sixHours = 6 * 60 * 60 * 1000;
        const startTime = chartPointsData[0].date.getTime();
        const endTime = chartPointsData[chartPointsData.length - 1].date.getTime();
        const firstLineTime = Math.ceil(startTime / sixHours) * sixHours;

        ctx.strokeStyle = "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        for (let lineTime = firstLineTime; lineTime <= endTime; lineTime += sixHours) {
          const fraction = (lineTime - startTime) / timeSpan;
          if (fraction < 0 || fraction > 1) continue;
          const x = margin + fraction * chartWidth;
          ctx.beginPath();
          ctx.moveTo(x, margin);
          ctx.lineTo(x, height - margin);
          ctx.stroke();
        }

        ctx.setLineDash([]);
      }

      // draw line
      ctx.strokeStyle = "#6df909";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      chartPoints.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();

      // draw points
      ctx.fillStyle = "#009d22";
      chartPoints.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // x-axis labels
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const maxLabels = 4;
      const labelIndexes = pointCount <= maxLabels
        ? Array.from({ length: pointCount }, (_, i) => i)
        : Array.from({ length: maxLabels }, (_, i) => Math.round(i * (pointCount - 1) / (maxLabels - 1)));
      const uniqueIndexes = [...new Set(labelIndexes)];
      uniqueIndexes.forEach((index) => {
        const label = labels[index];
        const x = chartPoints[index].x;
        ctx.fillText(label, x, height - margin + 8);
      });
    }

    // tabs behavior in the UI
    const tabs = document.querySelectorAll('[data-tab-target]');
    const tabContents = document.querySelectorAll('[data-tab-content]');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = document.querySelector(tab.dataset.tabTarget);
        tabContents.forEach(tabContent => {
          tabContent.classList.remove('active');
        });
        tabs.forEach(tab => {
          tab.classList.remove('active');
        });
        tab.classList.add('active');
        target.classList.add('active');
      });
    });
  });