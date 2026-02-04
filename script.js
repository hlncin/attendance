// script.js
import {
  collection, doc, getDocs, getDoc,
  setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const today = new Date().toISOString().slice(0,10);
const empTable = document.getElementById("employeeTable");

async function loadEmployees() {
  empTable.innerHTML = "";
  const empSnap = await getDocs(collection(db, "employees"));

  for (const emp of empSnap.docs) {
    if (!emp.data().active) continue;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${emp.data().name}</td>
      <td><button class="attend">Attend</button></td>
      <td><button class="leave">Leave</button></td>
    `;

    row.querySelector(".attend").onclick = () => attend(emp.id);
    row.querySelector(".leave").onclick = () => leave(emp.id);

    empTable.appendChild(row);
  }
}

async function attend(empId) {
  const ref = doc(db, "attendance", today, "records", empId);
  const snap = await getDoc(ref);

  if (snap.exists() && snap.data().attendAt) {
    alert("Already attended today.");
    return;
  }

  await setDoc(ref, { attendAt: serverTimestamp(), leaveAt: null }, { merge:true });
}

async function leave(empId) {
  const ref = doc(db, "attendance", today, "records", empId);
  const snap = await getDoc(ref);

  if (!snap.exists() || !snap.data().attendAt) {
    alert("Attend first.");
    return;
  }
  if (snap.data().leaveAt) {
    alert("Already left.");
    return;
  }

  await updateDoc(ref, { leaveAt: serverTimestamp() });
}

loadEmployees();

