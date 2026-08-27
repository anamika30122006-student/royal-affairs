/* Customer Account Dashboard for Royal Affair - Designer Suits */

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("account-dashboard-content")) {
    initAccountDashboard();
  }
});

// Setup mock orders if none exist
function seedMockOrders() {
  let orders = JSON.parse(localStorage.getItem("royal_affair_orders")) || [];
  
  if (orders.length === 0) {
    orders = [
      {
        orderId: "RA-481903",
        date: "May 12, 2026",
        total: 15900,
        status: "Delivered",
        items: [
          {
            id: 2,
            name: "Mehr Festive Anarkali Set",
            price: 15900,
            quantity: 1,
            size: "M",
            color: "Deep Plum",
            image: "./assets/images/sharara_plum.jpg"
          }
        ],
        shippingDetails: {
          name: "Aishwarya Sen",
          address: "Flat 4B, Regency Heights, Sector 62, Noida, Uttar Pradesh - 201301",
          phone: "9876543210",
          email: "aishwarya@example.com",
          deliveryMethod: "standard",
          paymentMethod: "UPI"
        }
      },
      {
        orderId: "RA-294810",
        date: "January 28, 2026",
        total: 26800,
        status: "Delivered",
        items: [
          {
            id: 3,
            name: "Meher Festive Anarkali Set",
            price: 10900,
            quantity: 1,
            size: "M",
            color: "Emerald Green",
            image: "./assets/images/kameez_ivory.jpg"
          },
          {
            id: 1,
            name: "Gulnaar Wedding Sharara Set",
            price: 15900,
            quantity: 1,
            size: "M",
            color: "Crimson Red",
            image: "./assets/images/anarkali_maroon.jpg"
          }
        ],
        shippingDetails: {
          name: "Aishwarya Sen",
          address: "Flat 4B, Regency Heights, Sector 62, Noida, Uttar Pradesh - 201301",
          phone: "9876543210",
          email: "aishwarya@example.com",
          deliveryMethod: "express",
          paymentMethod: "Card"
        }
      }
    ];
    localStorage.setItem("royal_affair_orders", JSON.stringify(orders));
  }
}

// Seed mock address book if none exists
function seedMockAddresses() {
  let addrList = JSON.parse(localStorage.getItem("royal_affair_addresses")) || [];
  if (addrList.length === 0) {
    addrList = [
      {
        fullname: "Aishwarya Sen",
        line1: "Flat 4B, Regency Heights",
        line2: "Sector 62",
        city: "Noida",
        state: "Uttar Pradesh",
        pin: "201301",
        phone: "9876543210",
        isDefault: true
      },
      {
        fullname: "Aishwarya Sen",
        line1: "Heritage Mansion",
        line2: "Mall Road",
        city: "Meerut",
        state: "Uttar Pradesh",
        pin: "250001",
        phone: "9219956289",
        isDefault: false
      }
    ];
    localStorage.setItem("royal_affair_addresses", JSON.stringify(addrList));
  }
}

function initAccountDashboard() {
  if (typeof ensureCustomerStorageIsolation === "function") ensureCustomerStorageIsolation();
  
  let user = JSON.parse(localStorage.getItem("royal_affair_user"));
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Populate welcome names
  const welcomeName = document.getElementById("account-welcome-name");
  const dashName = document.getElementById("dash-welcome-fullname");
  if (welcomeName) welcomeName.textContent = user.firstName;
  if (dashName) dashName.textContent = `${user.firstName} ${user.lastName}`;

  // Populate UI inputs in profile form
  const profileForm = document.getElementById("profile-form");
  if (profileForm) {
    document.getElementById("profile-fname").value = user.firstName || "";
    document.getElementById("profile-lname").value = user.lastName || "";
    document.getElementById("profile-email").value = user.email || "";
    document.getElementById("profile-phone").value = user.phone || "";
    
    // Bind profile submit
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (typeof validateForm === "function" && !validateForm(profileForm)) return;

      const updatedUser = {
        firstName: document.getElementById("profile-fname").value.trim(),
        lastName: document.getElementById("profile-lname").value.trim(),
        email: document.getElementById("profile-email").value.trim(),
        phone: document.getElementById("profile-phone").value.trim()
      };

      localStorage.setItem("royal_affair_user", JSON.stringify(updatedUser));
      showToast("Profile details updated successfully.", "success");
      
      if (welcomeName) welcomeName.textContent = updatedUser.firstName;
      if (dashName) dashName.textContent = `${updatedUser.firstName} ${updatedUser.lastName}`;
    });
  }

  // Bind Address form submission
  const addrForm = document.getElementById("address-add-form");
  if (addrForm) {
    addrForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveAddressFromForm();
    });
  }

  // Sync dashboard widgets
  syncDashboardWidgets();

  // Load addresses card grid
  renderAddressesCards();

  // Load orders table
  renderOrdersTable();

  // Setup tab switcher
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add("active");
    });
  });
}

// Redirect and switch tab directly
window.switchTabDirect = function(tabId) {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabButtons.forEach(b => b.classList.remove("active"));
  tabPanes.forEach(p => p.classList.remove("active"));

  const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (targetBtn) targetBtn.classList.add("active");

  const pane = document.getElementById(tabId);
  if (pane) pane.classList.add("active");
}

// Populate Dashboard count widgets
function syncDashboardWidgets() {
  // Wishlist count
  const wishlist = JSON.parse(localStorage.getItem("royal_affair_wishlist")) || [];
  const wishCountEl = document.getElementById("dash-wishlist-count");
  if (wishCountEl) wishCountEl.textContent = wishlist.length;

  // Orders count
  const orders = JSON.parse(localStorage.getItem("royal_affair_orders")) || [];
  const orderCountEl = document.getElementById("dash-orders-count");
  if (orderCountEl) orderCountEl.textContent = orders.length;

  // Default address text
  const addrList = JSON.parse(localStorage.getItem("royal_affair_addresses")) || [];
  const defaultAddr = addrList.find(addr => addr.isDefault === true) || addrList[0];
  const addrTxtEl = document.getElementById("dash-default-address");
  if (addrTxtEl) {
    if (defaultAddr) {
      addrTxtEl.innerHTML = `<strong>${defaultAddr.fullname}</strong><br>${defaultAddr.line1}, ${defaultAddr.city}, ${defaultAddr.state} - ${defaultAddr.pin}`;
    } else {
      addrTxtEl.textContent = "No addresses saved yet.";
    }
  }

  // Recent order display card
  const recentOrderEl = document.getElementById("dash-recent-order-container");
  if (recentOrderEl) {
    const lastOrder = orders[0];
    if (lastOrder) {
      recentOrderEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
          <span style="font-weight: 700;">ID: #${lastOrder.orderId}</span>
          <span style="font-size: 0.85rem; color: var(--color-gray); font-weight: 500;">Placed on: ${lastOrder.date}</span>
        </div>
        <div style="font-size: 0.9rem; color: var(--color-charcoal-light); margin-bottom: 1rem; line-height: 1.4;">
          Status: <strong style="color:var(--color-maroon);">${lastOrder.status}</strong><br>
          Total Payable: <strong>${formatCurrency(lastOrder.total)}</strong>
        </div>
        <button onclick="switchTabDirect('orders-pane')" class="btn btn-outline btn-sm" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600;">View Entire History</button>
      `;
    } else {
      recentOrderEl.innerHTML = `<p style="color:var(--color-gray); margin:0;">No orders booked yet.</p>`;
    }
  }
}

// Render addresses book grid
function renderAddressesCards() {
  const grid = document.getElementById("addresses-cards-grid");
  if (!grid) return;

  const addrList = JSON.parse(localStorage.getItem("royal_affair_addresses")) || [];

  if (addrList.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: var(--color-gray); border: 1px dashed var(--color-gray-light); border-radius: var(--border-radius-xs);">
        No saved addresses in address book.
      </div>
    `;
    return;
  }

  grid.innerHTML = addrList.map((addr, index) => `
    <div style="background-color: var(--color-white); border: 1.5px solid ${addr.isDefault ? 'var(--color-maroon)' : 'var(--color-gray-light)'}; padding: 1.5rem; border-radius: var(--border-radius-xs); box-shadow: var(--shadow-sm); position: relative; display: flex; flex-direction: column;">
      ${addr.isDefault ? '<span style="position:absolute; top:-10px; right:15px; background-color:var(--color-maroon); color:var(--color-white); font-size:0.7rem; padding: 2px 8px; font-weight:600; border-radius: 10px;">DEFAULT</span>' : ''}
      <strong style="display:block; font-size:1.1rem; color:var(--color-maroon-dark); margin-bottom: 0.5rem;">${addr.fullname}</strong>
      <p style="font-size:0.9rem; color:var(--color-charcoal-light); margin:0 0 1rem 0; line-height:1.4; flex:1;">
        ${addr.line1}<br>
        ${addr.line2 ? addr.line2 + '<br>' : ''}
        ${addr.city}, ${addr.state} - ${addr.pin}<br>
        Phone: ${addr.phone}
      </p>
      
      <div style="display:flex; gap:0.5rem; border-top:1px solid var(--color-gray-light); padding-top:0.75rem; font-size:0.8rem; font-weight:600;">
        <button onclick="editAddress(${index})" style="background:none; border:none; color:var(--color-charcoal); cursor:pointer; text-decoration:underline;">Edit</button>
        <button onclick="deleteAddress(${index})" style="background:none; border:none; color:var(--color-error); cursor:pointer; text-decoration:underline; margin-left: 0.5rem;">Delete</button>
        ${!addr.isDefault ? `<button onclick="setDefaultAddress(${index})" style="background:none; border:none; color:var(--color-gold-dark); cursor:pointer; text-decoration:underline; margin-left: auto;">Set Default</button>` : ''}
      </div>
    </div>
  `).join("");
}

// Collapsible address form toggle
window.toggleAddAddressForm = function() {
  const wrapper = document.getElementById("add-address-form-wrapper");
  const btn = document.getElementById("toggle-add-addr-btn");
  if (!wrapper) return;

  if (wrapper.style.display === "none") {
    wrapper.style.display = "block";
    btn.textContent = "Close Form";
    // Reset form values
    document.getElementById("address-add-form").reset();
    document.getElementById("edit-address-index").value = "-1";
    document.getElementById("address-form-title").textContent = "Add New Address";
  } else {
    wrapper.style.display = "none";
    btn.textContent = "+ Add New Address";
  }
}

window.cancelAddressForm = function() {
  const wrapper = document.getElementById("add-address-form-wrapper");
  const btn = document.getElementById("toggle-add-addr-btn");
  if (wrapper) wrapper.style.display = "none";
  if (btn) btn.textContent = "+ Add New Address";
}

// Save Address details
function saveAddressFromForm() {
  const index = parseInt(document.getElementById("edit-address-index").value);
  const fullname = document.getElementById("addr-fullname").value.trim();
  const line1 = document.getElementById("addr-line1").value.trim();
  const line2 = document.getElementById("addr-line2").value.trim();
  const city = document.getElementById("addr-city").value.trim();
  const state = document.getElementById("addr-state").value.trim();
  const pin = document.getElementById("addr-pin").value.trim();
  const phone = document.getElementById("addr-phone").value.trim();
  const isDefault = document.getElementById("addr-default").checked;

  let addrList = JSON.parse(localStorage.getItem("royal_affair_addresses")) || [];

  const newAddr = { fullname, line1, line2, city, state, pin, phone, isDefault };

  if (isDefault) {
    // Unmark other default flags
    addrList.forEach(addr => addr.isDefault = false);
  }

  if (index > -1) {
    // Edit existing address
    addrList[index] = newAddr;
    showToast("Address updated successfully.", "success");
  } else {
    // Add new address
    if (addrList.length === 0) newAddr.isDefault = true; // First item is default
    addrList.push(newAddr);
    showToast("New address added successfully.", "success");
  }

  localStorage.setItem("royal_affair_addresses", JSON.stringify(addrList));
  cancelAddressForm();
  renderAddressesCards();
  syncDashboardWidgets();
}

// Edit address values
window.editAddress = function(index) {
  const addrList = JSON.parse(localStorage.getItem("royal_affair_addresses")) || [];
  const addr = addrList[index];
  if (!addr) return;

  // Open form
  const wrapper = document.getElementById("add-address-form-wrapper");
  const btn = document.getElementById("toggle-add-addr-btn");
  if (wrapper) wrapper.style.display = "block";
  if (btn) btn.textContent = "Close Form";

  // Pre-fill values
  document.getElementById("edit-address-index").value = index;
  document.getElementById("address-form-title").textContent = "Edit Address";
  document.getElementById("addr-fullname").value = addr.fullname;
  document.getElementById("addr-line1").value = addr.line1;
  document.getElementById("addr-line2").value = addr.line2 || "";
  document.getElementById("addr-city").value = addr.city;
  document.getElementById("addr-state").value = addr.state;
  document.getElementById("addr-pin").value = addr.pin;
  document.getElementById("addr-phone").value = addr.phone;
  document.getElementById("addr-default").checked = addr.isDefault;
}

// Delete saved address
window.deleteAddress = function(index) {
  let addrList = JSON.parse(localStorage.getItem("royal_affair_addresses")) || [];
  const wasDefault = addrList[index].isDefault;

  addrList.splice(index, 1);
  
  // If deleted item was default, set next item as default
  if (wasDefault && addrList.length > 0) {
    addrList[0].isDefault = true;
  }

  localStorage.setItem("royal_affair_addresses", JSON.stringify(addrList));
  showToast("Address deleted from address book.", "info");
  renderAddressesCards();
  syncDashboardWidgets();
}

// Toggle default address
window.setDefaultAddress = function(index) {
  let addrList = JSON.parse(localStorage.getItem("royal_affair_addresses")) || [];
  
  addrList.forEach((addr, idx) => {
    addr.isDefault = (idx === index);
  });

  localStorage.setItem("royal_affair_addresses", JSON.stringify(addrList));
  showToast("Default address updated.", "success");
  renderAddressesCards();
  syncDashboardWidgets();
}

// Render My Orders table
function renderOrdersTable() {
  const container = document.getElementById("orders-table-container");
  if (!container) return;
  const localOrders = JSON.parse(localStorage.getItem("royal_affair_orders")) || [];

  // If user is logged in, try fetching orders from backend to reflect real statuses
  const user = JSON.parse(localStorage.getItem("royal_affair_user")) || null;
  if (user && user.email) {
    const API_BASE = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "http://127.0.0.1:8000/api/v1";
    fetch(`${API_BASE}/orders?email=${encodeURIComponent(user.email)}`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        if (data && Array.isArray(data.orders)) {
          const serverOrders = data.orders.map(o => ({
            orderId: o.order_number || o.id,
            date: new Date(o.created_at).toLocaleDateString("en-IN", { year: 'numeric', month: 'long', day: 'numeric' }),
            total: o.total_amount || o.total || 0,
            status: o.status || 'Processing',
            items: o.items || [],
            shippingDetails: {
              name: o.customer_name,
              address: o.shipping_address || '',
              phone: o.customer_phone || '',
              email: o.customer_email || user.email,
              deliveryMethod: o.delivery_method || 'standard',
              paymentMethod: o.payment_method || o.payment || 'Unknown',
              paymentId: o.razorpay_payment_id || null
            }
          }));
          localStorage.setItem("royal_affair_orders", JSON.stringify(serverOrders));
          renderOrdersFromArray(serverOrders);
          return;
        }
        renderOrdersFromArray(localOrders);
      })
      .catch(() => {
        renderOrdersFromArray(localOrders);
      });
    return;
  }
  renderOrdersFromArray(localOrders);
}

function renderOrdersFromArray(orders) {
  const container = document.getElementById("orders-table-container");
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--color-gray); border: 1px dashed var(--color-gray-light); border-radius: var(--border-radius-xs);">
        <p style="margin: 0 0 1rem 0;">You have not placed any orders yet.</p>
        <a href="shop.html" class="btn btn-primary btn-sm" style="display:inline-block; padding: 0.5rem 1.5rem; text-decoration:none;">Shop Collection</a>
      </div>
    `;
    return;
  }

  let tableRows = "";
  orders.forEach(order => {
    let itemsSummary = order.items.map(item => `• ${item.name} (${item.size}) &times; ${item.quantity}`).join("<br>");
    
    let statusColor = "var(--color-maroon)";
    if (order.status.toLowerCase() === "delivered") statusColor = "var(--color-success)";
    else if (order.status.toLowerCase() === "processing") statusColor = "#E65100";

    tableRows += `
      <tr style="border-bottom: 1px solid var(--color-gray-light);">
        <td style="padding: 1.25rem 0.75rem;"><strong>#${order.orderId}</strong></td>
        <td style="padding: 1.25rem 0.75rem;">${order.date}</td>
        <td style="padding: 1.25rem 0.75rem; font-weight: 700; color: var(--color-maroon);">${formatCurrency(order.total)}</td>
        <td style="padding: 1.25rem 0.75rem;">
          <span style="display: inline-block; padding: 2px 8px; background-color: var(--color-beige); color: ${statusColor}; font-size: 0.8rem; font-weight: 600; border-radius: 10px;">
            ${order.status}
          </span>
        </td>
        <td style="padding: 1.25rem 0.75rem; display: flex; gap: 0.5rem; align-items: center; justify-content: center; flex-wrap: wrap;">
          <button onclick="toggleOrderDetailsCard('${order.orderId}')" class="btn btn-outline btn-sm" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; font-weight:600;">Details</button>
          <a href="order-tracking.html?id=${order.orderId}" class="btn btn-primary btn-sm" style="padding: 0.35rem 0.65rem; font-size: 0.75rem; text-decoration:none;">Track</a>
        </td>
      </tr>
      
      <!-- Collapsible Order Details Block Row -->
      <tr id="details-${order.orderId}" style="display: none; background-color: var(--color-white-dark);">
        <td colspan="5" style="padding: 1.5rem; text-align: left; border-bottom: 1.5px solid var(--color-gray-light);">
          <div style="background-color: var(--color-white); border: 1px solid var(--color-gray-light); padding: 1.25rem; border-radius: var(--border-radius-xs);">
            <h4 style="font-family: var(--font-heading); font-size: 1.15rem; color: var(--color-maroon-dark); margin: 0 0 1rem 0; border-bottom: 1px dashed var(--color-gray-light); padding-bottom: 0.5rem;">Ordered Products Details</h4>
            
            <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.25rem;">
              ${order.items.map(item => `
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <img src="${item.image}" alt="${item.name}" style="width: 40px; height: 55px; object-fit: cover; border-radius: var(--border-radius-xs); border: 1px solid var(--color-gray-light);">
                  <div style="flex: 1;">
                    <span style="font-weight: 600; font-size: 0.9rem; color: var(--color-charcoal);">${item.name}</span><br>
                    <span style="font-size: 0.75rem; color: var(--color-gray);">Size: ${item.size} | Color: ${item.color || 'Default'} | Qty: ${item.quantity}</span>
                  </div>
                  <span style="font-weight: 500; font-size: 0.9rem;">${formatCurrency(item.price * item.quantity)}</span>
                </div>
              `).join("")}
            </div>
            
            <div style="font-size: 0.85rem; color: var(--color-charcoal-light); line-height: 1.4; border-top: 1px solid var(--color-gray-light); padding-top: 0.75rem;">
              <strong>Delivery Mode</strong>: ${order.shippingDetails.deliveryMethod === 'express' ? 'Express Courier Courier' : 'Standard Shipping'}<br>
              <strong>Payment Option</strong>: ${order.shippingDetails.paymentMethod === 'COD' ? 'Cash on Delivery (COD)' : order.shippingDetails.paymentMethod + ' Electronic'}<br>
              <strong>Shipping Address</strong>: ${order.shippingDetails.address}
            </div>
          </div>
        </td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div class="table-responsive" style="overflow-x: auto; background-color: var(--color-white); padding: 1.5rem; border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); box-shadow: var(--shadow-sm);">
      <table class="royal-table" style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 1.5px solid var(--color-maroon); font-family: var(--font-heading); font-size: 0.95rem; color: var(--color-maroon-dark);">
            <th style="padding-bottom: 1rem; width: 18%;">Order ID</th>
            <th style="padding-bottom: 1rem; width: 22%;">Date</th>
            <th style="padding-bottom: 1rem; width: 20%;">Total Amount</th>
            <th style="padding-bottom: 1rem; width: 18%;">Status</th>
            <th style="padding-bottom: 1rem; width: 22%; text-align: center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;
}

// Toggle collapsible details
window.toggleOrderDetailsCard = function(orderId) {
  const card = document.getElementById(`details-${orderId}`);
  if (card) {
    card.style.display = card.style.display === "none" ? "table-row" : "none";
  }
}

// Log out session
window.handleLogout = function() {
  const auth = JSON.parse(localStorage.getItem("royal_affair_auth_state") || "null");
  if (auth?.email && typeof saveCurrentCustomerData === "function") saveCurrentCustomerData(auth.email);
  if (typeof clearActiveCustomerData === "function") clearActiveCustomerData();
  localStorage.removeItem("royal_affair_storage_owner");
  localStorage.removeItem("royal_affair_auth_state");
  localStorage.removeItem("royal_affair_access_token");
  localStorage.removeItem("royal_affair_refresh_token");
  localStorage.removeItem("royal_affair_user");
  showToast("Logged out successfully.", "info");
  setTimeout(() => {
    window.location.href = "login.html";
  }, 1000);
}
