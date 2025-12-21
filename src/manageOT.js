// manageOT.js
import { db, ref, set, onValue } from "./firebase.js";

export function initManageOT(selectedEmployeeID, displayAttendanceFn) {
    const manageOTBtn = document.getElementById("manageOT");
    const saveOTBtn = document.getElementById("saveOTBtn");
    const otTableBody = document.getElementById("otTableBody");
    const manageOTModalEl = document.getElementById("manageOTModal");
    const manageOTModal = new bootstrap.Modal(manageOTModalEl);

    let dailyRate = 0;

    // ------------------ OPEN MODAL ------------------
    manageOTBtn.addEventListener("click", () => {
        const empID = selectedEmployeeID();
        if (!empID) {
            alert("Please select an employee first!");
            return;
        }

        otTableBody.innerHTML = "";

        // get dailyRate
        const employeeRef = ref(db, `employees/${empID}`);
        onValue(employeeRef, snap => {
            dailyRate = snap.val()?.dailyRate || 0;
        }, { onlyOnce: true });

        const attendanceRef = ref(db, `employees/${empID}/attendance`);
        onValue(attendanceRef, snapshot => {
            if (!snapshot.exists()) {
                otTableBody.innerHTML =
                    `<tr><td colspan="8" class="text-center">No attendance records</td></tr>`;
                return;
            }

            const attendanceData = snapshot.val();
            const dates = Object.keys(attendanceData).sort(
                (a, b) => new Date(b) - new Date(a)
            );

            dates.forEach(date => {
    const record = attendanceData[date];

    const timeIn = record.timeIn || "-";
    const timeOut = record.timeOut || "-";
    const otHours = Number(record.overtimeHours || record.overtime?.hours || 0);
    const regularHours = calculateHours(timeIn, timeOut);
    const hourlyRate = dailyRate / 8;
    const totalHours = regularHours + otHours;
    const totalPay = regularHours * hourlyRate + otHours * hourlyRate * 1.25;

    const tr = document.createElement("tr");
    tr.innerHTML = `
        <td>${date}</td>
        <td><input type="text" class="form-control timeInInput" value="${timeIn}"></td>
        <td><input type="text" class="form-control timeOutInput" value="${timeOut}"></td>
        <td class="regular-hours">${regularHours.toFixed(2)}</td>
        <td class="daily-rate">₱${dailyRate.toFixed(2)}</td>
        <td><input type="number" min="0" step="0.25" class="form-control otInput" value="${otHours}" data-date="${date}"></td>
        <td class="total-hours">${totalHours.toFixed(2)}</td>
        <td class="total-pay">₱${totalPay.toFixed(2)}</td>
    `;
    otTableBody.appendChild(tr);

    const timeInInput = tr.querySelector(".timeInInput");
    const timeOutInput = tr.querySelector(".timeOutInput");
    const otInput = tr.querySelector(".otInput");

    function recalc() {
        const newTimeIn = timeInInput.value;
        const newTimeOut = timeOutInput.value;
        const newRegularHours = calculateHours(newTimeIn, newTimeOut);
        const newOT = parseFloat(otInput.value) || 0;

        const newTotalHours = newRegularHours + newOT;
        const newTotalPay = newRegularHours * hourlyRate + newOT * hourlyRate * 1.25;

        // update modal table instantly
        tr.querySelector(".regular-hours").textContent = newRegularHours.toFixed(2);
        tr.querySelector(".total-hours").textContent = newTotalHours.toFixed(2);
        tr.querySelector(".total-pay").textContent = `₱${newTotalPay.toFixed(2)}`;
    }

    timeInInput.addEventListener("input", recalc);
    timeOutInput.addEventListener("input", recalc);
    otInput.addEventListener("input", recalc);
});


            manageOTModal.show();
        }, { onlyOnce: true });
    });

    // ------------------ SAVE OT HOURS ------------------
    saveOTBtn.addEventListener("click", () => {
    const empID = selectedEmployeeID();
    if (!empID) return;

    const rows = otTableBody.querySelectorAll("tr");
    rows.forEach(row => {
        const date = row.querySelector(".otInput").dataset.date;
        const newTimeIn = row.querySelector(".timeInInput").value || "-";
        const newTimeOut = row.querySelector(".timeOutInput").value || "-";
        const otHours = parseFloat(row.querySelector(".otInput").value) || 0;

        const regularHours = calculateHours(newTimeIn, newTimeOut);
        const hourlyRate = dailyRate / 8;
        const otPay = otHours * hourlyRate * 1.25;
        const totalHours = regularHours + otHours;
        const totalPay = regularHours * hourlyRate + otPay;

        const attendanceRef = ref(db, `employees/${empID}/attendance/${date}`);
        set(attendanceRef, {
            timeIn: newTimeIn,
            timeOut: newTimeOut,
            dailyRate,
            regularHours,
            overtimeHours: otHours,
            overtime: { hours: otHours, pay: otPay },
            totalHours,
            totalPay
        });

        // Update the table row immediately
        row.querySelector(".regular-hours").textContent = regularHours.toFixed(2);
        row.querySelector(".total-hours").textContent = totalHours.toFixed(2);
        row.querySelector(".total-pay").textContent = `₱${totalPay.toFixed(2)}`;
    });

    // ------------------ HIDE MODAL FIRST ------------------
    manageOTModal.hide();

    // Then refresh the main attendance table
    displayAttendanceFn(empID);

    alert("Overtime updated successfully!");
});

}

// ------------------ HELPER ------------------
function calculateHours(timeIn, timeOut) {
    if (!timeIn || !timeOut || timeIn === "-" || timeOut === "-") return 0;

    const toMinutes = t => {
        t = t.trim().toUpperCase();
        const [time, mod] = t.split(" ");
        let [h, m] = time.split(":").map(Number);

        if (mod === "PM" && h !== 12) h += 12;
        if (mod === "AM" && h === 12) h = 0;

        return h * 60 + m;
    };

    let diff = (toMinutes(timeOut) - toMinutes(timeIn)) / 60;
    diff -= 1; // lunch deduction
    return Math.max(diff, 0);
}
