import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const ordersContainer = document.getElementById("ordersContainer");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const logoutBtn = document.getElementById("logoutBtn");
const orderSearch = document.getElementById("orderSearch");

const totalOrdersStat = document.getElementById("totalOrdersStat");
const pendingOrdersStat = document.getElementById("pendingOrdersStat");
const completedOrdersStat = document.getElementById("completedOrdersStat");

const prevPageBtn = document.getElementById("prevPageBtn");
const nextPageBtn = document.getElementById("nextPageBtn");
const pageInfo = document.getElementById("pageInfo");

let currentPage = 1;
const ordersPerPage = 10;

let currentOrders = [];
let selectedStatus = "all";

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

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  loadOrders();
});

function loadOrders() {
  const q = query(
    collection(db, "orders"),
    where("deleted", "==", false)
  );

  onSnapshot(q, (snapshot) => {
    currentOrders = [];

    snapshot.forEach((docSnap) => {
      currentOrders.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    currentOrders.sort((a, b) => {
      const aTime = a.timestamp?.seconds || 0;
      const bTime = b.timestamp?.seconds || 0;
      return bTime - aTime;
    });

    renderOrders();
    renderStats();
  });
}

function getFilteredOrders() {
  const searchTerm = orderSearch.value.toLowerCase().trim();

  return currentOrders.filter((order) => {
    const status = order.done ? "completed" : "pending";

    const matchesStatus =
      selectedStatus === "all" || selectedStatus === status;

    const matchesSearch =
      order.customer?.toLowerCase().includes(searchTerm) ||
      order.employee?.toLowerCase().includes(searchTerm) ||
      order.citizenId?.toLowerCase().includes(searchTerm);

    return matchesStatus && matchesSearch;
  });
}

function renderOrders() {
  const filteredOrders = getFilteredOrders();

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage) || 1;

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }
  
  const startIndex = (currentPage - 1) * ordersPerPage;
  const paginatedOrders = filteredOrders.slice(
    startIndex,
    startIndex + ordersPerPage
  );
  
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages;

  ordersContainer.innerHTML = "";

  if (filteredOrders.length === 0) {
    ordersContainer.innerHTML = `
      <div class="empty-orders-row">
        No orders found.
      </div>
    `;
    return;
  }

  paginatedOrders.forEach((order) => {
    const orderRow = document.createElement("div");
    orderRow.classList.add("orders-table-row");

    const itemCount = order.items.reduce((sum, item) => {
      return sum + item.quantity;
    }, 0);

    const orderDate = order.timestamp
      ? new Date(order.timestamp.seconds * 1000)
      : null;

    const dateText = orderDate
      ? orderDate.toLocaleDateString()
      : "Just now";

    const timeText = orderDate
      ? orderDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        })
      : "";

    const statusClass = order.done ? "status-completed" : "status-pending";
    const statusText = order.done ? "Completed" : "Pending";
    const statusIcon = order.done ? "check" : "clock-3";

    orderRow.innerHTML = `
      <div class="table-user">
        <i data-lucide="user"></i>
        <span>${order.customer}</span>
      </div>

      <div class="table-user">
        <i data-lucide="badge-check"></i>
        <span>${order.employee}</span>
      </div>

      <div class="table-items">
        <i data-lucide="clipboard-list"></i>
        <span>${itemCount} ${itemCount === 1 ? "item" : "items"}</span>

        <button class="expand-btn view-items-btn">
          <i data-lucide="chevron-down"></i>
        </button>
      </div>

      <strong class="table-total">
        $${order.total.toLocaleString()}
      </strong>

      <div class="table-id">
        ${order.citizenId ? `ID: ${order.citizenId}` : "—"}
      </div>

      <div class="order-status ${statusClass}">
        <i data-lucide="${statusIcon}"></i>
        <span>${statusText}</span>
      </div>

      <div>
        ${dateText}<br>
        <small>${timeText}</small>
      </div>

      <div class="table-actions">
        <button class="complete-order-btn ${order.done ? "is-complete" : ""}">
          <span class="check-icon">${order.done ? "✓" : ""}</span>
          <span>${order.done ? "Complete" : "Mark Complete"}</span>
        </button>
      </div>
    `;

    orderRow.querySelector(".view-items-btn").addEventListener("click", () => {
      const itemList = order.items
        .map((item) => `${item.name} x${item.quantity}`)
        .join("<br>");

      showPopup(
        "Order Items",
        itemList,
        "success",
        10000
      );
    });

    orderRow.querySelector(".complete-order-btn").addEventListener("click", async () => {
      await updateDoc(doc(db, "orders", order.id), {
        done: !order.done
      });

      showPopup(
        order.done ? "Order Reopened" : "Order Completed",
        `${order.customer}'s order has been updated.`
      );
    });

    ordersContainer.appendChild(orderRow);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

function renderStats() {
  const totalOrders = currentOrders.length;
  const completedOrders = currentOrders.filter((order) => order.done).length;
  const pendingOrders = currentOrders.filter((order) => !order.done).length;

  totalOrdersStat.textContent = totalOrders;
  pendingOrdersStat.textContent = pendingOrders;
  completedOrdersStat.textContent = completedOrders;
}

document.querySelectorAll(".status-filter").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".status-filter").forEach((btn) => {
      btn.classList.remove("active-status");
    });

    button.classList.add("active-status");
    selectedStatus = button.dataset.status;
    renderOrders();
  });
});

prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderOrders();
    }
  });
  
  nextPageBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(getFilteredOrders().length / ordersPerPage) || 1;
  
    if (currentPage < totalPages) {
      currentPage++;
      renderOrders();
    }
  });
  
  orderSearch.addEventListener("input", () => {
    currentPage = 1;
    renderOrders();
  });

clearCompletedBtn.addEventListener("click", async () => {
  const completedOrders = currentOrders.filter((order) => order.done);

  if (completedOrders.length === 0) {
    showPopup(
      "Nothing To Clear",
      "There are no completed orders to clear.",
      "error"
    );
    return;
  }

  const confirmed = confirm("Clear all completed orders?");

  if (!confirmed) return;

  for (const order of completedOrders) {
    await updateDoc(doc(db, "orders", order.id), {
      deleted: true
    });
  }

  showPopup(
    "Orders Cleared",
    "Completed orders have been hidden."
  );
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});