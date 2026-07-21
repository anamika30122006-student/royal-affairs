/* Wishlist Management for Royal Affair - Designer Suits */

// Toggle item in wishlist
function toggleWishlist(productId) {
  const product = getProductById(productId);
  if (!product) return;

  let wishlist = JSON.parse(localStorage.getItem("royal_affair_wishlist")) || [];
  const index = wishlist.findIndex(item => item.id === product.id);

  if (index > -1) {
    // Remove
    wishlist.splice(index, 1);
    localStorage.setItem("royal_affair_wishlist", JSON.stringify(wishlist));
    showToast("Removed from wishlist.", "info");
  } else {
    // Add
    wishlist.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0]
    });
    localStorage.setItem("royal_affair_wishlist", JSON.stringify(wishlist));
    showToast("Added to wishlist.");
  }

  updateBadges();
  updateWishlistButtonUI(product.id);

  if (document.getElementById("wishlist-page-content")) {
    renderWishlistPage();
  }
}

// Check if item in wishlist
function isInWishlist(productId) {
  const wishlist = JSON.parse(localStorage.getItem("royal_affair_wishlist")) || [];
  return wishlist.some(item => item.id === parseInt(productId));
}

// Sync CSS states of wishlist heart icons
function updateWishlistButtonUI(productId) {
  const buttons = document.querySelectorAll(`.wishlist-toggle-btn[data-id="${productId}"]`);
  const isWish = isInWishlist(productId);

  buttons.forEach(btn => {
    if (isWish) {
      btn.classList.add("active");
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--color-maroon)" stroke="var(--color-maroon)" stroke-width="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      `;
    } else {
      btn.classList.remove("active");
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      `;
    }
  });
}

// Sync buttons on document load
function syncAllWishlistButtons() {
  const buttons = document.querySelectorAll(".wishlist-toggle-btn");
  buttons.forEach(btn => {
    const id = btn.getAttribute("data-id");
    if (id) {
      updateWishlistButtonUI(id);
    }
  });
}

// Move item from wishlist to cart
function moveWishlistItemToCart(productId) {
  const product = getProductById(productId);
  if (!product) return;

  const defaultSize = "M";
  const defaultColor = product.colors && product.colors.length > 0 ? product.colors[0] : "Default";

  // Add to cart
  if (typeof addToCart === "function") {
    addToCart(productId, defaultSize, 1, defaultColor);
  }

  // Remove from wishlist
  let wishlist = JSON.parse(localStorage.getItem("royal_affair_wishlist")) || [];
  wishlist = wishlist.filter(item => item.id !== productId);
  localStorage.setItem("royal_affair_wishlist", JSON.stringify(wishlist));

  // Sync counters and badges
  updateBadges();
  syncAllWishlistButtons();

  if (document.getElementById("wishlist-page-content")) {
    renderWishlistPage();
  }
}

// Clear Entire Wishlist
function clearWishlist() {
  localStorage.removeItem("royal_affair_wishlist");
  updateBadges();
  syncAllWishlistButtons();

  if (document.getElementById("wishlist-page-content")) {
    renderWishlistPage();
  }
  showToast("Your wishlist has been cleared.", "info");
}

// Render main Wishlist Page
function renderWishlistPage() {
  const container = document.getElementById("wishlist-page-content");
  if (!container) return;

  const wishlist = JSON.parse(localStorage.getItem("royal_affair_wishlist")) || [];

  if (wishlist.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; background-color: var(--color-white); border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); box-shadow: var(--shadow-sm);">
        <svg viewBox="0 0 24 24" width="70" height="70" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 1.5rem; display: block; color: var(--color-gray-light);">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
        <h2 style="font-family: var(--font-heading); font-size: 2.2rem; color: var(--color-maroon-dark); margin-bottom: 1rem;">Your Wishlist is Empty</h2>
        <p style="color: var(--color-charcoal-light); margin-bottom: 2rem; font-size: 1rem;">Keep track of designer suits you adore by clicking the heart button on product pages.</p>
        <a href="shop.html" class="btn btn-primary" style="display: inline-block; padding: 0.75rem 2rem;">Discover Suits</a>
      </div>
    `;
    return;
  }

  let html = "";
  wishlist.forEach(item => {
    const originalProd = getProductById(item.id);
    if (!originalProd) return;

    // Price and discount calculations
    let priceHtml = `<span style="font-weight: 600; color: var(--color-charcoal);">${formatCurrency(originalProd.price)}</span>`;
    if (originalProd.originalPrice > originalProd.price) {
      priceHtml = `
        <span style="font-weight: 600; color: var(--color-maroon);">${formatCurrency(originalProd.price)}</span>
        <span style="text-decoration: line-through; color: var(--color-gray); font-size: 0.85rem; margin-left: 0.5rem;">${formatCurrency(originalProd.originalPrice)}</span>
        <span style="color: var(--color-gold-dark); font-size: 0.8rem; font-weight: 600; margin-left: 0.5rem; background-color: var(--color-beige); padding: 1px 6px; border-radius: var(--border-radius-xs);">Save ${originalProd.discount}%</span>
      `;
    }

    // Availability checks
    const availHtml = originalProd.stock > 0
      ? `<span style="color: var(--color-success); font-weight: 600; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 4px;"><span style="width: 6px; height: 6px; border-radius: 50%; background-color: var(--color-success); display: inline-block;"></span>In Stock</span>`
      : `<span style="color: var(--color-error); font-weight: 600; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 4px;"><span style="width: 6px; height: 6px; border-radius: 50%; background-color: var(--color-error); display: inline-block;"></span>Out of Stock</span>`;

    html += `
      <tr style="border-bottom: 1px solid var(--color-gray-light);">
        <td style="display: flex; align-items: center; gap: 1.25rem; padding: 1.5rem 0; text-align: left;">
          <img src="${originalProd.images[0]}" alt="${originalProd.name}" style="width: 70px; height: 95px; object-fit: cover; border-radius: var(--border-radius-xs); border: 1px solid var(--color-gray-light);">
          <div>
            <h3 style="font-family: var(--font-heading); font-size: 1.15rem; color: var(--color-maroon-dark); margin: 0 0 0.5rem 0; line-height: 1.2;">
              <a href="product.html?id=${originalProd.id}" style="text-decoration: none; color: inherit;">${originalProd.name}</a>
            </h3>
            <span style="font-size: 0.8rem; color: var(--color-gray);">Collection: ${originalProd.category}</span>
          </div>
        </td>
        <td style="padding: 1.5rem 0; text-align: left;">${priceHtml}</td>
        <td style="padding: 1.5rem 0; text-align: left;">${availHtml}</td>
        <td style="padding: 1.5rem 0; text-align: left;">
          <button class="btn btn-primary btn-sm" onclick="moveWishlistItemToCart(${originalProd.id})" ${originalProd.stock === 0 ? 'disabled style="background-color: var(--color-gray-dark); opacity: 0.7; cursor: not-allowed;"' : ''}>
            Move to Cart
          </button>
        </td>
        <td style="padding: 1.5rem 0; text-align: center;">
          <button onclick="toggleWishlist(${originalProd.id})" style="background: none; border: none; color: var(--color-error); font-size: 0.85rem; font-weight: 600; cursor: pointer; text-decoration: underline;" title="Remove from wishlist">
            Remove
          </button>
        </td>
      </tr>
    `;
  });

  container.innerHTML = `
    <div class="table-responsive" style="overflow-x: auto; background-color: var(--color-white); padding: 1.5rem; border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); box-shadow: var(--shadow-sm); margin-bottom: 2rem;">
      <table class="royal-table" style="width: 100%; border-collapse: collapse; text-align: left;">
        <thead>
          <tr style="border-bottom: 1.5px solid var(--color-maroon); font-family: var(--font-heading); font-size: 0.95rem; color: var(--color-maroon-dark);">
            <th style="padding-bottom: 1rem; width: 45%;">Designer Suit</th>
            <th style="padding-bottom: 1rem;">Price</th>
            <th style="padding-bottom: 1rem;">Availability</th>
            <th style="padding-bottom: 1rem;">Action</th>
            <th style="padding-bottom: 1rem; text-align: center;">Remove</th>
          </tr>
        </thead>
        <tbody>
          ${html}
        </tbody>
      </table>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
      <a href="shop.html" class="btn btn-outline btn-sm" style="display: inline-block; font-weight: 600; text-decoration: none;">&larr; Continue Shopping</a>
      <button class="btn btn-outline btn-sm" onclick="clearWishlist()" style="border-color: var(--color-error); color: var(--color-error); font-weight: 600;">Clear Wishlist</button>
    </div>
  `;
}

// Initial triggers
document.addEventListener("DOMContentLoaded", () => {
  syncAllWishlistButtons();
  if (document.getElementById("wishlist-page-content")) {
    renderWishlistPage();
  }
});
