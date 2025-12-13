document.addEventListener("DOMContentLoaded", () => {
    const employeeListEl = document.getElementById("employeeList");
    const searchInput = document.getElementById("employeeSearch");
    const filterSelect = document.getElementById("departmentFilter");

    const empID = document.getElementById("empID");
    const empName = document.getElementById("empName");
    const empPosition = document.getElementById("empPosition");
    const empRate = document.getElementById("empRate");
    const basicPay = document.getElementById("basicPay");
    const empFirstName = document.getElementById("empFirstName");
    const empLastName = document.getElementById("empLastName");
    const empDepartment = document.getElementById("empDepartment");
    const modalTitle = document.getElementById("modalTitle");
    const saveBtn = document.getElementById("saveEmployeeBtn");
    const employeeModal = new bootstrap.Modal(document.getElementById("employeeModal"));

    const { db, firebaseImports } = window;
    const { ref, set, onValue, remove } = firebaseImports;
    const employeesRef = ref(db, "employees/");

    let editingEmployeeID = null;

    // Filter / Search function
    function applyFilter() {
    const selectedDept = filterSelect.value.toLowerCase();
    const searchTerm = searchInput.value.trim().toLowerCase();

    let anyVisible = false;

    document.querySelectorAll(".employee-item").forEach(item => {
        const empDept = item.dataset.department.toLowerCase();
        const empName = item.dataset.name.toLowerCase();
        const matchesDept = (selectedDept === "all" || empDept === selectedDept);
        const matchesSearch = empName.includes(searchTerm);
        const show = matchesDept && matchesSearch;

        item.classList.toggle("d-none", !show);

        if (show) anyVisible = true;
    });

    // Handle "No employees found"
    let noItem = document.getElementById("noEmployees");
    if (!anyVisible) {
        if (!noItem) {
            noItem = document.createElement("li");
            noItem.id = "noEmployees";
            noItem.className = "list-group-item text-muted";
            noItem.textContent = "No employees found";
            employeeListEl.appendChild(noItem);
        }
    } else {
        if (noItem) {
            noItem.remove();
        }
    }
}


    // Load Employees
    function loadEmployees() {
        onValue(employeesRef, snapshot => {
            employeeListEl.innerHTML = "";
            const departmentSet = new Set();

            if (!snapshot.exists()) {
                employeeListEl.innerHTML = '<li class="list-group-item text-muted" id="noEmployees">No employees yet</li>';
                filterSelect.innerHTML = '<option value="all">All Departments</option>';
                return;
            }

            snapshot.forEach(childSnap => {
                const data = childSnap.val();
                departmentSet.add(data.department);

                const li = document.createElement("li");
                li.className = "list-group-item d-flex justify-content-between align-items-center employee-item";
                li.dataset.department = data.department;
                li.dataset.name = `${data.firstName} ${data.lastName}`;
                li.style.cursor = "pointer";

                const nameSpan = document.createElement("span");
                nameSpan.textContent = `${data.firstName} ${data.lastName} (${data.department})`;
                nameSpan.style.flexGrow = "1";
                li.appendChild(nameSpan);

                // Click to show details
                nameSpan.addEventListener("click", () => {
                    document.querySelectorAll(".employee-item").forEach(i => i.classList.remove("active"));
                    li.classList.add("active");
                    empID.textContent = childSnap.key;
                    empName.textContent = `${data.firstName} ${data.lastName}`;
                    empPosition.textContent = data.department;
                    empRate.textContent = "-";
                    basicPay.textContent = "-";
                });

                // Edit / Delete buttons
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

                const deleteBtn = document.createElement("button");
                deleteBtn.className = "btn btn-sm btn-danger";
                deleteBtn.textContent = "Delete";
                deleteBtn.addEventListener("click", e => {
                    e.stopPropagation();
                    if (confirm(`Delete ${data.firstName} ${data.lastName}?`)) {
                        remove(ref(db, "employees/" + childSnap.key)).catch(err => console.error(err));
                    }
                });

                btnContainer.appendChild(editBtn);
                btnContainer.appendChild(deleteBtn);
                li.appendChild(btnContainer);

                employeeListEl.appendChild(li);
            });

            // Populate department filter dynamically
            filterSelect.innerHTML = '<option value="all">All Departments</option>';
            [...departmentSet].sort().forEach(dept => {
                const option = document.createElement("option");
                option.value = dept;
                option.textContent = dept;
                filterSelect.appendChild(option);
            });

            // Apply filter after loading
            applyFilter();
        });
    }

    loadEmployees();

    // Attach events
    filterSelect.addEventListener("change", applyFilter);
    searchInput.addEventListener("input", applyFilter);

    // Save / Update Employee
    saveBtn.addEventListener("click", () => {
        const employeeID = empID.value.trim();
        const firstName = empFirstName.value.trim();
        const lastName = empLastName.value.trim();
        const department = empDepartment.value;

        if (!employeeID || !firstName || !lastName || !department) {
            alert("Please fill all fields!");
            return;
        }

        set(ref(db, "employees/" + employeeID), {
            firstName,
            lastName,
            department,
            attendance: { timeIn: "", timeOut: "" }
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

    // Optional: Initialize Select2 if you want searchable department dropdown
    if (window.jQuery) {
        $(filterSelect).select2({ placeholder: "Filter by department", allowClear: true, width: '100%' });
        $(filterSelect).on('change', applyFilter);
    }
});
