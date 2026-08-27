/* =========================================================
   Checkout Workflow — Royal Affair Designer Suits
   - Real cart items loaded from localStorage
   - Full validation per step
   - Non-COD payments → Razorpay popup → verify → save order
   - COD → direct order POST to /api/v1/orders
   - Cart cleared ONLY after confirmed success
   - Form + cart preserved on any failure
   ========================================================= */

let currentStep = 1;
let selectedDelivery = "standard";
let selectedPayment  = "UPI";   // UPI | Card | NetBanking | COD

const API_BASE = (typeof API_BASE_URL !== "undefined") ? API_BASE_URL : "http://127.0.0.1:8000/api/v1";

// ─── Formatter ───────────────────────────────────────────
function fmtINR(amount) {
  return "₹" + parseFloat(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });
}
window.formatCurrency = fmtINR;

// ─── Boot ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("checkout-form")) {
    initCheckoutPage();
  }
});

function initCheckoutPage() {
  const cart = JSON.parse(localStorage.getItem("royal_affair_cart")) || [];

  if (cart.length === 0) {
    window.location.href = "cart.html";
    return;
  }

  // Auto-fill from logged-in user
  const user = JSON.parse(localStorage.getItem("royal_affair_user")) || null;
  if (user) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || "";
    _setVal("contact-name",      fullName);
    _setVal("contact-email",     user.email || "");
    _setVal("contact-phone",     user.phone || "");
    _setVal("shipping-fullname", fullName);
    _setVal("shipping-addr1",    user.address || "");
    _setVal("shipping-city",     user.city || "");
    _setVal("shipping-state",    user.state || "");
    _setVal("shipping-pin",      user.postalCode || "");
  }

  renderSummaryItems(cart);

  window.updatePrices = function () {
    const totals = calcTotals(selectedDelivery, selectedPayment);
    _setText("checkout-subtotal", fmtINR(totals.subtotal));
    _setText("checkout-shipping", totals.shipping === 0 ? "FREE" : fmtINR(totals.shipping));
    _setText("checkout-total",    fmtINR(totals.total));

    const discountRow = document.getElementById("checkout-discount");
    if (discountRow) {
      if (totals.discount > 0) {
        discountRow.parentElement.style.display = "flex";
        discountRow.textContent = "- " + fmtINR(totals.discount);
      } else {
        discountRow.parentElement.style.display = "none";
      }
    }

    let codRow = document.getElementById("summary-cod-surcharge-row");
    if (totals.paymentSurcharge > 0) {
      if (!codRow) {
        codRow = document.createElement("div");
        codRow.id = "summary-cod-surcharge-row";
        codRow.style.cssText = "display:flex;justify-content:space-between;margin-bottom:0.75rem;font-size:0.9rem;color:var(--color-charcoal-light);";
        codRow.innerHTML = `<span>COD Convenience Fee</span><span class="surcharge-val"></span>`;
        const shippingEl = document.getElementById("checkout-shipping");
        if (shippingEl) shippingEl.parentElement.insertAdjacentElement("afterend", codRow);
      }
      codRow.style.display = "flex";
      codRow.querySelector(".surcharge-val").textContent = fmtINR(totals.paymentSurcharge);
    } else if (codRow) {
      codRow.style.display = "none";
    }

    const standardLabel = document.getElementById("standard-price-label");
    if (standardLabel) {
      standardLabel.textContent = "FREE";
    }
  };

  updatePrices();
  initCouponHandling();
  setupRealtimeValidations();
}

// ─── Render sidebar cart items ───────────────────────────
function renderSummaryItems(cart) {
  const el = document.getElementById("checkout-summary-items");
  if (!el) return;
  el.innerHTML = cart.map(item => {
    const img   = typeof resolveProductImage === "function" ? resolveProductImage(item.image || item.thumbnail) : (item.image || item.thumbnail || "./assets/images/anarkali_maroon.jpg");
    const size  = item.size  || "M";
    const color = item.color || "—";
    const line  = (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
    return `
      <div style="display:flex;gap:1rem;align-items:center;margin-bottom:1.25rem;">
        <div style="position:relative;flex-shrink:0;">
          <img src="${img}" alt="${item.name}"
            style="width:55px;height:75px;object-fit:cover;border-radius:var(--border-radius-xs);border:1px solid var(--color-gray-light);"
            onerror="handleImageError(this)">
          <span style="position:absolute;top:-5px;right:-5px;background:var(--color-maroon);color:#fff;font-size:0.7rem;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;">${item.quantity}</span>
        </div>
        <div style="flex:1;text-align:left;">
          <h4 style="font-family:var(--font-heading);font-size:0.95rem;color:var(--color-maroon-dark);margin:0 0 0.15rem;line-height:1.2;">${item.name}</h4>
          <span style="font-size:0.75rem;color:var(--color-gray);">Size: ${size} | Color: ${color}</span>
        </div>
        <span style="font-weight:500;white-space:nowrap;">${fmtINR(line)}</span>
      </div>`;
  }).join("");
}

// ─── Totals calculator ───────────────────────────────────
function calcTotals(deliveryOption, paymentOption) {
  const cart     = JSON.parse(localStorage.getItem("royal_affair_cart")) || [];
  const subtotal = cart.reduce((s, i) => s + (parseFloat(i.price) || 0) * (parseInt(i.quantity) || 1), 0);
  const promo    = localStorage.getItem("royal_affair_promo") || "";

  const deliveryUpgrade  = deliveryOption === "express" ? 150 : 0;
  const paymentSurcharge = paymentOption  === "COD"     ? 100 : 0;
  const shipping         = deliveryUpgrade;

  let discount = 0;
  if (promo === "ROYAL10")   discount = subtotal * 0.10;
  else if (promo === "FIRST200") discount = Math.min(200, subtotal);

  const total = Math.max(0, subtotal - discount + shipping + paymentSurcharge);
  return { subtotal, shipping, discount, total, paymentSurcharge };
}

// ─── Coupon ──────────────────────────────────────────────
function initCouponHandling() {
  const promoInput = document.getElementById("checkout-promo-input");
  const promoBtn   = document.getElementById("checkout-promo-btn");
  const promoMsg   = document.getElementById("checkout-promo-msg");
  if (!promoBtn) return;

  const active = localStorage.getItem("royal_affair_promo") || "";
  if (active && promoInput) {
    promoInput.value    = active;
    promoInput.disabled = true;
    promoBtn.textContent = "Clear";
    if (promoMsg) { promoMsg.textContent = `Coupon ${active} applied!`; promoMsg.style.color = "var(--color-success)"; }
  }

  promoBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (localStorage.getItem("royal_affair_promo")) {
      localStorage.removeItem("royal_affair_promo");
      if (promoInput) { promoInput.value = ""; promoInput.disabled = false; }
      promoBtn.textContent = "Apply";
      if (promoMsg) promoMsg.textContent = "";
      updatePrices();
      if (typeof showToast === "function") showToast("Coupon removed.");
    } else {
      const code = promoInput ? promoInput.value.trim().toUpperCase() : "";
      if (["ROYAL10", "FIRST200", "FREESHIP"].includes(code)) {
        localStorage.setItem("royal_affair_promo", code);
        if (promoInput) promoInput.disabled = true;
        promoBtn.textContent = "Clear";
        if (promoMsg) { promoMsg.textContent = `Coupon ${code} applied!`; promoMsg.style.color = "var(--color-success)"; }
        updatePrices();
        if (typeof showToast === "function") showToast(`Coupon ${code} applied.`);
      } else {
        if (promoMsg) { promoMsg.textContent = "Invalid code. Try ROYAL10, FIRST200, or FREESHIP."; promoMsg.style.color = "var(--color-error)"; }
      }
    }
  });
}

// ─── Validators ──────────────────────────────────────────
function setupRealtimeValidations() {
  [
    ["contact-name",      validateContactName],
    ["contact-email",     validateContactEmail],
    ["contact-phone",     validateContactPhone],
    ["shipping-fullname", validateShippingName],
    ["shipping-addr1",    validateShippingAddress],
    ["shipping-city",     validateShippingCity],
    ["shipping-state",    validateShippingState],
    ["shipping-pin",      validateShippingPin],
  ].forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => fn(el));
  });
}

function validateContactName(el)    { return _val(el, "err-contact-name",      el.value.trim().length >= 3,  "Enter your full name (min 3 characters)."); }
function validateContactEmail(el)   { return _val(el, "err-contact-email",     /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()), "Enter a valid email address."); }
function validateContactPhone(el)   { return _val(el, "err-contact-phone",     el.value.trim().length === 10, "Enter a valid 10-digit mobile number."); }
function validateShippingName(el)   { return _val(el, "err-shipping-fullname", el.value.trim().length >= 3,  "Recipient name required."); }
function validateShippingAddress(el){ return _val(el, "err-shipping-addr1",    el.value.trim().length >= 5,  "Enter a valid street/house address."); }
function validateShippingCity(el)   { return _val(el, "err-shipping-city",     el.value.trim().length >= 2,  "City name required."); }
function validateShippingState(el)  { return _val(el, "err-shipping-state",    el.value.trim().length >= 2,  "State name required."); }
function validateShippingPin(el)    { return _val(el, "err-shipping-pin",      el.value.trim().length === 6, "Enter a valid 6-digit PIN code."); }

function _val(el, errId, isValid, msg) {
  const e = document.getElementById(errId);
  if (isValid) {
    if (e) e.style.display = "none";
    el.style.borderColor = "var(--color-gray-light)";
    return true;
  }
  if (e) { e.textContent = msg; e.style.display = "block"; }
  el.style.borderColor = "var(--color-error)";
  return false;
}

// ─── Delivery / Payment selectors ────────────────────────
window.selectDeliveryOption = function(option) {
  selectedDelivery = option;
  const s = document.getElementById("deliv-method-label-standard");
  const x = document.getElementById("deliv-method-label-express");
  if (s) s.style.borderColor = option === "standard" ? "var(--color-maroon)" : "var(--color-gray-light)";
  if (x) x.style.borderColor = option === "express"  ? "var(--color-maroon)" : "var(--color-gray-light)";
  updatePrices();
};

window.selectPaymentOption = function(option) {
  selectedPayment = option.toUpperCase();
  ["upi", "card", "net", "cod"].forEach(k => {
    const el = document.getElementById(`pay-method-label-${k}`);
    if (el) el.style.borderColor = option.toLowerCase() === k ? "var(--color-maroon)" : "var(--color-gray-light)";
  });
  updatePrices();
};

// ─── Multi-step navigation ───────────────────────────────
window.triggerNextStep = function() {
  if (currentStep === 1) {
    const ok = validateContactName(document.getElementById("contact-name"))
             & validateContactEmail(document.getElementById("contact-email"))
             & validateContactPhone(document.getElementById("contact-phone"));
    if (!ok) { _toast("Please fix contact details.", "error"); return; }
  } else if (currentStep === 2) {
    const ok = validateShippingName(document.getElementById("shipping-fullname"))
             & validateShippingAddress(document.getElementById("shipping-addr1"))
             & validateShippingCity(document.getElementById("shipping-city"))
             & validateShippingState(document.getElementById("shipping-state"))
             & validateShippingPin(document.getElementById("shipping-pin"));
    if (!ok) { _toast("Please fix shipping address.", "error"); return; }
  }
  currentStep++;
  switchStepDisplay();
};

window.triggerPrevStep = function() {
  currentStep--;
  switchStepDisplay();
};

function switchStepDisplay() {
  document.querySelectorAll(".checkout-step-pane").forEach(p => p.style.display = "none");
  const active = document.getElementById(`checkout-step-pane-${currentStep}`);
  if (active) active.style.display = "block";

  document.querySelectorAll(".progress-step").forEach((el, i) => {
    const on = i + 1 === currentStep;
    el.style.color      = on ? "var(--color-maroon)" : "var(--color-gray)";
    el.style.fontWeight = on ? "600" : "500";
    el.classList.toggle("active", on);
  });

  const prevBtn  = document.getElementById("prev-step-btn");
  const nextBtn  = document.getElementById("next-step-btn");
  const placeBtn = document.getElementById("place-order-btn");
  if (prevBtn)  prevBtn.style.display  = currentStep > 1 ? "block" : "none";
  if (nextBtn)  nextBtn.style.display  = currentStep < 5 ? "block" : "none";
  if (placeBtn) placeBtn.style.display = currentStep === 5 ? "block" : "none";

  if (currentStep === 5) buildReviewSummary();
}

// ─── Review ──────────────────────────────────────────────
function buildReviewSummary() {
  const name     = _getVal("contact-name");
  const email    = _getVal("contact-email");
  const phone    = _getVal("contact-phone");
  const shipName = _getVal("shipping-fullname");
  const addr1    = _getVal("shipping-addr1");
  const addr2    = _getVal("shipping-addr2");
  const landmark = _getVal("shipping-landmark");
  const city     = _getVal("shipping-city");
  const state    = _getVal("shipping-state");
  const pin      = _getVal("shipping-pin");
  const addrType = (document.querySelector('input[name="shipping_type"]:checked') || {}).value || "Home";

  const delivLabel = selectedDelivery === "express" ? "Express Courier (2 business days)" : "Standard Shipping (4–6 business days)";

  // Show Razorpay badge for online payments
  let payLabel = selectedPayment === "COD" ? "Cash on Delivery (COD)" : `${selectedPayment} via Razorpay`;

  _setHTML("rev-contact-summary",  `<strong>${name}</strong><br>Email: ${email}<br>Phone: +91 ${phone}`);
  _setHTML("rev-shipping-summary", `<strong>${shipName}</strong> [${addrType}]<br>${addr1}${addr2 ? ", " + addr2 : ""}${landmark ? "<br>Landmark: " + landmark : ""}<br>${city}, ${state} – ${pin}`);
  _setHTML("rev-delivery-summary", `<strong>Method:</strong> ${delivLabel}`);
  _setHTML("rev-payment-summary",  `<strong>Option:</strong> ${payLabel}`);
}

// ─── Collect form data ───────────────────────────────────
function collectFormData() {
  const name     = _getVal("contact-name");
  const email    = _getVal("contact-email");
  const phone    = _getVal("contact-phone");
  const shipName = _getVal("shipping-fullname") || name;
  const addr1    = _getVal("shipping-addr1");
  const addr2    = _getVal("shipping-addr2");
  const city     = _getVal("shipping-city");
  const state    = _getVal("shipping-state");
  const pin      = _getVal("shipping-pin");
  const addrType = (document.querySelector('input[name="shipping_type"]:checked') || {}).value || "Home";

  let shippingAddress = addr1;
  if (addr2)  shippingAddress += ", " + addr2;
  shippingAddress += `, ${city}, ${state} – ${pin} (${addrType})`;

  return { name, email, phone, shipName, shippingAddress };
}

// ─── Place Order (main handler) ──────────────────────────
window.submitMultiStepCheckout = async function() {
  const cart = JSON.parse(localStorage.getItem("royal_affair_cart")) || [];
  if (cart.length === 0) {
    _toast("Your cart is empty.", "error");
    window.location.href = "cart.html";
    return;
  }

  const { name, email, phone, shipName, shippingAddress } = collectFormData();
  if (!name || !email || !phone || !shippingAddress) {
    _toast("Please complete all required fields.", "error");
    return;
  }

  const totals = calcTotals(selectedDelivery, selectedPayment);

  // Disable button to prevent double clicks
  const placeBtn = document.getElementById("place-order-btn");
  const setBtnState = (disabled, label) => {
    if (placeBtn) { placeBtn.disabled = disabled; placeBtn.textContent = label; }
  };

  // Build items array (shared between both flows)
  const orderItems = cart.map(item => ({
    product_id: String(item.id || item.product_id || ""),
    slug:       item.slug  || "",
    name:       item.name  || "Designer Suit",
    sku:        item.sku   || `RA-${item.id || "ITEM"}`,
    price:      parseFloat(item.price)    || 0,
    quantity:   parseInt(item.quantity)   || 1,
    qty:        parseInt(item.quantity)   || 1,
    size:       item.size  || "M",
    color:      item.color || "Default",
    image:      item.image || item.thumbnail || ""
  }));

  // ─────────────────────────────────────────────────────────
  // BRANCH A: COD — direct order to /api/v1/orders
  // ─────────────────────────────────────────────────────────
  if (selectedPayment === "COD") {
    setBtnState(true, "Placing Order…");

    const orderPayload = {
      customer_name:    shipName,
      customer_email:   email,
      customer_phone:   phone,
      shipping_address: shippingAddress,
      delivery_method:  selectedDelivery,
      payment_method:   "COD",
      payment_status:   "Pending",
      items:            orderItems,
      subtotal:         totals.subtotal,
      discount:         totals.discount,
      shipping_fee:     totals.shipping,
      total_amount:     totals.total
    };

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(orderPayload)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error ${res.status}`);
      }
      const created = await res.json();
      _onOrderSuccess(created.order_number || created.id, cart, totals, shipName, name, email, phone, shippingAddress, "COD");
    } catch (err) {
      setBtnState(false, "Place Order « Demo »");
      _toast("Order failed: " + err.message + ". Cart preserved.", "error");
    }
    return;
  }

  // ─────────────────────────────────────────────────────────
  // BRANCH B: Online (Razorpay) — UPI / Card / NetBanking
  // ─────────────────────────────────────────────────────────
  setBtnState(true, "Opening Payment…");

  // Step 1: Create Razorpay order on backend
  let rzOrderData;
  try {
    const res = await fetch(`${API_BASE}/payments/create-razorpay-order`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        amount:  totals.total,
        currency: "INR",
        receipt:  `receipt_${Date.now()}`,
        notes:    { customer: shipName, email }
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${res.status}`);
    }
    rzOrderData = await res.json();
  } catch (err) {
    setBtnState(false, "Place Order « Demo »");
    _toast("Could not initiate payment: " + err.message, "error");
    return;
  }

  // Step 2: Open Razorpay popup
  const rzOptions = {
    key:          rzOrderData.key_id,
    amount:       rzOrderData.amount,       // in paise
    currency:     rzOrderData.currency,
    name:         "Royal Affair",
    description:  "Designer Suit Purchase",
    image:        "./assets/images/logo.png",
    order_id:     rzOrderData.razorpay_order_id,
    prefill: {
      name:    shipName,
      email:   email,
      contact: phone
    },
    notes: {
      shipping_address: shippingAddress
    },
    theme: { color: "#731c38" },

    // ── Payment success ──────────────────────────────────
    handler: async function(response) {
      setBtnState(true, "Verifying Payment…");

      const verifyPayload = {
        razorpay_order_id:   response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature:  response.razorpay_signature,
        customer_name:       shipName,
        customer_email:      email,
        customer_phone:      phone,
        shipping_address:    shippingAddress,
        delivery_method:     selectedDelivery,
        payment_method:      selectedPayment,
        items:               orderItems,
        subtotal:            totals.subtotal,
        discount:            totals.discount,
        shipping_fee:        totals.shipping,
        total_amount:        totals.total
      };

      try {
        const vRes = await fetch(`${API_BASE}/payments/verify`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(verifyPayload)
        });
        if (!vRes.ok) {
          const errData = await vRes.json().catch(() => ({}));
          throw new Error(errData.detail || `Verification failed ${vRes.status}`);
        }
        const savedOrder = await vRes.json();
        _onOrderSuccess(
          savedOrder.order_number || savedOrder.id,
          cart, totals, shipName, name, email, phone, shippingAddress,
          selectedPayment, response.razorpay_payment_id
        );
      } catch (err) {
        setBtnState(false, "Place Order « Demo »");
        _toast("Payment received but verification failed: " + err.message + ". Please contact support.", "error");
      }
    },

    // ── Modal dismissed ──────────────────────────────────
    modal: {
      ondismiss: function() {
        setBtnState(false, "Place Order « Demo »");
        _toast("Payment cancelled. Your cart is intact.", "error");
      }
    }
  };

  if (typeof Razorpay === "undefined") {
    setBtnState(false, "Place Order « Demo »");
    _toast("Razorpay failed to load. Please refresh and try again.", "error");
    return;
  }

  const rzpInstance = new Razorpay(rzOptions);

  // Handle payment failure (card declined, network error etc.)
  rzpInstance.on("payment.failed", function(response) {
    setBtnState(false, "Place Order « Demo »");
    const reason = (response.error && response.error.description) || "Unknown error";
    _toast("Payment failed: " + reason + ". Cart is preserved.", "error");
  });

  rzpInstance.open();
};

// ─── Post-success: clear cart, save, redirect ────────────
function _onOrderSuccess(orderId, cart, totals, shipName, name, email, phone, shippingAddress, paymentMethod, paymentId) {
  const today = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });

  const lastOrder = {
    orderId: orderId,
    date:    today,
    items:   cart,
    total:   totals.total,
    status:  "Processing",
    shippingDetails: {
      name:           shipName,
      contactName:    name,
      address:        shippingAddress,
      phone:          phone,
      email:          email,
      deliveryMethod: selectedDelivery,
      paymentMethod:  paymentMethod,
      paymentId:      paymentId || null
    }
  };

  const orders = JSON.parse(localStorage.getItem("royal_affair_orders")) || [];
  orders.unshift(lastOrder);
  localStorage.setItem("royal_affair_orders",   JSON.stringify(orders));
  localStorage.setItem("royal_affair_last_order", JSON.stringify(lastOrder));

  // Clear cart ONLY on confirmed success
  localStorage.removeItem("royal_affair_cart");
  localStorage.removeItem("royal_affair_promo");
  if (typeof updateBadges === "function") updateBadges();

  _toast("Order confirmed! Redirecting to confirmation…", "success");

  setTimeout(() => {
    window.location.href = `thank-you.html?orderId=${encodeURIComponent(orderId)}`;
  }, 1200);
}

// ─── Sidebar Place Order button ──────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const sidebarBtn = document.querySelector('button[type="submit"][form="checkout-form"]');
  if (sidebarBtn) {
    sidebarBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (currentStep === 5) submitMultiStepCheckout();
      else triggerNextStep();
    });
  }
});

// ─── Utility helpers ─────────────────────────────────────
function _getVal(id) { const e = document.getElementById(id); return e ? e.value.trim() : ""; }
function _setVal(id, v) { const e = document.getElementById(id); if (e && v) e.value = v; }
function _setText(id, t) { const e = document.getElementById(id); if (e) e.textContent = t; }
function _setHTML(id, h) { const e = document.getElementById(id); if (e) e.innerHTML = h; }
function _toast(msg, type) { if (typeof showToast === "function") showToast(msg, type); }
