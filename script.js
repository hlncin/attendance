import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const employees = [
  "Kiran Barthwal",
  "Jeenat Khan",
  "Rohin Dixit",
  "Kamal Hassain",
  "Sudarla",
  "Jakir",
  "Sam Lee",
];

const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

const select = document.getElementById("employeeSelect");
const attendBtn = document.getElementById("attendBtn");
const leaveBtn = document.getElementById("leaveBtn");

employees.forEach((name) => {
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  select.appendChild(opt);
});

// ✅ 날짜(부모) 문서를 "실제로 존재"하게 만드는 함수
async function ensureDayDocExists(dateKey) {
  const dayRef = doc(db, "attendance", dateKey);
  await setDoc(
    dayRef,
    {
      date: dateKey,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

attendBtn.onclick = async () => {
  const name = select.value;
  if (!name) return alert("Select your name");

  // ✅ 먼저 날짜 문서를 생성/갱신 (History에서 날짜 목록이 보이게 됨)
  await ensureDayDocExists(today);

  const ref = doc(db, "attendance", today, "records", name);
  const snap = await getDoc(ref);

  if (snap.exists() && snap.data().attendAt) {
    alert("Already attended today");
    return;
  }

  await setDoc(
    ref,
    {
      attendAt: serverTimestamp(),
      leaveAt: null,
    },
    { merge: true }
  );

  // ✅ 날짜 문서 updatedAt 갱신 (선택 사항이지만 좋음)
  await ensureDayDocExists(today);

  alert("Attendance recorded");
};

leaveBtn.onclick = async () => {
  const name = select.value;
  if (!name) return alert("Select your name");

  // ✅ 퇴근도 동일하게 날짜 문서 보장
  await ensureDayDocExists(today);

  const ref = doc(db, "attendance", today, "records", name);
  const snap = await getDoc(ref);

  if (!snap.exists() || !snap.data().attendAt) {
    alert("Attend first");
    return;
  }

  if (snap.data().leaveAt) {
    alert("Already left");
    return;
  }

  await updateDoc(ref, {
    leaveAt: serverTimestamp(),
  });

  // ✅ 날짜 문서 updatedAt 갱신
  await ensureDayDocExists(today);

  alert("Leave recorded");
};
