/**
 * Royal Affair Admin Product Create / Edit Form & Image Upload Manager
 * Fixed Workflow Implementation
 */

let editProductId = null;
let uploadedThumbnailUrl = '';
let uploadedGalleryUrls = [];

let pendingThumbFile = null;
let pendingGalleryFiles = [];

let availableCollections = [];
let selectedCollectionIds = new Set();
let originalProductCollectionIds = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAdminAuth();
  if (!user) return;

  await loadCategoriesDropdown();
  await loadCollectionsCheckboxes();

  // Check query param for edit mode
  const urlParams = new URLSearchParams(window.location.search);
  editProductId = urlParams.get('id');

  const submitBtn = document.getElementById('form-submit-btn');

  if (editProductId) {
    document.getElementById('form-page-title').innerText = 'Edit Product Details';
    if (submitBtn) submitBtn.innerHTML = '<span>✨ Update Product</span>';
    await fetchAndPopulateProduct(editProductId);
  } else {
    document.getElementById('form-page-title').innerText = 'Add New Product';
    if (submitBtn) submitBtn.innerHTML = '<span>✨ Publish Product</span>';
  }

  setupImageUploaders();
  setupFormSaveHandler();
});

async function loadCategoriesDropdown() {
  const select = document.getElementById('field-category');
  if (!select) return;

  try {
    const categories = await adminApiRequest('/categories');
    const list = Array.isArray(categories) ? categories : (categories.categories || []);
    select.innerHTML = '<option value="">-- Select Category --</option>' + list.map(c => `
      <option value="${c.id || c._id}">${c.name}</option>
    `).join('');
  } catch (err) {
    console.error('Failed to load categories:', err);
    showToast('Failed to load categories dropdown.', 'error');
  }
}

async function loadCollectionsCheckboxes() {
  const container = document.getElementById('field-collections-container');
  if (!container) return;

  try {
    const collectionsRes = await adminApiRequest('/admin/collections');
    const collections = Array.isArray(collectionsRes) ? collectionsRes : (collectionsRes.collections || collectionsRes.data || []);
    availableCollections = collections.map(col => ({
      id: col.id || col._id,
      name: col.name || col.slug || 'Collection',
      is_active: col.is_active !== false,
      product_ids: Array.isArray(col.product_ids) ? col.product_ids : []
    }));
    renderCollectionCheckboxList();
  } catch (err) {
    console.error('Failed to load collections:', err);
    showToast('Failed to load collections selector.', 'error');
  }
}

function renderCollectionCheckboxList() {
  const container = document.getElementById('field-collections-container');
  if (!container) return;

  if (!availableCollections || availableCollections.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted);">No collections available yet.</div>';
    return;
  }

  container.innerHTML = availableCollections.map(col => {
    const checked = selectedCollectionIds.has(col.id) ? 'checked' : '';
    const label = col.is_active ? col.name : `${col.name} (Inactive)`;
    return `
      <label class="checkbox-row" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.45rem 0.25rem; border-bottom: 1px solid rgba(0,0,0,0.05);">
        <input type="checkbox" value="${col.id}" ${checked} onchange="toggleCollectionSelection(this)">
        <span>${label}</span>
      </label>
    `;
  }).join('');
}

window.toggleCollectionSelection = function(input) {
  if (!input || !input.value) return;
  if (input.checked) {
    selectedCollectionIds.add(input.value);
  } else {
    selectedCollectionIds.delete(input.value);
  }
};

function setSelectedCollections(collectionIds) {
  selectedCollectionIds = new Set(Array.isArray(collectionIds) ? collectionIds : []);
  renderCollectionCheckboxList();
}

function getSelectedCollectionIds() {
  return Array.from(selectedCollectionIds);
}

async function fetchAndPopulateProduct(productId) {
  try {
    const product = await adminApiRequest(`/admin/products/${productId}`);

    document.getElementById('field-name').value = product.name || '';
    document.getElementById('field-slug').value = product.slug || '';
    document.getElementById('field-sku').value = product.sku || '';
    document.getElementById('field-category').value = product.category_id || '';
    let colIds = Array.isArray(product.collection_ids) ? product.collection_ids : [];
    if (colIds.length === 0 && availableCollections && availableCollections.length > 0) {
      colIds = availableCollections.filter(c => Array.isArray(c.product_ids) && c.product_ids.includes(String(productId))).map(c => c.id || c._id);
    }
    setSelectedCollections(colIds);
    document.getElementById('field-subcategory').value = product.subcategory || '';
    document.getElementById('field-price').value = product.price || '';
    document.getElementById('field-original-price').value = product.original_price || '';
    document.getElementById('field-discount').value = product.discount_percentage || '';
    document.getElementById('field-stock').value = product.stock || 0;
    document.getElementById('field-fabric').value = product.fabric || '';
    document.getElementById('field-occasion').value = product.occasion || '';
    document.getElementById('field-brand').value = product.brand || 'Royal Affair';
    document.getElementById('field-sizes').value = (product.sizes || []).join(', ');
    document.getElementById('field-colors').value = (product.colors || []).join(', ');
    document.getElementById('field-short-desc').value = product.short_description || '';
    document.getElementById('field-description').value = product.description || '';
    
    document.getElementById('field-status').value = product.status || 'published';
    document.getElementById('field-featured').checked = !!product.featured;
    document.getElementById('field-bestseller').checked = !!product.bestseller;
    document.getElementById('field-new-arrival').checked = !!product.new_arrival;
    document.getElementById('field-active').checked = product.is_active !== false;

    // Existing Thumbnail
    if (product.thumbnail) {
      uploadedThumbnailUrl = product.thumbnail;
      renderThumbnailPreview(product.thumbnail, 'Uploaded Thumbnail');
    }

    // Existing Gallery
    if (product.images && product.images.length > 0) {
      uploadedGalleryUrls = [...product.images];
      renderGalleryPreviews();
    }

    // Existing collection assignments
    originalProductCollectionIds = availableCollections
      .filter(col => Array.isArray(col.product_ids) && col.product_ids.includes(productId))
      .map(col => col.id);
    setSelectedCollections(originalProductCollectionIds);

  } catch (err) {
    console.error('Failed to fetch product details:', err);
    showToast('Error loading product details: ' + err.message, 'error');
  }
}

async function syncProductCollections(productId) {
  if (!productId) return;
  const selectedIds = getSelectedCollectionIds();
  const toAdd = selectedIds.filter(id => !originalProductCollectionIds.includes(id));
  const toRemove = originalProductCollectionIds.filter(id => !selectedIds.includes(id));

  for (const collectionId of toAdd) {
    try {
      await adminApiRequest(`/admin/collections/${collectionId}/products`, {
        method: 'POST',
        body: JSON.stringify([productId])
      });
    } catch (err) {
      console.warn(`Failed to add product to collection ${collectionId}:`, err);
    }
  }

  for (const collectionId of toRemove) {
    try {
      await adminApiRequest(`/admin/collections/${collectionId}/products/${productId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.warn(`Failed to remove product from collection ${collectionId}:`, err);
    }
  }

  originalProductCollectionIds = selectedIds;
}

function setupImageUploaders() {
  const thumbInput = document.getElementById('thumb-file-input');
  const galleryInput = document.getElementById('gallery-file-input');
  const thumbDropzone = document.getElementById('thumb-dropzone');
  const galleryDropzone = document.getElementById('gallery-dropzone');

  // Trigger input when dropzone clicked
  if (thumbDropzone) {
    thumbDropzone.addEventListener('click', (e) => {
      e.preventDefault();
      thumbInput.click();
    });
  }

  if (galleryDropzone) {
    galleryDropzone.addEventListener('click', (e) => {
      e.preventDefault();
      galleryInput.click();
    });
  }

  // File Change Handlers (Instant Preview, No Form Reset)
  thumbInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    handleThumbSelection(file);
  });

  galleryInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    files.forEach(f => handleGallerySelection(f));
  });

  // Drag & Drop
  if (thumbDropzone) {
    setupDropzoneEvents(thumbDropzone, (files) => {
      if (files.length > 0) handleThumbSelection(files[0]);
    });
  }

  if (galleryDropzone) {
    setupDropzoneEvents(galleryDropzone, (files) => {
      files.forEach(f => handleGallerySelection(f));
    });
  }
}

function setupDropzoneEvents(dropzoneEl, onDropFiles) {
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzoneEl.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneEl.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzoneEl.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropzoneEl.classList.remove('drag-over');
    }, false);
  });

  dropzoneEl.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);
    if (files.length > 0) onDropFiles(files);
  });
}

function handleThumbSelection(file) {
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMime.includes(file.type)) {
    showToast(`Invalid file type '${file.type}'. Only JPEG, PNG, and WebP are allowed.`, 'error');
    return;
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    showToast(`File size ${(file.size / (1024 * 1024)).toFixed(2)} MB exceeds 5 MB limit.`, 'error');
    return;
  }

  pendingThumbFile = file;
  const tempUrl = URL.createObjectURL(file);
  renderThumbnailPreview(tempUrl, file.name, true);
}

function handleGallerySelection(file) {
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMime.includes(file.type)) {
    showToast(`Invalid file type '${file.type}'.`, 'error');
    return;
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    showToast(`File size ${(file.size / (1024 * 1024)).toFixed(2)} MB exceeds 5 MB limit.`, 'error');
    return;
  }

  pendingGalleryFiles.push(file);
  renderGalleryPreviews();
}

function renderThumbnailPreview(url, filename = '', isPending = false) {
  const container = document.getElementById('thumb-preview-container');
  const bareFilename = filename || url.split('/').pop();
  const resolvedUrl = url.startsWith('blob:') ? url : getProductImage(url);

  container.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.85rem; background: #FFF; padding: 0.5rem 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); margin-top: 0.75rem;">
      <div class="preview-box" style="width: 60px; height: 60px; margin: 0; position: relative;">
        <img src="${resolvedUrl}" alt="Thumbnail" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;" onerror="handleImageError(this)">
        <button type="button" class="remove-img-btn" title="Remove Thumbnail" onclick="removeThumbImage()">&times;</button>
      </div>
      <div>
        <div style="font-size: 0.85rem; font-weight: 600; color: var(--primary);">${bareFilename}</div>
        <div style="font-size: 0.75rem; color: ${isPending ? '#D97706' : '#059669'};">
          ${isPending ? '⏳ Ready for save upload' : '✓ Main Product Thumbnail'}
        </div>
      </div>
    </div>
  `;
}

function renderGalleryPreviews() {
  const container = document.getElementById('gallery-preview-container');
  let html = '';

  // Render uploaded gallery images
  uploadedGalleryUrls.forEach((url, idx) => {
    const bareFilename = url.split('/').pop();
    const resolvedUrl = getProductImage(url);
    html += `
      <div class="preview-box" style="position: relative; display: inline-block; margin-right: 0.75rem; margin-top: 0.5rem;">
        <img src="${resolvedUrl}" alt="Gallery ${idx}" style="width: 70px; height: 85px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border-color);" onerror="handleImageError(this)">
        <button type="button" class="remove-img-btn" title="Remove Image" onclick="removeUploadedGalleryImage(${idx})">&times;</button>
      </div>
    `;
  });

  // Render pending gallery images
  pendingGalleryFiles.forEach((file, idx) => {
    const tempUrl = URL.createObjectURL(file);
    html += `
      <div class="preview-box" style="position: relative; display: inline-block; margin-right: 0.75rem; margin-top: 0.5rem; border: 2px solid var(--accent-gold); border-radius: 8px;">
        <img src="${tempUrl}" alt="Pending Gallery ${idx}" style="width: 70px; height: 85px; object-fit: cover; border-radius: 6px;">
        <button type="button" class="remove-img-btn" title="Remove Image" onclick="removePendingGalleryImage(${idx})">&times;</button>
      </div>
    `;
  });

  container.innerHTML = html;
}

function removeThumbImage() {
  pendingThumbFile = null;
  uploadedThumbnailUrl = '';
  document.getElementById('thumb-preview-container').innerHTML = '';
}

function removeUploadedGalleryImage(index) {
  uploadedGalleryUrls.splice(index, 1);
  renderGalleryPreviews();
}

function removePendingGalleryImage(index) {
  pendingGalleryFiles.splice(index, 1);
  renderGalleryPreviews();
}

async function uploadSingleFileToServer(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await adminApiRequest('/admin/uploads/product-image', {
    method: 'POST',
    body: formData
  });

  if (res && res.url) {
    return res.url;
  }
  throw new Error(res.detail || 'Upload failed');
}

function setupFormSaveHandler() {
  const submitBtn = document.getElementById('form-submit-btn');
  if (!submitBtn) return;

  submitBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳ Validating product...</span>';

    // Form Field Values
    const nameInput = document.getElementById('field-name');
    const skuInput = document.getElementById('field-sku');
    const categoryInput = document.getElementById('field-category');
    const priceInput = document.getElementById('field-price');
    const stockInput = document.getElementById('field-stock');

    const name = nameInput.value.trim();
    const slug = document.getElementById('field-slug').value.trim();
    const sku = skuInput.value.trim().toUpperCase();
    const category_id = categoryInput.value;
    const subcategory = document.getElementById('field-subcategory').value.trim();
    const price = parseFloat(priceInput.value);
    const originalPriceVal = document.getElementById('field-original-price').value;
    const original_price = originalPriceVal ? parseFloat(originalPriceVal) : null;
    const discountVal = document.getElementById('field-discount').value;
    const discount_percentage = discountVal ? parseFloat(discountVal) : 0.0;
    const stock = parseInt(stockInput.value, 10);
    const fabric = document.getElementById('field-fabric').value.trim();
    const occasion = document.getElementById('field-occasion').value.trim();
    const brand = document.getElementById('field-brand').value.trim() || 'Royal Affair';
    const sizes = document.getElementById('field-sizes').value.split(',').map(s => s.trim()).filter(Boolean);
    const colors = document.getElementById('field-colors').value.split(',').map(c => c.trim()).filter(Boolean);
    const short_description = document.getElementById('field-short-desc').value.trim();
    const description = document.getElementById('field-description').value.trim();
    
    const status = document.getElementById('field-status').value;
    const featured = document.getElementById('field-featured').checked;
    const bestseller = document.getElementById('field-bestseller').checked;
    const new_arrival = document.getElementById('field-new-arrival').checked;
    const is_active = document.getElementById('field-active').checked;

    // Field Validations
    let hasError = false;

    if (!name) {
      nameInput.classList.add('error');
      showToast('Product name is required.', 'error');
      hasError = true;
    }
    if (!sku) {
      skuInput.classList.add('error');
      showToast('Product SKU is required.', 'error');
      hasError = true;
    }
    if (!category_id) {
      categoryInput.classList.add('error');
      showToast('Please select a category.', 'error');
      hasError = true;
    }
    if (isNaN(price) || price <= 0) {
      priceInput.classList.add('error');
      showToast('Price must be greater than zero.', 'error');
      hasError = true;
    }
    if (original_price !== null && original_price < price) {
      document.getElementById('field-original-price').classList.add('error');
      showToast('Original price cannot be less than selling price.', 'error');
      hasError = true;
    }
    if (isNaN(stock) || stock < 0) {
      stockInput.classList.add('error');
      showToast('Stock quantity cannot be negative.', 'error');
      hasError = true;
    }

    if (hasError) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = editProductId ? '<span>✨ Update Product</span>' : '<span>✨ Publish Product</span>';
      return;
    }

    // Step 1: Upload Pending Images in background
    let finalThumbUrl = uploadedThumbnailUrl;
    let finalGalleryUrls = [...uploadedGalleryUrls];

    try {
      if (pendingThumbFile) {
        submitBtn.innerHTML = '<span>📸 Uploading thumbnail...</span>';
        finalThumbUrl = await uploadSingleFileToServer(pendingThumbFile);
        uploadedThumbnailUrl = finalThumbUrl;
        pendingThumbFile = null;
      }

      if (pendingGalleryFiles.length > 0) {
        submitBtn.innerHTML = '<span>🖼️ Uploading gallery images...</span>';
        for (const f of pendingGalleryFiles) {
          const url = await uploadSingleFileToServer(f);
          finalGalleryUrls.push(url);
        }
        uploadedGalleryUrls = finalGalleryUrls;
        pendingGalleryFiles = [];
      }
    } catch (uploadErr) {
      console.error('Image upload failed during save:', uploadErr);
      showToast(`Image upload failed: ${uploadErr.message}. Your form data is saved below, please retry.`, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = editProductId ? '<span>✨ Update Product</span>' : '<span>✨ Publish Product</span>';
      return; // Stop saving, KEEP all form data intact
    }

    // Step 2: Save Product Record
    submitBtn.innerHTML = '<span>✨ Saving Product...</span>';

    const payload = {
      name,
      slug: slug || undefined,
      sku,
      category_id,
      collection_ids: getSelectedCollectionIds(),
      subcategory: subcategory || undefined,
      price,
      original_price,
      discount_percentage,
      stock,
      fabric: fabric || undefined,
      occasion: occasion || undefined,
      brand,
      sizes: sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL'],
      colors: colors.length > 0 ? colors : ['Plum', 'Maroon'],
      short_description: short_description || undefined,
      description: description || undefined,
      status,
      featured,
      bestseller,
      new_arrival,
      is_active,
      thumbnail: finalThumbUrl || undefined,
      images: finalGalleryUrls
    };

    try {
      let savedProduct = null;
      if (editProductId) {
        savedProduct = await adminApiRequest(`/admin/products/${editProductId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showToast('Product updated successfully!', 'success');
      } else {
        savedProduct = await adminApiRequest('/admin/products', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        editProductId = savedProduct.id || savedProduct._id || editProductId;
        showToast('New product created successfully!', 'success');
      }

      const savedProductId = editProductId || (savedProduct && (savedProduct.id || savedProduct._id));
      if (savedProductId) {
        await syncProductCollections(savedProductId);
      }

      setTimeout(() => {
        window.location.href = 'products.html';
      }, 1000);

    } catch (saveErr) {
      console.error('Failed to save product:', saveErr);
      showToast(`Failed to save product: ${saveErr.message}. All form data is preserved.`, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = editProductId ? '<span>✨ Update Product</span>' : '<span>✨ Publish Product</span>';
    }
  });
}
