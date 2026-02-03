import { db, getTodayKey } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 직원 이름 리스트 (항상 고정)
const EMPLOYEES = [
  "Jakir",
  "Jeenat Khan",
  "Kamal Hassain",
  "Kiran Barthwal",
  "Robin Dixit",
  "Sam Lee",
  "Sudarla"
];

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

    const attend = snapshot.exists() && snapshot.data().attend ? snapshot.data().attend : "-";
    const leave = snapshot.exists() && snapshot.data().leave ? snapshot.data().leave : "-";

    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${name}</td><td>${attend}</td><td>${leave}</td>`;
    table.appendChild(tr);
  }
}

loadTodayAttendance();

