/* Catalog Filtering, Sorting, and Column Controls for Royal Affair */

let catalogState = {
  category: "All",
  maxPrice: 12999,
  sizes: [],
  colors: [],
  fabrics: [],
  occasions: [],
  availability: "all",
  discountOnly: false,
  minRating: 0,
  sort: "featured",
  layout: "grid",
  columns: 3,
  currentPage: 1,
  itemsPerPage: 12,
  search: ""
};

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("products-catalog-grid")) {
    initCatalogPage();
  }
});

function initCatalogPage() {
  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has("category")) {
    catalogState.category = urlParams.get("category");
  }
  if (urlParams.has("search")) {
    catalogState.search = urlParams.get("search").toLowerCase();
    const infoMsg = document.getElementById("search-info-message");
    if (infoMsg) {
      infoMsg.textContent = `Showing search results for "${urlParams.get("search")}"`;
      infoMsg.style.display = "block";
    }
  }

  // Load state and update inputs
  syncFormInputs();
  applyFilters();
}

// 1. Core Filter logic
function applyFilters() {
  let filtered = [...products];

  // Search filter
  if (catalogState.search) {
    filtered = filtered.filter(prod => 
      prod.name.toLowerCase().includes(catalogState.search) ||
      prod.category.toLowerCase().includes(catalogState.search) ||
      prod.subcategory.toLowerCase().includes(catalogState.search)
    );
  }

  // Category filter
  if (catalogState.category !== "All") {
    filtered = filtered.filter(prod => prod.category === catalogState.category);
  }

  // Price filter
  filtered = filtered.filter(prod => prod.price <= catalogState.maxPrice);

  // Sizes filter
  if (catalogState.sizes.length > 0) {
    filtered = filtered.filter(prod => 
      prod.sizes.some(s => catalogState.sizes.includes(s))
    );
  }

  // Colors filter
  if (catalogState.colors.length > 0) {
    filtered = filtered.filter(prod => 
      prod.colors.some(c => catalogState.colors.includes(c))
    );
  }

  // Fabric filter
  if (catalogState.fabrics.length > 0) {
    filtered = filtered.filter(prod => 
      catalogState.fabrics.includes(prod.fabric)
    );
  }

  // Occasions filter
  if (catalogState.occasions.length > 0) {
    filtered = filtered.filter(prod => 
      catalogState.occasions.includes(prod.occasion)
    );
  }

  // Availability filter
  if (catalogState.availability === "in-stock") {
    filtered = filtered.filter(prod => prod.stock > 0);
  }

  // Discount Offer filter
  if (catalogState.discountOnly) {
    filtered = filtered.filter(prod => prod.originalPrice > prod.price);
  }

  // Rating filter
  if (catalogState.minRating > 0) {
    filtered = filtered.filter(prod => prod.rating >= catalogState.minRating);
  }

  // Apply Sorting
  if (catalogState.sort === "price-low") {
    filtered.sort((a, b) => a.price - b.price);
  } else if (catalogState.sort === "price-high") {
    filtered.sort((a, b) => b.price - a.price);
  } else if (catalogState.sort === "rating") {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (catalogState.sort === "newest") {
    filtered.sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0));
  } else if (catalogState.sort === "discount") {
    filtered.sort((a, b) => (b.originalPrice - b.price) - (a.originalPrice - a.price));
  }

  // Save filtered count globally to slice pages
  window.currentFilteredProducts = filtered;

  // Render Layouts
  renderFilterChips();
  renderCatalogProducts();
}

// 2. Render Cards Pager
function renderCatalogProducts() {
  const grid = document.getElementById("products-catalog-grid");
  const countLabel = document.getElementById("catalog-count");
  if (!grid) return;

  const items = window.currentFilteredProducts || [];
  if (countLabel) {
    countLabel.textContent = `${items.length} ${items.length === 1 ? 'suit' : 'suits'} found`;
  }

  if (items.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 0; color: var(--color-gray);">
        <h3 style="font-family: var(--font-heading); font-size: 1.75rem; margin-bottom: 1rem; color: var(--color-maroon-dark);">No Designer Suits Found</h3>
        <p style="margin-bottom: 1.5rem;">Adjust your filter selections to see our luxury pieces.</p>
        <button class="btn btn-primary btn-sm" onclick="clearAllCatalogFilters()">Reset All Filters</button>
      </div>
    `;
    const loadMore = document.getElementById("load-more-container");
    if (loadMore) loadMore.style.display = "none";
    const pager = document.getElementById("catalog-pagination-row");
    if (pager) pager.innerHTML = "";
    return;
  }

  // Paginated slice
  const startIdx = (catalogState.currentPage - 1) * catalogState.itemsPerPage;
  const endIdx = startIdx + catalogState.itemsPerPage;
  const pageItems = items.slice(startIdx, endIdx);

  // Render cards
  grid.innerHTML = pageItems.map(prod => createProductCardHTML(prod)).join("");

  // Sync Wishlist and Compare button states
  if (typeof syncAllWishlistButtons === "function") syncAllWishlistButtons();
  if (typeof syncAllCompareButtons === "function") syncAllCompareButtons();

  // Load More Button visibility
  const loadMore = document.getElementById("load-more-container");
  if (loadMore) {
    if (endIdx < items.length) {
      loadMore.style.display = "block";
    } else {
      loadMore.style.display = "none";
    }
  }

  // Render Pagination Pagers
  renderPagination(items.length);
}

// 3. Render Pagination Pager Buttons
function renderPagination(totalItems) {
  const container = document.getElementById("catalog-pagination-row");
  if (!container) return;

  const totalPages = Math.ceil(totalItems / catalogState.itemsPerPage);
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";
  
  // Previous button
  html += `
    <button class="pagination-btn ${catalogState.currentPage === 1 ? 'disabled' : ''}" 
            onclick="setCatalogPage(${catalogState.currentPage - 1})" 
            aria-label="Previous Page" 
            ${catalogState.currentPage === 1 ? 'disabled' : ''}>
      &larr;
    </button>
  `;

  // Page Numbers
  for (let i = 1; i <= totalPages; i++) {
    html += `
      <button class="pagination-btn ${catalogState.currentPage === i ? 'active' : ''}" 
              onclick="setCatalogPage(${i})">
        ${i}
      </button>
    `;
  }

  // Next button
  html += `
    <button class="pagination-btn ${catalogState.currentPage === totalPages ? 'disabled' : ''}" 
            onclick="setCatalogPage(${catalogState.currentPage + 1})" 
            aria-label="Next Page" 
            ${catalogState.currentPage === totalPages ? 'disabled' : ''}>
      &rarr;
    </button>
  `;

  container.innerHTML = html;
}

// 4. Global Controller functions attached to Window
window.setFilterCategory = function(cat) {
  catalogState.category = cat;
  catalogState.currentPage = 1;
  syncFormInputs();
  applyFilters();
};

window.setFilterPrice = function(val) {
  catalogState.maxPrice = parseInt(val);
  catalogState.currentPage = 1;
  syncFormInputs();
  applyFilters();
};

window.toggleFilterSize = function(btn, size) {
  const index = catalogState.sizes.indexOf(size);
  if (index > -1) {
    catalogState.sizes.splice(index, 1);
  } else {
    catalogState.sizes.push(size);
  }
  catalogState.currentPage = 1;
  syncFormInputs();
  applyFilters();
};

window.removeFilterSize = function(size) {
  catalogState.sizes = catalogState.sizes.filter(s => s !== size);
  catalogState.currentPage = 1;
  syncFormInputs();
  applyFilters();
};

window.toggleFilterColor = function(el, color) {
  const index = catalogState.colors.indexOf(color);
  if (index > -1) {
    catalogState.colors.splice(index, 1);
  } else {
    catalogState.colors.push(color);
  }
  catalogState.currentPage = 1;
  syncFormInputs();
  applyFilters();
};

window.removeFilterColor = function(color) {
  catalogState.colors = catalogState.colors.filter(c => c !== color);
  catalogState.currentPage = 1;
  syncFormInputs();
  applyFilters();
};

window.toggleFilterFabric = function(fabric) {
  const index = catalogState.fabrics.indexOf(fabric);
  if (index > -1) {
    catalogState.fabrics.splice(index, 1);
  } else {
    catalogState.fabrics.push(fabric);
  }
  catalogState.currentPage = 1;
  syncFormInputs();
  applyFilters();
};

window.removeFilterFabric = function(fabric) {
  catalogState.fabrics = catalogState.fabrics.filter(f => f !== fabric);
  catalogState.currentPage = 1;
  syncFormInputs();
  applyFilters();
};

window.toggleFilterOccasion = function(occasion) {
  const index = catalogState.occasions.indexOf(occasion);
  if (index > -1) {
    catalogState.occasions.splice(index, 1);
  } else {
    catalogState.occasions.push(occasion);
  }
  catalogState.currentPage = 1;
  syncFormInputs();
  applyFilters();
};

window.removeFilterOccasion = function(occasion) {
  catalogState.occasions = catalogState.occasions.filter(o => o !== occasion);
  catalogState.currentPage = 1;
  syncFormInputs();
  applyFilters();
};

window.setFilterAvail = function(avail) {
  catalogState.availability = avail;
  catalogState.currentPage = 1;
  syncFormInputs();
  applyFilters();
};

window.toggleFilterDiscount = function(isChecked) {
  catalogState.discountOnly = isChecked;
  catalogState.currentPage = 1;
  syncFormInputs();
  applyFilters();
};

window.setFilterRating = function(rating) {
  catalogState.minRating = parseFloat(rating);
  catalogState.currentPage = 1;
  syncFormInputs();
  applyFilters();
};

window.setCatalogSort = function(sortVal) {
  catalogState.sort = sortVal;
  catalogState.currentPage = 1;
  syncFormInputs();
  applyFilters();
};

window.setCatalogPage = function(pageNumber) {
  catalogState.currentPage = pageNumber;
  window.scrollTo({ top: 150, behavior: "smooth" });
  renderCatalogProducts();
};

window.triggerLoadMoreCatalog = function() {
  catalogState.currentPage++;
  renderCatalogProducts();
};

window.setCatalogLayout = function(layoutType) {
  const grid = document.getElementById("products-catalog-grid");
  const colSelectors = document.getElementById("column-selectors-block");
  const gridBtn = document.getElementById("layout-grid-btn");
  const listBtn = document.getElementById("layout-list-btn");

  if (!grid) return;

  catalogState.layout = layoutType;
  
  if (layoutType === "list") {
    grid.className = "catalog-list-view";
    if (colSelectors) colSelectors.style.display = "none";
    if (gridBtn) gridBtn.classList.remove("active");
    if (listBtn) listBtn.classList.add("active");
  } else {
    grid.className = "";
    if (colSelectors) colSelectors.style.display = "flex";
    if (gridBtn) gridBtn.classList.add("active");
    if (listBtn) listBtn.classList.remove("active");
    setCatalogColumns(catalogState.columns);
  }
};

window.setCatalogColumns = function(colCount) {
  const grid = document.getElementById("products-catalog-grid");
  if (!grid || catalogState.layout === "list") return;

  catalogState.columns = colCount;

  // Clear col utilities
  grid.classList.remove("catalog-grid-cols-2", "catalog-grid-cols-3", "catalog-grid-cols-4");
  
  // Set selected col class
  grid.classList.add(`catalog-grid-cols-${colCount}`);

  // Update button active borders
  const buttons = document.querySelectorAll(".col-select-btn");
  buttons.forEach(btn => {
    const cols = parseInt(btn.getAttribute("data-cols"));
    if (cols === colCount) {
      btn.style.backgroundColor = "var(--color-maroon)";
      btn.style.color = "var(--color-ivory)";
      btn.style.borderColor = "var(--color-maroon)";
    } else {
      btn.style.backgroundColor = "var(--color-white)";
      btn.style.color = "var(--color-charcoal)";
      btn.style.borderColor = "var(--color-gray-light)";
    }
  });
};

window.clearAllCatalogFilters = function() {
  catalogState = {
    category: "All",
    maxPrice: 12999,
    sizes: [],
    colors: [],
    fabrics: [],
    occasions: [],
    availability: "all",
    discountOnly: false,
    minRating: 0,
    sort: "featured",
    layout: catalogState.layout,
    columns: catalogState.columns,
    currentPage: 1,
    itemsPerPage: 12,
    search: ""
  };

  // Clear URL parameters
  window.history.pushState({}, document.title, window.location.pathname);
  const infoMsg = document.getElementById("search-info-message");
  if (infoMsg) infoMsg.style.display = "none";

  syncFormInputs();
  applyFilters();
};

// 5. Mobile Filter Drawer toggles
window.openMobileFilterDrawer = function() {
  const sidebar = document.querySelector(".desktop-filters-sidebar");
  const placeholder = document.getElementById("mobile-filters-placeholder-content");
  const drawer = document.getElementById("mobile-filter-drawer-panel");
  const overlay = document.getElementById("mobile-filter-backdrop-overlay");

  if (sidebar && placeholder) {
    placeholder.innerHTML = sidebar.innerHTML;
    // Suppress clear-filters heading in mobile drawer
    const header = placeholder.querySelector("div");
    if (header) header.style.display = "none";

    // Bind cloned input events in drawer back to sync state
    // Price range inside mobile drawer
    const range = placeholder.querySelector(".price-slider-input");
    if (range) {
      range.addEventListener("input", (e) => {
        setFilterPrice(e.target.value);
      });
    }
  }

  if (drawer && overlay) {
    drawer.classList.add("open");
    overlay.classList.add("open");
    document.body.style.overflow = "hidden";
  }
};

window.closeMobileFilterDrawer = function() {
  const drawer = document.getElementById("mobile-filter-drawer-panel");
  const overlay = document.getElementById("mobile-filter-backdrop-overlay");
  
  if (drawer && overlay) {
    drawer.classList.remove("open");
    overlay.classList.remove("open");
    document.body.style.overflow = "";
  }
};

// 6. Active Chips Renderer
function renderFilterChips() {
  const chipsRow = document.getElementById("active-filter-chips-row");
  if (!chipsRow) return;

  let html = "";
  
  if (catalogState.category !== "All") {
    html += `<span class="filter-chip" onclick="setFilterCategory('All')">Category: ${catalogState.category} &times;</span>`;
  }
  if (catalogState.maxPrice < 12999) {
    html += `<span class="filter-chip" onclick="setFilterPrice(12999)">Price: < ₹${catalogState.maxPrice} &times;</span>`;
  }
  catalogState.sizes.forEach(sz => {
    html += `<span class="filter-chip" onclick="removeFilterSize('${sz}')">Size: ${sz} &times;</span>`;
  });
  catalogState.colors.forEach(col => {
    html += `<span class="filter-chip" onclick="removeFilterColor('${col}')">Color: ${col} &times;</span>`;
  });
  catalogState.fabrics.forEach(fab => {
    html += `<span class="filter-chip" onclick="removeFilterFabric('${fab}')">${fab} &times;</span>`;
  });
  catalogState.occasions.forEach(occ => {
    html += `<span class="filter-chip" onclick="removeFilterOccasion('${occ}')">${occ.split(" ")[0]} &times;</span>`;
  });
  if (catalogState.availability !== "all") {
    html += `<span class="filter-chip" onclick="setFilterAvail('all')">In Stock &times;</span>`;
  }
  if (catalogState.discountOnly) {
    html += `<span class="filter-chip" onclick="toggleFilterDiscount(false)">On Sale &times;</span>`;
  }
  if (catalogState.minRating > 0) {
    html += `<span class="filter-chip" onclick="setFilterRating(0)">${catalogState.minRating}★ & Above &times;</span>`;
  }

  chipsRow.innerHTML = html;
}

// 7. Sync variables to Sidebar UI elements
function syncFormInputs() {
  const catRadios = document.querySelectorAll("input[name='filter-category']");
  catRadios.forEach(rad => {
    rad.checked = rad.value === catalogState.category;
  });

  const priceSliders = document.querySelectorAll(".price-slider-input");
  priceSliders.forEach(slider => {
    slider.value = catalogState.maxPrice;
  });

  const ceilingVals = document.querySelectorAll(".ceiling-price-val");
  ceilingVals.forEach(val => {
    val.textContent = formatCurrency(catalogState.maxPrice);
  });

  const sizeBtns = document.querySelectorAll(".filter-size-btn");
  sizeBtns.forEach(btn => {
    const sz = btn.getAttribute("data-size");
    if (catalogState.sizes.includes(sz)) {
      btn.style.backgroundColor = "var(--color-maroon)";
      btn.style.color = "var(--color-ivory)";
      btn.style.borderColor = "var(--color-maroon)";
    } else {
      btn.style.backgroundColor = "var(--color-white)";
      btn.style.color = "var(--color-charcoal)";
      btn.style.borderColor = "var(--color-gray-light)";
    }
  });

  const colorTags = document.querySelectorAll(".filter-color-tag");
  colorTags.forEach(tag => {
    const col = tag.getAttribute("data-color");
    if (catalogState.colors.includes(col)) {
      tag.style.transform = "scale(1.2)";
      tag.style.boxShadow = "0 0 0 2px var(--color-maroon)";
    } else {
      tag.style.transform = "scale(1)";
      tag.style.boxShadow = "none";
    }
  });

  const fabricChks = document.querySelectorAll(".filter-fabric-chk");
  fabricChks.forEach(chk => {
    chk.checked = catalogState.fabrics.includes(chk.value);
  });

  const occasionChks = document.querySelectorAll(".filter-occasion-chk");
  occasionChks.forEach(chk => {
    chk.checked = catalogState.occasions.includes(chk.value);
  });

  const availRadios = document.querySelectorAll("input[name='filter-avail']");
  availRadios.forEach(rad => {
    rad.checked = rad.value === catalogState.availability;
  });

  const discountChk = document.getElementById("filter-discount-chk");
  if (discountChk) discountChk.checked = catalogState.discountOnly;

  const ratingRadios = document.querySelectorAll("input[name='filter-rating']");
  ratingRadios.forEach(rad => {
    rad.checked = parseFloat(rad.value) === catalogState.minRating;
  });

  const sortSelect = document.getElementById("catalog-sort");
  if (sortSelect) sortSelect.value = catalogState.sort;
}
