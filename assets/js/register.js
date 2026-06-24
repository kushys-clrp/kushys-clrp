import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const employeeSelect = document.getElementById("employeeSelect");
const menuContainer = document.getElementById("menuContainer");
const categoryButtons = document.getElementById("categoryButtons");
const menuSearch = document.getElementById("menuSearch");
const orderSummary = document.getElementById("orderSummary");
const orderTotal = document.getElementById("orderTotal");
const submitOrderBtn = document.getElementById("submitOrderBtn");
const logoutBtn = document.getElementById("logoutBtn");

const citizenIdWrapper = document.getElementById("citizenIdWrapper");
const citizenIdInput = document.getElementById("citizenId");
const clearOrderBtn = document.getElementById("clearOrderBtn");

const filterBtn = document.getElementById("filterBtn");
const filterMenu = document.getElementById("filterMenu");

let currentOrder = [];
let menuItems = [];
let selectedCategory = "All";
let selectedSort = "default";

function showPopup(title, message, type = "success", duration = 3000) {
  const popupContainer = document.getElementById("popupContainer");
  if (!popupContainer) return;

  const popup = document.createElement("div");
  popup.classList.add("custom-popup");
  popup.classList.add(type === "error" ? "popup-error" : "popup-success");

  popup.innerHTML = `
    <div class="popup-title">${title}</div>
    <div class="popup-message">${message}</div>
  `;

  popupContainer.appendChild(popup);

  setTimeout(() => {
    popup.remove();
  }, duration);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  await loadEmployees();
  await loadMenu();
});

async function loadEmployees() {
  const employeeHiddenInput = document.getElementById("employeeSelect");
  const employeeSelectTrigger = document.getElementById("employeeSelectTrigger");
  const employeeSelectMenu = document.getElementById("employeeSelectMenu");

  employeeSelectMenu.innerHTML = "";

  const q = query(
    collection(db, "employees"),
    where("active", "==", true)
  );

  const snapshot = await getDocs(q);
  const employeeList = [];

  snapshot.forEach((doc) => {
    employeeList.push(doc.data());
  });

  employeeList.sort((a, b) => {
    if (a.name === "Bart") return -1;
    if (b.name === "Bart") return 1;
    return a.name.localeCompare(b.name);
  });

  employeeList.forEach((employee) => {
    const option = document.createElement("button");
    option.type = "button";
    option.classList.add("custom-select-option");
    option.textContent = employee.name;

    option.addEventListener("click", () => {
      employeeHiddenInput.value = employee.name;
      employeeSelectTrigger.textContent = employee.name;
      employeeSelectMenu.classList.remove("open");
    });

    employeeSelectMenu.appendChild(option);
  });

  employeeSelectTrigger.addEventListener("click", () => {
    employeeSelectMenu.classList.toggle("open");
  });
}

async function loadMenu() {
  const q = query(
    collection(db, "menuItems"),
    where("available", "==", true)
  );

  const snapshot = await getDocs(q);

  menuItems = [];

  snapshot.forEach((doc) => {
    menuItems.push({
      id: doc.id,
      ...doc.data()
    });
  });

  buildCategoryButtons();
  renderMenu();
}

function buildCategoryButtons() {
  const categories = [
    "All",
    ...new Set(menuItems.map((item) => item.category))
  ];

  categoryButtons.innerHTML = "";

  categories.forEach((category) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.classList.add("category-btn");

    if (category === selectedCategory) {
      btn.classList.add("active-category");
    }

    btn.textContent = category;

    btn.addEventListener("click", () => {
      selectedCategory = category;
      buildCategoryButtons();
      renderMenu();
    });

    categoryButtons.appendChild(btn);
  });
}

function renderMenu() {
  menuContainer.innerHTML = "";

  const searchTerm = menuSearch.value.toLowerCase();

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;

    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm) ||
      item.category.toLowerCase().includes(searchTerm);

    return matchesCategory && matchesSearch;
  });

  if (selectedSort === "price-low") {
    filteredItems.sort((a, b) => a.price - b.price);
  }

  if (selectedSort === "price-high") {
    filteredItems.sort((a, b) => b.price - a.price);
  }

  if (selectedSort === "name-az") {
    filteredItems.sort((a, b) => a.name.localeCompare(b.name));
  }

  if (selectedSort === "name-za") {
    filteredItems.sort((a, b) => b.name.localeCompare(a.name));
  }

  if (filteredItems.length === 0) {
    menuContainer.innerHTML = `<p>No matching items found.</p>`;
    return;
  }

  filteredItems.forEach((item) => {
    const productCard = document.createElement("div");
    productCard.classList.add("product-card");

    productCard.innerHTML = `
      <div>
        <p class="product-category">${item.category}</p>
        <h3>${item.name}</h3>
        <strong>$${item.price.toLocaleString()}</strong>
      </div>

      <div class="product-add-row">
        <div class="qty-stepper">
          <input type="number" class="product-qty-input" value="1" min="1" />

          <div class="qty-stepper-buttons">
            <button type="button" class="qty-stepper-up">▲</button>
            <button type="button" class="qty-stepper-down">▼</button>
          </div>
        </div>

        <button type="button" class="add-product-btn">Add</button>
      </div>
    `;

    const qtyInput = productCard.querySelector(".product-qty-input");

    productCard.querySelector(".qty-stepper-up").addEventListener("click", () => {
      qtyInput.value = Number(qtyInput.value) + 1;
    });

    productCard.querySelector(".qty-stepper-down").addEventListener("click", () => {
      if (Number(qtyInput.value) > 1) {
        qtyInput.value = Number(qtyInput.value) - 1;
      }
    });

    productCard.querySelector(".add-product-btn").addEventListener("click", () => {
      const quantity = Number(qtyInput.value);

      if (!quantity || quantity < 1) {
        showPopup("Invalid Quantity", "Please enter a valid quantity.", "error");
        return;
      }

      addToOrder(item, quantity);
      qtyInput.value = 1;
    });

    menuContainer.appendChild(productCard);
  });
}

menuSearch.addEventListener("input", renderMenu);

function addToOrder(item, quantity = 1) {
  const existingItem = currentOrder.find(
    (orderItem) => orderItem.id === item.id
  );

  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    currentOrder.push({
      id: item.id,
      name: item.name,
      price: item.price,
      category: item.category,
      quantity
    });
  }

  renderOrder();
}

function orderIncludesJoints() {
  return currentOrder.some((item) =>
    item.category.toLowerCase().includes("joint")
  );
}

function updateCitizenIdVisibility() {
  if (orderIncludesJoints()) {
    citizenIdWrapper.style.display = "block";
  } else {
    citizenIdWrapper.style.display = "none";
    citizenIdInput.value = "";
  }
}

function renderOrder() {
  orderSummary.innerHTML = "";

  if (currentOrder.length === 0) {
    orderSummary.innerHTML = `
      <div class="empty-order-box">
        <div class="empty-basket-icon">
          <i data-lucide="shopping-bag"></i>
        </div>

        <p>No items added yet</p>
        <span>Browse products and add them to the order.</span>
      </div>
    `;

    if (window.lucide) {
      lucide.createIcons();
    }

    orderTotal.textContent = "0";
    updateCitizenIdVisibility();
    return;
  }

  let total = 0;

  currentOrder.forEach((item) => {
    total += item.price * item.quantity;

    const itemRow = document.createElement("div");
    itemRow.classList.add("order-summary-row");

    itemRow.innerHTML = `
      <div class="order-item-info">
        <span class="order-item-name">${item.name}</span>

        <span class="order-item-price">
          $${item.price.toLocaleString()} each
        </span>
      </div>

      <div class="order-actions">
        <div class="quantity-controls">
          <button type="button" class="qty-btn minus-btn">-</button>

          <span class="order-qty">${item.quantity}</span>

          <button type="button" class="qty-btn plus-btn">+</button>
        </div>

        <strong>
          $${(item.price * item.quantity).toLocaleString()}
        </strong>

        <button type="button" class="remove-item-btn">
          Remove
        </button>
      </div>
    `;

    itemRow.querySelector(".plus-btn").addEventListener("click", () => {
      item.quantity += 1;
      renderOrder();
    });

    itemRow.querySelector(".minus-btn").addEventListener("click", () => {
      item.quantity -= 1;

      if (item.quantity <= 0) {
        currentOrder = currentOrder.filter(
          (orderItem) => orderItem.id !== item.id
        );
      }

      renderOrder();
    });

    itemRow.querySelector(".remove-item-btn").addEventListener("click", () => {
      currentOrder = currentOrder.filter(
        (orderItem) => orderItem.id !== item.id
      );

      renderOrder();
    });

    orderSummary.appendChild(itemRow);
  });

  orderTotal.textContent = total.toLocaleString();
  updateCitizenIdVisibility();
}

submitOrderBtn.addEventListener("click", async () => {
  const employeeName = employeeSelect.value;
  const customerName = document.getElementById("customerName").value.trim();
  const citizenId = citizenIdInput.value.trim();

  if (!employeeName) {
    showPopup("Missing Staff Member", "Please select a staff member.", "error");
    return;
  }

  if (!customerName) {
    showPopup("Missing Customer", "Please enter a customer name.", "error");
    return;
  }

  if (currentOrder.length === 0) {
    showPopup("Empty Order", "Please add at least one item.", "error");
    return;
  }

  if (orderIncludesJoints() && !citizenId) {
    showPopup(
      "Citizen ID Required",
      "Citizen ID is required for joint purchases.",
      "error"
    );
    return;
  }

  const total = currentOrder.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  await addDoc(collection(db, "orders"), {
    employee: employeeName,
    customer: customerName,
    citizenId: citizenId || null,
    requiresCitizenId: orderIncludesJoints(),
    items: currentOrder,
    total,
    timestamp: serverTimestamp(),
    done: false,
    deleted: false
  });

  showPopup(
    "Order Submitted",
    "The order has been sent to the orders page."
  );

  currentOrder = [];
  renderOrder();

  document.getElementById("customerName").value = "";
  citizenIdInput.value = "";
  employeeSelect.value = "";

  const employeeSelectTrigger = document.getElementById("employeeSelectTrigger");
  if (employeeSelectTrigger) {
    employeeSelectTrigger.textContent = "Select staff member";
  }

  updateCitizenIdVisibility();
});

if (clearOrderBtn) {
  clearOrderBtn.addEventListener("click", () => {
    currentOrder = [];
    renderOrder();

    document.getElementById("customerName").value = "";
    citizenIdInput.value = "";
    employeeSelect.value = "";

    const employeeSelectTrigger = document.getElementById("employeeSelectTrigger");
    if (employeeSelectTrigger) {
      employeeSelectTrigger.textContent = "Select staff member";
    }

    showPopup("Order Cleared", "The current order has been cleared.");
  });
}

if (filterBtn && filterMenu) {
  filterBtn.addEventListener("click", () => {
    filterMenu.classList.toggle("open");

    if (window.lucide) {
      lucide.createIcons();
    }
  });

  filterMenu.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedSort = button.dataset.sort;
      filterMenu.classList.remove("open");
      renderMenu();
    });
  });
}

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

if (window.lucide) {
  lucide.createIcons();
}

renderOrder();