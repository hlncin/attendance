console.log("🔥 admin.js loaded");

import { db, getTodayKey } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {

  /*****************
   * 관리자 PIN
   *****************/
  const ADMIN_PIN = "0317";

  /*****************
   * 직원 이름 리스트 (고정)
   *****************/
  const EMPLOYEES = [
    "Jakir",
    "Jeenat Khan",
    "Kamal Hassain",
    "Kiran Barthwal",
    "Robin Dixit",
    "Sam Lee",
    "Sudarla"
  ];

  /*****************
   * 시간 포맷 함수
   * HH:MM → 오전/오후 X시 XX분
   *****************/
  function formatTime(timeStr) {
    if (!timeStr || timeStr === "-") return "-";

    const [h, m] = timeStr.split(":").map(Number);
    const period = h < 12 ? "오전" : "오후";
    const hour = h % 12 === 0 ? 12 : h % 12;

    return `${period} ${hour}시 ${m.toString().padStart(2, "0")}분`;
  }

  /*****************
   * PIN 요소
   *****************/
  const pinBtn = document.getElementById("pinBtn");
  const pinInput = document.getElementById("pinInput");
  const pinError = document.getElementById("pinError");
  const pinSection = document.getElementById("pinSection");
  const adminSection = document.getElementById("adminSection");

  pinBtn.addEventListener("click", checkPin);
  pinInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") checkPin();
  });

  function checkPin() {
    if (pinInput.value === ADMIN_PIN) {
      pinSection.style.display = "none";
      adminSection.style.display = "block";
      loadTodayAttendance();
    } else {
      pinError.textContent = "PIN이 올바르지 않습니다.";
    }
  }

  /*****************
   * 오늘 출석 로드
   *****************/
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

  /*****************
   * History 토글
   *****************/
  const toggleBtn = document.getElementById("toggleHistory");
  const historySection = document.getElementById("historySection");
  let historyLoaded = false;

  toggleBtn.addEventListener("click", async () => {
    const open = historySection.style.display === "block";
    historySection.style.display = open ? "none" : "block";
    toggleBtn.textContent = open ? "View more ▼" : "Hide ▲";

    if (!historyLoaded) {
      await loadHistory();
      historyLoaded = true;
    }
  });

  /*****************
   * History 로드
   *****************/
  async function loadHistory() {
    const todayKey = getTodayKey();
    const container = document.getElementById("historyContainer");
    container.innerHTML = "";

    const snap = await getDocs(collection(db, "attendance"));

    const dates = snap.docs
      .map(d => d.id)
      .filter(d => d !== todayKey)
      .sort((a, b) => b.localeCompare(a));

    for (const date of dates) {
      let html = `
        <div class="history-day">
          <h4>${date}</h4>
          <table>
            <tr>
              <th>Name</th>
              <th>Check-in</th>
              <th>Check-out</th>
            </tr>
      `;

      for (const name of EMPLOYEES) {
        const ref = doc(db, "attendance", date, "users", name);
        const snap = await getDoc(ref);

        const attend = snap.exists() && snap.data().attend
          ? formatTime(snap.data().attend)
          : "-";

        const leave = snap.exists() && snap.data().leave
          ? formatTime(snap.data().leave)
          : "-";

        html += `
          <tr>
            <td>${name}</td>
            <td>${attend}</td>
            <td>${leave}</td>
          </tr>
        `;
      }

      html += "</table></div>";
      container.innerHTML += html;
    }
  }
});

