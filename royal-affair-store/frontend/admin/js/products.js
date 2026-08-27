/**
 * Royal Affair Admin Products List Management
 * Premium Redesign Implementation
 */

let currentPage = 1;
let currentLimit = 12;
let selectedProductIdForStock = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAdminAuth();
  if (!user) return;

  await loadCategoryOptions();
  await loadProducts();

  // Attach event listeners for search & filters
  document.getElementById('search-input').addEventListener('input', debounce(loadProducts, 300));
  document.getElementById('category-filter').addEventListener('change', loadProducts);
  document.getElementById('status-filter').addEventListener('change', loadProducts);
  document.getElementById('stock-filter').addEventListener('change', loadProducts);
  document.getElementById('sort-filter').addEventListener('change', loadProducts);
  document.getElementById('refresh-btn').addEventListener('click', loadProducts);
});

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function loadCategoryOptions() {
  const select = document.getElementById('category-filter');
  if (!select) return;

  try {
    const categories = await adminApiRequest('/categories');
    const list = Array.isArray(categories) ? categories : (categories.categories || []);
    list.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id || c._id;
      opt.innerText = c.name;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

async function loadProducts(page = 1) {
  currentPage = page;
  const tbody = document.getElementById('products-tbody');
  
  // Show skeleton loading rows
  tbody.innerHTML = `
    <tr class="skeleton-row">
      <td><div class="skeleton skeleton-thumb"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 70%;"></div><div class="skeleton skeleton-text" style="width: 45%;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 60%;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 50%;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 60%;"></div></td>
      <td><div class="skeleton skeleton-badge"></div></td>
      <td><div class="skeleton skeleton-badge"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 40%;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 60%;"></div></td>
      <td><div class="skeleton skeleton-actions"></div></td>
    </tr>
    <tr class="skeleton-row">
      <td><div class="skeleton skeleton-thumb"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 65%;"></div><div class="skeleton skeleton-text" style="width: 40%;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 55%;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 45%;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 50%;"></div></td>
      <td><div class="skeleton skeleton-badge"></div></td>
      <td><div class="skeleton skeleton-badge"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 35%;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 55%;"></div></td>
      <td><div class="skeleton skeleton-actions"></div></td>
    </tr>
    <tr class="skeleton-row">
      <td><div class="skeleton skeleton-thumb"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 75%;"></div><div class="skeleton skeleton-text" style="width: 50%;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 65%;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 55%;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 60%;"></div></td>
      <td><div class="skeleton skeleton-badge"></div></td>
      <td><div class="skeleton skeleton-badge"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 45%;"></div></td>
      <td><div class="skeleton skeleton-text" style="width: 65%;"></div></td>
      <td><div class="skeleton skeleton-actions"></div></td>
    </tr>
  `;

  const search = document.getElementById('search-input').value.trim();
  const category = document.getElementById('category-filter').value;
  const status = document.getElementById('status-filter').value;
  const stock = document.getElementById('stock-filter').value;
  const sort = document.getElementById('sort-filter').value;

  let query = `?page=${currentPage}&limit=${currentLimit}&include_deleted=true`;
  if (search) query += `&search=${encodeURIComponent(search)}`;
  if (category) query += `&category=${encodeURIComponent(category)}`;
  if (status) query += `&status_filter=${encodeURIComponent(status)}`;
  if (sort) query += `&sort=${encodeURIComponent(sort)}`;

  try {
    const res = await adminApiRequest(`/admin/products/all${query}`);
    let products = res.products || [];

    // Filter by stock locally if stock filter set
    if (stock === 'in_stock') {
      products = products.filter(p => p.stock > 0);
    } else if (stock === 'out_of_stock') {
      products = products.filter(p => p.stock === 0);
    } else if (stock === 'low_stock') {
      products = products.filter(p => p.stock > 0 && p.stock <= 5);
    }

    if (products.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="padding: 0; border: none; background: transparent;">
            <div class="empty-state-card card">
              <div class="empty-state-icon-box">👗</div>
              <h3 class="empty-state-title">No Products Found</h3>
              <p class="empty-state-subtitle">We couldn't find any products matching your search criteria. Try modifying your filter options or add a new suit.</p>
              <a href="product-form.html" class="btn btn-primary">+ Add Product</a>
            </div>
          </td>
        </tr>
      `;
      renderPagination(0, 1);
      return;
    }

    tbody.innerHTML = products.map(p => {
      const nameEscaped = (p.name || '').replace(/"/g, '&quot;');
      const isDeleted = !!p.is_deleted;
      const imageUrl = getProductImage(p);

      return `
        <tr style="${isDeleted ? 'opacity: 0.65; background-color: #FFF5F5;' : ''}">
          <td data-label="Thumbnail">
            <div class="thumb-wrapper">
              <img src="${imageUrl}" alt="${nameEscaped}" loading="lazy" onerror="handleImageError(this)">
            </div>
          </td>
          <td data-label="Product Name">
            <div class="product-name-text" title="${nameEscaped}">${p.name}</div>
            <div class="product-slug-text">${p.slug || ''}</div>
          </td>
          <td data-label="SKU">
            <code style="background-color: #F3F4F6; padding: 2px 6px; border-radius: 4px; font-size: 0.82rem;">${p.sku}</code>
          </td>
          <td data-label="Category">${p.subcategory || 'Suit'}</td>
          <td data-label="Price">${renderPriceCell(p)}</td>
          <td data-label="Stock">${renderStockCell(p)}</td>
          <td data-label="Status">${renderStatusCell(p)}</td>
          <td data-label="Featured">${renderFeaturedCell(p)}</td>
          <td data-label="Updated" style="font-size: 0.82rem; color: var(--text-muted);">${formatDate(p.updated_at || p.created_at)}</td>
          <td data-label="Actions" style="text-align: right;">${renderActionButtons(p)}</td>
        </tr>
      `;
    }).join('');

    renderPagination(res.total || products.length, res.total_pages || Math.ceil((res.total || products.length) / currentLimit));

  } catch (err) {
    console.error('Failed to load products:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; color: #DC2626; padding: 2.5rem;">
          <div style="font-weight: 600; margin-bottom: 0.5rem;">Error loading product catalog: ${err.message}</div>
          <button class="btn btn-secondary btn-sm" onclick="loadProducts()">🔄 Retry Loading</button>
        </td>
      </tr>
    `;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return '—';
  }
}

function renderPriceCell(p) {
  const current = `₹${p.price.toLocaleString('en-IN')}`;
  const original = p.original_price ? `<span class="product-price-original">₹${p.original_price.toLocaleString('en-IN')}</span>` : '';
  return `<span class="product-price-current">${current}</span>${original}`;
}

function renderStockCell(p) {
  let badgeClass = 'badge-stock-in';
  let badgeLabel = `In Stock (${p.stock})`;
  if (p.stock === 0) {
    badgeClass = 'badge-stock-out';
    badgeLabel = 'Out of Stock';
  } else if (p.stock <= 5) {
    badgeClass = 'badge-stock-low';
    badgeLabel = `Low Stock (${p.stock})`;
  }

  return `
    <div style="display: flex; align-items: center; gap: 0.35rem;">
      <span class="badge ${badgeClass}">${badgeLabel}</span>
      <button type="button" class="btn-inline-stock" title="Update Stock" onclick="openStockModal('${p.id}', ${p.stock})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      </button>
    </div>
  `;
}

function renderStatusCell(p) {
  if (p.is_deleted) {
    return `<span class="badge badge-status-deleted">Deleted</span>`;
  }
  if (p.status === 'draft') {
    return `<span class="badge badge-status-draft">Draft</span>`;
  }
  if (p.status === 'archived') {
    return `<span class="badge badge-status-archived">Archived</span>`;
  }
  return `<span class="badge badge-status-published">Published</span>`;
}

function renderFeaturedCell(p) {
  if (p.featured) {
    return `<span class="featured-star-badge">⭐ Featured</span>`;
  }
  return `<span style="color: var(--text-light);">—</span>`;
}

function renderActionButtons(p) {
  const isDeleted = !!p.is_deleted;
  const nameEscaped = (p.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

  return `
    <div class="action-icon-group" style="justify-content: flex-end;">
      <a href="../shop.html?search=${encodeURIComponent(p.sku || p.slug || p.name)}" target="_blank" class="action-icon-btn btn-view" title="View Storefront">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
      </a>
      <a href="product-form.html?id=${p.id}" class="action-icon-btn btn-edit" title="Edit Product">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      </a>
      ${!isDeleted ? `
        <button type="button" class="action-icon-btn btn-delete" title="Delete Product" onclick="deleteProduct('${p.id}', '${nameEscaped}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      ` : `
        <button type="button" class="action-icon-btn btn-restore" title="Restore Product" onclick="restoreProduct('${p.id}', '${nameEscaped}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
        </button>
      `}
    </div>
  `;
}

function renderPagination(total, totalPages) {
  const pagEl = document.getElementById('pagination-container');
  if (!pagEl) return;

  if (totalPages <= 1) {
    pagEl.innerHTML = `<span style="font-size: 0.85rem; color: var(--text-muted);">Showing ${total} items</span>`;
    return;
  }

  pagEl.innerHTML = `
    <span style="font-size: 0.85rem; color: var(--text-muted);">Page ${currentPage} of ${totalPages} (${total} total)</span>
    <div style="display: flex; gap: 0.5rem;">
      <button class="btn btn-secondary btn-sm" ${currentPage <= 1 ? 'disabled' : ''} onclick="loadProducts(${currentPage - 1})">Previous</button>
      <button class="btn btn-secondary btn-sm" ${currentPage >= totalPages ? 'disabled' : ''} onclick="loadProducts(${currentPage + 1})">Next</button>
    </div>
  `;
}

// Stock Modal Logic
function openStockModal(productId, currentStock) {
  selectedProductIdForStock = productId;
  document.getElementById('stock-modal-current').innerText = currentStock;
  document.getElementById('stock-modal-input').value = currentStock;
  document.getElementById('stock-modal').classList.add('active');
}

function closeStockModal() {
  document.getElementById('stock-modal').classList.remove('active');
  selectedProductIdForStock = null;
}

async function saveStockUpdate() {
  if (!selectedProductIdForStock) return;
  const newStock = parseInt(document.getElementById('stock-modal-input').value, 10);
  if (isNaN(newStock) || newStock < 0) {
    showToast('Stock quantity must be a non-negative integer.', 'error');
    return;
  }

  try {
    await adminApiRequest(`/admin/products/${selectedProductIdForStock}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stock: newStock })
    });
    showToast('Stock quantity updated successfully!', 'success');
    closeStockModal();
    loadProducts(currentPage);
  } catch (err) {
    showToast(err.message || 'Failed to update stock.', 'error');
  }
}

// Delete Product Logic
async function deleteProduct(productId, productName) {
  showConfirmModal('Delete Product Confirmation', `Are you sure you want to soft-delete '${productName}'? The product will be hidden from the store.`, async () => {
    try {
      await adminApiRequest(`/admin/products/${productId}`, { method: 'DELETE' });
      showToast(`Product '${productName}' deleted successfully.`, 'success');
      loadProducts(currentPage);
    } catch (err) {
      showToast(err.message || 'Failed to delete product.', 'error');
    }
  });
}

// Restore Product Logic
async function restoreProduct(productId, productName) {
  showConfirmModal('Restore Product Confirmation', `Are you sure you want to restore product '${productName}'?`, async () => {
    try {
      await adminApiRequest(`/admin/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: true, status: 'published' })
      });
      showToast(`Product '${productName}' restored successfully.`, 'success');
      loadProducts(currentPage);
    } catch (err) {
      showToast(err.message || 'Failed to restore product.', 'error');
    }
  });
}
