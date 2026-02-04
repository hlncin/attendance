import { db, getTodayKey } from "./firebase.js";
import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/*****************
 * 관리자 PIN
 *****************/
const ADMIN_PIN = "0317";

/*****************
 * 직원 이름 리스트 (항상 고정)
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
 * PIN 체크
 *****************/
document.getElementById("pinBtn").addEventListener("click", () => {
  const input = document.getElementById("pinInput").value;

  if (input === ADMIN_PIN) {
    document.getElementById("pinSection").style.display = "none";
    document.getElementById("adminSection").style.display = "block";
    loadTodayAttendance();
  } else {
    document.getElementById("pinError").textContent = "PIN이 올바르지 않습니다.";
  }
});

/*****************
 * 오늘 출석 로드
 *****************/
async function loadTodayAttendance() {
  const todayKey = getTodayKey();

  // 제목에 오늘 날짜 표시
  const title = document.getElementById("title");
  title.textContent = `Today's Attendance (${todayKey})`;

  const table = document.getElementById("attendanceTable");
  table.innerHTML = "";

  for (const name of EMPLOYEES) {
    const docRef = doc(db, "attendance", todayKey, "users", name);
    const snapshot = await getDoc(docRef);

    const attend =
      snapshot.exists() && snapshot.data().attend
        ? snapshot.data().attend
        : "-";
    const leave =
      snapshot.exists() && snapshot.data().leave
        ? snapshot.data().leave
        : "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${name}</td><td>${attend}</td><td>${leave}</td>`;
    table.appendChild(tr);
  }
}

/*****************
 * History 토글
 *****************/
const toggleBtn = document.getElementById("toggleHistory");
const historySection = document.getElementById("historySection");

let historyLoaded = false;

toggleBtn.addEventListener("click", async () => {
  const isOpen = historySection.style.display === "block";

  historySection.style.display = isOpen ? "none" : "block";
  toggleBtn.textContent = isOpen ? "View more ▼" : "Hide ▲";

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
  const historyContainer = document.getElementById("historyContainer");
  historyContainer.innerHTML = "";

  const attendanceRef = collection(db, "attendance");
  const snapshot = await getDocs(attendanceRef);

  snapshot.docs
    .map(doc => doc.id)
    .filter(date => date !== todayKey)
    .sort((a, b) => b.localeCompare(a))
    .forEach(async date => {
      const dayBlock = document.createElement("div");
      dayBlock.className = "history-day";
      dayBlock.innerHTML = `<h4>${date}</h4>`;

      for (const name of EMPLOYEES) {
        const userRef = doc(db, "attendance", date, "users", name);
        const userSnap = await getDoc(userRef);

        const attend =
          userSnap.exists() && userSnap.data().attend
            ? userSnap.data().attend
            : "-";
        const leave =
          userSnap.exists() && userSnap.data().leave
            ? userSnap.data().leave
            : "-";

        const row = document.createElement("div");
        row.className = "row";
        row.innerHTML = `<span>${name}</span><span>${attend}</span><span>${leave}</span>`;
        dayBlock.appendChild(row);
      }

      historyContainer.appendChild(dayBlock);
    });
}

