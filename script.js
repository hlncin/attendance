// script.js
import { db, getTodayKey } from "./firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.checkIn = async function() {
  const name = document.getElementById("nameSelect").value;
  if (!name) { alert("Please select your name."); return; }

  const todayKey = getTodayKey();
  const docRef = doc(db, "attendance", todayKey, "users", name);
  const snapshot = await getDoc(docRef);

  if (snapshot.exists()) {
    alert("You have already checked in today.");
    return;
  }

  await setDoc(docRef, {
    name: name,
    checkedAt: serverTimestamp(),
    checkOut: "" // 초기값
  });

  alert("Check-in completed!");
};

window.checkOut = async function() {
  const name = document.getElementById("nameSelect").value;
  if (!name) { alert("Please select your name."); return; }

  const todayKey = getTodayKey();
  const docRef = doc(db, "attendance", todayKey, "users", name);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) {
    alert("No check-in record found today.");
    return;
  }

  await setDoc(docRef, { checkOut: new Date().toLocaleTimeString() }, { merge: true });
  alert("Check-out recorded!");
};

