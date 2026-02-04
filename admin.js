import { db, getTodayKey } from "./firebase.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("🔥 admin.js loaded");

const ADMIN_PIN = "0317";

const EMPLOYEES = [
  "Jakir",
  "Jeenat Khan",
  "Kamal Hassain",
  "Kiran Barthwal",
  "Robin Dixit",
  "Sam Lee",
  "Sudarla"
];

function formatTime(timeStr) {
  if (!timeStr || timeStr === "-") return "-";
  const nums = timeStr.match(/\d+/g);
  if (!nums || nums.length < 2) return "-";
  const h = Number(nums[nums.length >= 3 ? nums.length - 3 : 0]);
  const m = Number(nums[nums.length - 2]);
  if (isNaN(h) || isNaN(m)) return "-";
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${m.toString().padStart(2,"0")}`;
}

const pinBtn = document.getElementById("pinBtn");
const pinInput = document.getElementById("pinInput");
const pinError = document.getElementById("pinError");
const pinSection = document.getElementById("pinSection");
const adminSection = document.getElementById("adminSection");

// checkPin 전역에 연결
window.checkPin = async function() {
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

// loadTodayAttendance 이하 기존 그대로 유지
async function loadTodayAttendance() {
  const todayKey = getTodayKey();
  document.getElementById("title").textContent =
    `Today's Attendance (${todayKey})`;

  const tbody = document.getElementById("attendanceTable");
  tbody.innerHTML = "";

  for (const name of EMPLOYEES) {
    const ref = doc(db, "attendance", todayKey, "users", name);
    const snap = await getDoc(ref);

    const attend = snap.exists() && snap.data().attend
      ? formatTime(snap.data().attend)
      : "-";

    const leave = snap.exists() && snap.data().leave
      ? formatTime(snap.data().leave)
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

