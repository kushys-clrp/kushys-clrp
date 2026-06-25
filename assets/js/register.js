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
  serverTimestamp,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const employeeSelect = document.getElementById("employeeSelect");
const menuContainer = document.getElementById("menuContainer");
const categoryButtons = document.getElementById("categoryButtons");
const menuSearch = document.getElementById("menuSearch");
const orderSummary = document.getElementById("orderSummary");
const orderTotal = document.getElementById("orderTotal");
const submitOrderBtn = document.getElementById("submitOrderBtn");
const logoutBtn = document.getElementById("logoutBtn");
const managementNavBtn = document.getElementById("managementNavBtn");

const citizenIdWrapper = document.getElementById("citizenIdWrapper");
const citizenIdInput = document.getElementById("citizenId");
const clearOrderBtn = document.getElementById("clearOrderBtn");

const filterBtn = document.getElementById("filterBtn");
const filterMenu = document.getElementById("filterMenu");

const toggleTabBtn = document.getElementById("toggleTabBtn");
const redeemMembershipBtn = document.getElementById("redeemMembershipBtn");

const tabModal = document.getElementById("tabModal");
const membershipModal = document.getElementById("membershipModal");

const existingTabSelect = document.getElementById("existingTabSelect");
const newTabName = document.getElementById("newTabName");
const setupTabBtn = document.getElementById("setupTabBtn");
const cancelTabBtn = document.getElementById("cancelTabBtn");

const membershipSelect = document.getElementById("membershipSelect");
const confirmMembershipBtn = document.getElementById("confirmMembershipBtn");
const cancelMembershipBtn = document.getElementById("cancelMembershipBtn");

const existingTabTrigger = document.getElementById("existingTabTrigger");
const existingTabMenu = document.getElementById("existingTabMenu");

const membershipTrigger = document.getElementById("membershipTrigger");
const membershipMenu = document.getElementById("membershipMenu");

let currentOrder = [];
let menuItems = [];
let selectedCategory = "All";
let selectedSort = "default";
let selectedTab = null;
let selectedMembership = null;

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
    window.location.href = "index.html";
    return;
  }

  const employeeRef = doc(db, "employees", user.uid);
  const employeeSnap = await getDoc(employeeRef);

  if (!employeeSnap.exists()) {
    await signOut(auth);
    window.location.href = "index.html";
    return;
  }

  const employeeData = employeeSnap.data();

  if (!employeeData.active) {
    await signOut(auth);
    window.location.href = "index.html";
    return;
  }

  document.body.classList.add("auth-ready");

  if (
    managementNavBtn &&
    (employeeData.role === "owner" || employeeData.role === "manager")
  ) {
    managementNavBtn.style.display = "inline-block";
  }

  await loadEmployees();
  await loadMenu();
  await loadTabs();
  await loadMemberships();
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
    citizenIdWrapper.classList.remove("hidden-field");
  } else {
    citizenIdWrapper.classList.add("hidden-field");
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

function setupCustomModalSelect(trigger, menu, hiddenInput, otherMenu) {
  if (!trigger || !menu || !hiddenInput) return;

  trigger.addEventListener("click", () => {
    if (otherMenu) {
      otherMenu.classList.remove("open");
    }

    menu.classList.toggle("open");
  });

  menu.addEventListener("click", (event) => {
    const option = event.target.closest("button");

    if (!option) return;

    hiddenInput.value = option.dataset.value || "";
    trigger.textContent = option.dataset.name || option.textContent.trim();
    trigger.dataset.selectedName = option.dataset.name || option.textContent.trim();

    menu.classList.remove("open");
  });
}

setupCustomModalSelect(
  existingTabTrigger,
  existingTabMenu,
  existingTabSelect,
  membershipMenu
);

setupCustomModalSelect(
  membershipTrigger,
  membershipMenu,
  membershipSelect,
  existingTabMenu
);

document.addEventListener("click", (event) => {
  if (
    existingTabMenu &&
    !event.target.closest("#existingTabTrigger") &&
    !event.target.closest("#existingTabMenu")
  ) {
    existingTabMenu.classList.remove("open");
  }

  if (
    membershipMenu &&
    !event.target.closest("#membershipTrigger") &&
    !event.target.closest("#membershipMenu")
  ) {
    membershipMenu.classList.remove("open");
  }
});

function openModal(modal) {
  if (modal) {
    modal.classList.remove("hidden-field");
  }
}

function resetExtraOrderOptions() {
  selectedTab = null;
  selectedMembership = null;

  if (toggleTabBtn) {
    toggleTabBtn.textContent = "Toggle Tab";
  }

  if (redeemMembershipBtn) {
    redeemMembershipBtn.textContent = "Redeem Membership";
  }

  if (existingTabSelect) {
    existingTabSelect.value = "";
  }

  if (existingTabTrigger) {
    existingTabTrigger.textContent = "Select existing tab";
    existingTabTrigger.dataset.selectedName = "";
  }

  if (newTabName) {
    newTabName.value = "";
  }

  if (membershipSelect) {
    membershipSelect.value = "";
  }

  if (membershipTrigger) {
    membershipTrigger.textContent = "Select member";
    membershipTrigger.dataset.selectedName = "";
  }
}

function addModalSelectOption(menu, value, name) {
  const option = document.createElement("button");
  option.type = "button";
  option.dataset.value = value;
  option.dataset.name = name;
  option.textContent = name;

  menu.appendChild(option);
}

async function loadTabs() {
  if (!existingTabMenu) return;

  existingTabMenu.innerHTML = "";

  addModalSelectOption(existingTabMenu, "", "Select existing tab");

  const q = query(
    collection(db, "tabs"),
    where("active", "==", true)
  );

  const snapshot = await getDocs(q);
  const tabs = [];

  snapshot.forEach((docSnap) => {
    tabs.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  tabs.sort((a, b) => a.name.localeCompare(b.name));

  tabs.forEach((tab) => {
    addModalSelectOption(existingTabMenu, tab.id, tab.name);
  });
}

async function loadMemberships() {
  if (!membershipMenu) return;

  membershipMenu.innerHTML = "";

  addModalSelectOption(membershipMenu, "", "Select member");

  const q = query(
    collection(db, "memberships"),
    where("active", "==", true)
  );

  const snapshot = await getDocs(q);
  const memberships = [];

  snapshot.forEach((docSnap) => {
    memberships.push({
      id: docSnap.id,
      ...docSnap.data()
    });
  });

  memberships.sort((a, b) => a.name.localeCompare(b.name));

  memberships.forEach((member) => {
    addModalSelectOption(
      membershipMenu,
      member.id,
      `${member.name} - ${member.plan || "VIP Plan"}`
    );
  });
}

function orderIncludesMembershipPlan() {
  return currentOrder.some((item) =>
    item.name.toLowerCase().includes("royalty") ||
    item.name.toLowerCase().includes("vip") ||
    item.category.toLowerCase().includes("membership")
  );
}

function closeModal(modal) {
  if (modal) {
    modal.classList.add("hidden-field");
  }
}

if (toggleTabBtn) {
  toggleTabBtn.addEventListener("click", () => {
    openModal(tabModal);
  });
}

if (cancelTabBtn) {
  cancelTabBtn.addEventListener("click", () => {
    closeModal(tabModal);
  });
}

if (setupTabBtn) {
  setupTabBtn.addEventListener("click", async () => {
    const existingTabId = existingTabSelect.value;
    const existingTabName = existingTabTrigger.dataset.selectedName || "";
    const createdTabName = newTabName.value.trim();

    if (!existingTabId && !createdTabName) {
      showPopup(
        "No Tab Selected",
        "Please select an existing tab or enter a new tab name.",
        "error"
      );
      return;
    }

    if (existingTabId && createdTabName) {
      showPopup(
        "Choose One Tab Option",
        "Please either select an existing tab or create a new one, not both.",
        "error"
      );
      return;
    }

    if (createdTabName) {
      const newTabRef = await addDoc(collection(db, "tabs"), {
        name: createdTabName,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.uid || null
      });

      selectedTab = {
        id: newTabRef.id,
        name: createdTabName
      };

      await loadTabs();
    } else {
      selectedTab = {
        id: existingTabId,
        name: existingTabName
      };
    }

    selectedMembership = null;

    toggleTabBtn.textContent = `Tab: ${selectedTab.name}`;
    redeemMembershipBtn.textContent = "Redeem Membership";

    closeModal(tabModal);

    showPopup(
      "Tab Selected",
      `${selectedTab.name} has been added to this order.`
    );
  });
}

if (redeemMembershipBtn) {
  redeemMembershipBtn.addEventListener("click", () => {
    openModal(membershipModal);
  });
}

if (cancelMembershipBtn) {
  cancelMembershipBtn.addEventListener("click", () => {
    closeModal(membershipModal);
  });
}

if (confirmMembershipBtn) {
  confirmMembershipBtn.addEventListener("click", () => {
    const membershipId = membershipSelect.value;
    const membershipName = membershipTrigger.dataset.selectedName || "";

    if (!membershipId) {
      showPopup(
        "No Member Selected",
        "Please select a VIP member to redeem.",
        "error"
      );
      return;
    }

    selectedMembership = {
      id: membershipId,
      name: membershipName
    };

    selectedTab = null;

    redeemMembershipBtn.textContent = `VIP: ${selectedMembership.name}`;
    toggleTabBtn.textContent = "Toggle Tab";

    closeModal(membershipModal);

    showPopup(
      "Membership Selected",
      `${selectedMembership.name} will be redeemed for this order.`
    );
  });
}

if (tabModal) {
  tabModal.addEventListener("click", (event) => {
    if (event.target === tabModal) {
      closeModal(tabModal);
    }
  });
}

if (membershipModal) {
  membershipModal.addEventListener("click", (event) => {
    if (event.target === membershipModal) {
      closeModal(membershipModal);
    }
  });
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

const orderData = {
  employee: employeeName,
  customer: customerName,
  citizenId: citizenId || null,
  requiresCitizenId: orderIncludesJoints(),
  items: currentOrder,
  total,
  timestamp: serverTimestamp(),
  done: false,
  deleted: false,
  paymentType: "standard"
};

if (selectedTab) {
  orderData.paymentType = "tab";
  orderData.tabId = selectedTab.id;
  orderData.tabName = selectedTab.name;
  orderData.tabPaid = false;
}

if (selectedMembership) {
  orderData.paymentType = "membership";
  orderData.membershipId = selectedMembership.id;
  orderData.membershipName = selectedMembership.name;
  orderData.originalTotal = total;
  orderData.finalTotal = 0;
}

await addDoc(collection(db, "orders"), orderData);

if (orderIncludesMembershipPlan()) {
  await addDoc(collection(db, "memberships"), {
    name: customerName,
    plan: "Kushy's Royalty VIP Plan",
    active: true,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid || null
  });

  await loadMemberships();
}

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
  resetExtraOrderOptions();
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

    resetExtraOrderOptions();
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
  window.location.href = "index.html";
});

if (window.lucide) {
  lucide.createIcons();
}

renderOrder();