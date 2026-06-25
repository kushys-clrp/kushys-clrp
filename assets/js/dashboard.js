import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const categories = [
  "Kushy's Joints",
  "Bongs/Pipes",
  "Kushy's Edibles",
  "Crop Bags",
  "Dabs & Carts",
  "Kushy's Extras",
  "Event Items"
];

let menuItems = [];
let employees = [];
let managementOrders = [];

const logoutBtn = document.getElementById("logoutBtn");

const addItemBtn = document.getElementById("addItemBtn");
const menuItemSelect = document.getElementById("menuItemSelect");

const addEmployeeBtn = document.getElementById("addEmployeeBtn");
const employeeSelectEdit = document.getElementById("employeeSelectEdit");
const saveEmployeeBtn = document.getElementById("saveEmployeeBtn");

const downloadOrdersBtn = document.getElementById("downloadOrdersBtn");

const saveItemBtn = document.getElementById("saveMenuItemBtn");
const deleteItemBtn = document.getElementById("deleteMenuItemBtn");
const deleteEmployeeBtn = document.getElementById("removeEmployeeBtn");

const deleteAllOrdersBtn = document.getElementById("deleteAllOrdersBtn");

const managementOrdersContainer = document.getElementById(
  "managementOrdersContainer"
);

const managementOrderSearch = document.getElementById("managementOrderSearch");
const managementOrderStatusFilter = document.getElementById(
  "managementOrderStatusFilter"
);

const editOrderModal = document.getElementById("editOrderModal");
const editOrderId = document.getElementById("editOrderId");
const editOrderCustomer = document.getElementById("editOrderCustomer");
const editOrderEmployee = document.getElementById("editOrderEmployee");
const editOrderCitizenId = document.getElementById("editOrderCitizenId");
const editOrderTotal = document.getElementById("editOrderTotal");
const editOrderStatus = document.getElementById("editOrderStatus");

const saveEditedOrderBtn = document.getElementById("saveEditedOrderBtn");
const cancelEditOrderBtn = document.getElementById("cancelEditOrderBtn");

function showPopup(title, message, type = "success") {
  const popupContainer = document.getElementById("popupContainer");

  if (!popupContainer) return;

  const popup = document.createElement("div");
  popup.classList.add("custom-popup");

  if (type === "error") {
    popup.classList.add("popup-error");
  } else {
    popup.classList.add("popup-success");
  }

  popup.innerHTML = `
    <div class="popup-title">${title}</div>
    <div class="popup-message">${message}</div>
  `;

  popupContainer.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, 3000);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const employeeSnap = await getDoc(doc(db, "employees", user.uid));

  if (!employeeSnap.exists()) {
    window.location.href = "index.html";
    return;
  }

  const employee = employeeSnap.data();

  if (!employee.active || (employee.role !== "owner" && employee.role !== "manager")) {
    showPopup(
      "Access Denied",
      "You do not have permission to access management.",
      "error"
    );

    setTimeout(() => {
      window.location.href = "register.html";
    }, 1200);

    return;
  }

  document.body.classList.add("auth-ready");

await loadMenuDropdown();
await loadEmployeeDropdown();
await loadManagementOrders();
  
});

// MENU MANAGEMENT

async function loadMenuDropdown() {
  menuItems = [];
  menuItemSelect.innerHTML = `<option value="">Select item</option>`;

  const snapshot = await getDocs(collection(db, "menuItems"));

  snapshot.forEach((docSnap) => {
    const item = {
      id: docSnap.id,
      ...docSnap.data()
    };

    menuItems.push(item);
  });

  menuItems.sort((a, b) => {
    if (a.category === b.category) {
      return a.name.localeCompare(b.name);
    }

    return a.category.localeCompare(b.category);
  });

  menuItems.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.category} - ${item.name}`;
    menuItemSelect.appendChild(option);
  });
}

menuItemSelect.addEventListener("change", () => {
  const selectedId = menuItemSelect.value;
  const item = menuItems.find((menuItem) => menuItem.id === selectedId);

  if (!item) {
    document.getElementById("editItemName").value = "";
    document.getElementById("editItemPrice").value = "";
    document.getElementById("editItemCategory").value = "";
    document.getElementById("editAvailable").checked = false;
    return;
  }

  document.getElementById("editItemName").value = item.name;
  document.getElementById("editItemPrice").value = item.price;
  document.getElementById("editItemCategory").value = item.category;
  document.getElementById("editAvailable").checked = item.available;
});

addItemBtn.addEventListener("click", async () => {
  const name = document.getElementById("itemName").value.trim();
  const price = Number(document.getElementById("itemPrice").value);
  const category = document.getElementById("itemCategory").value;

  if (!name || !price || !category) {
    showPopup(
      "Missing Details",
      "Please fill in all menu item fields.",
      "error"
    );
    return;
  }

  await addDoc(collection(db, "menuItems"), {
    name,
    price,
    category,
    available: true
  });

  document.getElementById("itemName").value = "";
  document.getElementById("itemPrice").value = "";
  document.getElementById("itemCategory").value = "";

  showPopup(
    "Menu Item Added",
    `${name} has been added to the menu.`
  );

  await loadMenuDropdown();
});

saveItemBtn.addEventListener("click", async () => {
  const selectedId = menuItemSelect.value;

  if (!selectedId) {
    showPopup(
      "No Item Selected",
      "Please select a menu item first.",
      "error"
    );
    return;
  }

  const name = document.getElementById("editItemName").value.trim();
  const price = Number(document.getElementById("editItemPrice").value);
  const category = document.getElementById("editItemCategory").value;
  const available = document.getElementById("editAvailable").checked;

  if (!name || !price || !category) {
    showPopup(
      "Missing Details",
      "Please fill in all menu item fields.",
      "error"
    );
    return;
  }

  await updateDoc(doc(db, "menuItems", selectedId), {
    name,
    price,
    category,
    available
  });

  showPopup(
    "Menu Item Saved",
    `${name} has been updated.`
  );

  await loadMenuDropdown();
});

deleteItemBtn.addEventListener("click", async () => {
  const selectedId = menuItemSelect.value;

  if (!selectedId) {
    showPopup(
      "No Item Selected",
      "Please select a menu item first.",
      "error"
    );
    return;
  }

  const item = menuItems.find((menuItem) => menuItem.id === selectedId);
  const confirmed = confirm(`Delete ${item.name}?`);

  if (!confirmed) return;

  await deleteDoc(doc(db, "menuItems", selectedId));

  showPopup(
    "Menu Item Deleted",
    `${item.name} has been removed from the menu.`
  );

  document.getElementById("editItemName").value = "";
  document.getElementById("editItemPrice").value = "";
  document.getElementById("editItemCategory").value = "";
  document.getElementById("editAvailable").checked = false;

  await loadMenuDropdown();
});

// EMPLOYEE MANAGEMENT

async function loadEmployeeDropdown() {
  employees = [];
  employeeSelectEdit.innerHTML = `<option value="">Select employee</option>`;

  const snapshot = await getDocs(collection(db, "employees"));

  snapshot.forEach((docSnap) => {
    const employee = {
      id: docSnap.id,
      ...docSnap.data()
    };

    employees.push(employee);
  });

  employees.sort((a, b) => a.name.localeCompare(b.name));

  employees.forEach((employee) => {
    const option = document.createElement("option");
    option.value = employee.id;
    option.textContent = `${employee.name} - ${employee.role}`;
    employeeSelectEdit.appendChild(option);
  });
}

employeeSelectEdit.addEventListener("change", () => {
  const selectedId = employeeSelectEdit.value;
  const employee = employees.find((emp) => emp.id === selectedId);

  if (!employee) {
    document.getElementById("editEmployeeName").value = "";
    document.getElementById("editEmployeeRole").value = "employee";
    document.getElementById("editEmployeeActive").checked = false;
    return;
  }

  document.getElementById("editEmployeeName").value = employee.name;
  document.getElementById("editEmployeeRole").value = employee.role;
  document.getElementById("editEmployeeActive").checked = employee.active;
});

addEmployeeBtn.addEventListener("click", async () => {
  const name = document.getElementById("employeeName").value.trim();
  const role = document.getElementById("employeeRole").value;

  if (!name || !role) {
    showPopup(
      "Missing Details",
      "Please enter an employee name and role.",
      "error"
    );
    return;
  }

  await addDoc(collection(db, "employees"), {
    name,
    role,
    active: true
  });

  document.getElementById("employeeName").value = "";
  document.getElementById("employeeRole").value = "employee";

  showPopup(
    "Employee Added",
    `${name} has been added to the register.`
  );

  await loadEmployeeDropdown();
});

saveEmployeeBtn.addEventListener("click", async () => {
  const selectedId = employeeSelectEdit.value;

  if (!selectedId) {
    showPopup(
      "No Employee Selected",
      "Please select an employee first.",
      "error"
    );
    return;
  }

  const name = document.getElementById("editEmployeeName").value.trim();
  const role = document.getElementById("editEmployeeRole").value;
  const active = document.getElementById("editEmployeeActive").checked;

  if (!name || !role) {
    showPopup(
      "Missing Details",
      "Please fill in all employee fields.",
      "error"
    );
    return;
  }

  await updateDoc(doc(db, "employees", selectedId), {
    name,
    role,
    active
  });

  showPopup(
    "Employee Saved",
    `${name}'s details have been updated.`
  );

  await loadEmployeeDropdown();
});

deleteEmployeeBtn.addEventListener("click", async () => {
  const selectedId = employeeSelectEdit.value;

  if (!selectedId) {
    showPopup(
      "No Employee Selected",
      "Please select an employee first.",
      "error"
    );
    return;
  }

  const employee = employees.find((emp) => emp.id === selectedId);
  const confirmed = confirm(`Remove ${employee.name} from the register?`);

  if (!confirmed) return;

  await deleteDoc(doc(db, "employees", selectedId));

  showPopup(
    "Employee Removed",
    `${employee.name} has been removed from the register.`
  );

  document.getElementById("editEmployeeName").value = "";
  document.getElementById("editEmployeeRole").value = "employee";
  document.getElementById("editEmployeeActive").checked = false;

  await loadEmployeeDropdown();
});

if (downloadOrdersBtn) {
  downloadOrdersBtn.addEventListener("click", async () => {
    console.log("Download button clicked");
    const snapshot = await getDocs(collection(db, "orders"));

    const rows = [
      [
        "Customer",
        "Staff Member",
        "Items",
        "Total",
        "Citizen ID",
        "Status",
        "Date",
        "Time"
      ]
    ];

    snapshot.forEach((docSnap) => {
      const order = docSnap.data();

      if (order.deleted) return;

      const orderDate = order.timestamp
        ? new Date(order.timestamp.seconds * 1000)
        : null;

      const dateText = orderDate ? orderDate.toLocaleDateString() : "";
      const timeText = orderDate
        ? orderDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          })
        : "";

      const itemsText = (order.items || [])
        .map((item) => `${item.name} x${item.quantity}`)
        .join(", ");

      rows.push([
        order.customer || "",
        order.employee || "",
        itemsText,
        order.total || 0,
        order.citizenId || "",
        order.done ? "Completed" : "Pending",
        dateText,
        timeText
      ]);
    });

    if (rows.length === 1) {
      showPopup("No Orders", "There are no orders to download.", "error");
      return;
    }

    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;"
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.download = "kushys-orders.csv";
    link.style.display = "none";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);

    showPopup(
      "Spreadsheet Downloaded",
      "The orders spreadsheet has been downloaded."
    );
  });
}

if (deleteAllOrdersBtn) {
  deleteAllOrdersBtn.addEventListener("click", () => {
    const popupContainer = document.getElementById("popupContainer");

    if (!popupContainer) return;

    const confirmPopup = document.createElement("div");
    confirmPopup.classList.add("custom-popup", "popup-error");

    confirmPopup.innerHTML = `
      <div class="popup-title">
        Delete ALL orders?
      </div>

      <div class="popup-message">
        This cannot be undone.
      </div>

      <div class="popup-confirm-actions">
        <button type="button" class="confirm-delete-btn">
          Delete
        </button>

        <button type="button" class="cancel-delete-btn">
          Cancel
        </button>
      </div>
    `;

    popupContainer.appendChild(confirmPopup);

    confirmPopup
      .querySelector(".cancel-delete-btn")
      .addEventListener("click", () => {
        confirmPopup.remove();
      });

    confirmPopup
      .querySelector(".confirm-delete-btn")
      .addEventListener("click", async () => {
        const snapshot = await getDocs(collection(db, "orders"));

        const deletePromises = [];

        snapshot.forEach((docSnap) => {
          deletePromises.push(
            deleteDoc(doc(db, "orders", docSnap.id))
          );
        });

        await Promise.all(deletePromises);

        confirmPopup.remove();

        showPopup(
          "Orders Deleted",
          "All orders have been removed from the database."
        );
      });
  });
}

// ORDER MANAGEMENT

async function loadManagementOrders() {
  if (!managementOrdersContainer) return;

  const snapshot = await getDocs(collection(db, "orders"));

  managementOrders = [];

  snapshot.forEach((docSnap) => {
    const order = {
      id: docSnap.id,
      ...docSnap.data()
    };

    if (!order.deleted) {
      managementOrders.push(order);
    }
  });

  managementOrders.sort((a, b) => {
    const aTime = a.timestamp?.seconds || 0;
    const bTime = b.timestamp?.seconds || 0;
    return bTime - aTime;
  });

  renderManagementOrders();
}

function getFilteredManagementOrders() {
  const searchTerm = managementOrderSearch?.value.toLowerCase().trim() || "";
  const statusFilter = managementOrderStatusFilter?.value || "all";

  return managementOrders.filter((order) => {
    const status = order.done ? "completed" : "pending";

    const matchesStatus =
      statusFilter === "all" || statusFilter === status;

    const matchesSearch =
      order.customer?.toLowerCase().includes(searchTerm) ||
      order.employee?.toLowerCase().includes(searchTerm) ||
      order.citizenId?.toLowerCase().includes(searchTerm);

    return matchesStatus && matchesSearch;
  });
}

function renderManagementOrders() {
  if (!managementOrdersContainer) return;

  const filteredOrders = getFilteredManagementOrders();

  managementOrdersContainer.innerHTML = "";

  if (filteredOrders.length === 0) {
    managementOrdersContainer.innerHTML = `
      <div class="empty-orders-row">
        No orders found.
      </div>
    `;
    return;
  }

  filteredOrders.forEach((order) => {
    const orderRow = document.createElement("div");
    orderRow.classList.add("management-order-row");

    const orderDate = order.timestamp
      ? new Date(order.timestamp.seconds * 1000)
      : null;

    const dateText = orderDate
      ? orderDate.toLocaleDateString()
      : "Just now";

    const paymentLabel =
      order.paymentType && order.paymentType !== "standard"
        ? ` (${order.paymentType})`
        : "";

    orderRow.innerHTML = `
      <span>${order.customer || "Unknown"}${paymentLabel}</span>
      <span>${order.employee || "Unknown"}</span>
      <strong>$${Number(order.total || 0).toLocaleString()}</strong>
      <span>${order.done ? "Completed" : "Pending"}</span>
      <span>${dateText}</span>

      <div class="management-order-actions">
        <button type="button" class="edit-order-btn">
          Edit
        </button>

        <button type="button" class="delete-order-btn">
          Delete
        </button>
      </div>
    `;

    orderRow.querySelector(".edit-order-btn").addEventListener("click", () => {
      openEditOrderModal(order);
    });

    orderRow.querySelector(".delete-order-btn").addEventListener("click", () => {
      softDeleteOrder(order);
    });

    managementOrdersContainer.appendChild(orderRow);
  });
}

function openEditOrderModal(order) {
  if (!editOrderModal) return;

  editOrderId.value = order.id;
  editOrderCustomer.value = order.customer || "";
  editOrderEmployee.value = order.employee || "";
  editOrderCitizenId.value = order.citizenId || "";
  editOrderTotal.value = order.total || 0;
  editOrderStatus.value = order.done ? "completed" : "pending";

  editOrderModal.classList.remove("hidden-field");
}

function closeEditOrderModal() {
  if (!editOrderModal) return;

  editOrderModal.classList.add("hidden-field");

  editOrderId.value = "";
  editOrderCustomer.value = "";
  editOrderEmployee.value = "";
  editOrderCitizenId.value = "";
  editOrderTotal.value = "";
  editOrderStatus.value = "pending";
}

async function softDeleteOrder(order) {
  const confirmed = confirm(
    `Delete ${order.customer || "this"} order from the orders page?`
  );

  if (!confirmed) return;

  await updateDoc(doc(db, "orders", order.id), {
    deleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: auth.currentUser?.uid || null
  });

  showPopup(
    "Order Deleted",
    "The order has been hidden from the orders page."
  );

  await loadManagementOrders();
}

if (managementOrderSearch) {
  managementOrderSearch.addEventListener("input", renderManagementOrders);
}

if (managementOrderStatusFilter) {
  managementOrderStatusFilter.addEventListener("change", renderManagementOrders);
}

if (cancelEditOrderBtn) {
  cancelEditOrderBtn.addEventListener("click", closeEditOrderModal);
}

if (editOrderModal) {
  editOrderModal.addEventListener("click", (event) => {
    if (event.target === editOrderModal) {
      closeEditOrderModal();
    }
  });
}

if (saveEditedOrderBtn) {
  saveEditedOrderBtn.addEventListener("click", async () => {
    const orderId = editOrderId.value;

    if (!orderId) {
      showPopup("No Order Selected", "Please select an order first.", "error");
      return;
    }

    const customer = editOrderCustomer.value.trim();
    const employee = editOrderEmployee.value.trim();
    const citizenId = editOrderCitizenId.value.trim();
    const total = Number(editOrderTotal.value);
    const done = editOrderStatus.value === "completed";

    if (!customer || !employee || Number.isNaN(total)) {
      showPopup(
        "Missing Details",
        "Please fill in the customer, staff member and total.",
        "error"
      );
      return;
    }

    await updateDoc(doc(db, "orders", orderId), {
      customer,
      employee,
      citizenId: citizenId || null,
      total,
      done,
      edited: true,
      editedAt: serverTimestamp(),
      editedBy: auth.currentUser?.uid || null
    });

    closeEditOrderModal();

    showPopup(
      "Order Updated",
      "The order has been updated successfully."
    );

    await loadManagementOrders();
  });
}

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});