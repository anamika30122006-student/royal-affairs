/* Checkout Workflow for Royal Affair - Designer Suits */

let currentStep = 1;
let selectedDelivery = "standard";
let selectedPayment = "UPI";

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("checkout-form")) {
    initCheckoutPage();
  }
});

function initCheckoutPage() {
  const orderSummaryList = document.getElementById("checkout-summary-items");
  const checkoutSubtotal = document.getElementById("checkout-subtotal");
  const checkoutDiscount = document.getElementById("checkout-discount");
  const checkoutShipping = document.getElementById("checkout-shipping");
  const checkoutTotal = document.getElementById("checkout-total");
  const promoInput = document.getElementById("checkout-promo-input");
  const promoBtn = document.getElementById("checkout-promo-btn");
  const promoMsg = document.getElementById("checkout-promo-msg");

  const cart = JSON.parse(localStorage.getItem("royal_affair_cart")) || [];
  
  if (cart.length === 0) {
    window.location.href = "cart.html";
    return;
  }

  // 1. Render Summary Items
  let html = "";
  cart.forEach(item => {
    html += `
      <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.25rem;">
        <div style="position: relative;">
          <img src="${item.image}" alt="${item.name}" style="width: 55px; height: 75px; object-fit: cover; border-radius: var(--border-radius-xs); border: 1px solid var(--color-gray-light);">
          <span style="position: absolute; top: -5px; right: -5px; background: var(--color-maroon); color: var(--color-white); font-size: 0.7rem; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600;">
            ${item.quantity}
          </span>
        </div>
        <div style="flex: 1; text-align: left;">
          <h4 style="font-family: var(--font-heading); font-size: 1rem; color: var(--color-maroon-dark); margin: 0; line-height: 1.2;">${item.name}</h4>
          <span style="font-size: 0.75rem; color: var(--color-gray);">Size: ${item.size} | Color: ${item.color}</span>
        </div>
        <span style="font-weight: 500;">${formatCurrency(item.price * item.quantity)}</span>
      </div>
    `;
  });
  if (orderSummaryList) orderSummaryList.innerHTML = html;

  // 2. Apply and Update Prices
  window.updatePrices = function() {
    const totals = calculateCheckoutTotals(selectedDelivery, selectedPayment);

    if (checkoutSubtotal) checkoutSubtotal.textContent = formatCurrency(totals.subtotal);
    
    if (checkoutDiscount) {
      if (totals.discount > 0) {
        checkoutDiscount.parentElement.style.display = "flex";
        checkoutDiscount.textContent = `- ${formatCurrency(totals.discount)}`;
      } else {
        checkoutDiscount.parentElement.style.display = "none";
      }
    }
    
    if (checkoutShipping) {
      checkoutShipping.textContent = totals.shipping === 0 ? "FREE" : formatCurrency(totals.shipping);
    }
    
    // Check if COD surcharge is active and display it inside summary
    let codSurchargeEl = document.getElementById("summary-cod-surcharge-row");
    if (codSurchargeEl) {
      if (totals.paymentSurcharge > 0) {
        codSurchargeEl.style.display = "flex";
        codSurchargeEl.querySelector(".surcharge-val").textContent = formatCurrency(totals.paymentSurcharge);
      } else {
        codSurchargeEl.style.display = "none";
      }
    } else if (totals.paymentSurcharge > 0) {
      const summaryDiv = checkoutShipping.parentElement;
      const newRow = document.createElement("div");
      newRow.id = "summary-cod-surcharge-row";
      newRow.style.display = "flex";
      newRow.style.justifyContent = "space-between";
      newRow.style.marginBottom = "1.5rem";
      newRow.style.fontSize = "0.9rem";
      newRow.style.color = "var(--color-charcoal-light)";
      newRow.innerHTML = `<span>COD Convenience Fee</span><span class="surcharge-val">${formatCurrency(totals.paymentSurcharge)}</span>`;
      summaryDiv.insertAdjacentElement('afterend', newRow);
    }
    
    if (checkoutTotal) {
      checkoutTotal.textContent = formatCurrency(totals.total);
    }

    // Update standard shipping cost label on form pane if subtotal under 1999
    const standardLabel = document.getElementById("standard-price-label");
    if (standardLabel) {
      const standardCost = totals.subtotal > 1999 || localStorage.getItem("royal_affair_promo") === "FREESHIP" ? 0 : 500;
      standardLabel.textContent = standardCost === 0 ? "FREE" : formatCurrency(500);
    }
  }

  updatePrices();

  // 3. Promo Application
  const activePromo = localStorage.getItem("royal_affair_promo") || "";
  if (activePromo && promoInput && promoMsg && promoBtn) {
    promoInput.value = activePromo;
    promoInput.disabled = true;
    promoBtn.textContent = "Clear";
    promoMsg.textContent = `Coupon ${activePromo} applied successfully!`;
    promoMsg.style.color = "var(--color-success)";
  }

  if (promoBtn) {
    promoBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const code = promoInput.value.trim().toUpperCase();

      if (localStorage.getItem("royal_affair_promo")) {
        // Clear
        localStorage.removeItem("royal_affair_promo");
        promoInput.value = "";
        promoInput.disabled = false;
        promoBtn.textContent = "Apply";
        promoMsg.textContent = "";
        updatePrices();
        showToast("Coupon removed.");
      } else {
        // Apply
        if (code === "ROYAL10" || code === "FIRST200" || code === "FREESHIP") {
          localStorage.setItem("royal_affair_promo", code);
          promoInput.disabled = true;
          promoBtn.textContent = "Clear";
          promoMsg.textContent = `Coupon ${code} applied successfully!`;
          promoMsg.style.color = "var(--color-success)";
          updatePrices();
          showToast(`Coupon code ${code} applied.`);
        } else {
          promoMsg.textContent = "Invalid code. Try ROYAL10, FIRST200, or FREESHIP.";
          promoMsg.style.color = "var(--color-error)";
        }
      }
    });
  }

  // Real-time validations
  setupRealtimeValidations();
}

// Calculate totals matching coupons and surcharges
function calculateCheckoutTotals(deliveryOption, paymentOption) {
  const cart = JSON.parse(localStorage.getItem("royal_affair_cart")) || [];
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const promoCode = localStorage.getItem("royal_affair_promo") || null;
  
  // Base shipping: Free if subtotal > 1999. Also check if FREESHIP is active.
  let baseShipping = subtotal > 1999 || subtotal === 0 ? 0 : 500;
  if (promoCode === "FREESHIP") {
    baseShipping = 0;
  }
  
  // Delivery upgrade: Express adds 150
  const deliveryUpgrade = deliveryOption === "express" ? 150 : 0;
  
  // Payment surcharge: COD adds 100
  const paymentSurcharge = paymentOption === "COD" ? 100 : 0;

  const shipping = baseShipping + deliveryUpgrade;
  
  let discount = 0;
  if (subtotal > 0) {
    if (promoCode === "ROYAL10") {
      discount = subtotal * 0.10;
    } else if (promoCode === "FIRST200") {
      discount = Math.min(200, subtotal);
    }
  }

  const gstTax = subtotal * 0.12; // Inclusive GST
  
  const total = Math.max(0, subtotal - discount + shipping + paymentSurcharge);
  
  return { subtotal, shipping, discount, total, gstTax, paymentSurcharge };
}

// Setup validation listeners
function setupRealtimeValidations() {
  const nameInp = document.getElementById("contact-name");
  const emailInp = document.getElementById("contact-email");
  const phoneInp = document.getElementById("contact-phone");

  const shipNameInp = document.getElementById("shipping-fullname");
  const shipAddrInp = document.getElementById("shipping-addr1");
  const shipCityInp = document.getElementById("shipping-city");
  const shipStateInp = document.getElementById("shipping-state");
  const shipPinInp = document.getElementById("shipping-pin");

  if (nameInp) nameInp.addEventListener("input", () => validateContactName(nameInp));
  if (emailInp) emailInp.addEventListener("input", () => validateContactEmail(emailInp));
  if (phoneInp) phoneInp.addEventListener("input", () => validateContactPhone(phoneInp));

  if (shipNameInp) shipNameInp.addEventListener("input", () => validateShippingName(shipNameInp));
  if (shipAddrInp) shipAddrInp.addEventListener("input", () => validateShippingAddress(shipAddrInp));
  if (shipCityInp) shipCityInp.addEventListener("input", () => validateShippingCity(shipCityInp));
  if (shipStateInp) shipStateInp.addEventListener("input", () => validateShippingState(shipStateInp));
  if (shipPinInp) shipPinInp.addEventListener("input", () => validateShippingPin(shipPinInp));
}

// Single-field validator algorithms
function validateContactName(el) {
  const err = document.getElementById("err-contact-name");
  if (el.value.trim().length < 3) {
    err.textContent = "Please enter your full name (minimum 3 characters).";
    err.style.display = "block";
    el.style.borderColor = "var(--color-error)";
    return false;
  }
  err.style.display = "none";
  el.style.borderColor = "var(--color-gray-light)";
  return true;
}

function validateContactEmail(el) {
  const err = document.getElementById("err-contact-email");
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(el.value.trim())) {
    err.textContent = "Please enter a valid email address.";
    err.style.display = "block";
    el.style.borderColor = "var(--color-error)";
    return false;
  }
  err.style.display = "none";
  el.style.borderColor = "var(--color-gray-light)";
  return true;
}

function validateContactPhone(el) {
  const err = document.getElementById("err-contact-phone");
  if (el.value.trim().length !== 10) {
    err.textContent = "Please enter a valid 10-digit mobile number.";
    err.style.display = "block";
    el.style.borderColor = "var(--color-error)";
    return false;
  }
  err.style.display = "none";
  el.style.borderColor = "var(--color-gray-light)";
  return true;
}

function validateShippingName(el) {
  const err = document.getElementById("err-shipping-fullname");
  if (el.value.trim().length < 3) {
    err.textContent = "Recipient name is required.";
    err.style.display = "block";
    el.style.borderColor = "var(--color-error)";
    return false;
  }
  err.style.display = "none";
  el.style.borderColor = "var(--color-gray-light)";
  return true;
}

function validateShippingAddress(el) {
  const err = document.getElementById("err-shipping-addr1");
  if (el.value.trim().length < 5) {
    err.textContent = "Address Line 1 must contain street/house details.";
    err.style.display = "block";
    el.style.borderColor = "var(--color-error)";
    return false;
  }
  err.style.display = "none";
  el.style.borderColor = "var(--color-gray-light)";
  return true;
}

function validateShippingCity(el) {
  const err = document.getElementById("err-shipping-city");
  if (el.value.trim().length < 2) {
    err.textContent = "City is required.";
    err.style.display = "block";
    el.style.borderColor = "var(--color-error)";
    return false;
  }
  err.style.display = "none";
  el.style.borderColor = "var(--color-gray-light)";
  return true;
}

function validateShippingState(el) {
  const err = document.getElementById("err-shipping-state");
  if (el.value.trim().length < 2) {
    err.textContent = "State is required.";
    err.style.display = "block";
    el.style.borderColor = "var(--color-error)";
    return false;
  }
  err.style.display = "none";
  el.style.borderColor = "var(--color-gray-light)";
  return true;
}

function validateShippingPin(el) {
  const err = document.getElementById("err-shipping-pin");
  if (el.value.trim().length !== 6) {
    err.textContent = "Please enter a valid 6-digit Indian PIN code.";
    err.style.display = "block";
    el.style.borderColor = "var(--color-error)";
    return false;
  }
  err.style.display = "none";
  el.style.borderColor = "var(--color-gray-light)";
  return true;
}

// Delivery selectors
window.selectDeliveryOption = function(option) {
  selectedDelivery = option;
  
  const standardLabel = document.getElementById("deliv-method-label-standard");
  const expressLabel = document.getElementById("deliv-method-label-express");
  
  if (option === "standard") {
    if (standardLabel) standardLabel.style.borderColor = "var(--color-maroon)";
    if (expressLabel) expressLabel.style.borderColor = "var(--color-gray-light)";
  } else {
    if (standardLabel) standardLabel.style.borderColor = "var(--color-gray-light)";
    if (expressLabel) expressLabel.style.borderColor = "var(--color-maroon)";
  }
  
  updatePrices();
}

// Payment selectors
window.selectPaymentOption = function(option) {
  selectedPayment = option.toUpperCase();
  
  const upiLabel = document.getElementById("pay-method-label-upi");
  const cardLabel = document.getElementById("pay-method-label-card");
  const netLabel = document.getElementById("pay-method-label-net");
  const codLabel = document.getElementById("pay-method-label-cod");
  
  if (upiLabel) upiLabel.style.borderColor = option === "upi" ? "var(--color-maroon)" : "var(--color-gray-light)";
  if (cardLabel) cardLabel.style.borderColor = option === "card" ? "var(--color-maroon)" : "var(--color-gray-light)";
  if (netLabel) netLabel.style.borderColor = option === "net" ? "var(--color-maroon)" : "var(--color-gray-light)";
  if (codLabel) codLabel.style.borderColor = option === "cod" ? "var(--color-maroon)" : "var(--color-gray-light)";

  updatePrices();
}

// Page triggers
window.triggerNextStep = function() {
  if (currentStep === 1) {
    // Validate Step 1
    const nameValid = validateContactName(document.getElementById("contact-name"));
    const emailValid = validateContactEmail(document.getElementById("contact-email"));
    const phoneValid = validateContactPhone(document.getElementById("contact-phone"));
    
    if (!nameValid || !emailValid || !phoneValid) {
      showToast("Please fill in contact information correctly.", "error");
      return;
    }
  } else if (currentStep === 2) {
    // Validate Step 2
    const nameValid = validateShippingName(document.getElementById("shipping-fullname"));
    const addrValid = validateShippingAddress(document.getElementById("shipping-addr1"));
    const cityValid = validateShippingCity(document.getElementById("shipping-city"));
    const stateValid = validateShippingState(document.getElementById("shipping-state"));
    const pinValid = validateShippingPin(document.getElementById("shipping-pin"));
    
    if (!nameValid || !addrValid || !cityValid || !stateValid || !pinValid) {
      showToast("Please fill in shipping address correctly.", "error");
      return;
    }
  }
  
  // Transition step
  currentStep++;
  switchStepDisplay();
}

window.triggerPrevStep = function() {
  currentStep--;
  switchStepDisplay();
}

// Display toggle
function switchStepDisplay() {
  // Hide all step panes
  document.querySelectorAll(".checkout-step-pane").forEach(pane => pane.style.display = "none");
  document.getElementById(`checkout-step-pane-${currentStep}`).style.display = "block";
  
  // Update indicator steps
  document.querySelectorAll(".progress-step").forEach((el, index) => {
    if (index + 1 === currentStep) {
      el.style.color = "var(--color-maroon)";
      el.style.fontWeight = "600";
      el.classList.add("active");
    } else {
      el.style.color = "var(--color-gray)";
      el.style.fontWeight = "500";
      el.classList.remove("active");
    }
  });

  // Buttons toggle visibility
  const prevBtn = document.getElementById("prev-step-btn");
  const nextBtn = document.getElementById("next-step-btn");
  const placeBtn = document.getElementById("place-order-btn");

  if (prevBtn) prevBtn.style.display = currentStep > 1 ? "block" : "none";
  if (nextBtn) nextBtn.style.display = currentStep < 5 ? "block" : "none";
  if (placeBtn) placeBtn.style.display = currentStep === 5 ? "block" : "none";

  // If entering review step, generate review values
  if (currentStep === 5) {
    generateOrderReviewSummary();
  }
}

// Generate reviews text
function generateOrderReviewSummary() {
  const name = document.getElementById("contact-name").value;
  const email = document.getElementById("contact-email").value;
  const phone = document.getElementById("contact-phone").value;

  const shipName = document.getElementById("shipping-fullname").value;
  const shipAddr1 = document.getElementById("shipping-addr1").value;
  const shipAddr2 = document.getElementById("shipping-addr2").value;
  const shipLand = document.getElementById("shipping-landmark").value;
  const shipCity = document.getElementById("shipping-city").value;
  const shipState = document.getElementById("shipping-state").value;
  const shipPin = document.getElementById("shipping-pin").value;
  const addressType = document.querySelector('input[name="shipping_type"]:checked').value;

  const deliveryMethodLabel = selectedDelivery === "express" ? "Express Courier (Expected in 2 business days)" : "Standard Shipping (Expected in 4-6 business days)";
  const paymentMethodLabel = selectedPayment === "COD" ? "Cash on Delivery (COD)" : `${selectedPayment} Electronic Transfer`;

  const contactSummaryEl = document.getElementById("rev-contact-summary");
  const shippingSummaryEl = document.getElementById("rev-shipping-summary");
  const deliverySummaryEl = document.getElementById("rev-delivery-summary");
  const paymentSummaryEl = document.getElementById("rev-payment-summary");

  if (contactSummaryEl) {
    contactSummaryEl.innerHTML = `<strong>${name}</strong><br>Email: ${email}<br>Phone: +91 ${phone}`;
  }

  if (shippingSummaryEl) {
    shippingSummaryEl.innerHTML = `<strong>${shipName}</strong> [${addressType}]<br>${shipAddr1}${shipAddr2 ? ', ' + shipAddr2 : ''}${shipLand ? '<br>Landmark: ' + shipLand : ''}<br>${shipCity}, ${shipState} - ${shipPin}`;
  }

  if (deliverySummaryEl) {
    deliverySummaryEl.innerHTML = `<strong>Method</strong>: ${deliveryMethodLabel}`;
  }

  if (paymentSummaryEl) {
    paymentSummaryEl.innerHTML = `<strong>Option</strong>: ${paymentMethodLabel}`;
  }
}

// Place Order trigger
window.submitMultiStepCheckout = function() {
  const cart = JSON.parse(localStorage.getItem("royal_affair_cart")) || [];
  const name = document.getElementById("contact-name").value;
  const email = document.getElementById("contact-email").value;
  const phone = document.getElementById("contact-phone").value;
  const shipName = document.getElementById("shipping-fullname").value;
  const shipAddr1 = document.getElementById("shipping-addr1").value;
  const shipCity = document.getElementById("shipping-city").value;
  const shipState = document.getElementById("shipping-state").value;
  const shipPin = document.getElementById("shipping-pin").value;
  const addressType = document.querySelector('input[name="shipping_type"]:checked').value;

  const totals = calculateCheckoutTotals(selectedDelivery, selectedPayment);
  const orderId = "RA-" + Math.floor(100000 + Math.random() * 900000);
  const today = new Date().toLocaleDateString("en-IN", { year: 'numeric', month: 'long', day: 'numeric' });

  const newOrder = {
    orderId: orderId,
    date: today,
    items: cart,
    total: totals.total,
    status: "Processing",
    shippingDetails: {
      name: shipName,
      contactName: name,
      address: `${shipAddr1}, ${shipCity}, ${shipState} - ${shipPin} (${addressType})`,
      phone: phone,
      email: email,
      deliveryMethod: selectedDelivery,
      paymentMethod: selectedPayment
    }
  };

  // Save to order list
  let orders = JSON.parse(localStorage.getItem("royal_affair_orders")) || [];
  orders.unshift(newOrder);
  localStorage.setItem("royal_affair_orders", JSON.stringify(orders));

  // Save details temporarily for thank you page
  localStorage.setItem("royal_affair_last_order", JSON.stringify(newOrder));

  // Clear cart and cookies
  localStorage.removeItem("royal_affair_cart");
  localStorage.removeItem("royal_affair_promo");
  updateBadges();

  showToast("Order placed successfully! Redirecting...", "success");

  // Redirect to thank-you.html
  setTimeout(() => {
    window.location.href = `thank-you.html?orderId=${orderId}`;
  }, 1500);
}
