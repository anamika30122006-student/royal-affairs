/**
 * Royal Affair Admin Categories Management
 * Data Integrity, Dynamic Count Sync, and Drag & Drop Cover Image Upload
 */

let editingCategoryId = null;
let pendingCatFile = null;
let uploadedCatImageUrl = '';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAdminAuth();
  } catch (e) {
    console.warn('Auth check warning:', e);
  }

  // Ensure catalog products are available for the picker (from collections.js)
  if (typeof loadCatalogProducts === 'function') {
    try {
      await loadCatalogProducts();
    } catch (e) {
      console.warn('loadCatalogProducts prefetch error (non-fatal):', e);
    }
  }

  try {
    await loadCategories();
  } catch (err) {
    console.error('Categories initialization error:', err);
  }

  // Setup auto-slug listener
  const nameInput = document.getElementById('cat-name');
  const slugInput = document.getElementById('cat-slug');
  if (nameInput && slugInput) {
    nameInput.addEventListener('input', () => {
      if (!editingCategoryId || !slugInput.value) {
        slugInput.value = nameInput.value.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
      }
    });
  }

  setupDropzone();
  const catForm = document.getElementById('category-form');
  if (catForm) catForm.addEventListener('submit', handleCategorySubmit);
});

function setupDropzone() {
  const dropzone = document.getElementById('cat-dropzone');
  const fileInput = document.getElementById('cat-file-input');

  if (!dropzone || !fileInput) return;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleCatFileSelection(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleCatFileSelection(e.target.files[0]);
    }
  });
}

function handleCatFileSelection(file) {
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    showToast('Invalid file format. Please upload JPEG, PNG, or WebP.', 'error');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image file size exceeds 5 MB limit.', 'error');
    return;
  }

  pendingCatFile = file;
  const previewUrl = URL.createObjectURL(file);
  renderCatImagePreview(previewUrl, file.name, true);
}

function renderCatImagePreview(src, name = 'Cover Image', isPending = false) {
  const container = document.getElementById('cat-image-preview-container');
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
      <button type="button" class="btn btn-secondary btn-sm" onclick="removeCatImage()" style="color: #DC2626; border-color: rgba(220,38,38,0.2);">Remove</button>
    </div>
  `;
}

function removeCatImage() {
  pendingCatFile = null;
  uploadedCatImageUrl = '';
  document.getElementById('cat-image').value = '';
  const container = document.getElementById('cat-image-preview-container');
  if (container) container.innerHTML = '';
}

async function loadCategories() {
  const tbody = document.getElementById('categories-tbody');
  if (!tbody) return;

  try {
    const categoriesRes = await adminApiRequest('/categories');
    let categories = [];
    if (Array.isArray(categoriesRes)) {
      categories = categoriesRes;
    } else if (categoriesRes && typeof categoriesRes === 'object') {
      categories = categoriesRes.categories || categoriesRes.data || categoriesRes.items || categoriesRes.results || categoriesRes;
    }

    if (!Array.isArray(categories)) {
      categories = [];
    }

    let productCounts = {};
    try {
      const productsRes = await adminApiRequest('/admin/products/all?limit=200');
      const products = (productsRes && Array.isArray(productsRes)) ? productsRes : ((productsRes && (productsRes.products || productsRes.data || productsRes.items)) || []);
      if (Array.isArray(products)) {
        products.forEach(p => {
          if (!p.is_deleted && p.category_id) {
            const key = p.category_id;
            productCounts[key] = (productCounts[key] || 0) + 1;
          }
        });
      }
    } catch (e) {
      console.warn('Could not fetch products for category count mapping:', e);
    }

    const normalizedCategories = categories.map(cat => {
      const id = cat.id || cat._id || cat.slug || null;
      return {
        id,
        name: cat.name || '',
        slug: cat.slug || '',
        description: cat.description || '',
        image: cat.image || cat.thumbnail || '',
        display_order: cat.display_order || 0,
        product_count: (cat.product_count !== undefined && cat.product_count !== null) ? cat.product_count : (id ? (productCounts[id] || 0) : 0),
        is_active: cat.is_active !== false,
        show_on_home: cat.show_on_home === true,
        home_display_order: cat.home_display_order || 0,
      };
    });

    if (normalizedCategories.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="padding: 0; border: none; background: transparent;">
            <div class="empty-state-card card">
              <div class="empty-state-icon-box">🏷️</div>
              <h3 class="empty-state-title">No Categories Found</h3>
              <p class="empty-state-subtitle">Get started by creating your first category to group luxury suit products.</p>
              <button type="button" class="btn btn-primary" onclick="openCategoryModal()">+ Add Category</button>
            </div>
          </td>
        </tr>
      `;
      window.cachedCategories = [];
      return;
    }

    tbody.innerHTML = normalizedCategories.map(c => {
      const imageUrl = getProductImage(c.image);
      const count = c.product_count;
      const isActive = c.is_active;
      const displayOrder = c.display_order;
      const nameEscaped = (c.name || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');

      return `
        <tr>
          <td data-label="Cover Image">
            <div class="thumb-wrapper" style="width: 54px; height: 54px; border-radius: 8px;">
              <img src="${imageUrl}" alt="${nameEscaped}" loading="lazy" style="width: 54px; height: 54px;" onerror="handleImageError(this)">
            </div>
          </td>
          <td data-label="Category Name">
            <div style="font-weight: 600; color: var(--primary); font-size: 0.95rem;">${c.name}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.3;">${c.description || 'No description provided.'}</div>
          </td>
          <td data-label="URL Slug">
            <code style="background-color: #F3F4F6; padding: 2px 6px; border-radius: 4px; font-size: 0.82rem;">${c.slug || ''}</code>
          </td>
          <td data-label="Menu Order">
            <span class="badge badge-secondary" style="font-weight: 600;">#${displayOrder}</span>
          </td>
          <td data-label="Assigned Products">
            <span class="badge badge-secondary" style="font-weight: 600;">${count} ${count === 1 ? 'product' : 'products'}</span>
          </td>
          <td data-label="Status">
            <span class="badge ${isActive ? 'badge-status-published' : 'badge-status-archived'}">
              ${isActive ? 'Active' : 'Disabled'}
            </span>
          </td>
          <td data-label="Actions" style="text-align: right;">
            <div class="action-icon-group" style="justify-content: flex-end;">
              <button type="button" class="action-icon-btn ${isActive ? 'btn-restore' : 'btn-view'}" style="${isActive ? 'color:#D97706;' : 'color:#059669;'}" title="${isActive ? 'Disable Category' : 'Enable Category'}" onclick="toggleCategoryStatus('${c.id}', ${!isActive})">
                ${isActive ? '⏸️' : '▶️'}
              </button>
              <button type="button" class="action-icon-btn btn-edit" title="Edit Category" onclick="openCategoryModal('${c.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              </button>
              <button type="button" class="action-icon-btn btn-delete" title="Delete Category" onclick="deleteCategory('${c.id}', '${nameEscaped}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    window.cachedCategories = normalizedCategories;

  } catch (err) {
    console.error('Failed to load categories:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: #DC2626; padding: 2.5rem;">
          <div>Error loading categories: ${err.message || 'Server connection failed'}</div>
          <button type="button" class="btn btn-secondary btn-sm" style="margin-top: 0.75rem;" onclick="loadCategories()">🔄 Retry</button>
        </td>
      </tr>
    `;
  } finally {
    try {
      const skeletons = tbody.querySelectorAll('.skeleton-row');
      skeletons.forEach(s => s.remove());
    } catch (e) { console.error('Failed to remove loading skeleton:', e); }
  }
}

async function openCategoryModal(categoryId = null) {
  editingCategoryId = categoryId;
  pendingCatFile = null;
  uploadedCatImageUrl = '';

  const modal = document.getElementById('category-modal');
  const title = document.getElementById('category-modal-title');
  const submitBtn = document.getElementById('cat-submit-btn');
  const previewContainer = document.getElementById('cat-image-preview-container');

  if (previewContainer) previewContainer.innerHTML = '';

  if (editingCategoryId) {
    title.innerText = '✏️ Edit Category';
    submitBtn.innerText = 'Save Changes';
    const cat = (window.cachedCategories || []).find(c => (c.id || c._id) === editingCategoryId);
    if (cat) {
      document.getElementById('cat-name').value = cat.name || '';
      document.getElementById('cat-slug').value = cat.slug || '';
      document.getElementById('cat-description').value = cat.description || '';
      document.getElementById('cat-order').value = cat.display_order || 1;
      document.getElementById('cat-active').checked = cat.is_active !== false;
      document.getElementById('cat-show-on-home').checked = cat.show_on_home === true;
      document.getElementById('cat-home-order').value = cat.home_display_order || 0;
      uploadedCatImageUrl = cat.image || '';
      document.getElementById('cat-image').value = uploadedCatImageUrl;

      if (uploadedCatImageUrl) {
        renderCatImagePreview(uploadedCatImageUrl, cat.name, false);
      }
      // Load assigned products for this category into the picker
      try {
        // Try admin products endpoint filtered by category to fetch assigned products
        const prodRes = await adminApiRequest(`/admin/products/all?category=${editingCategoryId}&limit=1000`);
        const products = Array.isArray(prodRes) ? prodRes : (prodRes.products || prodRes.data || []);
        // selectedProductIds is a global used by collections.js picker
        if (Array.isArray(products) && products.length > 0) {
          selectedProductIds = products.map(p => p.id || p._id);
        } else {
          // fallback: empty
          selectedProductIds = [];
        }
        // keep a copy of original assignment to detect additions/removals
        window._originalCategoryAssigned = Array.isArray(selectedProductIds) ? [...selectedProductIds] : [];
      } catch (e) {
        console.warn('Could not load assigned products for category picker', e);
        selectedProductIds = selectedProductIds || [];
        window._originalCategoryAssigned = [...selectedProductIds];
      }
    }
  } else {
    title.innerText = '🏷️ Add New Category';
    submitBtn.innerText = 'Create Category';
    document.getElementById('category-form').reset();
    document.getElementById('cat-order').value = (window.cachedCategories ? window.cachedCategories.length + 1 : 1);
    document.getElementById('cat-active').checked = true;
    document.getElementById('cat-show-on-home').checked = false;
    document.getElementById('cat-home-order').value = 0;
    document.getElementById('cat-image').value = '';
  }
  // show/hide the product picker depending on whether this is an existing category
  const pickerContainer = document.getElementById('category-product-picker');
  if (pickerContainer) pickerContainer.style.display = editingCategoryId ? 'flex' : 'none';

  // ensure selected product objects are loaded then render picker
  if (typeof ensureSelectedProductsLoaded === 'function') await ensureSelectedProductsLoaded();
  if (typeof renderProductPicker === 'function') renderProductPicker();
  modal.classList.add('active');
}

function closeCategoryModal() {
  document.getElementById('category-modal').classList.remove('active');
  editingCategoryId = null;
  pendingCatFile = null;
  uploadedCatImageUrl = '';
}

async function handleCategorySubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('cat-submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Saving...';

  const name = document.getElementById('cat-name').value.trim();
  const slug = document.getElementById('cat-slug').value.trim();
  const description = document.getElementById('cat-description').value.trim();
  const display_order = parseInt(document.getElementById('cat-order').value, 10) || 0;
  const is_active = document.getElementById('cat-active').checked;
  const show_on_home = document.getElementById('cat-show-on-home').checked;
  const home_display_order = show_on_home ? (parseInt(document.getElementById('cat-home-order').value, 10) || 1) : 0;

  if (!name) {
    showToast('Category name is required.', 'error');
    submitBtn.disabled = false;
    submitBtn.innerText = editingCategoryId ? 'Save Changes' : 'Create Category';
    return;
  }

  // 1. Upload Cover Image if pending file selected
  if (pendingCatFile) {
    try {
      submitBtn.innerText = 'Uploading Image...';
      const formData = new FormData();
      formData.append('file', pendingCatFile);

      const uploadRes = await adminApiRequest('/admin/uploads/product-image', {
        method: 'POST',
        body: formData
      });

      if (uploadRes && uploadRes.url) {
        uploadedCatImageUrl = uploadRes.url;
      }
    } catch (uploadErr) {
      console.error('Category cover image upload failed:', uploadErr);
      showToast('Image upload failed: ' + uploadErr.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerText = editingCategoryId ? 'Save Changes' : 'Create Category';
      return;
    }
  }

  const payload = {
    name,
    slug: slug || undefined,
    description,
    image: uploadedCatImageUrl || undefined,
    display_order,
    is_active,
    show_on_home,
    home_display_order
  };

  try {
    if (editingCategoryId) {
      await adminApiRequest(`/admin/categories/${editingCategoryId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast('Category updated successfully!', 'success');
    } else {
      await adminApiRequest('/admin/categories', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast('New category created successfully!', 'success');
    }

    closeCategoryModal();
    loadCategories();
  } catch (err) {
    showToast(err.message || 'Failed to save category.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = editingCategoryId ? 'Save Changes' : 'Create Category';
  }
}

async function toggleCategoryStatus(categoryId, targetActive) {
  try {
    await adminApiRequest(`/admin/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: targetActive })
    });
    showToast(`Category status updated.`, 'success');
    loadCategories();
  } catch (err) {
    showToast(err.message || 'Failed to update category status.', 'error');
  }
}

async function deleteCategory(categoryId, categoryName) {
  showConfirmModal('Delete Category Confirmation', `Are you sure you want to delete category '${categoryName}'? This action cannot be undone.`, async () => {
    try {
      await adminApiRequest(`/admin/categories/${categoryId}`, { method: 'DELETE' });
      showToast(`Category '${categoryName}' deleted successfully.`, 'success');
      loadCategories();
    } catch (err) {
      showToast(err.message || 'Failed to delete category.', 'error');
    }
  });
}

// ---------------- Category Product Picker Handlers ----------------

async function handleAddSelectedToCategory() {
  const checked = Array.from(document.querySelectorAll('.catalog-item-checkbox:checked')).map(inp => inp.value);
  if (!checked.length) return showToast('No products selected to add.', 'error');
  const toAdd = checked.filter(id => !selectedProductIds.includes(id));
  if (!toAdd.length) return showToast('Selected products are already assigned.', 'info');

  // update each product to set category_id
  try {
    for (const pid of toAdd) {
      await adminApiRequest(`/admin/products/${pid}`, { method: 'PUT', body: JSON.stringify({ category_id: editingCategoryId }) });
      // update local catalog product if present
      const prod = (allCatalogProducts || []).find(p => (p.id||p._id) === pid);
      if (prod) prod.category_id = editingCategoryId;
      if (!selectedProductIds.includes(pid)) selectedProductIds.push(pid);
    }
    showToast('Products added to category.', 'success');
    if (typeof renderProductPicker === 'function') renderProductPicker(document.getElementById('product-picker-search')?.value || '');
    loadCategories();
  } catch (e) {
    console.error('Failed to add products to category', e);
    showToast('Failed to add some products: ' + (e.message || ''), 'error');
  }
}

async function handleAddAllToCategory() {
  const available = (typeof getAvailableProducts === 'function') ? getAvailableProducts(document.getElementById('product-picker-search')?.value || '') : [];
  const ids = available.map(p => p.id || p._id).filter(id => id && !selectedProductIds.includes(id));
  if (!ids.length) return showToast('No available products to add.', 'info');
  try {
    for (const pid of ids) {
      await adminApiRequest(`/admin/products/${pid}`, { method: 'PUT', body: JSON.stringify({ category_id: editingCategoryId }) });
      const prod = (allCatalogProducts || []).find(p => (p.id||p._id) === pid);
      if (prod) prod.category_id = editingCategoryId;
      if (!selectedProductIds.includes(pid)) selectedProductIds.push(pid);
    }
    showToast('All available products added to category.', 'success');
    if (typeof renderProductPicker === 'function') renderProductPicker();
    loadCategories();
  } catch (e) {
    console.error('Failed to add all products to category', e);
    showToast('Failed to add products: ' + (e.message || ''), 'error');
  }
}

async function handleRemoveSelectedFromCategory() {
  const checked = Array.from(document.querySelectorAll('.selected-item-checkbox:checked')).map(inp => inp.value);
  if (!checked.length) return showToast('No selected products to remove.', 'error');

  showConfirmModal('Remove Products', `Remove ${checked.length} products from this category?`, async () => {
    try {
      for (const pid of checked) {
        await adminApiRequest(`/admin/products/${pid}`, { method: 'PUT', body: JSON.stringify({ category_id: null }) });
        selectedProductIds = selectedProductIds.filter(id => id !== pid);
        const prod = (allCatalogProducts || []).find(p => (p.id||p._id) === pid);
        if (prod) prod.category_id = null;
      }
      showToast('Selected products removed from category.', 'success');
      if (typeof renderProductPicker === 'function') renderProductPicker();
      loadCategories();
    } catch (e) {
      console.error('Failed to remove products from category', e);
      showToast('Failed to remove products: ' + (e.message || ''), 'error');
    }
  });
}

async function handleRemoveAllFromCategory() {
  if (!selectedProductIds || !selectedProductIds.length) return showToast('No products to remove.', 'info');
  showConfirmModal('Remove All Products', `Remove all ${selectedProductIds.length} products from this category?`, async () => {
    try {
      const toRemove = [...selectedProductIds];
      for (const pid of toRemove) {
        await adminApiRequest(`/admin/products/${pid}`, { method: 'PUT', body: JSON.stringify({ category_id: null }) });
        const prod = (allCatalogProducts || []).find(p => (p.id||p._id) === pid);
        if (prod) prod.category_id = null;
      }
      selectedProductIds = [];
      showToast('All products removed from category.', 'success');
      if (typeof renderProductPicker === 'function') renderProductPicker();
      loadCategories();
    } catch (e) {
      console.error('Failed to remove all products from category', e);
      showToast('Failed to remove products: ' + (e.message || ''), 'error');
    }
  });
}
