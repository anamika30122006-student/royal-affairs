/* Main Global JS for Royal Affair - Designer Suits */

document.addEventListener("DOMContentLoaded", () => {
  injectGlobalHeader();
  injectGlobalFooter();
  initGlobalHeaderScroll();
  initMobileNavDrawer();
  initDrawerAndOverlays();
  updateBadges();
  initKeyboardAccessibility();
  initFooterControls();
  injectSkipLink();
  setupMainContentAnchor();
  injectSEO();
  lazyLoadImages();

  // Check and trigger welcome modal if on homepage
  const pathname = window.location.pathname.toLowerCase();
  const isHomepage = pathname.endsWith("index.html") ||
    pathname.endsWith("/") ||
    pathname === "" ||
    !pathname.includes(".html");
  if (isHomepage) {
    checkWelcomePopup();
  }
});

// 1. Inject Reusable Responsive Header Markup
function injectGlobalHeader() {
  // Remove existing header and announcement bar to prevent duplicates
  const existingBanners = document.querySelectorAll(".announcement-bar");
  existingBanners.forEach(el => el.remove());

  const existingHeaders = document.querySelectorAll("header");
  existingHeaders.forEach(el => el.remove());

  const existingDrawer = document.getElementById("mobile-nav-drawer");
  if (existingDrawer) existingDrawer.remove();
  const existingOverlay = document.getElementById("mobile-nav-drawer-overlay");
  if (existingOverlay) existingOverlay.remove();

  // Create announcement banner
  const announcementHtml = `
    <div class="announcement-bar">
      <span>Free shipping above ₹1,999</span>
      <span>Wholesale & Retail Orders Available</span>
      <a href="https://wa.me/919219956289" target="_blank" style="color: var(--color-gold-light); font-weight: 600;">Call/WhatsApp: +91 9219956289</a>
    </div>
  `;

  // Create double-row main header
  const headerHtml = `
    <header class="site-header">
      <div class="container main-header-row">
        <!-- Left: Brand Logo -->
        <a href="index.html" class="logo" style="flex-direction: row !important; align-items: center !important; gap: 0.55rem !important; text-transform: none !important; font-size: inherit !important; letter-spacing: normal !important; line-height: normal !important; text-decoration: none;">
          <img src="./assets/logo/logo.jpg" alt="Royal Affair Logo" style="height: 48px; width: 48px; min-width: 48px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--color-gold);">
          <div style="display: flex; flex-direction: column; align-items: flex-start;">
            <span style="font-family: var(--font-heading); font-size: 1.45rem; font-weight: 700; color: var(--color-maroon-dark); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; line-height: 1;">Royal Affair</span>
            <span style="font-family: var(--font-body); font-size: 0.65rem; font-weight: 600; text-transform: uppercase; color: var(--color-gold-dark); letter-spacing: 0.25em; margin-top: 3px; display: block; line-height: 1;">Designer Suits</span>
          </div>
        </a>

        <!-- Center: Integrated Search Bar -->
        <div class="header-search-bar">
          <form action="shop.html" method="GET" class="search-form" style="display: flex; align-items: center; background-color: var(--color-white); border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); padding: 2px;">
            <!-- Categories Select Dropdown -->
            <select name="category" class="search-category-select" style="padding: 0 0.5rem; border: none; background: none; font-size: 0.8rem; font-weight: 700; color: var(--color-charcoal-light); outline: none; cursor: pointer; height: 38px; font-family: var(--font-body); letter-spacing: 0.02em;">
              <option value="">All Categories</option>
              <option value="Anarkali">Anarkali Suits</option>
              <option value="Sharara Set">Sharara Sets</option>
              <option value="Salwar Kameez">Salwar Kameez</option>
              <option value="Palazzo Suit">Palazzo Suits</option>
            </select>
            <!-- Vertical Divider line -->
            <div style="width: 1px; height: 20px; background-color: var(--color-gray-light); margin: 0 4px;"></div>
            <!-- Search Text Input -->
            <input type="text" name="search" placeholder="Search premium suits..." class="header-search-input" style="border: none !important; flex: 1; height: 38px; outline: none; padding: 0 0.75rem; font-size: 0.85rem;" aria-label="Search catalog" autocomplete="off">
            <!-- Search Action Submit Button -->
            <button type="submit" class="header-search-btn" aria-label="Submit search" style="border: none; background-color: var(--color-maroon); color: var(--color-white); width: 44px; height: 38px; border-radius: var(--border-radius-xs); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background-color var(--transition-fast);">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
          </form>
          <!-- Auto-recommendations dropdown -->
          <div class="search-suggestions-dropdown" aria-label="Search suggestions"></div>
        </div>

        <!-- Right: Actions Buttons -->
        <div class="header-actions">
          <!-- Mobile Hamburger Toggle -->
          <button class="mobile-toggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="mobile-nav-drawer">
            <svg viewBox="0 0 24 24" width="26" height="26" stroke="currentColor" stroke-width="2" fill="none">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          <!-- Account Profile -->
          <a href="account.html" class="action-btn" aria-label="Account Profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </a>

          <!-- Wishlist Badge -->
          <a href="wishlist.html" class="action-btn" aria-label="Wishlist items">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            <span class="badge-count wishlist-badge">0</span>
          </a>



          <!-- Cart Badge & Total -->
          <button class="action-btn cart-trigger" aria-label="Shopping Cart Drawer" style="display: inline-flex; align-items: center; gap: 0.5rem; background: none; border: none; padding: 0;">
            <div style="position: relative;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 22px; height: 22px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
              <span class="badge-count cart-badge">0</span>
            </div>
            <span class="cart-total-text" style="font-size: var(--font-sm); font-weight: 600; color: var(--color-maroon); margin-left: 2px;">₹0</span>
          </button>
        </div>
      </div>

      <!-- Navigation Link Row (Desktop Mega Menu) -->
      <div class="navigation-row">
        <div class="container" style="position: relative; display: flex; align-items: center; justify-content: space-between; width: 100%;">
          
          <!-- Shop By Categories Dropdown on the left -->
          <div class="nav-item-dropdown category-dropdown-trigger" style="position: relative; flex-shrink: 0;">
            <button class="nav-link" aria-haspopup="true" aria-expanded="false" style="display: flex; align-items: center; gap: 0.5rem; background: var(--color-maroon); color: var(--color-white) !important; padding: 0.5rem 1.25rem; border-radius: var(--border-radius-xs); border: none; font-weight: 700; cursor: pointer; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.05em; height: 38px; flex-shrink: 0; white-space: nowrap;">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" style="margin-right: 2px;"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
              Shop By Categories
              <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" style="margin-left: 2px;"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="dropdown-menu category-dropdown-menu" style="position: absolute; top: calc(100% + 4px); left: 0; background: var(--color-white); border: 1px solid var(--color-gold); border-radius: var(--border-radius-xs); box-shadow: 0 12px 32px rgba(0,0,0,0.18); width: 220px; z-index: 9999; display: none; padding: 0.5rem 0;">
              <a href="shop.html?category=Anarkali" style="display: block; padding: 0.65rem 1.25rem; color: var(--color-charcoal); text-decoration: none; font-weight: 600; font-size: 0.85rem; border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.15s, color 0.15s;" onmouseover="this.style.background='rgba(115,28,56,0.06)';this.style.color='var(--color-maroon)'" onmouseout="this.style.background='';this.style.color='var(--color-charcoal)'">Anarkali Suits</a>
              <a href="shop.html?category=Sharara%20Set" style="display: block; padding: 0.65rem 1.25rem; color: var(--color-charcoal); text-decoration: none; font-weight: 600; font-size: 0.85rem; border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.15s, color 0.15s;" onmouseover="this.style.background='rgba(115,28,56,0.06)';this.style.color='var(--color-maroon)'" onmouseout="this.style.background='';this.style.color='var(--color-charcoal)'">Sharara Sets</a>
              <a href="shop.html?category=Salwar%20Kameez" style="display: block; padding: 0.65rem 1.25rem; color: var(--color-charcoal); text-decoration: none; font-weight: 600; font-size: 0.85rem; border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.15s, color 0.15s;" onmouseover="this.style.background='rgba(115,28,56,0.06)';this.style.color='var(--color-maroon)'" onmouseout="this.style.background='';this.style.color='var(--color-charcoal)'">Salwar Kameez</a>
              <a href="shop.html?category=Palazzo%20Suit" style="display: block; padding: 0.65rem 1.25rem; color: var(--color-charcoal); text-decoration: none; font-weight: 600; font-size: 0.85rem; transition: background 0.15s, color 0.15s;" onmouseover="this.style.background='rgba(115,28,56,0.06)';this.style.color='var(--color-maroon)'" onmouseout="this.style.background='';this.style.color='var(--color-charcoal)'">Palazzo Suits</a>
            </div>
          </div>

          <!-- Main Nav Menu -->
          <nav class="nav-menu" role="navigation" aria-label="Main Navigation" style="display: flex; gap: 0.5rem; margin-left: 1rem; flex: 1; min-width: 0; overflow-x: auto;">
            <a href="index.html" class="nav-link">Home</a>
            <div class="nav-item-dropdown mega-menu-trigger">
              <a href="shop.html" class="nav-link" aria-haspopup="true" aria-expanded="false">Shop Collection</a>
              <!-- Mega Menu Dropdown -->
              <div class="mega-menu">
                <div class="mega-menu-container">
                  <div class="mega-menu-column">
                    <h4>By Category</h4>
                    <a href="shop.html?category=Anarkali">Anarkali Suits</a>
                    <a href="shop.html?category=Sharara%20Set">Sharara Sets</a>
                    <a href="shop.html?category=Salwar%20Kameez">Salwar Kameez</a>
                    <a href="shop.html?category=Palazzo%20Suit">Palazzo Suits</a>
                  </div>
                  <div class="mega-menu-column">
                    <h4>Trending Styles</h4>
                    <a href="shop.html?search=velvet">Silk Velvet Heritage</a>
                    <a href="shop.html?search=silk">Pure Raw Silks</a>
                    <a href="shop.html?search=organza">Organza Collection</a>
                    <a href="shop.html?search=banarasi">Classic Banarasi</a>
                  </div>
                  <div class="mega-menu-column">
                    <h4>Bespoke Services</h4>
                    <a href="contact.html">Custom Measurements Fitting</a>
                    <a href="contact.html?type=wholesale">Wholesale Orders Enquiry</a>
                    <a href="about.html">Our Weavers Heritage</a>
                  </div>
                </div>
              </div>
            </div>
            <a href="shop.html?search=new" class="nav-link">New Arrivals</a>
            <a href="shop.html?search=pakistani" class="nav-link">Pakistani Suits</a>
            <a href="shop.html?category=Anarkali" class="nav-link">Designer Suits</a>
            <a href="shop.html?search=festive" class="nav-link">Festive Collection</a>
            <a href="shop.html?search=wedding" class="nav-link">Wedding Collection</a>
            <a href="contact.html?type=wholesale" class="nav-link">Wholesale Enquiry</a>
            <a href="about.html" class="nav-link">About</a>
            <a href="contact.html" class="nav-link">Contact</a>
          </nav>
        </div>
      </div>
    </header>
  `;

  // Create Left Drawer Mobile Navigation
  const mobileDrawerHtml = `
    <div class="mobile-drawer-overlay" id="mobile-nav-drawer-overlay"></div>
    <div class="mobile-drawer" id="mobile-nav-drawer" role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
      <div class="mobile-drawer-header">
        <a href="index.html" class="logo" style="display: flex; flex-direction: row !important; align-items: center !important; gap: 0.45rem !important; text-transform: none !important; font-size: inherit !important; letter-spacing: normal !important; line-height: normal !important; text-decoration: none;">
          <img src="./assets/logo/logo.jpg" alt="Royal Affair Logo" style="height: 38px; width: 38px; min-width: 38px; border-radius: 50%; object-fit: cover; border: 1px solid var(--color-gold);">
          <div style="display: flex; flex-direction: column; align-items: flex-start;">
            <span style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700; color: var(--color-maroon-dark); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; line-height: 1;">Royal Affair</span>
            <span style="font-family: var(--font-body); font-size: 0.55rem; font-weight: 600; text-transform: uppercase; color: var(--color-gold-dark); letter-spacing: 0.2em; margin-top: 2px; display: block; line-height: 1;">Designer Suits</span>
          </div>
        </a>
        <button class="mobile-drawer-close" aria-label="Close navigation menu">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="mobile-drawer-body">
        <div class="mobile-search-wrapper" style="margin-bottom: var(--spacing-md); position: relative;">
          <form action="shop.html" method="GET" style="display: flex; align-items: center; background-color: var(--color-white); border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); padding: 2px; width: 100%;">
            <input type="text" name="search" class="header-search-input" placeholder="Search catalog..." style="flex: 1; padding: 0.55rem 0.85rem; font-size: var(--font-sm); border: none; outline: none; background: none; width: 100%; color: var(--color-charcoal);" aria-label="Search mobile catalog" autocomplete="off">
            <button type="submit" style="background: none; border: none; padding: 0.5rem; color: var(--color-maroon); display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
          </form>
          <div class="search-suggestions-dropdown" style="display: none; position: absolute; left: 0; right: 0; top: 100%; z-index: 9999; max-height: 320px; overflow-y: auto; background-color: #ffffff; box-shadow: 0 16px 36px rgba(0,0,0,0.22); border: 1px solid var(--color-gold); border-radius: 4px;" aria-label="Search suggestions"></div>
        </div>
        <ul class="mobile-drawer-links">
          <li><a href="index.html" class="mobile-link">Home</a></li>
          <li class="mobile-drawer-item expandable">
            <button class="mobile-drawer-toggle-btn" aria-expanded="false">
              Shop Collection
              <span class="plus-icon">+</span>
            </button>
            <ul class="mobile-drawer-submenu">
              <li><a href="shop.html">All Suits</a></li>
              <li><a href="shop.html?category=Anarkali">Anarkali Suits</a></li>
              <li><a href="shop.html?category=Sharara%20Set">Sharara Sets</a></li>
              <li><a href="shop.html?category=Salwar%20Kameez">Salwar Kameez</a></li>
              <li><a href="shop.html?category=Palazzo%20Suit">Palazzo Suits</a></li>
            </ul>
          </li>
          <li><a href="shop.html?search=new" class="mobile-link">New Arrivals</a></li>
          <li><a href="shop.html?search=pakistani" class="mobile-link">Pakistani Suits</a></li>
          <li><a href="shop.html?category=Anarkali" class="mobile-link">Designer Suits</a></li>
          <li><a href="shop.html?search=festive" class="mobile-link">Festive Collection</a></li>
          <li><a href="shop.html?search=wedding" class="mobile-link">Wedding Collection</a></li>
          <li><a href="contact.html?type=wholesale" class="mobile-link">Wholesale Enquiry</a></li>
          <li><a href="about.html" class="mobile-link">About Heritage</a></li>
          <li><a href="contact.html" class="mobile-link">Contact Stylists</a></li>
          <li style="border-top: 1px solid var(--color-gray-light); margin-top: var(--spacing-md); padding-top: var(--spacing-md);">
            <a href="account.html" class="mobile-link" style="color: var(--color-maroon); font-weight: 600;">My Account</a>
          </li>
        </ul>
      </div>
    </div>
  `;

  // Prepend new header items to body
  const body = document.body;
  const tempWrapper = document.createElement("div");
  tempWrapper.innerHTML = announcementHtml + headerHtml + mobileDrawerHtml;

  while (tempWrapper.firstChild) {
    body.insertBefore(tempWrapper.firstChild, body.firstChild);
  }

  // Handle active states on current path matching
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const desktopLinks = document.querySelectorAll(".nav-menu .nav-link");
  desktopLinks.forEach(link => {
    const href = link.getAttribute("href");
    if (href && href.startsWith(currentPath)) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// 2. Header Stickiness on Page Scroll
function initGlobalHeaderScroll() {
  const header = document.querySelector("header");
  if (!header) return;

  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      header.classList.add("sticky");
    } else {
      header.classList.remove("sticky");
    }
  });
}

// 3. Mobile Left Navigation Drawer Interactions
function initMobileNavDrawer() {
  const toggleBtn = document.querySelector(".mobile-toggle");
  const closeBtn = document.querySelector(".mobile-drawer-close");
  const drawer = document.getElementById("mobile-nav-drawer");
  const overlay = document.getElementById("mobile-nav-drawer-overlay");

  if (toggleBtn && drawer && overlay) {
    // Open drawer
    toggleBtn.addEventListener("click", () => {
      drawer.classList.add("open");
      overlay.classList.add("open");
      toggleBtn.setAttribute("aria-expanded", "true");
      // Prevent body scrolling when menu is open
      document.body.style.overflow = "hidden";
      setupFocusTrap(drawer);
    });

    // Close drawer handlers
    const closeDrawer = () => {
      drawer.classList.remove("open");
      overlay.classList.remove("open");
      toggleBtn.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      removeFocusTrap();
    };

    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    overlay.addEventListener("click", closeDrawer);

    // Expandable accordion submenus in drawer
    const expandables = document.querySelectorAll(".mobile-drawer-item.expandable");
    expandables.forEach(item => {
      const toggle = item.querySelector(".mobile-drawer-toggle-btn");
      const submenu = item.querySelector(".mobile-drawer-submenu");

      if (toggle && submenu) {
        toggle.addEventListener("click", () => {
          const isOpen = submenu.classList.contains("open");
          submenu.classList.toggle("open", !isOpen);
          toggle.setAttribute("aria-expanded", !isOpen ? "true" : "false");
        });
      }
    });
  }
}

// 4. Cart Drawer Sidebar & Modal Backdrop overlay toggles
function initDrawerAndOverlays() {
  // Global click handler for all cart icons and triggers across all pages
  document.addEventListener("click", (e) => {
    const cartEl = e.target.closest(".cart-trigger, .cart-icon, .cart-badge, .cart-total-text, [aria-label*='Cart'], [aria-label*='cart']");
    if (cartEl) {
      const currentPath = window.location.pathname.toLowerCase();
      if (!currentPath.endsWith("cart.html")) {
        e.preventDefault();
        window.location.href = "cart.html";
      }
    }
  });
}

// 5. Update Badge Counts & Cart Totals Display
function updateBadges() {
  // Cart Badge
  const cart = JSON.parse(localStorage.getItem("royal_affair_cart")) || [];
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartBadges = document.querySelectorAll(".cart-badge");
  cartBadges.forEach(badge => {
    badge.textContent = cartCount;
    badge.style.display = cartCount > 0 ? "flex" : "none";
  });

  // Cart total sum in header
  const totals = typeof calculateCartTotals === "function" ? calculateCartTotals() : { total: 0 };
  const cartTotals = document.querySelectorAll(".cart-total-text");
  cartTotals.forEach(el => {
    el.textContent = formatCurrency(totals.total);
  });

  // Wishlist Badge
  const wishlist = JSON.parse(localStorage.getItem("royal_affair_wishlist")) || [];
  const wishlistBadges = document.querySelectorAll(".wishlist-badge");
  wishlistBadges.forEach(badge => {
    badge.textContent = wishlist.length;
    badge.style.display = wishlist.length > 0 ? "flex" : "none";
  });

  // Compare Badge
  const compare = JSON.parse(localStorage.getItem("royal_affair_compare")) || [];
  const compareBadges = document.querySelectorAll(".compare-badge");
  compareBadges.forEach(badge => {
    badge.textContent = compare.length;
    badge.style.display = compare.length > 0 ? "flex" : "none";
  });
}

// 6. Universal Keyboard accessibility listener
function initKeyboardAccessibility() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      // Close mobile drawer
      const mobDrawer = document.getElementById("mobile-nav-drawer");
      const mobOverlay = document.getElementById("mobile-nav-drawer-overlay");
      if (mobDrawer && mobDrawer.classList.contains("open")) {
        mobDrawer.classList.remove("open");
        if (mobOverlay) mobOverlay.classList.remove("open");
        document.body.style.overflow = "";
        const toggleBtn = document.querySelector(".mobile-toggle");
        if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
      }

      // Close cart drawer
      const cartOverlay = document.querySelector(".cart-drawer-overlay");
      if (cartOverlay && cartOverlay.classList.contains("open")) {
        cartOverlay.classList.remove("open");
      }

      // Close autocomplete recommendations
      const searchSuggestions = document.querySelector(".search-suggestions-dropdown");
      if (searchSuggestions) {
        searchSuggestions.innerHTML = "";
        searchSuggestions.style.display = "none";
      }

      // Close Quick View modal
      if (typeof closeQuickView === "function") {
        closeQuickView();
      }

      // Close Welcome popup modal
      if (typeof closeWelcomePopup === "function") {
        closeWelcomePopup();
      }
    }
  });
}

// 7. Format Currency (Indian Rupees)
function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

// 8. Custom Toast message alerts (with success, error, warning, and info parameters)
function showToast(message, type = "success") {
  let toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  let icon = `
    <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  `;
  if (type === "error") {
    icon = `
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
    `;
  } else if (type === "warning") {
    icon = `
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    `;
  } else if (type === "info") {
    icon = `
      <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    `;
  }

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      ${icon}
      <span>${message}</span>
    </div>
    <span class="toast-close">&times;</span>
  `;

  toastContainer.appendChild(toast);

  const closeBtn = toast.querySelector(".toast-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      toast.remove();
    });
  }

  const autoDismiss = setTimeout(() => {
    toast.style.animation = "fadeIn 0.3s ease-out reverse forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// 8b. Reusable Confirmation Dialog
function showConfirmDialog(title, message, onConfirm, onCancel) {
  const existing = document.getElementById("confirm-dialog-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "confirm-dialog-overlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(36, 33, 36, 0.6);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.25s ease;
  `;

  const box = document.createElement("div");
  box.style.cssText = `
    background: var(--color-white);
    border: 1px solid var(--color-gray-light);
    border-radius: var(--border-radius-xs);
    padding: 2rem;
    max-width: 420px;
    width: 90%;
    box-shadow: var(--shadow-lg);
    transform: scale(0.9);
    transition: transform 0.25s ease;
    text-align: left;
  `;

  box.innerHTML = `
    <h3 style="font-family: var(--font-heading); font-size: 1.4rem; color: var(--color-maroon-dark); margin-bottom: 0.75rem;">${title}</h3>
    <p style="color: var(--color-charcoal-light); font-size: 0.95rem; margin-bottom: 1.5rem; line-height: 1.5;">${message}</p>
    <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
      <button id="confirm-cancel-btn" class="btn btn-outline" style="padding: 0.5rem 1.25rem; font-size: 0.85rem;">Cancel</button>
      <button id="confirm-ok-btn" class="btn btn-primary" style="padding: 0.5rem 1.25rem; font-size: 0.85rem;">Confirm</button>
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    box.style.transform = "scale(1)";
  });

  const closeDialog = () => {
    overlay.style.opacity = "0";
    box.style.transform = "scale(0.9)";
    setTimeout(() => overlay.remove(), 250);
  };

  overlay.querySelector("#confirm-ok-btn").addEventListener("click", () => {
    if (onConfirm) onConfirm();
    closeDialog();
  });

  overlay.querySelector("#confirm-cancel-btn").addEventListener("click", () => {
    if (onCancel) onCancel();
    closeDialog();
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      if (onCancel) onCancel();
      closeDialog();
    }
  });
}

// 8c. Overlay, Modal and Drawer triggers
function showOverlay() {
  let overlay = document.getElementById("global-site-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "global-site-overlay";
    overlay.className = "site-overlay";
    document.body.appendChild(overlay);
  }
  overlay.classList.add("active");
}

function hideOverlay() {
  const overlay = document.getElementById("global-site-overlay");
  if (overlay) overlay.classList.remove("active");

  // Close any drawer / panel dependencies
  const mobileNav = document.getElementById("mobile-nav-drawer");
  if (mobileNav) mobileNav.classList.remove("active");
  const cartDrawer = document.querySelector(".cart-drawer-overlay");
  if (cartDrawer) cartDrawer.classList.remove("active");
}

// Global active Focus Trap state holder
let activeFocusTrap = null;

function setupFocusTrap(containerElement) {
  if (!containerElement) return;

  const focusableSelectors = 'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]';

  const getFocusableElements = () => {
    return Array.from(containerElement.querySelectorAll(focusableSelectors))
      .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0);
  };

  const handleKeydown = (e) => {
    if (e.key !== 'Tab') return;

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey) {
      if (active === first) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (active === last) {
        first.focus();
        e.preventDefault();
      }
    }
  };

  if (activeFocusTrap) {
    document.removeEventListener('keydown', activeFocusTrap);
  }

  activeFocusTrap = handleKeydown;
  document.addEventListener('keydown', activeFocusTrap);

  const focusable = getFocusableElements();
  if (focusable.length > 0) {
    focusable[0].focus();
  }
}

function removeFocusTrap() {
  if (activeFocusTrap) {
    document.removeEventListener('keydown', activeFocusTrap);
    activeFocusTrap = null;
  }
}

// Inject high contrast visible Skip to Content Links
function injectSkipLink() {
  const existing = document.getElementById("skip-to-content-link");
  if (existing) existing.remove();

  const skipLink = document.createElement("a");
  skipLink.id = "skip-to-content-link";
  skipLink.href = "#main-content-anchor";
  skipLink.textContent = "Skip to main content";
  skipLink.style.cssText = `
    position: absolute;
    top: -100px;
    left: 10px;
    background: var(--color-maroon);
    color: var(--color-white);
    padding: 0.75rem 1.5rem;
    z-index: 100000;
    transition: top 0.2s ease;
    text-decoration: none;
    font-weight: 600;
    border-radius: var(--border-radius-xs);
    border: 1px solid var(--color-gold);
  `;

  skipLink.addEventListener("focus", () => {
    skipLink.style.top = "10px";
  });
  skipLink.addEventListener("blur", () => {
    skipLink.style.top = "-100px";
  });

  document.body.insertBefore(skipLink, document.body.firstChild);
}

function setupMainContentAnchor() {
  const mainSection = document.querySelector("main") || document.querySelector("section") || document.querySelector(".section-padding");
  if (mainSection) {
    mainSection.id = "main-content-anchor";
    mainSection.setAttribute("tabindex", "-1");
    mainSection.style.outline = "none";
  }
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    showOverlay();
    setupFocusTrap(modal);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "";
    hideOverlay();
    removeFocusTrap();
  }
}

function openDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (drawer) {
    drawer.classList.add("active");
    document.body.style.overflow = "hidden";
    showOverlay();
    setupFocusTrap(drawer);
  }
}

function closeDrawer(drawerId) {
  const drawer = document.getElementById(drawerId);
  if (drawer) {
    drawer.classList.remove("active");
    document.body.style.overflow = "";
    hideOverlay();
    removeFocusTrap();
  }
}

// Escape key support to close open dialogs/drawers
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const confirmDialog = document.getElementById("confirm-dialog-overlay");
    if (confirmDialog) confirmDialog.remove();

    const searchOverlay = document.querySelector(".search-overlay-container");
    if (searchOverlay) searchOverlay.classList.remove("active");

    const cartDrawer = document.querySelector(".cart-drawer-overlay");
    if (cartDrawer) cartDrawer.classList.remove("active");

    const mobileNav = document.getElementById("mobile-nav-drawer");
    if (mobileNav) mobileNav.classList.remove("active");

    document.body.style.overflow = "";
    hideOverlay();
  }
});

// 8d. Performance Debounce Utility
function debounce(func, wait = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// 9. Inject Reusable Responsive Footer Markup
function injectGlobalFooter() {
  const existingFooters = document.querySelectorAll("footer");
  existingFooters.forEach(el => el.remove());

  // Also remove existing floating buttons if any to avoid duplicates
  const existingBtt = document.getElementById("back-to-top");
  if (existingBtt) existingBtt.remove();
  const existingWa = document.querySelector(".floating-whatsapp");
  if (existingWa) existingWa.remove();
  const existingBottomNav = document.querySelector(".mobile-bottom-nav");
  if (existingBottomNav) existingBottomNav.remove();

  const footerHtml = `
    <footer>
      <div class="container">
        <div class="footer-grid">
          <!-- Column 1: Brand Introduction & Socials -->
          <div class="footer-col">
            <a href="index.html" class="logo" style="display: flex; flex-direction: row !important; align-items: center !important; gap: 0.5rem !important; text-transform: none !important; font-size: inherit !important; letter-spacing: normal !important; line-height: normal !important; text-decoration: none; margin-bottom: var(--spacing-sm);">
              <img src="./assets/logo/logo.jpg" alt="Royal Affair Logo" style="height: 40px; width: 40px; min-width: 40px; border-radius: 50%; object-fit: cover; border: 1.2px solid var(--color-gold); filter: brightness(1.1) contrast(1.1);">
              <div style="display: flex; flex-direction: column; text-align: left; align-items: flex-start;">
                <span style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; color: var(--color-gold-light); text-transform: uppercase; letter-spacing: 0.05em; margin: 0; line-height: 1;">Royal Affair</span>
                <span style="font-family: var(--font-body); font-size: 0.6rem; font-weight: 600; text-transform: uppercase; color: var(--color-gold); letter-spacing: 0.2em; margin-top: 2px; display: block; line-height: 1;">Designer Suits</span>
              </div>
            </a>
            <p>
              Handcrafting the finest Indian designer suits. Experience premium silk velvets, luxury Banarasi weaves, and intricate hand-embellished zardozi wear.
            </p>
            <div class="social-icons" style="display: flex; gap: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap;">

              <!-- Instagram -->
              <a href="https://www.instagram.com/royalaffairdesigner" target="_blank" class="social-link" aria-label="Instagram" style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%); color: #fff; transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; box-shadow: 0 2px 8px rgba(214,36,159,0.35);" onmouseover="this.style.transform='scale(1.12)';this.style.boxShadow='0 4px 16px rgba(214,36,159,0.55)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 8px rgba(214,36,159,0.35)'">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" fill="radial-gradient(circle at 30% 107%, #fdf497 0%, #fd5949 45%, #d6249f 60%, #285AEB 90%)"/><circle cx="12" cy="12" r="3.2" fill="none" stroke="white" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.2" fill="white"/></svg>
              </a>

              <!-- WhatsApp -->
              <a href="https://wa.me/919219956289" target="_blank" class="social-link" aria-label="WhatsApp" style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: #25D366; color: #fff; transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; box-shadow: 0 2px 8px rgba(37,211,102,0.35);" onmouseover="this.style.transform='scale(1.12)';this.style.boxShadow='0 4px 16px rgba(37,211,102,0.55)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 8px rgba(37,211,102,0.35)'">
                <svg viewBox="0 0 24 24" width="21" height="21" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              </a>

              <!-- Facebook -->
              <a href="https://www.facebook.com/royalaffairdesigner" target="_blank" class="social-link" aria-label="Facebook" style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background: #1877F2; color: #fff; transition: transform 0.2s, box-shadow 0.2s; text-decoration: none; box-shadow: 0 2px 8px rgba(24,119,242,0.35);" onmouseover="this.style.transform='scale(1.12)';this.style.boxShadow='0 4px 16px rgba(24,119,242,0.55)'" onmouseout="this.style.transform='';this.style.boxShadow='0 2px 8px rgba(24,119,242,0.35)'">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </a>

            </div>
          </div>

          <!-- Column 2: Shop Links -->
          <div class="footer-col">
            <h3>Shop Collection</h3>
            <ul class="footer-links">
              <li><a href="shop.html">All Suits</a></li>
              <li><a href="shop.html?category=Anarkali">Anarkali Suits</a></li>
              <li><a href="shop.html?category=Sharara%20Set">Sharara Sets</a></li>
              <li><a href="shop.html?category=Salwar%20Kameez">Salwar Kameez</a></li>
              <li><a href="shop.html?category=Palazzo%20Suit">Palazzo Suits</a></li>
            </ul>
          </div>

          <!-- Column 3: Customer Care & Policies -->
          <div class="footer-col">
            <h3>Customer Care</h3>
            <ul class="footer-links">
              <li><a href="order-tracking.html">Track Order</a></li>
              <li><a href="shipping-returns.html">Shipping & Returns</a></li>
              <li><a href="privacy-policy.html">Privacy Policy</a></li>
              <li><a href="terms.html">Terms & Conditions</a></li>
              <li><a href="faq.html">FAQs Accordion</a></li>
            </ul>
          </div>

          <!-- Column 4: Contact details & Newsletter -->
          <div class="footer-col">
            <h3>Contact & Newsletter</h3>
            <p style="font-size: var(--font-sm); margin-bottom: 0.5rem;">
              <strong>Atelier:</strong> Heritage Mansion, Mall Road, Meerut, UP, India
            </p>
            <p style="font-size: var(--font-sm); margin-bottom: var(--spacing-sm);">
              <strong>Inquiries:</strong> care@royalaffair.in | +91 9219956289
            </p>
            <form class="footer-newsletter-form">
              <input type="email" placeholder="Your Email Address" class="footer-newsletter-input" required aria-label="Newsletter email address">
              <button type="submit" class="footer-newsletter-btn">Join</button>
            </form>
          </div>
        </div>

        <!-- Bottom Bar -->
        <div class="footer-bottom">
          <p>&copy; 2026 Royal Affair. All rights reserved. Elegant designer suits for the contemporary wardrobe.</p>
          <div class="payment-methods">
            <span>Visa | MasterCard | UPI | NetBanking | Cash on Delivery</span>
          </div>
        </div>
      </div>
    </footer>

    <!-- Floating Back to Top Button (Bottom Right) -->
    <button id="back-to-top" aria-label="Scroll back to top" class="back-to-top-btn">
      <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="18 15 12 9 6 15"></polyline></svg>
    </button>

    <!-- Floating Contact Dock (Bottom Left) -->
    <div class="floating-contact-dock">
      <!-- Phone Call (Orange Background) -->
      <a href="tel:+919219956289" class="dock-icon phone-dock" aria-label="Call Stylist">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
          <path d="M6.62 10.79a15.149 15.149 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.11-.27 11.5 11.5 0 0 0 3.58.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.5 11.5 0 0 0 .57 3.58 1 1 0 0 1-.27 1.11z"/>
        </svg>
      </a>
      <!-- WhatsApp (Green Background) -->
      <a href="https://wa.me/919219956289" target="_blank" class="dock-icon whatsapp-dock" aria-label="Chat on WhatsApp">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
          <path d="M12.012 2C6.5 2 2.006 6.5 2.006 12a9.84 9.84 0 0 0 1.29 4.84l-1.3 4.74 4.88-1.28A9.85 9.85 0 0 0 12.012 22c5.512 0 10.006-4.5 10.006-10S17.524 2 12.012 2zm5.748 13.91c-.24.68-1.39 1.3-1.63 1.38-.27.09-.59.17-.99.17-.55 0-1.27-.19-2.39-1.22-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.61-.92-2.2-.24-.59-.49-.5-.67-.52-.17-.01-.37-.01-.57-.01-.2 0-.52.08-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/>
        </svg>
      </a>
      <!-- Email (Blue Background) -->
      <a href="mailto:care@royalaffair.in" class="dock-icon gmail-dock" aria-label="Email Us">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
      </a>
    </div>

    <!-- Mobile Bottom Floating Navigation -->
    <div class="mobile-bottom-nav">
      <a href="index.html" class="mob-nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span>Home</span>
      </a>
      <a href="shop.html" class="mob-nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        <span>Shop</span>
      </a>
      <a href="wishlist.html" class="mob-nav-item" style="position: relative;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        <span class="badge-count wishlist-badge" style="position: absolute; top: -5px; right: 12px; min-width: 14px; height: 14px; font-size: 8px;">0</span>
        <span>Wishlist</span>
      </a>
      <a href="cart.html" class="mob-nav-item" style="position: relative;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
        <span class="badge-count cart-badge" style="position: absolute; top: -5px; right: 12px; min-width: 14px; height: 14px; font-size: 8px;">0</span>
        <span>Cart</span>
      </a>
      <a href="account.html" class="mob-nav-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        <span>Account</span>
      </a>
    </div>
  `;

  // Append new footer to body
  const body = document.body;
  const tempWrapper = document.createElement("div");
  tempWrapper.innerHTML = footerHtml;

  while (tempWrapper.firstChild) {
    body.appendChild(tempWrapper.firstChild);
  }

  // Highlight active mobile bottom navigation items
  const pathname = window.location.pathname.toLowerCase();
  const mobItems = document.querySelectorAll(".mob-nav-item");
  mobItems.forEach(item => {
    const href = item.getAttribute("href").toLowerCase();
    if (pathname.includes(href)) {
      item.classList.add("active");
    } else if (href === "index.html" && (pathname.endsWith("/") || pathname === "" || pathname.endsWith("index.html"))) {
      item.classList.add("active");
    }
  });

  // Call updateBadges to ensure counts display correctly
  if (typeof updateBadges === "function") {
    updateBadges();
  }
}

// 10. Initialize Footer Scroll and Newsletter controls
function initFooterControls() {
  const bttBtn = document.getElementById("back-to-top");
  if (bttBtn) {
    // Show / Hide floating back to top button
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        bttBtn.classList.add("visible");
      } else {
        bttBtn.classList.remove("visible");
      }
    });

    // Smooth scroll back to top
    bttBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    });
  }

  // Newsletter Validation & Toast feedback
  const newsletterForm = document.querySelector(".footer-newsletter-form");
  if (newsletterForm) {
    newsletterForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = newsletterForm.querySelector(".footer-newsletter-input");
      if (!input) return;

      const email = input.value.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        showToast("Please enter a valid email address.", "error");
        return;
      }

      showToast("Thank you! You have subscribed to the Royal Circle.", "success");
      newsletterForm.reset();
    });
  }
}

// 11. Reusable Product Card HTML Generator
function createProductCardHTML(prod) {
  const isWish = typeof isInWishlist === "function" ? isInWishlist(prod.id) : false;
  const isComp = typeof isInCompare === "function" ? isInCompare(prod.id) : false;

  let priceHtml = `<span class="product-price">${formatCurrency(prod.price)}</span>`;
  if (prod.originalPrice > prod.price) {
    priceHtml = `
      <span class="product-price">${formatCurrency(prod.price)}</span>
      <span class="product-price-original">${formatCurrency(prod.originalPrice)}</span>
    `;
  }

  let badgeHtml = "";
  if (prod.stock === 0) {
    badgeHtml = `<span class="badge" style="background-color: var(--color-gray-dark);">Sold Out</span>`;
  } else if (prod.newArrival) {
    badgeHtml = `<span class="badge badge-new">New</span>`;
  } else if (prod.bestseller) {
    badgeHtml = `<span class="badge badge-new" style="background-color: var(--color-plum);">Bestseller</span>`;
  } else if (prod.originalPrice > prod.price) {
    badgeHtml = `<span class="badge badge-sale">Save ${prod.discount}%</span>`;
  }

  let swatchesHtml = "";
  if (prod.colors && prod.colors.length > 0) {
    swatchesHtml = `<div class="card-color-swatches" style="display: flex; gap: 4px; justify-content: center; margin-top: 6px;">`;
    prod.colors.forEach(col => {
      let cssColor = col.toLowerCase();
      if (col === "Plum") cssColor = "#4A1835";
      if (col === "Deep Maroon" || col === "Maroon") cssColor = "#6B1F2A";
      if (col === "Muted Gold" || col === "Gold") cssColor = "#C29B55";
      if (col === "Ivory") cssColor = "#FFF9F1";
      if (col === "Cream") cssColor = "#F3E8D8";
      if (col === "Peach") cssColor = "#FFDAB9";
      if (col === "Soft Pink") cssColor = "#FFB6C1";

      swatchesHtml += `
        <span class="color-swatch" title="${col}" style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${cssColor}; border: 1px solid rgba(36,33,36,0.15);"></span>
      `;
    });
    swatchesHtml += `</div>`;
  }

  const isSoldOut = prod.stock === 0;
  const quickAddClick = isSoldOut ? '' : `onclick="addToCart(${prod.id}, 'M', 1)"`;
  const quickAddText = isSoldOut ? 'Out of Stock' : 'Quick Add';
  const quickAddStyle = isSoldOut ? 'background-color: var(--color-gray-dark); opacity: 0.8; cursor: not-allowed;' : '';

  return `
    <div class="product-card fade-in" style="${isSoldOut ? 'opacity: 0.85;' : ''}">
      <div class="product-img-wrapper">
        <a href="product.html?id=${prod.id}">
          <img src="${prod.images[0]}" alt="${prod.name}" class="product-img">
          <img src="${prod.images[1] || prod.images[0]}" alt="${prod.name} back" class="product-img-hover">
        </a>
        
        <div class="product-badges">
          ${badgeHtml}
        </div>

        <div class="product-actions-overlay">
          <button class="card-action-btn wishlist-toggle-btn ${isWish ? 'active' : ''}" data-id="${prod.id}" onclick="toggleWishlist(${prod.id})" title="Add to Wishlist">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="${isWish ? 'var(--color-maroon)' : 'none'}" stroke="${isWish ? 'var(--color-maroon)' : 'currentColor'}" stroke-width="1.5">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>
          


          <button class="card-action-btn" onclick="openQuickView(${prod.id})" title="Quick View">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            </svg>
          </button>
        </div>

        <button class="quick-add-btn" ${quickAddClick} style="${quickAddStyle}">${quickAddText}</button>
      </div>

      <div class="product-content">
        <div>
          <span class="product-category">${prod.category}</span>
          <h3 class="product-title">
            <a href="product.html?id=${prod.id}">${prod.name}</a>
          </h3>
          ${swatchesHtml}
        </div>
        <div style="margin-top: 8px;">
          <div class="product-rating">
            <span class="rating-stars">★ ${prod.rating}</span>
            <span class="rating-count">(${prod.reviewCount})</span>
          </div>
          <div class="product-price-wrapper">
            ${priceHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

// 12. Quick View Modal Window Toggles
function openQuickView(productId) {
  const prod = typeof getProductById === "function" ? getProductById(productId) : null;
  if (!prod) return;

  // Render sizes options buttons
  let sizesHtml = "";
  prod.sizes.forEach((sz, idx) => {
    sizesHtml += `
      <button class="size-select-btn ${sz === 'M' ? 'active' : ''}" onclick="selectQuickViewSize(this, '${sz}')" style="width: 38px; height: 38px; border: 1px solid ${sz === 'M' ? 'var(--color-maroon)' : 'var(--color-gray-light)'}; font-size: var(--font-xs); font-weight: 600; cursor: pointer; border-radius: var(--border-radius-xs); background-color: ${sz === 'M' ? 'var(--color-maroon)' : 'var(--color-white)'}; color: ${sz === 'M' ? 'var(--color-white)' : 'var(--color-charcoal)'}; transition: all var(--transition-fast);">
        ${sz}
      </button>
    `;
  });

  // Render color swatches
  let colorsHtml = "";
  prod.colors.forEach((col, idx) => {
    let cssColor = col.toLowerCase();
    if (col === "Plum") cssColor = "#4A1835";
    if (col === "Deep Maroon" || col === "Maroon") cssColor = "#6B1F2A";
    if (col === "Muted Gold" || col === "Gold") cssColor = "#C29B55";
    if (col === "Ivory") cssColor = "#FFF9F1";
    if (col === "Cream") cssColor = "#F3E8D8";
    if (col === "Peach") cssColor = "#FFDAB9";
    if (col === "Soft Pink") cssColor = "#FFB6C1";

    colorsHtml += `
      <span class="quickview-color-swatch" data-color="${col}" onclick="selectQuickViewColor(this, '${col}')" title="${col}" style="display: inline-block; width: 22px; height: 22px; border-radius: 50%; background-color: ${cssColor}; border: 2px solid ${idx === 0 ? 'var(--color-maroon)' : 'rgba(36, 33, 36, 0.15)'}; cursor: pointer; transition: all var(--transition-fast); margin-right: 6px;"></span>
    `;
  });

  const modalHtml = `
    <div class="modal-overlay open" id="quick-view-modal-overlay">
      <div class="modal-container" style="max-width: 750px; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--spacing-lg); padding: var(--spacing-lg);">
        <button class="modal-close-btn" aria-label="Close" onclick="closeQuickView()">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        
        <!-- Left: Product Image -->
        <div style="aspect-ratio: 3/4; overflow: hidden; border-radius: var(--border-radius-xs);">
          <img src="${prod.images[0]}" alt="${prod.name}" style="width: 100%; height: 100%; object-fit: cover;">
        </div>

        <!-- Right: Information & Customizations -->
        <div style="display: flex; flex-direction: column; justify-content: space-between; text-align: left;">
          <div>
            <span style="font-size: var(--font-xs); text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-gold-dark); font-weight: 600;">
              ${prod.category}
            </span>
            <h2 style="font-family: var(--font-heading); font-size: var(--font-lg); color: var(--color-maroon-dark); margin: 0.25rem 0 0.5rem; line-height: 1.2;">
              ${prod.name}
            </h2>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: var(--spacing-sm);">
              <span style="color: var(--color-gold); font-size: var(--font-sm);">★ ${prod.rating}</span>
              <span style="font-size: var(--font-xs); color: var(--color-gray);">(${prod.reviewCount} reviews)</span>
            </div>
            <p style="font-size: var(--font-sm); line-height: 1.5; color: var(--color-charcoal-light); margin-bottom: var(--spacing-md);">
              ${prod.shortDescription}
            </p>

            <!-- Color Swatches Selection -->
            <div style="margin-bottom: var(--spacing-md);">
              <h4 style="font-family: var(--font-body); font-size: var(--font-xs); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; font-weight: 600;">Select Color</h4>
              <div style="display: flex; align-items: center;" id="quick-view-colors">
                ${colorsHtml}
              </div>
            </div>

            <!-- Size Selection -->
            <div style="margin-bottom: var(--spacing-md);">
              <h4 style="font-family: var(--font-body); font-size: var(--font-xs); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; font-weight: 600;">Select Size</h4>
              <div style="display: flex; gap: 0.35rem;" id="quick-view-sizes">
                ${sizesHtml}
              </div>
            </div>

            <!-- Quantity Selection -->
            <div style="margin-bottom: var(--spacing-md);">
              <h4 style="font-family: var(--font-body); font-size: var(--font-xs); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; font-weight: 600;">Quantity</h4>
              <div class="qty-selector" style="height: 38px; display: inline-flex;">
                <button class="qty-btn" onclick="adjustQuickViewQty(-1)">-</button>
                <input type="text" id="quick-view-qty-input" class="qty-input" value="1" readonly style="width: 36px; font-size: 0.95rem;">
                <button class="qty-btn" onclick="adjustQuickViewQty(1)">+</button>
              </div>
            </div>
          </div>

          <div>
            <div style="font-size: var(--font-md); font-weight: 600; color: var(--color-maroon); margin-bottom: var(--spacing-md);">
              ${formatCurrency(prod.price)}
              ${prod.originalPrice > prod.price ? `<span style="text-decoration: line-through; color: var(--color-gray); font-size: var(--font-sm); margin-left: 0.5rem;">${formatCurrency(prod.originalPrice)}</span> <span style="font-size: var(--font-xs); color: var(--color-gold-dark); margin-left: 0.5rem;">Save ${prod.discount}%</span>` : ''}
            </div>
            
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-primary" onclick="triggerQuickViewAddToCart(${prod.id})" style="flex: 1;" ${prod.stock === 0 ? 'disabled style="background-color: var(--color-gray-dark); opacity: 0.8; cursor: not-allowed;"' : ''}>
                ${prod.stock === 0 ? 'Sold Out' : 'Add to Shopping Bag'}
              </button>
              
              <button class="card-action-btn" onclick="toggleWishlist(${prod.id}); closeQuickView();" style="width: 48px; height: 48px; border: 1px solid var(--color-gray-light); border-radius: var(--border-radius-xs); display: flex; align-items: center; justify-content: center; background-color: var(--color-white);" title="Wishlist">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
              </button>
            </div>

            <div style="text-align: center; margin-top: var(--spacing-sm);">
              <a href="product.html?id=${prod.id}" class="view-details-link" style="font-size: var(--font-xs); color: var(--color-maroon); text-decoration: underline; font-weight: 600;">View Full Details &rarr;</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const tempWrapper = document.createElement("div");
  tempWrapper.id = "quick-view-wrapper";
  tempWrapper.innerHTML = modalHtml;
  document.body.appendChild(tempWrapper);

  // Set default selection state variables
  window.quickViewSelectedSize = "M";
  window.quickViewSelectedColor = prod.colors && prod.colors.length > 0 ? prod.colors[0] : "Default";

  const overlay = document.getElementById("quick-view-modal-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeQuickView();
      }
    });
  }
}

function closeQuickView() {
  const wrapper = document.getElementById("quick-view-wrapper");
  if (wrapper) {
    wrapper.remove();
  }
}

function selectQuickViewSize(btn, sz) {
  const parent = btn.parentElement;
  const buttons = parent.querySelectorAll(".size-select-btn");
  buttons.forEach(b => {
    b.style.borderColor = "var(--color-gray-light)";
    b.style.color = "var(--color-charcoal)";
    b.style.backgroundColor = "var(--color-white)";
  });
  btn.style.borderColor = "var(--color-maroon)";
  btn.style.color = "var(--color-ivory)";
  btn.style.backgroundColor = "var(--color-maroon)";
  window.quickViewSelectedSize = sz;
}

function selectQuickViewColor(el, col) {
  const swatches = el.parentElement.querySelectorAll(".quickview-color-swatch");
  swatches.forEach(s => {
    s.style.borderColor = "rgba(36, 33, 36, 0.15)";
  });
  el.style.borderColor = "var(--color-maroon)";
  window.quickViewSelectedColor = col;
}

function adjustQuickViewQty(val) {
  const input = document.getElementById("quick-view-qty-input");
  if (!input) return;
  let curr = parseInt(input.value) || 1;
  curr += val;
  if (curr < 1) curr = 1;
  input.value = curr;
}

function triggerQuickViewAddToCart(productId) {
  const size = window.quickViewSelectedSize || "M";
  const color = window.quickViewSelectedColor || null;
  const qtyInput = document.getElementById("quick-view-qty-input");
  const qty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;

  if (typeof addToCart === "function") {
    addToCart(productId, size, qty, color);
  }
  closeQuickView();
}

// 13. Track Recently Viewed Products
function trackRecentlyViewed(productId) {
  let viewed = JSON.parse(localStorage.getItem("royal_affair_recently_viewed")) || [];
  viewed = viewed.filter(id => id !== productId);
  viewed.unshift(productId);
  if (viewed.length > 4) viewed.pop();
  localStorage.setItem("royal_affair_recently_viewed", JSON.stringify(viewed));
}

// 14. Welcome Discount Popup Modal
function checkWelcomePopup() {
  const shown = localStorage.getItem("royal_affair_welcome_shown");
  if (shown) return;

  const popupHtml = `
    <div class="modal-overlay open" id="welcome-popup-overlay" style="z-index: 10000;">
      <div class="modal-container" style="max-width: 500px; text-align: center; padding: 2.5rem var(--spacing-lg);">
        <button class="modal-close-btn" aria-label="Close" onclick="closeWelcomePopup()">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        
        <span style="font-family: var(--font-body); font-size: var(--font-xs); letter-spacing: 0.25em; text-transform: uppercase; color: var(--color-gold); font-weight: 600; display: block; margin-bottom: 0.5rem;">Welcome to the Circle</span>
        <h2 style="font-family: var(--font-heading); font-size: 2.4rem; color: var(--color-maroon-dark); margin-bottom: 1rem; line-height: 1.1;">Enjoy 10% Off Your First Order</h2>
        <p style="color: var(--color-charcoal-light); font-size: var(--font-base); line-height: 1.6; margin-bottom: 1.5rem;">Receive access to new arrivals, bespoke styling tips, and members-only events.</p>
        
        <div style="background-color: var(--color-beige); border: 1px dashed var(--color-gold); border-radius: var(--border-radius-sm); padding: var(--spacing-md); font-family: var(--font-heading); font-size: 1.5rem; color: var(--color-maroon); font-weight: 600; margin-bottom: 1.5rem; display: flex; justify-content: center; align-items: center; gap: 0.5rem; position: relative;">
          <span>ROYAL10</span>
          <button onclick="copyWelcomeCoupon()" title="Copy Coupon" style="background: none; border: none; cursor: pointer; color: var(--color-gold-dark); display: flex; align-items: center;">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>

        <button class="btn btn-primary btn-block" onclick="closeWelcomePopup()">Shop the Edit</button>
      </div>
    </div>
  `;

  const wrapper = document.createElement("div");
  wrapper.id = "welcome-popup-wrapper";
  wrapper.innerHTML = popupHtml;
  document.body.appendChild(wrapper);

  localStorage.setItem("royal_affair_welcome_shown", "true");

  const overlay = document.getElementById("welcome-popup-overlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeWelcomePopup();
      }
    });
  }
}

function closeWelcomePopup() {
  const wrapper = document.getElementById("welcome-popup-wrapper");
  if (wrapper) {
    wrapper.remove();
  }
}

function copyWelcomeCoupon() {
  navigator.clipboard.writeText("ROYAL10");
  showToast("Coupon code 'ROYAL10' copied to clipboard!", "success");
}

// 15. Dynamic SEO metadata & JSON-LD Schemas injection
function injectSEO() {
  const head = document.head;
  const pathname = window.location.pathname.toLowerCase();

  // Canonical Link
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    head.appendChild(canonical);
  }
  canonical.setAttribute("href", window.location.href);

  // Open Graph & Twitter meta elements setup
  const pageTitle = document.title;
  const metaDescEl = document.querySelector('meta[name="description"]');
  const pageDesc = metaDescEl ? metaDescEl.getAttribute("content") : "Premium designer Indian ethnic suits by Royal Affair.";

  const ogTags = {
    "og:title": pageTitle,
    "og:description": pageDesc,
    "og:type": pathname.includes("product.html") ? "product" : "website",
    "og:url": window.location.href,
    "og:image": window.location.origin + "/assets/banner-og.jpg",
    "og:site_name": "Royal Affair",
    "twitter:card": "summary_large_image",
    "twitter:title": pageTitle,
    "twitter:description": pageDesc,
    "twitter:image": window.location.origin + "/assets/banner-og.jpg"
  };

  // Override tags on product details page with active metadata
  if (pathname.includes("product.html") && typeof getProductById === "function") {
    const urlParams = new URLSearchParams(window.location.search);
    const prodId = parseInt(urlParams.get("id")) || 1;
    const product = getProductById(prodId);
    if (product) {
      document.title = `${product.name} | Royal Affair – Designer Suits`;
      if (metaDescEl) {
        metaDescEl.setAttribute("content", `Buy ${product.name} crafted in ${product.fabric || 'silk velvet'}. Features intricate hand zardozi and custom sizing fitting adjustments.`);
      }

      ogTags["og:title"] = `${product.name} | Royal Affair`;
      ogTags["og:description"] = `Luxury ${product.name} crafted in ${product.fabric || 'silk velvet'}. Custom sleeve fits and tailors measurements.`;
      ogTags["og:image"] = window.location.origin + "/" + product.images[0].replace(/^\.\//, "");
      ogTags["twitter:image"] = ogTags["og:image"];

      // Product Schema JSON-LD
      const productSchema = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "image": product.images.map(img => window.location.origin + "/" + img.replace(/^\.\//, "")),
        "description": `Luxury ${product.name} crafted in ${product.fabric || 'Premium Silk Velvet'} with custom sleeve measurements, bespoke fits, and hand-loomed detailing.`,
        "sku": `RA-${product.id}`,
        "offers": {
          "@type": "Offer",
          "priceCurrency": "INR",
          "price": product.price,
          "itemCondition": "https://schema.org/NewCondition",
          "availability": "https://schema.org/InStock",
          "url": window.location.href,
          "priceValidUntil": "2030-12-31"
        }
      };
      injectSchemaScript("product-schema-jsonld", productSchema);
    }
  }

  // Inject OG/Twitter tags
  for (const [property, content] of Object.entries(ogTags)) {
    const isOG = property.startsWith("og:");
    const attrName = isOG ? "property" : "name";
    let meta = document.querySelector(`meta[${attrName}="${property}"]`);
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute(attrName, property);
      head.appendChild(meta);
    }
    meta.setAttribute("content", content);
  }

  // Organization Schema JSON-LD
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Royal Affair",
    "url": window.location.origin,
    "logo": window.location.origin + "/assets/logo.png",
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": "+91-9219956289",
      "contactType": "Customer Support",
      "areaServed": "IN",
      "availableLanguage": ["en", "hi"]
    },
    "sameAs": [
      "https://instagram.com/royal_affair__official"
    ]
  };
  injectSchemaScript("org-schema-jsonld", orgSchema);

  // Breadcrumb Schema JSON-LD
  const crumbs = document.querySelectorAll(".breadcrumb a, .breadcrumb span.current");
  if (crumbs.length > 0) {
    const itemListElement = Array.from(crumbs).map((crumb, idx) => {
      const isLink = crumb.tagName === "A";
      return {
        "@type": "ListItem",
        "position": idx + 1,
        "name": crumb.textContent.trim(),
        "item": isLink ? (window.location.origin + "/" + crumb.getAttribute("href").replace(/^\.\//, "")) : window.location.href
      };
    });
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": itemListElement
    };
    injectSchemaScript("breadcrumb-schema-jsonld", breadcrumbSchema);
  }

  // FAQ Schema JSON-LD (for faq.html)
  if (pathname.includes("faq.html")) {
    const faqItems = document.querySelectorAll(".faq-item");
    if (faqItems.length > 0) {
      const faqEntities = Array.from(faqItems).map(item => {
        const question = item.querySelector("summary").textContent.replace(/\+/g, "").trim();
        const answer = item.querySelector("p").textContent.trim();
        return {
          "@type": "Question",
          "name": question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": answer
          }
        };
      });
      const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqEntities
      };
      injectSchemaScript("faq-schema-jsonld", faqSchema);
    }
  }
}

function injectSchemaScript(id, schemaObject) {
  let script = document.getElementById(id);
  if (!script) {
    script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(schemaObject, null, 2);
}

// 16. Image Lazy Loading & Dimension audits
function lazyLoadImages() {
  const images = document.querySelectorAll("img");
  images.forEach((img, index) => {
    // Keep top banner / LCP elements loading eagerly, lazy-load standard items
    if (index > 2) {
      img.setAttribute("loading", "lazy");
    }

    // Add default fallback size attributes if missing to prevent layout shifts (CLS)
    if (!img.getAttribute("width") && !img.getAttribute("height")) {
      const ratio = img.style.aspectRatio || "3/4";
      if (ratio === "3/4") {
        img.setAttribute("width", "300");
        img.setAttribute("height", "400");
      }
    }
  });
}

