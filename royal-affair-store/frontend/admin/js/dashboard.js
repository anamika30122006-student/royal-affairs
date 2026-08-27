/**
 * Royal Affair Admin Dashboard Overview Logic
 * Real API Integrations & Dynamic Metrics
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAdminAuth();
  if (!user) return;

  await loadDashboardMetrics();
  await loadRecentProducts();
});

async function loadDashboardMetrics() {
  try {
    // 1. Fetch products count using /admin/products/all
    let totalProducts = 0;
    let lowStockProducts = 0;
    try {
      const productsRes = await adminApiRequest('/admin/products/all?limit=200');
      const allProducts = productsRes.products || (Array.isArray(productsRes) ? productsRes : []);
      totalProducts = productsRes.total || allProducts.length;
      lowStockProducts = allProducts.filter(p => p.stock <= 5 && !p.is_deleted).length;
    } catch (e) {
      console.warn('Could not fetch products count:', e);
    }

    // 2. Fetch categories count using /categories
    let totalCategories = 0;
    try {
      const categoriesRes = await adminApiRequest('/categories');
      totalCategories = Array.isArray(categoriesRes) ? categoriesRes.length : (categoriesRes.categories ? categoriesRes.categories.length : 0);
    } catch (e) {
      console.warn('Could not fetch categories count:', e);
    }

    // 3. Fetch orders count using /admin/orders if endpoint available
    let totalOrders = 0;
    try {
      const ordersRes = await adminApiRequest('/admin/orders');
      totalOrders = Array.isArray(ordersRes) ? ordersRes.length : (ordersRes.total || (ordersRes.orders ? ordersRes.orders.length : 0));
    } catch (e) {
      // 0 if orders API is not present or returns no items
      totalOrders = 0;
    }

    // 4. Fetch customers count using /admin/customers if endpoint available
    let totalCustomers = 0;
    try {
      const customersRes = await adminApiRequest('/admin/customers');
      totalCustomers = Array.isArray(customersRes) ? customersRes.length : (customersRes.total || (customersRes.customers ? customersRes.customers.length : 0));
    } catch (e) {
      // 0 if customers API is not present or returns no items
      totalCustomers = 0;
    }

    // Update DOM Metrics
    if (document.getElementById('metric-total-products')) {
      document.getElementById('metric-total-products').innerText = totalProducts;
    }
    if (document.getElementById('metric-total-categories')) {
      document.getElementById('metric-total-categories').innerText = totalCategories;
    }
    if (document.getElementById('metric-total-orders')) {
      document.getElementById('metric-total-orders').innerText = totalOrders;
    }
    if (document.getElementById('metric-total-customers')) {
      document.getElementById('metric-total-customers').innerText = totalCustomers;
    }
    if (document.getElementById('metric-low-stock')) {
      document.getElementById('metric-low-stock').innerText = lowStockProducts;
    }

  } catch (err) {
    console.error('Failed to load dashboard metrics:', err);
    showToast('Failed to load dashboard statistics.', 'error');
  }
}

async function loadRecentProducts() {
  const recentTableBody = document.getElementById('recent-products-tbody');
  const lowStockTableBody = document.getElementById('low-stock-tbody');

  if (!recentTableBody) return;

  try {
    const productsRes = await adminApiRequest('/admin/products/all?limit=10');
    const products = productsRes.products || (Array.isArray(productsRes) ? productsRes : []);

    if (products.length === 0) {
      recentTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No products found in catalog.</td></tr>`;
      if (lowStockTableBody) {
        lowStockTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">No low stock items.</td></tr>`;
      }
      return;
    }

    // Display top 5 recent products
    const recent = products.slice(0, 5);
    recentTableBody.innerHTML = recent.map(p => {
      const imageUrl = getProductImage(p);
      const nameEscaped = (p.name || '').replace(/"/g, '&quot;');

      let stockBadgeClass = 'badge-stock-in';
      let stockLabel = `${p.stock} in stock`;
      if (p.stock === 0) {
        stockBadgeClass = 'badge-stock-out';
        stockLabel = 'Out of stock';
      } else if (p.stock <= 5) {
        stockBadgeClass = 'badge-stock-low';
        stockLabel = `${p.stock} left`;
      }

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 0.85rem;">
              <div class="thumb-wrapper" style="width: 48px; height: 60px; border-radius: 6px;">
                <img src="${imageUrl}" alt="${nameEscaped}" loading="lazy" style="width: 48px; height: 60px;" onerror="handleImageError(this)">
              </div>
              <div>
                <div class="product-name-text" title="${nameEscaped}" style="font-size: 0.9rem;">${p.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted); font-family: monospace;">${p.sku}</div>
              </div>
            </div>
          </td>
          <td><strong>₹${(p.price || 0).toLocaleString('en-IN')}</strong></td>
          <td><span class="badge ${stockBadgeClass}">${stockLabel}</span></td>
          <td style="text-align: right;">
            <a href="product-form.html?id=${p.id || p._id}" class="action-icon-btn btn-edit" title="Edit Product">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </a>
          </td>
        </tr>
      `;
    }).join('');

    // Low stock products filter (<= 5)
    const lowStock = products.filter(p => p.stock <= 5 && !p.is_deleted);
    if (lowStockTableBody) {
      if (lowStock.length === 0) {
        lowStockTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">All products well-stocked.</td></tr>`;
      } else {
        lowStockTableBody.innerHTML = lowStock.map(p => `
          <tr>
            <td>
              <div style="font-weight: 600; color: var(--primary);">${p.name}</div>
            </td>
            <td><code>${p.sku}</code></td>
            <td><span class="badge badge-stock-low">${p.stock} left</span></td>
            <td style="text-align: right;">
              <a href="product-form.html?id=${p.id || p._id}" class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.6rem;">Refill</a>
            </td>
          </tr>
        `).join('');
      }
    }

  } catch (err) {
    console.error('Failed to load recent products:', err);
    recentTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #DC2626; padding: 1.5rem;">Error loading products: ${err.message}</td></tr>`;
  }
}
