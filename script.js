import { db } from "./firebase.js";
import {
  collection, getDocs, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime() {
  const d = new Date();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const pm = h >= 12;
  h = h % 12 || 12;
  return `${pm ? "PM" : "AM"} ${h}:${m}`;
}

const tbody = document.getElementById("attendance-list");
const today = todayKey();

const empSnap = await getDocs(collection(db, "employees"));

for (const emp of empSnap.docs) {
  if (!emp.data().active) continue;

  const name = emp.id;
  const ref = doc(db, "attendance", today, "records", name);
  const snap = await getDoc(ref);
  const data = snap.exists() ? snap.data() : {};

  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${name}</td>
    <td>${data.attend ?? `<button>Attend</button>`}</td>
    <td>${data.leave ?? `<button>Leave</button>`}</td>
  `;

  tr.querySelectorAll("button").forEach(btn => {
    btn.onclick = async () => {
      const type = btn.textContent.toLowerCase();
      if (data[type]) return alert(`Already ${type}ed`);

      await setDoc(ref, { [type]: formatTime() }, { merge: true });
      location.reload();
    };
  });

  tbody.appendChild(tr);
}

