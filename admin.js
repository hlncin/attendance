import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

console.log("🔥 admin.js loaded (IST production)");

const ADMIN_PIN = "0317";

const EMPLOYEES = [
  "Kiran Barthwal",
  "Jeenat Khan",
  "Rohin Dixit",
  "Kamal Hassain",
  "Sundarlal",
  "Jakir Hossain",
  "Suvimal Saha",
  "Sam Lee",
];

/* ==============================
   🇮🇳 IST 유틸 (UTC+5:30)
================================ */

function getTodayKeyIST() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  const d = String(ist.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTimeIST(isoStr) {
  if (!isoStr) return "-";
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return "-";
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);
  const h = ist.getHours();
  const m = ist.getMinutes();
  const period = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${m.toString().padStart(2, "0")}`;
}

/* ==============================
   🔐 PIN
================================ */

const pinBtn     = document.getElementById("pinBtn");
const pinInput   = document.getElementById("pinInput");
const pinError   = document.getElementById("pinError");
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

/* ==============================
   📅 오늘 출석
================================ */

async function loadTodayAttendance() {
  const todayKey = getTodayKeyIST();
  document.getElementById("title").textContent =
    `Today's Attendance — ${todayKey}`;

  const tbody = document.getElementById("attendanceTable");
  tbody.innerHTML = "";

  try {
    for (const name of EMPLOYEES) {
      const ref = doc(db, "attendance", todayKey, "records", name);
      const snap = await getDoc(ref);

      const attend =
        snap.exists() && snap.data().attendAt
          ? formatTimeIST(snap.data().attendAt.toDate().toISOString())
          : "-";

      const leave =
        snap.exists() && snap.data().leaveAt
          ? formatTimeIST(snap.data().leaveAt.toDate().toISOString())
          : "-";

      tbody.innerHTML += `
        <tr>
          <td>${name}</td>
          <td>${attend}</td>
          <td>${leave}</td>
        </tr>
      `;
    }
  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="3" style="color:red;">Failed to load today's data</td></tr>`;
  }
}

console.log("✅ projectId =", db.app?.options?.projectId);

/* ==============================
   📜 History 토글
================================ */

const toggleBtn      = document.getElementById("toggleHistory");
const historySection = document.getElementById("historySection");
let historyLoaded = false;

toggleBtn.addEventListener("click", async () => {
  const open = historySection.style.display === "block";
  historySection.style.display = open ? "none" : "block";
  toggleBtn.textContent = open ? "View more ▼" : "Hide ▲";
  if (!open && !historyLoaded) {
    await loadHistory();
    historyLoaded = true;
  }
});

/* ==============================
   📜 History
================================ */

async function loadHistory() {
  const todayKey = getTodayKeyIST();
  const container = document.getElementById("historyContainer");
  container.innerHTML = "Loading...";

  try {
    const snap = await getDocs(collection(db, "attendance"));

    const dates = snap.docs
      .map((d) => d.id)
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort((a, b) => b.localeCompare(a))
      .slice(0, 30);

    if (dates.length === 0) {
      container.innerHTML = "<p>No history yet.</p>";
      return;
    }

    container.innerHTML = "";

    for (const date of dates) {
      const isToday = date === todayKey;

      let html = `
        <div class="history-day">
          <h4>${date}${isToday ? " (Today)" : ""}</h4>
          <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Attend</th><th>Leave</th></tr>
            </thead>
            <tbody>
      `;

      for (const name of EMPLOYEES) {
        const ref = doc(db, "attendance", date, "records", name);
        const snap = await getDoc(ref);

        const attend =
          snap.exists() && snap.data().attendAt
            ? formatTimeIST(snap.data().attendAt.toDate().toISOString())
            : "-";

        const leave =
          snap.exists() && snap.data().leaveAt
            ? formatTimeIST(snap.data().leaveAt.toDate().toISOString())
            : "-";

        html += `
          <tr>
            <td>${name}</td>
            <td>${attend}</td>
            <td>${leave}</td>
          </tr>
        `;
      }

      html += `</tbody></table></div></div>`;
      container.innerHTML += html;
    }
  } catch (e) {
    console.error(e);
    container.innerHTML = `<p style="color:red;">Failed to load history</p>`;
  }
}

/* ==============================
   👤 Employee Monthly View
================================ */

// 직원 드롭다운 채우기
const empSelect = document.getElementById("empSelect");
EMPLOYEES.forEach((name) => {
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  empSelect.appendChild(opt);
});

// 기본값: 현재 IST 연월
const monthInput = document.getElementById("monthInput");
(function setDefaultMonth() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, "0");
  monthInput.value = `${y}-${m}`;
})();

document.getElementById("loadEmpBtn").addEventListener("click", async () => {
  const name  = empSelect.value;
  const month = monthInput.value;
  if (!name)  return alert("직원을 선택해 주세요.");
  if (!month) return alert("월을 선택해 주세요.");
  await loadEmployeeMonth(name, month);
});

async function loadEmployeeMonth(name, month) {
  const tbody = document.getElementById("empTableBody");
  tbody.innerHTML = `<tr><td colspan="3" style="color:var(--muted);">Loading...</td></tr>`;

  const [year, mon] = month.split("-").map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate(); // 해당 월 마지막 날

  try {
    const rows = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const ref  = doc(db, "attendance", dateKey, "records", name);
      const snap = await getDoc(ref);

      if (!snap.exists()) continue;

      const attend =
        snap.data().attendAt
          ? formatTimeIST(snap.data().attendAt.toDate().toISOString())
          : "-";

      const leave =
        snap.data().leaveAt
          ? formatTimeIST(snap.data().leaveAt.toDate().toISOString())
          : "-";

      rows.push({ dateKey, attend, leave });
    }

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="color:var(--muted); text-align:center;">이 월에 기록이 없습니다.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map(
        (r) => `<tr><td>${r.dateKey}</td><td>${r.attend}</td><td>${r.leave}</td></tr>`
      )
      .join("");
  } catch (e) {
    console.error(e);
    tbody.innerHTML = `<tr><td colspan="3" style="color:red;">Failed to load</td></tr>`;
  }
}

/* ==============================
   📥 Excel Export (SheetJS)
================================ */

// 테이블 DOM → 2D 배열
function tableToAoA(tableEl) {
  const rows = [];
  for (const row of tableEl.rows) {
    const cells = [];
    for (const cell of row.cells) cells.push(cell.innerText.trim());
    rows.push(cells);
  }
  return rows;
}

function downloadExcel(aoa, filename) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, filename);
}

// Today 내보내기
document.getElementById("exportTodayBtn").addEventListener("click", () => {
  const table = document.getElementById("todayTable");
  const todayKey = getTodayKeyIST();
  const aoa = tableToAoA(table);
  if (aoa.length <= 1) return alert("데이터가 없습니다.");
  downloadExcel(aoa, `attendance_today_${todayKey}.xlsx`);
});

// History 내보내기 (로드된 데이터 전체)
document.getElementById("exportHistoryBtn").addEventListener("click", () => {
  const container = document.getElementById("historyContainer");
  const days = container.querySelectorAll(".history-day");
  if (days.length === 0) return alert("History를 먼저 열어 주세요.");

  const aoa = [];
  days.forEach((day) => {
    const h4    = day.querySelector("h4");
    const table = day.querySelector("table");
    if (!table) return;

    if (aoa.length > 0) aoa.push([]); // 날짜 사이 빈 줄
    aoa.push([h4 ? h4.innerText : ""]);
    tableToAoA(table).forEach((row) => aoa.push(row));
  });

  if (aoa.length === 0) return alert("데이터가 없습니다.");
  downloadExcel(aoa, `attendance_history.xlsx`);
});

// Employee Monthly 내보내기
document.getElementById("exportEmpBtn").addEventListener("click", () => {
  const name  = empSelect.value  || "employee";
  const month = monthInput.value || "month";
  const table = document.getElementById("empTable");
  const aoa   = tableToAoA(table);
  const hasData = aoa.some((r) => r[0] && /^\d{4}-/.test(r[0]));
  if (!hasData) return alert("먼저 Search를 눌러 데이터를 불러오세요.");
  downloadExcel(aoa, `attendance_${name}_${month}.xlsx`);
});