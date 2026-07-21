/* Cart Management for Royal Affair - Designer Suits */

// Add item to cart
function addToCart(productId, size = "M", quantity = 1, color = null) {
  const product = getProductById(productId);
  if (!product) return;

  // Resolve color
  const selectedColor = color || (product.colors && product.colors.length > 0 ? product.colors[0] : "Default");

  let cart = JSON.parse(localStorage.getItem("royal_affair_cart")) || [];

  // Check if item with same ID, size, and color exists
  const existingItemIndex = cart.findIndex(item => item.id === product.id && item.size === size && item.color === selectedColor);

  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      size: size,
      color: selectedColor,
      quantity: quantity
    });
  }

  localStorage.setItem("royal_affair_cart", JSON.stringify(cart));
  updateBadges();

  if (typeof showToast === "function") {
    showToast(`${product.name} (Size: ${size}, Color: ${selectedColor}) added to cart.`);
  }

  // Refresh cart views
  renderDrawerCart();
  if (document.getElementById("cart-page-content")) {
    renderCartPage();
  }
}

// Remove item from cart
function removeFromCart(productId, size, color) {
  let cart = JSON.parse(localStorage.getItem("royal_affair_cart")) || [];
  cart = cart.filter(item => !(item.id === parseInt(productId) && item.size === size && item.color === color));

  localStorage.setItem("royal_affair_cart", JSON.stringify(cart));
  updateBadges();

  if (typeof showToast === "function") {
    showToast("Item removed from cart.", "info");
  }

  renderDrawerCart();
  if (document.getElementById("cart-page-content")) {
    renderCartPage();
  }
}

// Update quantity
function updateCartQuantity(productId, size, color, quantity) {
  if (quantity < 1) return;

  let cart = JSON.parse(localStorage.getItem("royal_affair_cart")) || [];
  const itemIndex = cart.findIndex(item => item.id === parseInt(productId) && item.size === size && item.color === color);

  if (itemIndex > -1) {
    cart[itemIndex].quantity = parseInt(quantity);
    localStorage.setItem("royal_affair_cart", JSON.stringify(cart));
    updateBadges();

    renderDrawerCart();
    if (document.getElementById("cart-page-content")) {
      renderCartPage();
    }
  }
}

/// Calculate totals
function calculateCartTotals() {
  const cart = JSON.parse(localStorage.getItem("royal_affair_cart")) || [];
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const promoCode = localStorage.getItem("royal_affair_promo") || null;

  // Free shipping above ₹1,999. Also check if FREESHIP promo is active.
  let shipping = subtotal > 1999 || subtotal === 0 ? 0 : 500;
  if (promoCode === "FREESHIP") {
    shipping = 0;
  }

  let discount = 0;
  if (subtotal > 0) {
    if (promoCode === "ROYAL10") {
      discount = subtotal * 0.10; // 10% off
    } else if (promoCode === "FIRST200") {
      discount = Math.min(200, subtotal); // flat ₹200 off
    }
  }

  // GST 12% is included in the base pricing already for Indian retail compliance
  const gstTax = subtotal * 0.12;

  const total = Math.max(0, subtotal - discount + shipping);

  return { subtotal, shipping, discount, total, gstTax };
}

// Render main Cart page
function renderCartPage() {
  const container = document.getElementById("cart-page-content");
  if (!container) return;

  const cart = JSON.parse(localStorage.getItem("royal_affair_cart")) || [];

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; background-color: var(--color-white); border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); box-shadow: var(--shadow-sm);">
        <svg viewBox="0 0 24 24" width="70" height="70" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 1.5rem; display: block; color: var(--color-gray-light);">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <h2 style="font-family: var(--font-heading); font-size: 2.2rem; color: var(--color-maroon-dark); margin-bottom: 1rem;">Your Cart is Empty</h2>
        <p style="color: var(--color-charcoal-light); margin-bottom: 2rem; font-size: 1rem;">Browse our collections to add elegant designer suits, velvet Anarkalis, and wedding couture.</p>
        <a href="shop.html" class="btn btn-primary" style="display: inline-block; padding: 0.75rem 2rem;">Shop Collections</a>
      </div>
      
      <!-- Recommended items shelf inside empty state -->
      <div style="margin-top: 4rem;">
        <h3 style="font-family: var(--font-heading); font-size: 1.5rem; color: var(--color-maroon-dark); margin-bottom: 1.5rem; text-align: left;">Recommended For You</h3>
        <div id="cart-recommendations-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--spacing-lg);"></div>
      </div>
    `;
    loadCartRecommendations();
    return;
  }

  const totals = calculateCartTotals();
  const activePromo = localStorage.getItem("royal_affair_promo") || "";

  // 1. Free Shipping Progress calculations
  const progressText = totals.subtotal >= 1999
    ? "&#127881; Congratulations! Your order qualifies for <strong>FREE Shipping</strong>."
    : `Add <strong>${formatCurrency(1999 - totals.subtotal)}</strong> more to unlock FREE Shipping.`;
  const progressPercent = Math.min(100, (totals.subtotal / 1999) * 100);

  let cartItemsHtml = "";
  cart.forEach(item => {
    const productInfo = typeof getProductById === "function" ? getProductById(item.id) : null;

    // Sizing select dropdown
    let sizeSelectHtml = "";
    if (productInfo) {
      sizeSelectHtml = `
        <select onchange="updateCartItemSize(${item.id}, '${item.size}', '${item.color}', this.value)" style="padding: 4px 8px; font-size: 0.8rem; border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); background-color: var(--color-white); outline: none; cursor: pointer;">
          ${productInfo.sizes.map(sz => `<option value="${sz}" ${sz === item.size ? 'selected' : ''}>${sz}</option>`).join("")}
        </select>
      `;
    } else {
      sizeSelectHtml = item.size;
    }

    // Color select dropdown
    let colorSelectHtml = "";
    if (productInfo) {
      colorSelectHtml = `
        <select onchange="updateCartItemColor(${item.id}, '${item.size}', '${item.color}', this.value)" style="padding: 4px 8px; font-size: 0.8rem; border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); background-color: var(--color-white); outline: none; cursor: pointer;">
          ${productInfo.colors.map(col => `<option value="${col}" ${col === item.color ? 'selected' : ''}>${col}</option>`).join("")}
        </select>
      `;
    } else {
      colorSelectHtml = item.color;
    }

    cartItemsHtml += `
      <tr style="border-bottom: 1px solid var(--color-gray-light);">
        <td style="display: flex; align-items: center; gap: 1.25rem; padding: 1.5rem 0;">
          <img src="${item.image}" alt="${item.name}" style="width: 70px; height: 95px; object-fit: cover; border-radius: var(--border-radius-xs); border: 1px solid var(--color-gray-light);">
          <div>
            <h3 style="font-family: var(--font-heading); font-size: 1.15rem; color: var(--color-maroon-dark); margin: 0 0 0.5rem 0; line-height: 1.2;">
              <a href="product.html?id=${item.id}" style="text-decoration: none; color: inherit;">${item.name}</a>
            </h3>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
              ${sizeSelectHtml}
              ${colorSelectHtml}
            </div>
          </div>
        </td>
        <td style="padding: 1.5rem 0;">${formatCurrency(item.price)}</td>
        <td style="padding: 1.5rem 0;">
          <div class="qty-selector" style="width: fit-content; border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs);">
            <button class="qty-btn" onclick="updateCartQuantity(${item.id}, '${item.size}', '${item.color}', ${item.quantity - 1})">-</button>
            <input type="text" class="qty-input" value="${item.quantity}" readonly style="width: 32px; border: none;">
            <button class="qty-btn" onclick="updateCartQuantity(${item.id}, '${item.size}', '${item.color}', ${item.quantity + 1})">+</button>
          </div>
        </td>
        <td style="padding: 1.5rem 0;"><strong style="color: var(--color-maroon); font-weight: 600;">${formatCurrency(item.price * item.quantity)}</strong></td>
        <td style="padding: 1.5rem 0; text-align: center;">
          <button onclick="removeFromCart(${item.id}, '${item.size}', '${item.color}')" style="background: none; border: none; color: var(--color-error); font-size: 0.85rem; font-weight: 600; cursor: pointer; text-decoration: underline;" title="Remove item">
            Remove
          </button>
        </td>
      </tr>
    `;
  });

  let discountLabel = "Promo Discount";
  if (activePromo === "ROYAL10") {
    discountLabel = "Promo Discount (ROYAL10 - 10%)";
  } else if (activePromo === "FIRST200") {
    discountLabel = "Promo Discount (FIRST200 - ₹200)";
  } else if (activePromo === "FREESHIP") {
    discountLabel = "Promo Discount (FREESHIP - Free Delivery)";
  }

  container.innerHTML = `
    <!-- Shipping Progress Bar -->
    <div style="background-color: var(--color-white); border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); padding: 1.25rem; margin-bottom: 2rem; box-shadow: var(--shadow-sm); text-align: left;">
      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--color-charcoal-light);">
        <span id="shipping-progress-text">${progressText}</span>
        <span>Goal: ₹1,999</span>
      </div>
      <div style="width: 100%; height: 8px; background-color: var(--color-gray-light); border-radius: 4px; overflow: hidden;">
        <div style="width: ${progressPercent}%; height: 100%; background-color: var(--color-maroon); transition: width 0.3s ease;"></div>
      </div>
    </div>

    <div class="cart-grid-columns" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--spacing-xl);">
      
      <!-- Left: Cart Table and Action buttons -->
      <div>
        <div class="table-responsive" style="overflow-x: auto; background-color: var(--color-white); padding: 1.5rem; border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); box-shadow: var(--shadow-sm); margin-bottom: 1.5rem;">
          <table class="royal-table" style="width: 100%; border-collapse: collapse; text-align: left;">
            <thead>
              <tr style="border-bottom: 1.5px solid var(--color-maroon); font-family: var(--font-heading); font-size: 0.95rem; color: var(--color-maroon-dark);">
                <th style="padding-bottom: 1rem; width: 45%;">Suit style</th>
                <th style="padding-bottom: 1rem;">Price</th>
                <th style="padding-bottom: 1rem;">Quantity</th>
                <th style="padding-bottom: 1rem;">Total</th>
                <th style="padding-bottom: 1rem; text-align: center;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${cartItemsHtml}
            </tbody>
          </table>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 3rem;">
          <a href="shop.html" class="btn btn-outline btn-sm" style="display: inline-block; font-weight: 600; text-decoration: none;">&larr; Continue Shopping</a>
          <button class="btn btn-outline btn-sm" onclick="clearEntireCart()" style="border-color: var(--color-error); color: var(--color-error); font-weight: 600;">Clear All Cart</button>
        </div>
      </div>

      <!-- Right: Summary cards and Promo validate codes -->
      <div style="display: flex; flex-direction: column; gap: var(--spacing-md); text-align: left;">
        
        <!-- Summary Box -->
        <div style="background-color: var(--color-white); border: 1px solid var(--color-gray-light); padding: 2rem; border-radius: var(--border-radius-xs); box-shadow: var(--shadow-sm);">
          <h3 style="font-family: var(--font-heading); font-size: 1.5rem; color: var(--color-maroon-dark); border-bottom: 1px solid var(--color-gray-light); padding-bottom: 0.75rem; margin: 0 0 1.5rem 0;">Order Summary</h3>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; font-size: 0.95rem;">
            <span>Cart Subtotal</span>
            <span>${formatCurrency(totals.subtotal)}</span>
          </div>

          <div style="display: ${totals.discount > 0 ? 'flex' : 'none'}; justify-content: space-between; margin-bottom: 1rem; font-size: 0.95rem; color: var(--color-success); font-weight: 600;">
            <span>${discountLabel}</span>
            <span>-${formatCurrency(totals.discount)}</span>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; font-size: 0.95rem;">
            <span>Estimated Shipping</span>
            <span>${totals.shipping === 0 ? '<span style="color:var(--color-success); font-weight:600;">FREE</span>' : formatCurrency(totals.shipping)}</span>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 1rem; font-size: 0.85rem; color: var(--color-gray); border-bottom: 1px solid var(--color-gray-light); padding-bottom: 1rem;">
            <span>Inclusive Taxes (GST 12%)</span>
            <span>${formatCurrency(totals.gstTax)}</span>
          </div>

          <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 1.35rem; margin-bottom: 1.5rem;">
            <span>Grand Total</span>
            <span style="color: var(--color-maroon);">${formatCurrency(totals.total)}</span>
          </div>

          <!-- Promo Input form block -->
          <div style="margin-bottom: 1.5rem; border-top: 1px dashed var(--color-gray-light); padding-top: 1.25rem;">
            <label class="form-label" for="promo-input-box" style="font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 0.5rem;">Promotional Coupon</label>
            <div style="display: flex; gap: 0.5rem;">
              <input type="text" id="promo-input-box" class="form-input" placeholder="e.g. ROYAL10" value="${activePromo}" ${activePromo ? 'disabled style="background-color:var(--color-beige); opacity:0.8;"' : ''} style="flex:1; padding: 0.5rem; font-size: 0.85rem; outline: none; border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs);">
              <button onclick="${activePromo ? 'clearPromoCode()' : 'applyPromoCode()'}" class="btn btn-outline btn-sm" style="padding: 0.5rem 1rem;">
                ${activePromo ? 'Clear' : 'Apply'}
              </button>
            </div>
            <span id="promo-msg-box" style="font-size: 0.75rem; font-weight: 500; display: block; margin-top: 0.35rem; color: ${activePromo ? 'var(--color-success)' : 'var(--color-error)'};">
              ${activePromo ? 'Promo coupon applied successfully!' : ''}
            </span>
          </div>

          <a href="checkout.html" class="btn btn-primary btn-block" style="display: block; text-align: center; text-decoration: none; padding: 0.85rem var(--spacing-md);">Proceed to Checkout</a>
        </div>
      </div>
    </div>

    <!-- Recommendations shelf inside shopping page -->
    <div style="margin-top: 4rem;">
      <h3 style="font-family: var(--font-heading); font-size: 1.75rem; color: var(--color-maroon-dark); margin-bottom: 1.5rem; text-align: left;">Recommended For You</h3>
      <div id="cart-recommendations-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--spacing-lg);"></div>
    </div>
  `;

  loadCartRecommendations();
}

// Update Size
function updateCartItemSize(productId, oldSize, color, newSize) {
  let cart = JSON.parse(localStorage.getItem("royal_affair_cart")) || [];

  const itemIndex = cart.findIndex(item => item.id === parseInt(productId) && item.size === oldSize && item.color === color);
  if (itemIndex > -1) {
    const duplicateIndex = cart.findIndex(item => item.id === parseInt(productId) && item.size === newSize && item.color === color);
    if (duplicateIndex > -1 && duplicateIndex !== itemIndex) {
      cart[duplicateIndex].quantity += cart[itemIndex].quantity;
      cart.splice(itemIndex, 1);
    } else {
      cart[itemIndex].size = newSize;
    }
    localStorage.setItem("royal_affair_cart", JSON.stringify(cart));
    updateBadges();
    renderDrawerCart();
    renderCartPage();
    showToast("Suit size updated successfully.", "info");
  }
}

// Update Color
function updateCartItemColor(productId, size, oldColor, newColor) {
  let cart = JSON.parse(localStorage.getItem("royal_affair_cart")) || [];

  const itemIndex = cart.findIndex(item => item.id === parseInt(productId) && item.size === size && item.color === oldColor);
  if (itemIndex > -1) {
    const duplicateIndex = cart.findIndex(item => item.id === parseInt(productId) && item.size === size && item.color === newColor);
    if (duplicateIndex > -1 && duplicateIndex !== itemIndex) {
      cart[duplicateIndex].quantity += cart[itemIndex].quantity;
      cart.splice(itemIndex, 1);
    } else {
      cart[itemIndex].color = newColor;
    }
    localStorage.setItem("royal_affair_cart", JSON.stringify(cart));
    updateBadges();
    renderDrawerCart();
    renderCartPage();
    showToast("Suit color updated successfully.", "info");
  }
}

// Clear Entire cart
function clearEntireCart() {
  localStorage.removeItem("royal_affair_cart");
  localStorage.removeItem("royal_affair_promo");
  updateBadges();
  renderDrawerCart();
  renderCartPage();
  showToast("Your shopping cart has been cleared.", "info");
}

// Promo validation coupon codes
function applyPromoCode() {
  const input = document.getElementById("promo-input-box");
  const msg = document.getElementById("promo-msg-box");
  if (!input || !msg) return;

  const value = input.value.trim().toUpperCase();
  if (value === "ROYAL10") {
    localStorage.setItem("royal_affair_promo", "ROYAL10");
    showToast("10% promotional discount applied!");
    renderCartPage();
  } else if (value === "FIRST200") {
    localStorage.setItem("royal_affair_promo", "FIRST200");
    showToast("₹200 flat promotional discount applied!");
    renderCartPage();
  } else if (value === "FREESHIP") {
    localStorage.setItem("royal_affair_promo", "FREESHIP");
    showToast("Free shipping promotional code applied!");
    renderCartPage();
  } else {
    msg.textContent = "Invalid code. Try ROYAL10, FIRST200, or FREESHIP.";
    msg.style.color = "var(--color-error)";
  }
}

function clearPromoCode() {
  localStorage.removeItem("royal_affair_promo");
  showToast("Promotional code removed.");
  renderCartPage();
}

// Load Recommendations on cart
function loadCartRecommendations() {
  const grid = document.getElementById("cart-recommendations-grid");
  if (!grid) return;

  // Render first 4 bestsellers
  const bestsellers = typeof getBestsellers === "function" ? getBestsellers().slice(0, 4) : [];
  grid.innerHTML = bestsellers.map(prod => createProductCardHTML(prod)).join("");
}

// Initialize Cart page rendering if applicable
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("cart-page-content")) {
    renderCartPage();
  }
});
