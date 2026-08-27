/**
 * Royal Affair Admin Collections Management
 * Matches categories.js architecture — requireAdminAuth, same table/modal/CRUD pattern.
 */

let editingCollectionId = null;
let pendingColFile = null;
let uploadedColImageUrl = '';
let allCatalogProducts = [];
let selectedProductIds = [];
let categoryMap = {};

function normalizeId(id) {
  if (id === null || id === undefined) return null;
  if (typeof id === 'object') {
    if (id.$oid) return String(id.$oid);
    return String(id);
  }
  return String(id);
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAdminAuth();
  if (!user) return;

  // Only run full collections page initialization if on collections page
  if (!document.getElementById('collections-tbody') && !document.getElementById('collection-form')) {
    return;
  }

  await loadCatalogProducts();
  await loadCollections();

  // Auto-slug from name
  const nameInput = document.getElementById('col-name');
  const slugInput = document.getElementById('col-slug');
  if (nameInput && slugInput) {
    nameInput.addEventListener('input', () => {
      if (!editingCollectionId || !slugInput.value) {
        slugInput.value = nameInput.value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
      }
    });
  }

  setupColDropzone();
  const colForm = document.getElementById('collection-form');
  if (colForm) colForm.addEventListener('submit', handleCollectionSubmit);

  // filter change handlers
  const catSelect = document.getElementById('product-picker-category');
  const brandSelect = document.getElementById('product-picker-brand');
  const stockSelect = document.getElementById('product-picker-stock');
  if (catSelect) catSelect.addEventListener('change', () => renderProductPicker(document.getElementById('product-picker-search')?.value || ''));
  if (brandSelect) brandSelect.addEventListener('change', () => renderProductPicker(document.getElementById('product-picker-search')?.value || ''));
  if (stockSelect) stockSelect.addEventListener('change', () => renderProductPicker(document.getElementById('product-picker-search')?.value || ''));
});

// ─── Dropzone Setup ───────────────────────────────────────────────────────────

function setupColDropzone() {
  const dropzone = document.getElementById('col-dropzone');
  const fileInput = document.getElementById('col-file-input');
  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleColFileSelection(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleColFileSelection(e.target.files[0]);
    }
  });
}

function handleColFileSelection(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    showToast('Invalid file format. Please upload JPEG, PNG, or WebP.', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image file size exceeds 5 MB limit.', 'error');
    return;
  }
  pendingColFile = file;
  const previewUrl = URL.createObjectURL(file);
  renderColImagePreview(previewUrl, file.name, true);
}

function renderColImagePreview(src, name = 'Cover Image', isPending = false) {
  const container = document.getElementById('col-image-preview-container');
  if (!container) return;
  const displaySrc = isPending ? src : getProductImage(src);
  container.innerHTML = `
    <div class="preview-card" style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem; background: var(--bg-surface); border: 1px solid var(--border-light); border-radius: 8px; margin-top: 0.5rem;">
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <img src="${displaySrc}" alt="${name}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px;" onerror="handleImageError(this)">
        <div>
          <div style="font-weight: 600; font-size: 0.85rem; color: var(--primary);">${name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${isPending ? 'Pending Upload' : 'Saved Image'}</div>
        </div>
      </div>
      <button type="button" class="btn btn-secondary btn-sm" onclick="removeColImage()" style="color: #DC2626; border-color: rgba(220,38,38,0.2);">Remove</button>
    </div>
  `;
}

function removeColImage() {
  pendingColFile = null;
  uploadedColImageUrl = '';
  document.getElementById('col-image').value = '';
  const container = document.getElementById('col-image-preview-container');
  if (container) container.innerHTML = '';
}

// ─── Catalog Products Loader (for picker) ────────────────────────────────────

async function loadCatalogProducts() {
  try {
    const res = await adminApiRequest('/admin/products/all?limit=1000');
    // Accept different response shapes
    let products = [];
    if (!res) products = [];
    else if (Array.isArray(res)) products = res;
    else if (res.products) products = res.products;
    else if (res.data && Array.isArray(res.data)) products = res.data;
    else if (res.data && res.data.items && Array.isArray(res.data.items)) products = res.data.items;
    else if (res.items && Array.isArray(res.items)) products = res.items;

    // normalize product objects to expected shape
    allCatalogProducts = products.map(p => ({
      id: normalizeId(p.id || p._id || p.slug),
      name: p.name || p.title || p.product_name || '',
      sku: p.sku || p.SKU || '',
      price: (p.price !== undefined) ? p.price : (p.price_amount || 0),
      thumbnail: p.thumbnail || (p.images && p.images[0]) || p.image || p.img || '',
      images: p.images || (p.image ? [p.image] : []) || [],
      category_id: normalizeId(p.category_id || p.category || null),
      brand: p.brand || null,
      stock: (p.stock !== undefined) ? p.stock : (p.inventory || 0),
      is_deleted: p.is_deleted || false,
      is_active: (p.is_active === undefined) ? true : !!p.is_active,
      status: p.status || 'published'
    }));

    await loadCategoriesForPicker();
    populatePickerFilters();
  } catch (err) {
    console.warn('Could not load catalog products:', err);
    allCatalogProducts = [];
  }
}

async function loadCategoriesForPicker() {
  try {
    const res = await adminApiRequest('/categories');
    const cats = Array.isArray(res) ? res : (res.categories || res.data || []);
    categoryMap = {};
    cats.forEach(c => {
      const id = normalizeId(c.id || c._id);
      if (id) categoryMap[id] = c.name || c.title || '';
    });
  } catch (e) {
    console.warn('Could not load categories for picker', e);
    categoryMap = {};
  }
}

function populatePickerFilters() {
  // populate category and brand filters from loaded catalog
  const catSelect = document.getElementById('product-picker-category');
  const brandSelect = document.getElementById('product-picker-brand');
  if (!catSelect || !brandSelect) return;
  const cats = new Set();
  const brands = new Set();
  allCatalogProducts.forEach(p => {
    if (p.category_id) cats.add(p.category_id);
    if (p.brand) brands.add(p.brand);
  });
  // simple options using id/brand value
  const currentCat = catSelect.value;
  catSelect.innerHTML = '<option value="">All Categories</option>' + Array.from(cats).map(c => `<option value="${c}">${categoryMap[c] || c}</option>`).join('');
  brandSelect.innerHTML = '<option value="">All Brands</option>' + Array.from(brands).map(b => `<option value="${b}">${b}</option>`).join('');
  catSelect.value = currentCat;
}

// ─── Load Collections Table ───────────────────────────────────────────────────

async function loadCollections() {
  const tbody = document.getElementById('collections-tbody');

  try {
    const res = await adminApiRequest('/admin/collections');
    const collections = Array.isArray(res) ? res : (res.collections || res.data || []);

    if (collections.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="padding: 0; border: none; background: transparent;">
            <div class="empty-state-card card">
              <div class="empty-state-icon-box">📂</div>
              <h3 class="empty-state-title">No Collections Found</h3>
              <p class="empty-state-subtitle">Get started by creating your first storefront collection.</p>
              <button type="button" class="btn btn-primary" onclick="openCollectionModal()">+ Create Collection</button>
            </div>
          </td>
        </tr>
      `;
      window.cachedCollections = [];
      return;
    }

    tbody.innerHTML = collections.map(c => {
      const cid = c.id || c._id;
      const imageUrl = getProductImage(c.image || c.thumbnail || '');
      const count = Array.isArray(c.product_ids) ? c.product_ids.length : (c.product_count || 0);
      const isActive = c.is_active !== false;
      const displayOrder = c.display_order || 0;
      const nameEscaped = (c.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

      return `
        <tr>
          <td data-label="Cover Image">
            <div class="thumb-wrapper" style="width: 54px; height: 54px; border-radius: 8px;">
              <img src="${imageUrl}" alt="${nameEscaped}" loading="lazy" style="width: 54px; height: 54px;" onerror="handleImageError(this)">
            </div>
          </td>
          <td data-label="Collection Name">
            <div style="cursor:pointer;" onclick="openCollectionModal('${cid}', true)">
              <div style="font-weight: 600; color: var(--primary); font-size: 0.95rem;">${c.name}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.3;">${c.description || 'No description provided.'}</div>
            </div>
          </td>
          <td data-label="URL Slug">
            <code style="background-color: #F3F4F6; padding: 2px 6px; border-radius: 4px; font-size: 0.82rem;">${c.slug || ''}</code>
          </td>
          <td data-label="Display Order">
            <span class="badge badge-secondary" style="font-weight: 600;">#${displayOrder}</span>
          </td>
          <td data-label="Assigned Products">
            <span id="collection-count-${cid}" class="badge badge-secondary" style="font-weight: 600;">${count} ${count === 1 ? 'product' : 'products'}</span>
          </td>
          <td data-label="Status">
            <span class="badge ${isActive ? 'badge-status-published' : 'badge-status-archived'}">
              ${isActive ? 'Active' : 'Disabled'}
            </span>
          </td>
          <td data-label="Actions" style="text-align: right;">
            <div class="action-icon-group" style="justify-content: flex-end;">
              <button type="button" class="action-icon-btn ${isActive ? 'btn-restore' : 'btn-view'}" style="${isActive ? 'color:#D97706;' : 'color:#059669;'}" title="${isActive ? 'Disable Collection' : 'Enable Collection'}" onclick="toggleCollectionStatus('${cid}', ${!isActive})">
                ${isActive ? '⏸️' : '▶️'}
              </button>
              <button type="button" class="action-icon-btn btn-manage" title="Manage Products" onclick="openCollectionModal('${cid}', true)" style="color:#0ea5a4; padding:6px 8px; font-weight:600;">
                📦 Manage
              </button>
              <button type="button" class="action-icon-btn btn-edit" title="Edit Collection" onclick="openCollectionModal('${cid}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button type="button" class="action-icon-btn btn-delete" title="Delete Collection" onclick="deleteCollection('${cid}', '${nameEscaped}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    window.cachedCollections = collections;

  } catch (err) {
    console.error('Failed to load collections:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: #DC2626; padding: 2.5rem;">
          <div>Error loading collections: ${err.message}</div>
          <button class="btn btn-secondary btn-sm" style="margin-top: 0.5rem;" onclick="loadCollections()">🔄 Retry</button>
        </td>
      </tr>
    `;
  }
}

// ─── Modal Open / Close ───────────────────────────────────────────────────────

async function openCollectionModal(collectionId = null, showPicker = false) {
  editingCollectionId = collectionId;
  pendingColFile = null;
  uploadedColImageUrl = '';
  selectedProductIds = [];

  const modal = document.getElementById('collection-modal');
  const title = document.getElementById('collection-modal-title');
  const submitBtn = document.getElementById('col-submit-btn');
  const previewContainer = document.getElementById('col-image-preview-container');

  if (previewContainer) previewContainer.innerHTML = '';
  document.getElementById('collection-form').reset();
  document.getElementById('editing-collection-id').value = '';
  document.getElementById('col-image').value = '';

  if (editingCollectionId) {
    title.innerText = '✏️ Edit Collection';
    submitBtn.innerText = 'Save Changes';

    try {
      const col = await adminApiRequest(`/admin/collections/${editingCollectionId}`);
      document.getElementById('editing-collection-id').value = col.id || col._id;
      document.getElementById('col-name').value = col.name || '';
      document.getElementById('col-slug').value = col.slug || '';
      document.getElementById('col-type').value = col.collection_type || 'custom';
      document.getElementById('col-order').value = col.display_order || 0;
      document.getElementById('col-active').checked = col.is_active !== false;
      document.getElementById('col-desc').value = col.description || '';
      uploadedColImageUrl = col.image || '';
      document.getElementById('col-image').value = uploadedColImageUrl;

      if (uploadedColImageUrl) {
        renderColImagePreview(uploadedColImageUrl, col.name, false);
      }

      selectedProductIds = Array.isArray(col.product_ids) ? col.product_ids.map(normalizeId).filter(Boolean) : [];
    } catch (err) {
      showToast('Failed to load collection details: ' + err.message, 'error');
      return;
    }
  } else {
    title.innerText = '📂 Create Collection';
    submitBtn.innerText = 'Create Collection';
    document.getElementById('col-order').value = (window.cachedCollections ? window.cachedCollections.length + 1 : 1);
    document.getElementById('col-active').checked = true;
  }
  // ensure product details for selected ids are loaded before rendering
  await ensureSelectedProductsLoaded();
  renderProductPicker();
  // if caller requested, show the product picker panel immediately
  if (showPicker) {
    try {
      const picker = document.getElementById('collection-product-picker');
      if (picker) picker.style.display = 'flex';
      const search = document.getElementById('product-picker-search');
      if (search) search.focus();
    } catch (e) { /* ignore */ }
  }
  modal.classList.add('active');
}

function closeCollectionModal() {
  document.getElementById('collection-modal').classList.remove('active');
  editingCollectionId = null;
  pendingColFile = null;
  uploadedColImageUrl = '';
  selectedProductIds = [];
}

// ─── Product Picker ───────────────────────────────────────────────────────────

function renderProductPicker(filterQuery = '') {
  const catalogListEl = document.getElementById('catalog-picker-list');
  const selectedListEl = document.getElementById('selected-order-list');
  const selectedCountEl = document.getElementById('selected-count');

  if (!catalogListEl || !selectedListEl) return;
  if (selectedCountEl) selectedCountEl.innerText = selectedProductIds.length;

  const available = getAvailableProducts(filterQuery);

  if (available.length === 0) {
    catalogListEl.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:1rem;">No matching catalog suits found.</p>`;
  } else {
    catalogListEl.innerHTML = available.map(p => {
      const pid = normalizeId(p.id || p._id);
      const isAlreadyAdded = selectedProductIds.includes(pid);
      const img = getProductImage(p.thumbnail || (p.images && p.images[0] ? p.images[0] : (p.image || '')));
        const catName = categoryMap[p.category_id] || '';
        const sku = p.sku || '';
        const price = (p.price !== undefined && p.price !== null) ? Number(p.price).toFixed(2) : '';
        const stockBadge = (p.stock > 0) ? `<span style="color:var(--success); font-weight:600;">In stock (${p.stock})</span>` : `<span style="color:var(--danger); font-weight:600;">Out</span>`;
        return `
        <label style="display:flex; align-items:center; gap: 8px; font-size:0.82rem; padding: 6px; background:#fff; border-radius:4px; border:1px solid #eee; cursor:pointer;">
          <input type="checkbox" class="catalog-item-checkbox" value="${pid}" ${isAlreadyAdded ? 'checked disabled' : ''} onchange="toggleProductSelection('${pid}', this.checked)">
          <img src="${img}" style="width: 40px; height: 48px; object-fit: cover; border-radius: 4px;" onerror="handleImageError(this)">
          <div style="flex:1; min-width:0;">
            <div style="font-weight:600; color:var(--primary);">${p.name}</div>
            <div style="font-size:0.78rem; color:var(--text-muted); display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
              <span>SKU: ${sku}</span>
              <span>Price: ₹${price}</span>
              <span>Category: ${catName}</span>
              ${isAlreadyAdded ? '<span style="color:var(--success); font-weight:700;">Added</span>' : ''}
            </div>
          </div>
          <div style="min-width:90px; text-align:right; font-size:0.78rem;">${stockBadge}</div>
        </label>
      `;
    }).join('');
  }

  if (selectedProductIds.length === 0) {
    selectedListEl.innerHTML = `<p style="font-size:0.8rem; color:var(--text-muted); text-align:center; padding:1rem;">No suits selected yet.</p>`;
    return;
  }

  selectedListEl.innerHTML = selectedProductIds.map((pid, index) => {
    const p = allCatalogProducts.find(item => (item.id || item._id) === pid) || { name: `Suit ID #${pid}`, images: [], sku:'', price:0, category_id: null, stock:0 };
    const img = getProductImage(p.thumbnail || (p.images && p.images[0] ? p.images[0] : (p.image || '')));
    const sku = p.sku || '';
    const price = (p.price !== undefined && p.price !== null) ? Number(p.price).toFixed(2) : '';
    const catName = categoryMap[p.category_id] || '';
    const stockBadge = (p.stock > 0) ? `<span style="color:var(--success); font-weight:600;">In stock (${p.stock})</span>` : `<span style="color:var(--danger); font-weight:600;">Out</span>`;
    return `
      <div class="selected-item" draggable="true" data-pid="${pid}" style="display:flex; align-items:center; justify-content:space-between; font-size:0.8rem; padding: 6px 8px; background:#fff; border-radius:4px; border:1px solid var(--border-color);">
        <div style="display:flex; align-items:center; gap: 8px; flex:1; min-width:0; overflow:hidden;">
          <input type="checkbox" class="selected-item-checkbox" value="${pid}" style="margin-right:6px;">
          <span style="font-weight:700; color:var(--primary); font-size:0.75rem;">#${index + 1}</span>
          <img src="${img}" style="width: 40px; height: 48px; object-fit: cover; border-radius: 4px;" onerror="handleImageError(this)">
          <div style="min-width:0;">
            <div style="font-weight:600; color:var(--primary);">${p.name}</div>
            <div style="font-size:0.78rem; color:var(--text-muted); display:flex; gap:8px; align-items:center;">
              <span>SKU: ${sku}</span>
              <span>Price: ₹${price}</span>
              <span>Category: ${catName}</span>
            </div>
          </div>
        </div>
        <div style="display:flex; gap:6px; margin-left: 8px;">
          <button type="button" class="btn btn-secondary btn-sm" style="padding:4px 6px; font-size:0.75rem;" onclick="moveSelectedProduct(${index}, -1)" ${index === 0 ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn btn-secondary btn-sm" style="padding:4px 6px; font-size:0.75rem;" onclick="moveSelectedProduct(${index}, 1)" ${index === selectedProductIds.length - 1 ? 'disabled' : ''}>▼</button>
          <button type="button" class="btn btn-secondary btn-sm" style="padding:4px 6px; font-size:0.75rem; color:var(--danger);" onclick="toggleProductSelection('${pid}', false)">Remove</button>
        </div>
      </div>
    `;
  }).join('');

  // Attach drag handlers for reorder and drag between lists
  attachSelectedDragHandlers();
}

function updateCollectionCountBadge() {
  try {
    if (!editingCollectionId) return;
    const el = document.getElementById(`collection-count-${editingCollectionId}`);
    if (el) {
      const count = selectedProductIds.length || 0;
      el.innerText = `${count} ${count === 1 ? 'product' : 'products'}`;
    }
  } catch (e) { /* ignore */ }
}

function getAvailableProducts(filterQuery = '') {
  const query = filterQuery.toLowerCase();
  const catFilter = document.getElementById('product-picker-category')?.value || '';
  const brandFilter = document.getElementById('product-picker-brand')?.value || '';
  const stockFilter = document.getElementById('product-picker-stock')?.value || '';

  return allCatalogProducts.filter(p => {
    if (p.is_deleted) return false;
    if (!p.is_active || p.status !== 'published') return false;
    if (query && !(p.name || '').toLowerCase().includes(query) && !(p.sku || '').toLowerCase().includes(query)) return false;
    if (catFilter && (p.category_id || '') !== catFilter) return false;
    if (brandFilter && (p.brand || '') !== brandFilter) return false;
    if (stockFilter === 'instock' && !(p.stock > 0)) return false;
    if (stockFilter === 'outofstock' && (p.stock > 0)) return false;
    return true;
  });
}

async function ensureSelectedProductsLoaded() {
  // ensure all selectedProductIds exist in allCatalogProducts, fetch missing ones individually
  const missing = selectedProductIds.filter(id => !allCatalogProducts.find(p => (p.id || p._id) === id));
  if (missing.length === 0) return;
  for (const mid of missing) {
    try {
      const p = await adminApiRequest(`/admin/products/${mid}`);
      if (!p) continue;
      const prod = {
        id: normalizeId(p.id || p._id || p.slug),
        name: p.name || p.title || '',
        sku: p.sku || p.SKU || '',
        price: (p.price !== undefined) ? p.price : (p.price_amount || 0),
        thumbnail: p.thumbnail || (p.images && p.images[0]) || p.image || p.img || '',
        images: p.images || (p.image ? [p.image] : []) || [],
        category_id: p.category_id || p.category || null,
        brand: p.brand || null,
        stock: (p.stock !== undefined) ? p.stock : (p.inventory || 0),
        is_deleted: p.is_deleted || false,
        is_active: (p.is_active === undefined) ? true : !!p.is_active,
        status: p.status || 'published'
      };
      allCatalogProducts.push(prod);
    } catch (e) {
      console.warn('Could not load product', mid, e);
    }
  }
}

// ─── Selection Movement Buttons (center panel) ──────────────────────────────

function addSelectedFromCatalog() {
  const checked = Array.from(document.querySelectorAll('.catalog-item-checkbox:checked')).map(inp => normalizeId(inp.value));
  for (const id of checked) {
    if (!selectedProductIds.includes(id)) {
      if (selectedProductIds.length >= 4) {
        showToast('Maximum 4 products allowed per collection for storefront display.', 'warning');
        break;
      }
      selectedProductIds.push(id);
    }
  }
  renderProductPicker(document.getElementById('product-picker-search')?.value || '');
  updateCollectionCountBadge();
}

function addAllFromCatalog() {
  const available = getAvailableProducts(document.getElementById('product-picker-search')?.value || '').map(p => normalizeId(p.id || p._id));
  for (const id of available) {
    if (!selectedProductIds.includes(id)) {
      if (selectedProductIds.length >= 4) {
        showToast('Maximum 4 products allowed per collection for storefront display.', 'warning');
        break;
      }
      selectedProductIds.push(id);
    }
  }
  renderProductPicker(document.getElementById('product-picker-search')?.value || '');
  updateCollectionCountBadge();
}

function removeSelectedFromCollection() {
  const checked = Array.from(document.querySelectorAll('.selected-item-checkbox:checked')).map(inp => inp.value);
  selectedProductIds = selectedProductIds.filter(id => !checked.includes(id));
  renderProductPicker(document.getElementById('product-picker-search')?.value || '');
  updateCollectionCountBadge();
}

function removeAllFromCollection() {
  selectedProductIds = [];
  renderProductPicker(document.getElementById('product-picker-search')?.value || '');
  updateCollectionCountBadge();
}

function attachSelectedDragHandlers() {
  const items = document.querySelectorAll('.selected-item');
  items.forEach(item => {
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', item.dataset.pid);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', (e) => {
      item.classList.remove('dragging');
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = document.querySelector('.selected-item.dragging');
      if (!dragging || dragging === item) return;
      const pid = dragging.dataset.pid;
      const overPid = item.dataset.pid;
      const fromIndex = selectedProductIds.indexOf(pid);
      const toIndex = selectedProductIds.indexOf(overPid);
      if (fromIndex > -1 && toIndex > -1 && fromIndex !== toIndex) {
        selectedProductIds.splice(fromIndex, 1);
        selectedProductIds.splice(toIndex, 0, pid);
        renderProductPicker(document.getElementById('product-picker-search')?.value || '');
      }
    });
  });
}

function filterProductPickerList(val) {
  renderProductPicker(val);
}

function toggleProductSelection(pid, isSelected) {
  pid = normalizeId(pid);
  if (isSelected) {
    if (!selectedProductIds.includes(pid)) {
      if (selectedProductIds.length >= 4) {
        showToast('A collection tab can display a maximum of 4 products on the storefront.', 'warning');
        renderProductPicker(document.getElementById('product-picker-search')?.value || '');
        return;
      }
      selectedProductIds.push(pid);
    }
  } else {
    selectedProductIds = selectedProductIds.filter(id => id !== pid);
  }
  renderProductPicker(document.getElementById('product-picker-search')?.value || '');
  updateCollectionCountBadge();
}

function moveSelectedProduct(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= selectedProductIds.length) return;
  const temp = selectedProductIds[index];
  selectedProductIds[index] = selectedProductIds[newIndex];
  selectedProductIds[newIndex] = temp;
  renderProductPicker(document.getElementById('product-picker-search')?.value || '');
}

// ─── Form Submit (Create / Update) ───────────────────────────────────────────

async function handleCollectionSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('col-submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Saving...';

  const name = document.getElementById('col-name').value.trim();
  const slug = document.getElementById('col-slug').value.trim();
  const collectionType = document.getElementById('col-type').value;
  const display_order = parseInt(document.getElementById('col-order').value, 10) || 0;
  const is_active = document.getElementById('col-active').checked;
  const description = document.getElementById('col-desc').value.trim();

  if (!name) {
    showToast('Collection name is required.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerText = editingCollectionId ? 'Save Changes' : 'Create Collection';
    return;
  }

  // Upload cover image if pending file selected
  if (pendingColFile) {
    try {
      submitBtn.innerText = 'Uploading Image...';
      const formData = new FormData();
      formData.append('file', pendingColFile);

      const uploadRes = await adminApiRequest('/admin/uploads/product-image', {
        method: 'POST',
        body: formData
      });

      if (uploadRes && uploadRes.url) {
        uploadedColImageUrl = uploadRes.url;
      }
    } catch (uploadErr) {
      console.error('Cover image upload failed:', uploadErr);
      showToast('Image upload failed: ' + uploadErr.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerText = editingCollectionId ? 'Save Changes' : 'Create Collection';
      return;
    }
  }

  const payload = {
    name,
    slug: slug || undefined,
    collection_type: collectionType,
    display_order,
    is_active,
    description: description || undefined,
    image: uploadedColImageUrl || undefined,
    product_ids: selectedProductIds.slice(0, 4)
  };

  try {
    if (editingCollectionId) {
      await adminApiRequest(`/admin/collections/${editingCollectionId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Collection updated successfully!', 'success');
    } else {
      await adminApiRequest('/admin/collections', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('New collection created successfully!', 'success');
    }

    closeCollectionModal();
    loadCollections();
  } catch (err) {
    showToast(err.message || 'Failed to save collection.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = editingCollectionId ? 'Save Changes' : 'Create Collection';
  }
}

// ─── Enable / Disable Toggle ──────────────────────────────────────────────────

async function toggleCollectionStatus(collectionId, targetActive) {
  try {
    await adminApiRequest(`/admin/collections/${collectionId}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: targetActive })
    });
    showToast(`Collection ${targetActive ? 'enabled' : 'disabled'} successfully.`, 'success');
    loadCollections();
  } catch (err) {
    showToast(err.message || 'Failed to update collection status.', 'error');
  }
}

// ─── Delete Collection ────────────────────────────────────────────────────────

async function deleteCollection(collectionId, collectionName) {
  showConfirmModal(
    'Delete Collection Confirmation',
    `Are you sure you want to delete collection '${collectionName}'? This action cannot be undone.`,
    async () => {
      try {
        await adminApiRequest(`/admin/collections/${collectionId}`, { method: 'DELETE' });
        showToast(`Collection '${collectionName}' deleted successfully.`, 'success');
        loadCollections();
      } catch (err) {
        showToast(err.message || 'Failed to delete collection.', 'error');
      }
    }
  );
}
