import { db, getTodayKey } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("🔥 admin.js loaded");

const ADMIN_PIN = "0317";

const EMPLOYEES = [
  "Kiran Barthwal",
  "Jeenat Khan",
  "Rohin Dixit",
  "Kamal Hassain",
  "Sudarla",
  "Jakir",
  "Sam Lee",
];

function formatTime(isoStr) {
  if (!isoStr || isoStr === "-") return "-";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "-";

  const h = d.getHours();
  const m = d.getMinutes();
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${m.toString().padStart(2, "0")}`;
}

const pinBtn = document.getElementById("pinBtn");
const pinInput = document.getElementById("pinInput");
const pinError = document.getElementById("pinError");
const pinSection = document.getElementById("pinSection");
const adminSection = document.getElementById("adminSection");

window.checkPin = async function () {
  pinError.textContent = "";

  if (pinInput.value === ADMIN_PIN) {
    pinSection.style.display = "none";
    adminSection.style.display = "block";
    await loadTodayAttendance();
  } else {
    pinError.textContent = "PIN이 올바르지 않습니다.";
  }
};

pinBtn.addEventListener("click", checkPin);
pinInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkPin();
});

async function loadTodayAttendance() {
  const todayKey = getTodayKey();
  document.getElementById("title").textContent = `Today's Attendance (${todayKey})`;

  const tbody = document.getElementById("attendanceTable");
  tbody.innerHTML = "";

  for (const name of EMPLOYEES) {
    const ref = doc(db, "attendance", todayKey, "records", name);
    const snap = await getDoc(ref);

    const attend =
      snap.exists() && snap.data().attendAt
        ? formatTime(snap.data().attendAt.toDate().toISOString())
        : "-";

    const leave =
      snap.exists() && snap.data().leaveAt
        ? formatTime(snap.data().leaveAt.toDate().toISOString())
        : "-";

    tbody.innerHTML += `
      <tr>
        <td>${name}</td>
        <td>${attend}</td>
        <td>${leave}</td>
      </tr>
    `;
  }
}

const toggleBtn = document.getElementById("toggleHistory");
const historySection = document.getElementById("historySection");
let historyLoaded = false;

toggleBtn.addEventListener("click", async () => {
  const isOpen = historySection.style.display === "block";
  historySection.style.display = isOpen ? "none" : "block";
  toggleBtn.textContent = isOpen ? "View more ▼" : "Hide ▲";

  // ✅ 처음 열 때만 로딩
  if (!historyLoaded && !isOpen) {
    await loadHistory();
    historyLoaded = true;
  }
});

async function loadHistory() {
  const todayKey = getTodayKey();
  const container = document.getElementById("historyContainer");
  container.innerHTML = "Loading...";

  try {
    // ✅ 인덱스/쿼리 없이: 전부 가져와서 JS에서 정렬
    const snap = await getDocs(collection(db, "attendance"));

    const dates = snap.docs
      .map((d) => d.id)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) // YYYY-MM-DD 문서만
      .filter((d) => d !== todayKey)
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 30); // 최근 30일만 표시

    if (dates.length === 0) {
      container.innerHTML = "<p>No history yet.</p>";
      return;
    }

    container.innerHTML = "";

    for (const date of dates) {
      let html = `
        <div class="history-day">
          <h4>${date}</h4>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Attend</th>
                <th>Leave</th>
              </tr>
            </thead>
            <tbody>
      `;

      for (const name of EMPLOYEES) {
        const ref = doc(db, "attendance", date, "records", name);
        const snap = await getDoc(ref);

        const attend =
          snap.exists() && snap.data().attendAt
            ? formatTime(snap.data().attendAt.toDate().toISOString())
            : "-";

        const leave =
          snap.exists() && snap.data().leaveAt
            ? formatTime(snap.data().leaveAt.toDate().toISOString())
            : "-";

        html += `
          <tr>
            <td>${name}</td>
            <td>${attend}</td>
            <td>${leave}</td>
          </tr>
        `;
      }

      html += `
            </tbody>
          </table>
        </div>
      `;

      container.innerHTML += html;
    }
  } catch (e) {
    console.error("History load failed:", e);
    container.innerHTML = `
      <p style="color:red;">
        History load failed: ${e.message}
      </p>
    `;
  }
}


