import { db, ref, set, onValue, remove, update, get } from "./firebase.js";
import { initManageOT } from "./manageOT.js";


document.addEventListener("DOMContentLoaded", () => {
    const employeeListEl = document.getElementById("employeeList");
    const searchInput = document.getElementById("employeeSearch");
    const filterSelect = document.getElementById("departmentFilter");

    const empID = document.getElementById("empID");
    const empName = document.getElementById("empName");
    const empPosition = document.getElementById("empPosition");
    const basicPay = document.getElementById("basicPay");
    const empFirstName = document.getElementById("empFirstName");
    const empLastName = document.getElementById("empLastName");
    const empDepartment = document.getElementById("empDepartment");
    const modalTitle = document.getElementById("modalTitle");
    const saveBtn = document.getElementById("saveEmployeeBtn");
    const employeeModal = new bootstrap.Modal(document.getElementById("employeeModal"));

    const employeesRef = ref(db, "employees/");
    let editingEmployeeID = null;
    let selectedEmployeeID = null;

    // ------------------ FILTER FUNCTION ------------------
    function applyFilter() {
        const selectedDept = filterSelect.value.toLowerCase();
        const searchTerm = searchInput.value.trim().toLowerCase();
        let anyVisible = false;

        document.querySelectorAll(".employee-item").forEach(item => {
            const empDept = item.dataset.department.toLowerCase();
            const empNameText = item.dataset.name.toLowerCase();
            const show = (selectedDept === "all" || empDept === selectedDept) && empNameText.includes(searchTerm);
            item.classList.toggle("d-none", !show);
            if (show) anyVisible = true;
        });

        const noItem = document.getElementById("noEmployees");
        if (!anyVisible) {
            if (!noItem) {
                const li = document.createElement("li");
                li.id = "noEmployees";
                li.className = "list-group-item text-muted";
                li.textContent = "No employees found";
                employeeListEl.appendChild(li);
            }
        } else if (noItem) {
            noItem.remove();
        }
    }

    // ------------------ LOAD EMPLOYEES ------------------
    function loadEmployees() {
        onValue(employeesRef, snapshot => {
            employeeListEl.innerHTML = "";
            const departments = new Set();

            if (!snapshot.exists()) {
                employeeListEl.innerHTML = '<li class="list-group-item text-muted">No employees yet</li>';
                filterSelect.innerHTML = '<option value="all">All Departments</option>';
                return;
            }

            snapshot.forEach(childSnap => {
                const data = childSnap.val();
                departments.add(data.department);

                const li = document.createElement("li");
                li.className = "list-group-item d-flex justify-content-between align-items-center employee-item";
                li.dataset.name = `${data.firstName} ${data.lastName}`;
                li.dataset.department = data.department;
                li.style.cursor = "pointer";

                const nameSpan = document.createElement("span");
                nameSpan.textContent = `${data.firstName} ${data.lastName} (${data.department})`;
                nameSpan.style.flexGrow = "1";
                li.appendChild(nameSpan);

                // ------------------ CLICK TO SELECT ------------------
                nameSpan.addEventListener("click", () => {
                    document.querySelectorAll(".employee-item").forEach(i => i.classList.remove("active"));
                    li.classList.add("active");

                    selectedEmployeeID = childSnap.key;
                    localStorage.setItem("selectedEmployeeID", selectedEmployeeID); // optional, if you want persistence

                    // Update summary
                    empName.textContent = `${data.firstName} ${data.lastName}`;
                    empPosition.textContent = data.department;

                    // Display all attendance
                    displayAttendance(selectedEmployeeID, data.dailyRate);
                });

                // ------------------ EDIT BUTTON ------------------
                const btnContainer = document.createElement("div");

                const editBtn = document.createElement("button");
                editBtn.className = "btn btn-sm btn-warning me-2";
                editBtn.textContent = "Edit";
                editBtn.addEventListener("click", e => {
                    e.stopPropagation();
                    editingEmployeeID = childSnap.key;
                    modalTitle.textContent = "Update Employee";
                    empID.value = childSnap.key;
                    empID.disabled = true;
                    empFirstName.value = data.firstName;
                    empLastName.value = data.lastName;
                    empDepartment.value = data.department;
                    employeeModal.show();
                });

                // ------------------ DELETE BUTTON ------------------
                const deleteBtn = document.createElement("button");
                deleteBtn.className = "btn btn-sm btn-danger";
                deleteBtn.textContent = "Delete";
                deleteBtn.addEventListener("click", e => {
                    e.stopPropagation();
                    if (confirm(`Delete ${data.firstName} ${data.lastName}?`)) {
                        remove(ref(db, `employees/${childSnap.key}`)).catch(err => console.error(err));
                    }
                });

                btnContainer.appendChild(editBtn);
                btnContainer.appendChild(deleteBtn);
                li.appendChild(btnContainer);

                employeeListEl.appendChild(li);
            });

            // Populate department filter
            filterSelect.innerHTML = '<option value="all">All Departments</option>';
            [...departments].sort().forEach(d => {
                const option = document.createElement("option");
                option.value = d;
                option.textContent = d;
                filterSelect.appendChild(option);
            });

            applyFilter();
        });
    }

    loadEmployees();

    // ------------------ FILTER EVENTS ------------------
    filterSelect.addEventListener("change", applyFilter);
    searchInput.addEventListener("input", applyFilter);

        // ------------------ SAVE / UPDATE EMPLOYEE ------------------
        saveBtn.addEventListener("click", async () => {
    const employeeID = empID.value.trim();
    const firstName = empFirstName.value.trim();
    const lastName = empLastName.value.trim();
    const department = empDepartment.value;
    const empDailyRate = document.getElementById("empDailyRate");
    const dailyRateValue = parseFloat(empDailyRate?.value) || 0;

    if (!employeeID || !firstName || !lastName || !department) {
        alert("Please fill all fields!");
        return;
    }

    const employeeRef = ref(db, `employees/${employeeID}`);

    try {
        if (!editingEmployeeID) {
            // ---------- ADD NEW EMPLOYEE ----------
            const today = new Date().toISOString().split("T")[0];
            await set(employeeRef, {
                firstName,
                lastName,
                department,
                dailyRate: dailyRateValue,
                attendance: {
                    [today]: { timeIn: "", timeOut: "" }
                }
            });
            alert("Employee added!");
        } else {
            // ---------- UPDATE EXISTING EMPLOYEE ----------
            await update(employeeRef, {
                firstName,
                lastName,
                department,
                dailyRate: dailyRateValue
            });
            alert("Employee updated!");
        }

        // Reset form
        empID.value = "";
        empID.disabled = false;
        empFirstName.value = "";
        empLastName.value = "";
        empDepartment.value = "";
        editingEmployeeID = null;
        modalTitle.textContent = "Add Employee";
        employeeModal.hide();

        // ------------------ REFRESH EMPLOYEE LIST ------------------
        loadEmployees();

        // Automatically select the saved employee
        selectedEmployeeID = employeeID;
        localStorage.setItem("selectedEmployeeID", selectedEmployeeID);

        // Display employee summary and attendance
        const snapshot = await get(employeeRef);
            const empData = snapshot.val();
            if (empData) {
                empName.textContent = `${empData.firstName} ${empData.lastName}`;
                empPosition.textContent = empData.department;
                displayAttendance(selectedEmployeeID, empData.dailyRate);
            }

    } catch (err) {
        console.error("Failed to save employee:", err);
        alert("Failed to save employee. Check console for details.");
    }
});


    // ------------------ SELECT2 (optional) ------------------
    if (window.jQuery) {
        $(filterSelect).select2({ placeholder: "Filter by department", allowClear: true, width: '100%' });
        $(filterSelect).on('change', applyFilter);
    }

    // ------------------ ATTENDANCE DISPLAY ------------------
    function displayAttendance(employeeId, dailyRate) {
    const attList = document.getElementById("attendanceList");
    attList.innerHTML = ""; // clear previous

    const attendanceRef = ref(db, `employees/${employeeId}/attendance`);
    onValue(attendanceRef, snapshot => {
        const data = snapshot.val();
        if (!data) {
            attList.innerHTML = "<p class='text-center text-muted'>No attendance records</p>";
            return;
        }

        // Sort dates descending (latest first)
        const sortedDates = Object.keys(data).sort((a, b) => new Date(b) - new Date(a));

        sortedDates.forEach(date => {
            const record = data[date];
            const timeIn = record.timeIn || "-";
            const timeOut = record.timeOut || "-";
            const hoursWorked = calculateHours(timeIn, timeOut);
            
            // Get overtime hours stored in attendance (default 0)
            const overtimeHours = record.overtimeHours || 0;

            let regularPay = 0, otPay = 0, subtotal = "-";
            if (hoursWorked !== "-" && dailyRate) {
                const hourlyRate = parseFloat(dailyRate) / 8; // 8-hour workday
                regularPay = parseFloat(hoursWorked) * hourlyRate;
                // Overtime rate in PH = 25% of hourly rate per hour (regular day)
                const otRate = hourlyRate * 1.25;
                otPay = parseFloat(overtimeHours) * hourlyRate * 1.25; // PH OT = 125% per hour
                subtotal = (regularPay + otPay).toFixed(2);
            }

            const row = document.createElement("div");
            row.classList.add("row", "text-center", "mb-2");
            row.innerHTML = `
                <div class="col">${date}</div>
                <div class="col">${timeIn}</div>
                <div class="col">${timeOut}</div>
                <div class="col">${hoursWorked}</div>
                <div class="col">₱${parseFloat(dailyRate).toFixed(2)}</div>
                <div class="col">${overtimeHours}</div>
                <div class="col">₱${subtotal}</div>
            `;
            attList.appendChild(row);
        });
    });
}


    // ------------------ HOURS CALCULATION ------------------
    function calculateHours(timeIn, timeOut) {
        if (!timeIn || !timeOut) return "-";

        function parseTime(timeStr) {
            const ampmMatch = timeStr.match(/(AM|PM)/i);
            if (ampmMatch) {
                const [time, modifier] = timeStr.split(' ');
                let [hours, minutes] = time.split(':').map(Number);
                if (modifier.toUpperCase() === 'PM' && hours !== 12) hours += 12;
                if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0;
                return { hours, minutes };
            } else {
                const [hours, minutes] = timeStr.split(':').map(Number);
                return { hours, minutes };
            }
        }

        const tIn = parseTime(timeIn);
        const tOut = parseTime(timeOut);

        const dIn = new Date(1970, 0, 1, tIn.hours, tIn.minutes);
        const dOut = new Date(1970, 0, 1, tOut.hours, tOut.minutes);

        let diff = (dOut - dIn) / (1000 * 60 * 60);
        if (diff < 0) diff += 24; // handle overnight shifts
        diff -= 1; // deduct 1-hour lunch
        return Math.max(diff, 0).toFixed(2);
    }

    // Load Manage Overtime modal and initialize its JS
    fetch("manageOT.html")
        .then(response => response.text())
        .then(html => {
            document.getElementById("modalsContainer").innerHTML = html;

            // Initialize Manage OT JS after modal is in DOM
            import("./manageOT.js").then(module => {
                module.initManageOT(() => selectedEmployeeID, displayAttendance);
            });
        })
        .catch(err => console.error("Failed to load Manage OT modal:", err));

});
