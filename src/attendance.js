import { db, ref, set } from "./firebase.js";

const empID = localStorage.getItem("selectedEmployeeID");

if (!empID) {
    alert("No employee selected");
    window.location.href = "index.html";
}

document.getElementById("saveAttendance").addEventListener("click", () => {
    const date = document.getElementById("attendanceDate").value;

    set(ref(db, `attendance/${empID}/${date}`), {
    overtime: document.getElementById("ot").checked,
    nightDiff: document.getElementById("nd").checked,
    holiday: document.getElementById("holiday").checked
    });

    alert("Attendance saved");
});
