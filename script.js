console.log("NEW script.js loaded");

const firebaseConfig = {
  apiKey: "AIzaSyBDmKX2EzmZQYtLhGWHPhrNiAbYMQpsEPI",
  authDomain: "attendance-app-4cc52.firebaseapp.com",
  projectId: "attendance-app-4cc52",
  storageBucket: "attendance-app-4cc52.firebasestorage.app",
  messagingSenderId: "862990205208",
  appId: "1:862990205208:web:f6caa206cd05c86a8a9e6d"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const today = new Date().toISOString().split("T")[0];

// ✅ 출근 (하루 1번 제한)
function checkIn() {
  const name = document.getElementById("nameSelect").value;
  if (!name) {
    alert("Please select a name");
    return;
  }

  db.collection("attendance")
    .where("name", "==", name)
    .where("date", "==", today)
    .get()
    .then(snapshot => {
      if (!snapshot.empty) {
        alert("You already checked in today");
        return;
      }

      db.collection("attendance").add({
        name: name,
        date: today,
        checkIn: new Date().toLocaleTimeString(),
        checkOut: ""
      });

      alert("Check-in recorded");
    });
}

// ✅ 퇴근 (출근 기록이 있을 때만)
function checkOut() {
  const name = document.getElementById("nameSelect").value;
  if (!name) {
    alert("Please select a name");
    return;
  }

  db.collection("attendance")
    .where("name", "==", name)
    .where("date", "==", today)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        alert("No check-in record found today");
        return;
      }

      snapshot.forEach(doc => {
        db.collection("attendance").doc(doc.id).update({
          checkOut: new Date().toLocaleTimeString()
        });
      });

      alert("Check-out recorded");
    });
}

