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
  getDoc,
  Timestamp
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

const membershipJointModal = document.getElementById("membershipJointModal");
const membershipJointTrigger = document.getElementById("membershipJointTrigger");
const membershipJointMenu = document.getElementById("membershipJointMenu");
const membershipJointSelect = document.getElementById("membershipJointSelect");
const confirmMembershipJointBtn = document.getElementById("confirmMembershipJointBtn");
const cancelMembershipJointBtn = document.getElementById("cancelMembershipJointBtn");

let currentOrder = [];
let menuItems = [];
let comboItems = [];
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
loadMembershipJointOptions();
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

  await loadCombos();
buildCategoryButtons();
renderMenu();
}

async function loadCombos() {
  comboItems = [];

  const snapshot = await getDocs(collection(db, "combos"));

  snapshot.forEach((docSnap) => {
    const combo = {
      id: docSnap.id,
      ...docSnap.data()
    };

    if (combo.active) {
      comboItems.push({
        id: `combo-${combo.id}`,
        comboId: combo.id,
        name: combo.name,
        price: Number(combo.price),
        category: "Combos",
        isCombo: true,
        comboItems: combo.items || []
      });
    }
  });

  comboItems.sort((a, b) => a.name.localeCompare(b.name));
}

function buildCategoryButtons() {
const allRegisterItems = [...menuItems, ...comboItems];

const categories = [
  "All",
  ...new Set(allRegisterItems.map((item) => item.category))
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

  const allRegisterItems = [...menuItems, ...comboItems];

const filteredItems = allRegisterItems.filter((item) => {
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

${item.isCombo ? `
  <p class="combo-card-items">
    ${(item.comboItems || [])
      .map((comboItem) => `${comboItem.quantity}x ${comboItem.name}`)
      .join("<br>")}
  </p>
` : ""}

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
  const isJoint = item.category.toLowerCase().includes("joint");

  if (isJoint) {
    const currentJointQuantity = getJointQuantityFromOrder();
const itemJointQuantity = getJointQuantityFromItem({
  ...item,
  quantity
});

if (itemJointQuantity > 0 && currentJointQuantity + itemJointQuantity > 5) {
  showPopup(
    "Joint Limit Reached",
    "Employees can only sell 5 joints per order.",
    "error"
  );
  return;
}
  }

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
  quantity,
  isCombo: item.isCombo || false,
  comboItems: item.comboItems || []
});
  }

  renderOrder();
}

function getJointQuantityFromItem(item) {
  if (item.category?.toLowerCase().includes("joint")) {
    return item.quantity || 0;
  }

  if (item.isCombo) {
    const comboJointQuantity = (item.comboItems || []).reduce((total, comboItem) => {
      if (comboItem.category?.toLowerCase().includes("joint")) {
        return total + Number(comboItem.quantity || 0);
      }

      return total;
    }, 0);

    return comboJointQuantity * (item.quantity || 1);
  }

  return 0;
}

function orderIncludesJoints() {
  return currentOrder.some((item) => {
    return getJointQuantityFromItem(item) > 0;
  });
}

function getJointQuantityFromOrder() {
  return currentOrder.reduce((total, item) => {
    return total + getJointQuantityFromItem(item);
  }, 0);
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
  const isJoint = item.category.toLowerCase().includes("joint");

  if (isJoint && getJointQuantityFromOrder() + 1 > 5) {
    showPopup(
      "Joint Limit Reached",
      "Employees can only sell 5 joints per order.",
      "error"
    );
    return;
  }

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

let finalTotal = total;

if (selectedMembership) {
  const membershipDiscount = Math.round(total * 0.05);
  finalTotal = Math.max(total - membershipDiscount, 0);

  const discountRow = document.createElement("div");
  discountRow.classList.add("order-summary-row");

  discountRow.innerHTML = `
    <div class="order-item-info">
      <span class="order-item-name">VIP Discount</span>

      <span class="order-item-price">
        5% off paid items
      </span>
    </div>

    <div class="order-actions">
      <strong>-$${membershipDiscount.toLocaleString()}</strong>
    </div>
  `;

  orderSummary.appendChild(discountRow);
}

orderTotal.textContent = finalTotal.toLocaleString();
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

setupCustomModalSelect(
  membershipJointTrigger,
  membershipJointMenu,
  membershipJointSelect,
  null
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

  if (
  membershipJointMenu &&
  !event.target.closest("#membershipJointTrigger") &&
  !event.target.closest("#membershipJointMenu")
) {
  membershipJointMenu.classList.remove("open");
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
const now = new Date();

snapshot.forEach((docSnap) => {
  const membership = {
    id: docSnap.id,
    ...docSnap.data()
  };

  const expiresAt = membership.expiresAt?.toDate
    ? membership.expiresAt.toDate()
    : null;

  if (!expiresAt || expiresAt > now) {
    memberships.push(membership);
  }
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

function loadMembershipJointOptions() {
  if (!membershipJointMenu) return;

  membershipJointMenu.innerHTML = "";

  addModalSelectOption(membershipJointMenu, "", "Select joint");

  const jointItems = menuItems.filter((item) =>
    item.category.toLowerCase().includes("joint")
  );

  jointItems.sort((a, b) => a.name.localeCompare(b.name));

  jointItems.forEach((joint) => {
    addModalSelectOption(membershipJointMenu, joint.id, joint.name);
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
  setupTabBtn.addEventListener("click", () => {
    const existingTabId = existingTabSelect.value;
    const existingTabName = existingTabTrigger.dataset.selectedName || "";

    if (!existingTabId) {
      showPopup(
        "No Tab Selected",
        "Please select an existing tab.",
        "error"
      );
      return;
    }

    selectedTab = {
      id: existingTabId,
      name: existingTabName
    };

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
      name: membershipName,
      customerName: membershipName.split(" - ")[0]
    };

    selectedTab = null;

    redeemMembershipBtn.textContent = `VIP: ${selectedMembership.customerName}`;
    toggleTabBtn.textContent = "Toggle Tab";

    closeModal(membershipModal);
    openModal(membershipJointModal);
  });
}

if (cancelMembershipJointBtn) {
  cancelMembershipJointBtn.addEventListener("click", () => {
    selectedMembership = null;
    redeemMembershipBtn.textContent = "Redeem Membership";
    closeModal(membershipJointModal);
  });
}

if (confirmMembershipJointBtn) {
  confirmMembershipJointBtn.addEventListener("click", () => {
    const jointId = membershipJointSelect.value;

    if (!jointId) {
      showPopup(
        "No Joint Selected",
        "Please select which joint the VIP customer wants.",
        "error"
      );
      return;
    }

    const selectedJoint = menuItems.find((item) => item.id === jointId);

    if (!selectedJoint) {
      showPopup(
        "Joint Not Found",
        "Please refresh and try again.",
        "error"
      );
      return;
    }

    const existingPaidJoints = currentOrder.filter((item) => {
      return (
        item.category.toLowerCase().includes("joint") &&
        !item.membershipFreeJoint
      );
    });

    if (existingPaidJoints.length > 0) {
      showPopup(
        "Remove Existing Joints",
        "Please remove any joints already in the basket before redeeming VIP joints.",
        "error",
        5000
      );
      return;
    }

    currentOrder = currentOrder.filter(
      (item) => !item.membershipFreeJoint
    );

    currentOrder.push({
      id: `vip-free-${selectedJoint.id}`,
      originalItemId: selectedJoint.id,
      name: `VIP Free ${selectedJoint.name}`,
      price: 0,
      originalPrice: selectedJoint.price,
      category: selectedJoint.category,
      quantity: 5,
      membershipFreeJoint: true
    });

    renderOrder();

    closeModal(membershipJointModal);

    showPopup(
      "VIP Joints Added",
      `5 free ${selectedJoint.name} joints have been added to the basket.`
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

if (membershipJointModal) {
  membershipJointModal.addEventListener("click", (event) => {
    if (event.target === membershipJointModal) {
      closeModal(membershipJointModal);
    }
  });
}

submitOrderBtn.addEventListener("click", async () => {
  const employeeName = employeeSelect.value;
  const customerName = selectedMembership
  ? selectedMembership.name.split(" - ")[0]
  : document.getElementById("customerName").value.trim();
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

  const membershipDiscount = selectedMembership
  ? Math.round(total * 0.05)
  : 0;

const finalTotal = Math.max(total - membershipDiscount, 0);

const orderData = {
  employee: employeeName,
  customer: customerName,
  citizenId: citizenId || null,
  requiresCitizenId: orderIncludesJoints(),
  items: currentOrder,
  total: finalTotal,
  originalTotal: total,
  membershipDiscount,
  finalTotal,
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
  orderData.customer = customerName;
  orderData.membershipDiscountRate = 0.05;
  orderData.membershipDiscount = membershipDiscount;
  orderData.finalTotal = finalTotal;
}

await addDoc(collection(db, "orders"), orderData);

if (orderIncludesMembershipPlan() && !selectedMembership) {
  const expiresAtDate = new Date();
  expiresAtDate.setMonth(expiresAtDate.getMonth() + 1);

  await addDoc(collection(db, "memberships"), {
    name: customerName,
    plan: "Kushy's Royalty VIP Plan",
    active: true,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAtDate),
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