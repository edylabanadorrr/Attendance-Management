import { db, ref, set, onValue, remove } from "./firebase.js";

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
        saveBtn.addEventListener("click", () => {
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

            const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"

            set(ref(db, `employees/${employeeID}`), {
                firstName,
                lastName,
                department,
                dailyRate: dailyRateValue,
                attendance: {
                    [today]: { // use today's date as the key
                        timeIn: "",
                        timeOut: "",
                    }
                }
            })
            .then(() => {
                alert(editingEmployeeID ? "Employee updated!" : "Employee added!");
                empID.value = "";
                empID.disabled = false;
                empFirstName.value = "";
                empLastName.value = "";
                empDepartment.value = "";
                editingEmployeeID = null;
                modalTitle.textContent = "Add Employee";
                employeeModal.hide();
            })
            .catch(err => console.error(err));
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
            let pay = "-";
            if (hoursWorked !== "-" && dailyRate) {
                const hourlyRate = parseFloat(dailyRate) / 8;
                pay = (hoursWorked * hourlyRate).toFixed(2);
            }

            const row = document.createElement("div");
            row.classList.add("row", "text-center", "mb-2");
            row.innerHTML = `
                <div class="col-md-2">${date}</div>
                <div class="col-md-2">${timeIn}</div>
                <div class="col-md-2">${timeOut}</div>
                <div class="col-md-2">${hoursWorked}</div>
                <div class="col-md-2">₱${pay}</div>
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

});
