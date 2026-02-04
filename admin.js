// admin.js
import {
    collection, doc, getDocs,
    addDoc, updateDoc, serverTimestamp
  } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
  
  const today = new Date().toISOString().slice(0,10);
  
  async function loadToday() {
    const box = document.getElementById("today");
    box.innerHTML = `<h2>Today (${today})</h2>`;
  
    const snap = await getDocs(collection(db,"attendance",today,"records"));
    snap.forEach(d=>{
      const r = d.data();
      box.innerHTML += `
        <p>${d.id} |
        Attend: ${r.attendAt ? r.attendAt.toDate().toLocaleTimeString() : "-"}
        Leave: ${r.leaveAt ? r.leaveAt.toDate().toLocaleTimeString() : "-"}</p>`;
    });
  }
  
  async function loadHistory() {
    const box = document.getElementById("history");
    box.innerHTML = "<h2>History</h2>";
    const snap = await getDocs(collection(db,"attendance"));
    snap.forEach(d=>{
      box.innerHTML += `<p>📅 ${d.id}</p>`;
    });
  }
  
  async function loadStaff() {
    const box = document.getElementById("staff");
    box.innerHTML = `
      <h2>Staff</h2>
      <input id="newName" placeholder="Name">
      <button onclick="add()">Add</button>
      <div id="list"></div>
    `;
  
    const list = document.getElementById("list");
    const snap = await getDocs(collection(db,"employees"));
  
    snap.forEach(d=>{
      if(!d.data().active) return;
      list.innerHTML += `
        <p>${d.data().name}
        <button onclick="remove('${d.id}')">Remove</button></p>`;
    });
  }
  
  window.add = async ()=>{
    const name = document.getElementById("newName").value;
    await addDoc(collection(db,"employees"),{ name, active:true });
    loadStaff();
  }
  
  window.remove = async (id)=>{
    await updateDoc(doc(db,"employees",id),{ active:false });
    loadStaff();
  }
  
  loadToday(); loadHistory(); loadStaff();
  
  