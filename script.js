// 오늘 날짜 표시
const today = new Date();
document.getElementById("date").innerText =
    today.getFullYear() + "년 " +
    (today.getMonth() + 1) + "월 " +
    today.getDate() + "일";

// 출근
function clockIn() {
    const now = new Date();
    localStorage.setItem("inTime", now.getTime());
    document.getElementById("inTime").innerText = formatTime(now);
}

// 퇴근
function clockOut() {
    const now = new Date();
    localStorage.setItem("outTime", now.getTime());
    document.getElementById("outTime").innerText = formatTime(now);

    calculateWorkTime();
}

// 근무 시간 계산
function calculateWorkTime() {
    const inTime = localStorage.getItem("inTime");
    const outTime = localStorage.getItem("outTime");

    if (!inTime || !outTime) return;

    const diff = outTime - inTime;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);

    document.getElementById("workTime").innerText =
        hours + "시간 " + minutes + "분";
}

// 시간 포맷
function formatTime(date) {
    return date.getHours().toString().padStart(2, "0") + ":" +
           date.getMinutes().toString().padStart(2, "0");
}

// 새로고침해도 유지
window.onload = function () {
    const inTime = localStorage.getItem("inTime");
    const outTime = localStorage.getItem("outTime");

    if (inTime) {
        document.getElementById("inTime").innerText =
            formatTime(new Date(Number(inTime)));
    }

    if (outTime) {
        document.getElementById("outTime").innerText =
            formatTime(new Date(Number(outTime)));
        calculateWorkTime();
    }
};
