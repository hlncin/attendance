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
   Employees
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
   IST Date Utility (UTC+5:30)
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
  await setDoc(dayRef, { date: dateKey, updatedAt: serverTimestamp() }, { merge: true });
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

  if (!isAttendance) holidayRenderAll();
}

$navAttendance?.addEventListener("click", () => setActiveView("attendance"));
$navHoliday?.addEventListener("click", () => setActiveView("holiday"));
setActiveView(localStorage.getItem(STORAGE_VIEW_KEY) || "attendance");

/* ==============================
   Attendance
================================ */
const select = document.getElementById("employeeSelect");
const attendBtn = document.getElementById("attendBtn");
const leaveBtn = document.getElementById("leaveBtn");

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
   Holiday (List + Month Calendar)
   HTML IDs match your index.html exactly:
   hyYear, hyMonth, hyPrevYear, hyNextYear, hyThisYear,
   holidayTitle, holidayListTitle, holidayList, monthCalendar
================================ */
const $holidayTitle = document.getElementById("holidayTitle");
const $holidayListTitle = document.getElementById("holidayListTitle");
const $holidayList = document.getElementById("holidayList");
const $monthCalendar = document.getElementById("monthCalendar");

const $hyYear = document.getElementById("hyYear");
const $hyMonth = document.getElementById("hyMonth");
const $hyPrevYear = document.getElementById("hyPrevYear");
const $hyNextYear = document.getElementById("hyNextYear");
const $hyThisYear = document.getElementById("hyThisYear");

const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const weekday = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

let holidayByDate = new Map(); // "YYYY-MM-DD" -> [{name,date,year}]

function initHolidayDefaults() {
  if (!$hyYear || !$hyMonth) return;
  const now = new Date();
  $hyYear.value = String(now.getFullYear());
  $hyMonth.value = String(now.getMonth() + 1);
}
initHolidayDefaults();

/* controls */
$hyYear?.addEventListener("change", () => holidayRenderAll());
$hyMonth?.addEventListener("change", () => {
  renderMonthCalendar(Number($hyYear.value), Number($hyMonth.value));
});

$hyPrevYear?.addEventListener("click", () => {
  $hyYear.value = String(Number($hyYear.value) - 1);
  holidayRenderAll();
});
$hyNextYear?.addEventListener("click", () => {
  $hyYear.value = String(Number($hyYear.value) + 1);
  holidayRenderAll();
});
$hyThisYear?.addEventListener("click", () => {
  $hyYear.value = String(new Date().getFullYear());
  holidayRenderAll();
});

/* data */
async function loadHolidaysForYear(yearNum) {
  const qy = query(
    collection(db, "holidays"),
    where("year", "==", Number(yearNum)),
    orderBy("date", "asc")
  );

  const snap = await getDocs(qy);
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
  if (!$hyYear || !$hyMonth) return;

  const yearNum = Number($hyYear.value);
  const monthNum = Number($hyMonth.value);
  if (!Number.isFinite(yearNum) || !Number.isFinite(monthNum)) return;

  if ($holidayTitle) $holidayTitle.textContent = "Holidays";
  if ($holidayListTitle) $holidayListTitle.textContent = `Holidays for ${yearNum}`;

  try {
    holidayByDate = await loadHolidaysForYear(yearNum);
  } catch (e) {
    console.error(e);
    holidayByDate = new Map();
  }

  renderHolidayList(yearNum);
  renderMonthCalendar(yearNum, monthNum);
}

function renderHolidayList(yearNum) {
  if (!$holidayList) return;

  const items = [];
  for (const [date, arr] of holidayByDate.entries()) {
    for (const h of arr) items.push(h);
  }
  items.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

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

function renderMonthCalendar(year, monthNumber) {
  if (!$monthCalendar) return;

  const mIndex = monthNumber - 1;
  if (mIndex < 0 || mIndex > 11) return;

  const first = new Date(year, mIndex, 1);
  const last = new Date(year, mIndex + 1, 0);
  const daysInMonth = last.getDate();
  const startDow = first.getDay();
  const prevLastDate = new Date(year, mIndex, 0).getDate();

  const monthPrefix = `${year}-${String(monthNumber).padStart(2, "0")}-`;

  // 이번 달 공휴일만 set
  const holidayDatesInMonth = new Set();
  for (const d of holidayByDate.keys()) {
    if (d.startsWith(monthPrefix)) holidayDatesInMonth.add(d);
  }

  $monthCalendar.innerHTML = `
    <div class="month-head">
      <h4>${monthNames[mIndex]} ${year}</h4>
      <div class="sub">${holidayDatesInMonth.size} holiday date(s)</div>
    </div>
    <div class="weekdays">${weekday.map(d => `<div>${d}</div>`).join("")}</div>
    <div class="days" id="daysGrid"></div>
  `;

  const daysWrap = $monthCalendar.querySelector("#daysGrid");

  // 6 weeks fixed
  for (let cell = 0; cell < 42; cell++) {
    const dayNum = cell - startDow + 1;
    const dayEl = document.createElement("div");
    dayEl.className = "day";

    let displayNum, dateObj, muted = false;

    if (dayNum <= 0) {
      displayNum = prevLastDate + dayNum;
      dateObj = new Date(year, mIndex - 1, displayNum);
      muted = true;
    } else if (dayNum > daysInMonth) {
      displayNum = dayNum - daysInMonth;
      dateObj = new Date(year, mIndex + 1, displayNum);
      muted = true;
    } else {
      displayNum = dayNum;
      dateObj = new Date(year, mIndex, displayNum);
    }

    const dow = dateObj.getDay();
    if (muted) dayEl.classList.add("muted");
    if (dow === 0 || dow === 6) dayEl.classList.add("weekend");

    const iso = toISO(dateObj);

    // ✅ 공휴일 하이라이트(폰트 빨강은 style.css의 .day.holiday에서 처리)
    if (!muted && holidayDatesInMonth.has(iso)) {
      dayEl.classList.add("holiday");
      const names = (holidayByDate.get(iso) || []).map(x => x.name).filter(Boolean);
      if (names.length) dayEl.title = names.join(" / ");
    }

    dayEl.textContent = String(displayNum);
    daysWrap.appendChild(dayEl);
  }
}

/* helpers */
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
