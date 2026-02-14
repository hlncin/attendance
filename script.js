import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ==============================
   Employees (existing)
================================ */
const employees = [
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
   🇮🇳 IST 날짜키 유틸 (UTC+5:30)
================================ */
function getTodayKeyIST() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 5.5 * 60 * 60 * 1000);
  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, "0");
  const dd = String(ist.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function confirmSelectedName(action, name) {
  return window.confirm(
    `Is this you?\nSelected name: "${name}"\n\nPress OK to ${action}, or Cancel to go back.`
  );
}

async function ensureDayDocExists(dateKey) {
  const dayRef = doc(db, "attendance", dateKey);
  await setDoc(
    dayRef,
    { date: dateKey, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/* ==============================
   Sidebar + View Switch
================================ */
const STORAGE_VIEW_KEY = "main_active_view_v1";

const $sidebar = document.getElementById("sidebar");
const $sidebarToggle = document.getElementById("sidebarToggle");
const $navAttendance = document.getElementById("navAttendance");
const $navHoliday = document.getElementById("navHoliday");

const $viewAttendance = document.getElementById("viewAttendance");
const $viewHoliday = document.getElementById("viewHoliday");
const $pageTitle = document.getElementById("pageTitle");

const $todayKeyBadge = document.getElementById("todayKeyBadge");
if ($todayKeyBadge) $todayKeyBadge.textContent = `Today (IST): ${getTodayKeyIST()}`;

$sidebarToggle?.addEventListener("click", () => {
  $sidebar.classList.toggle("is-collapsed");
});

function setActiveView(view) {
  const isAttendance = view === "attendance";
  $viewAttendance.classList.toggle("is-active", isAttendance);
  $viewHoliday.classList.toggle("is-active", !isAttendance);

  $navAttendance.classList.toggle("is-active", isAttendance);
  $navHoliday.classList.toggle("is-active", !isAttendance);

  $pageTitle.textContent = isAttendance ? "Attendance" : "Holiday";
  localStorage.setItem(STORAGE_VIEW_KEY, view);

  if (!isAttendance) holidayRenderAll(); // Holiday 화면 들어갈 때 최신 반영
}

$navAttendance?.addEventListener("click", () => setActiveView("attendance"));
$navHoliday?.addEventListener("click", () => setActiveView("holiday"));

setActiveView(localStorage.getItem(STORAGE_VIEW_KEY) || "attendance");

/* ==============================
   Attendance UI
================================ */
const select = document.getElementById("employeeSelect");
const attendBtn = document.getElementById("attendBtn");
const leaveBtn = document.getElementById("leaveBtn");

// 드롭다운 채우기
employees.forEach((name) => {
  const opt = document.createElement("option");
  opt.value = name;
  opt.textContent = name;
  select.appendChild(opt);
});

/* Attend */
attendBtn.onclick = async () => {
  const name = select.value;
  if (!name) return alert("Select your name");
  if (!confirmSelectedName("Attend", name)) return;

  const todayKey = getTodayKeyIST();
  await ensureDayDocExists(todayKey);

  const ref = doc(db, "attendance", todayKey, "records", name);
  const snap = await getDoc(ref);

  if (snap.exists() && snap.data().attendAt) {
    alert("Already attended today");
    return;
  }

  await setDoc(ref, { attendAt: serverTimestamp(), leaveAt: null }, { merge: true });
  await ensureDayDocExists(todayKey);
  alert("Attendance recorded");
};

/* Leave */
leaveBtn.onclick = async () => {
  const name = select.value;
  if (!name) return alert("Select your name");
  if (!confirmSelectedName("Leave", name)) return;

  const todayKey = getTodayKeyIST();
  await ensureDayDocExists(todayKey);

  const ref = doc(db, "attendance", todayKey, "records", name);
  const snap = await getDoc(ref);

  if (!snap.exists() || !snap.data().attendAt) {
    alert("Attend first");
    return;
  }
  if (snap.data().leaveAt) {
    alert("Already left");
    return;
  }

  await updateDoc(ref, { leaveAt: serverTimestamp() });
  await ensureDayDocExists(todayKey);
  alert("Leave recorded");
};

/* ==============================
   Holiday Calendar (Admin-added only)
   Firestore: collection "holidays"
   doc fields: { name, date:"YYYY-MM-DD", year:Number }
================================ */
const $hybYear = document.getElementById("hybYear");
const $hybPrev = document.getElementById("hybPrev");
const $hybNext = document.getElementById("hybNext");
const $hybThisYear = document.getElementById("hybThisYear");

const $holidayList = document.getElementById("holidayList");
const $hybYearGrid = document.getElementById("hybYearGrid");

const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const weekday = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

let holidayByDate = new Map(); // date -> [{name,date,year},...]

function holidayInit() {
  if (!$hybYear) return;
  $hybYear.value = String(new Date().getFullYear());
}
holidayInit();

$hybYear?.addEventListener("change", holidayRenderAll);
$hybPrev?.addEventListener("click", () => {
  $hybYear.value = String(Number($hybYear.value) - 1);
  holidayRenderAll();
});
$hybNext?.addEventListener("click", () => {
  $hybYear.value = String(Number($hybYear.value) + 1);
  holidayRenderAll();
});
$hybThisYear?.addEventListener("click", () => {
  $hybYear.value = String(new Date().getFullYear());
  holidayRenderAll();
});

async function loadHolidaysForYear(yearNum) {
  // year 필드가 있는 구조를 전제로 함 (admin이 저장할 때 year도 넣어야 함)
  const q = query(
    collection(db, "holidays"),
    where("year", "==", Number(yearNum)),
    orderBy("date", "asc")
  );

  const snap = await getDocs(q);
  const map = new Map();

  snap.forEach((d) => {
    const data = d.data();
    if (!data?.date) return;
    const arr = map.get(data.date) || [];
    arr.push({ name: data.name || "Holiday", date: data.date, year: data.year });
    map.set(data.date, arr);
  });

  return map;
}

async function holidayRenderAll() {
  if (!$hybYear || !$hybYearGrid || !$holidayList) return;

  const yearNum = Number($hybYear.value);

  // 1) Firestore에서 관리자 추가 공휴일 불러오기
  try {
    $holidayList.innerHTML = `<div class="muted">Loading...</div>`;
    holidayByDate = await loadHolidaysForYear(yearNum);
  } catch (e) {
    console.error(e);
    $holidayList.innerHTML = `<div class="muted" style="color:#ffb4b4;">Failed to load holidays</div>`;
    holidayByDate = new Map();
  }

  // 2) 오른쪽 리스트 렌더
  renderHolidayList(yearNum);

  // 3) 연간 캘린더 렌더 (1~12월 한 페이지)
  renderYearCalendar(yearNum);
}

function renderHolidayList(yearNum) {
  const items = [];
  for (const [date, arr] of holidayByDate.entries()) {
    for (const h of arr) items.push(h);
  }
  items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  if (!items.length) {
    $holidayList.innerHTML = `<div class="muted">No holidays for ${yearNum}</div>`;
    return;
  }

  $holidayList.innerHTML = "";
  for (const h of items) {
    const el = document.createElement("div");
    el.className = "holiday-item";
    el.innerHTML = `
      <div class="name">${escapeHtml(h.name)}</div>
      <div class="date">${escapeHtml(h.date)}</div>
    `;
    $holidayList.appendChild(el);
  }
}

function renderYearCalendar(yearNum) {
  $hybYearGrid.innerHTML = "";

  const holidayDates = new Set(holidayByDate.keys()); // "YYYY-MM-DD"

  for (let m = 0; m < 12; m++) {
    $hybYearGrid.appendChild(buildMonth(yearNum, m, holidayDates));
  }
}

function buildMonth(year, monthIndex, holidayDates) {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const daysInMonth = last.getDate();
  const startDow = first.getDay();
  const prevLastDate = new Date(year, monthIndex, 0).getDate();

  const card = document.createElement("div");
  card.className = "month";
  card.innerHTML = `
    <h4>${monthNames[monthIndex]} <span>${year}</span></h4>
    <div class="weekdays">${weekday.map(d => `<div>${d}</div>`).join("")}</div>
    <div class="days"></div>
  `;

  const daysWrap = card.querySelector(".days");

  for (let cell = 0; cell < 42; cell++) {
    const dayNum = cell - startDow + 1;
    const dayEl = document.createElement("div");
    dayEl.className = "day";

    let displayNum, dateObj, muted = false;

    if (dayNum <= 0) {
      displayNum = prevLastDate + dayNum;
      dateObj = new Date(year, monthIndex - 1, displayNum);
      muted = true;
    } else if (dayNum > daysInMonth) {
      displayNum = dayNum - daysInMonth;
      dateObj = new Date(year, monthIndex + 1, displayNum);
      muted = true;
    } else {
      displayNum = dayNum;
      dateObj = new Date(year, monthIndex, displayNum);
    }

    const dow = dateObj.getDay();
    if (muted) dayEl.classList.add("muted");
    if (dow === 0 || dow === 6) dayEl.classList.add("weekend");

    const iso = toISO(dateObj);

    // ✅ 관리자 추가 공휴일만 하이라이트 (현재 달 셀만)
    if (!muted && holidayDates.has(iso)) {
      dayEl.classList.add("holiday");

      // tooltip(title)에 공휴일 이름 표시
      const names = (holidayByDate.get(iso) || []).map(x => x.name).filter(Boolean);
      if (names.length) dayEl.title = names.join(" / ");
    }

    dayEl.textContent = String(displayNum);
    daysWrap.appendChild(dayEl);
  }

  return card;
}

function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
