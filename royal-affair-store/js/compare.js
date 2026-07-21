/* Product Comparison Management for Royal Affair - Designer Suits */

let highlightDiffActive = false;

// Add to compare (limit to 4 items)
function toggleCompare(productId) {
  const product = getProductById(productId);
  if (!product) return;

  let compareList = JSON.parse(localStorage.getItem("royal_affair_compare")) || [];
  const index = compareList.findIndex(item => item.id === product.id);

  if (index > -1) {
    // Remove
    compareList.splice(index, 1);
    localStorage.setItem("royal_affair_compare", JSON.stringify(compareList));
    showToast("Product removed from comparison.", "info");
  } else {
    // Add
    if (compareList.length >= 4) {
      showToast("You can compare up to 4 suits at a time.", "error");
      return;
    }
    compareList.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0]
    });
    localStorage.setItem("royal_affair_compare", JSON.stringify(compareList));
    showToast("Product added to comparison list.");
  }

  updateBadges();
  updateCompareButtonUI(product.id);

  if (document.getElementById("compare-page-content")) {
    renderComparePage();
  }
}

// Check if item is in comparison list
function isInCompare(productId) {
  const compareList = JSON.parse(localStorage.getItem("royal_affair_compare")) || [];
  return compareList.some(item => item.id === parseInt(productId));
}

// Update comparison button styling
function updateCompareButtonUI(productId) {
  const buttons = document.querySelectorAll(`.compare-toggle-btn[data-id="${productId}"]`);
  const isComp = isInCompare(productId);

  buttons.forEach(btn => {
    if (isComp) {
      btn.classList.add("active");
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="var(--color-maroon)" stroke="var(--color-maroon)" stroke-width="1.5">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          <polyline points="9 14 11 16 15 12"></polyline>
        </svg>
      `;
    } else {
      btn.classList.remove("active");
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
      `;
    }
  });
}

// Sync buttons on document load
function syncAllCompareButtons() {
  const buttons = document.querySelectorAll(".compare-toggle-btn");
  buttons.forEach(btn => {
    const id = btn.getAttribute("data-id");
    if (id) {
      updateCompareButtonUI(id);
    }
  });
}

// Clear Entire Compare List
function clearCompareList() {
  localStorage.removeItem("royal_affair_compare");
  updateBadges();
  syncAllCompareButtons();

  if (document.getElementById("compare-page-content")) {
    renderComparePage();
  }
  showToast("Comparison list cleared.", "info");
}

// Highlight rows with differences
function toggleHighlightDifferences() {
  highlightDiffActive = !highlightDiffActive;
  const btn = document.getElementById("highlight-diff-btn");
  if (btn) {
    if (highlightDiffActive) {
      btn.textContent = "Unhighlight Differences";
      btn.style.backgroundColor = "var(--color-maroon)";
      btn.style.color = "var(--color-white)";
      btn.style.borderColor = "var(--color-maroon)";
    } else {
      btn.textContent = "Highlight Differences";
      btn.style.backgroundColor = "var(--color-white)";
      btn.style.color = "var(--color-charcoal)";
      btn.style.borderColor = "var(--color-gray-light)";
    }
  }

  const rows = document.querySelectorAll(".compare-row-data");
  rows.forEach(row => {
    if (!highlightDiffActive) {
      row.style.backgroundColor = "";
      return;
    }

    const cells = Array.from(row.querySelectorAll("td"));
    if (cells.length <= 1) return;

    // Check if values in the cells are different
    const firstVal = cells[0].textContent.trim().toLowerCase();
    const isDifferent = cells.slice(1).some(cell => cell.textContent.trim().toLowerCase() !== firstVal);

    if (isDifferent) {
      row.style.backgroundColor = "rgba(194, 155, 85, 0.18)"; // Highlight color
    } else {
      row.style.backgroundColor = "";
    }
  });
}

// Render main Compare Page
function renderComparePage() {
  const container = document.getElementById("compare-page-content");
  if (!container) return;

  const compareList = JSON.parse(localStorage.getItem("royal_affair_compare")) || [];

  if (compareList.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem 1rem; background-color: var(--color-white); border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); box-shadow: var(--shadow-sm);">
        <svg viewBox="0 0 24 24" width="70" height="70" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 1.5rem; display: block; color: var(--color-gray-light);">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
        <h2 style="font-family: var(--font-heading); font-size: 2.2rem; color: var(--color-maroon-dark); margin-bottom: 1rem;">No Suits to Compare</h2>
        <p style="color: var(--color-charcoal-light); margin-bottom: 2rem; font-size: 1rem;">Add up to 4 suits from the shop list to compare their fabrics, embroidery details, and prices side-by-side.</p>
        <a href="shop.html" class="btn btn-primary" style="display: inline-block; padding: 0.75rem 2rem;">Shop Collection</a>
      </div>
    `;
    return;
  }

  // Retrieve complete product details
  const fullProducts = compareList.map(item => getProductById(item.id)).filter(Boolean);

  let headerRow = "<th style='width: 150px; font-weight: 700; color: var(--color-maroon-dark);'>Features</th>";
  let imageRow = "<td style='font-weight: 600; color: var(--color-charcoal);'>Image</td>";
  let priceRow = "<td>Price</td>";
  let discountRow = "<td>Promo Discount</td>";
  let ratingRow = "<td>Customer Rating</td>";
  let categoryRow = "<td>Collection</td>";
  let fabricRow = "<td>Fabric Type</td>";
  let occasionRow = "<td>Occasion</td>";
  let colorsRow = "<td>Colorways</td>";
  let sizesRow = "<td>Available Sizes</td>";
  let stockRow = "<td>Availability</td>";
  let actionRow = "<td>Purchase Option</td>";

  fullProducts.forEach(prod => {
    headerRow += `<th style="text-align: center; font-family: var(--font-heading); font-size: 1.15rem; color: var(--color-maroon-dark);">${prod.name}</th>`;
    imageRow += `
      <td style="text-align: center; padding: 1.25rem;">
        <img src="${prod.images[0]}" alt="${prod.name}" style="width: 100px; height: 135px; object-fit: cover; margin: 0 auto; box-shadow: var(--shadow-sm); border-radius: var(--border-radius-xs); border: 1px solid var(--color-gray-light);">
      </td>
    `;

    // Price checks
    priceRow += `<td style="text-align: center; font-weight: 700; color: var(--color-maroon);">${formatCurrency(prod.price)}</td>`;

    // Discount checks
    discountRow += `<td style="text-align: center; font-weight: 600; color: var(--color-gold-dark);">${prod.originalPrice > prod.price ? `Save ${prod.discount}%` : 'No Discount'}</td>`;

    // Rating checks
    ratingRow += `
      <td style="text-align: center;">
        <span style="color: var(--color-gold);">★</span> ${prod.rating} (${prod.reviewCount} reviews)
      </td>
    `;

    categoryRow += `<td style="text-align: center;">${prod.category}</td>`;
    fabricRow += `<td style="text-align: center;">${prod.fabric || "Silk Velvet"}</td>`;
    occasionRow += `<td style="text-align: center;">${prod.occasion || "Festive Wear"}</td>`;
    colorsRow += `<td style="text-align: center;">${prod.colors ? prod.colors.join(", ") : "Default"}</td>`;
    sizesRow += `<td style="text-align: center;">${prod.sizes ? prod.sizes.join(", ") : "M"}</td>`;

    // Stock check
    stockRow += `<td style="text-align: center; font-weight: 600; color: ${prod.stock > 0 ? 'var(--color-success)' : 'var(--color-error)'};">${prod.stock > 0 ? 'In Stock' : 'Sold Out'}</td>`;

    actionRow += `
      <td style="text-align: center; padding: 1.5rem 0;">
        <button class="btn btn-primary btn-sm" onclick="addToCart(${prod.id}, 'M', 1)" style="margin-bottom: 0.5rem;" ${prod.stock === 0 ? 'disabled style="background-color: var(--color-gray-dark); opacity: 0.7; cursor: not-allowed;"' : ''}>Add to Cart</button><br>
        <button onclick="toggleCompare(${prod.id})" style="color: var(--color-error); font-size: 0.85rem; background: none; border: none; font-weight: 600; cursor: pointer; text-decoration: underline;">Remove</button>
      </td>
    `;
  });

  container.innerHTML = `
    <!-- Top toolbar button row -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem;">
      <button class="btn btn-outline btn-sm" id="highlight-diff-btn" onclick="toggleHighlightDifferences()" style="border-color: var(--color-gray-light); color: var(--color-charcoal); font-weight: 600;">Highlight Differences</button>
      <button class="btn btn-outline btn-sm" onclick="clearCompareList()" style="border-color: var(--color-error); color: var(--color-error); font-weight: 600;">Clear Compare List</button>
    </div>

    <!-- Scrollable Comparison Table -->
    <div class="table-responsive" style="overflow-x: auto; background-color: var(--color-white); border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); box-shadow: var(--shadow-sm); padding: 1.5rem;">
      <table class="royal-table compare-table-highlightable" style="width: 100%; border-collapse: collapse; min-width: 600px;">
        <thead>
          <tr style="border-bottom: 1.5px solid var(--color-maroon);">${headerRow}</tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid var(--color-gray-light);">${imageRow}</tr>
          <tr class="compare-row-data" style="border-bottom: 1px solid var(--color-gray-light); font-weight: 600; background-color: rgba(107,31,42,0.02);">${priceRow}</tr>
          <tr class="compare-row-data" style="border-bottom: 1px solid var(--color-gray-light);">${discountRow}</tr>
          <tr class="compare-row-data" style="border-bottom: 1px solid var(--color-gray-light);">${ratingRow}</tr>
          <tr class="compare-row-data" style="border-bottom: 1px solid var(--color-gray-light);">${categoryRow}</tr>
          <tr class="compare-row-data" style="border-bottom: 1px solid var(--color-gray-light);">${fabricRow}</tr>
          <tr class="compare-row-data" style="border-bottom: 1px solid var(--color-gray-light);">${occasionRow}</tr>
          <tr class="compare-row-data" style="border-bottom: 1px solid var(--color-gray-light);">${colorsRow}</tr>
          <tr class="compare-row-data" style="border-bottom: 1px solid var(--color-gray-light);">${sizesRow}</tr>
          <tr class="compare-row-data" style="border-bottom: 1px solid var(--color-gray-light);">${stockRow}</tr>
          <tr style="border-top: 1.5px solid var(--color-maroon);">${actionRow}</tr>
        </tbody>
      </table>
    </div>

    <div style="margin-top: 2rem; text-align: left;">
      <a href="shop.html" class="btn btn-outline btn-sm" style="display: inline-block; font-weight: 600; text-decoration: none;">&larr; Continue Shopping</a>
    </div>
  `;

  // Retain difference highlighting if active
  if (highlightDiffActive) {
    highlightDiffActive = false; // Reset to trigger true state
    toggleHighlightDifferences();
  }
}

// Initial triggers
document.addEventListener("DOMContentLoaded", () => {
  syncAllCompareButtons();
  if (document.getElementById("compare-page-content")) {
    renderComparePage();
  }
});
