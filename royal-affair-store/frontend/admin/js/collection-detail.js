// Collection Detail page JS
let collectionId = null;
let collectionData = null;
let collectionProducts = [];
let addCatalog = [];
let addSelectedIds = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAdminAuth();
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  collectionId = params.get('id');
  if (!collectionId) {
    showToast('Collection ID is required in URL', 'error');
    return;
  }

  document.getElementById('delete-collection-btn').addEventListener('click', handleDeleteCollection);
  document.getElementById('add-products-btn').addEventListener('click', openAddProductsModal);
  document.getElementById('add-selected-btn').addEventListener('click', handleAddSelected);
  document.getElementById('save-order-btn').addEventListener('click', saveCollectionOrder);
  document.getElementById('add-search').addEventListener('input', renderAddProductsList);
  document.getElementById('add-filter-stock').addEventListener('change', renderAddProductsList);

  await loadCollectionDetails();
  await loadCollectionProducts();
});

async function loadCollectionDetails() {
  try {
    const res = await adminApiRequest(`/collections/${collectionId}`);
    collectionData = res;
    document.getElementById('page-title').innerText = `Collection: ${collectionData.name}`;
    document.getElementById('collection-name').innerText = collectionData.name;
    document.getElementById('collection-desc').innerText = collectionData.description || '';
    document.getElementById('collection-status').innerText = collectionData.is_active ? 'Active' : 'Disabled';
    document.getElementById('collection-order').innerText = `#${collectionData.display_order || 0}`;
    const imgEl = document.getElementById('collection-image');
    imgEl.innerHTML = collectionData.image ? `<img src="${collectionData.image}" style="width:100%; height:100%; object-fit:cover;">` : '';
  } catch (e) {
    console.error('Failed to load collection', e);
    showToast('Failed to load collection: ' + (e.message || e), 'error');
  }
}

async function loadCollectionProducts() {
  try {
    // Use public collection detail to get populated products
    const res = await adminApiRequest(`/collections/${collectionId}`);
    collectionProducts = res.products || [];
    renderCollectionProducts();
  } catch (e) {
    console.error('Failed to load collection products', e);
    document.getElementById('collection-products-tbody').innerHTML = `<tr><td colspan="6" style="text-align:center; color:#DC2626;">Failed to load products</td></tr>`;
  }
}

function renderCollectionProducts() {
  const tbody = document.getElementById('collection-products-tbody');
  if (!collectionProducts || collectionProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">No products assigned to this collection.</td></tr>`;
    document.getElementById('products-count').innerText = 0;
    return;
  }

  document.getElementById('products-count').innerText = collectionProducts.length;

  tbody.innerHTML = collectionProducts.map((p, idx) => {
    const img = getProductImage(p.thumbnail || (p.images && p.images[0]) || p.image || '');
    const sku = p.sku || '';
    const price = (p.price !== undefined && p.price !== null) ? Number(p.price).toFixed(2) : '';
    const stock = p.stock || 0;
    return `
      <tr data-pid="${p.id}">
        <td><img src="${img}" style="width:54px; height:54px; object-fit:cover; border-radius:6px;" onerror="handleImageError(this)"></td>
        <td style="min-width:220px;">
          <div style="font-weight:600; color:var(--primary);">${p.name}</div>
        </td>
        <td>${sku}</td>
        <td>₹${price}</td>
        <td>${stock}</td>
        <td style="text-align:right;">
          <div style="display:flex; gap:6px; justify-content:flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="moveProduct(${idx}, -1)" ${idx===0? 'disabled':''}>▲</button>
            <button class="btn btn-secondary btn-sm" onclick="moveProduct(${idx}, 1)" ${idx===collectionProducts.length-1? 'disabled':''}>▼</button>
            <button class="btn btn-secondary btn-sm" onclick="removeProduct('${p.id}')">Remove</button>
            <a class="btn btn-secondary btn-sm" href="products.html?id=${p.id}">Edit</a>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // attach drag handlers for tbody rows
  attachDragReorderHandlers();
}

function moveProduct(index, dir) {
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= collectionProducts.length) return;
  const tmp = collectionProducts[index];
  collectionProducts.splice(index, 1);
  collectionProducts.splice(newIndex, 0, tmp);
  renderCollectionProducts();
}

async function saveCollectionOrder() {
  const product_ids = collectionProducts.map(p => p.id || p._id);
  try {
    await adminApiRequest(`/admin/collections/${collectionId}/products`, { method: 'PUT', body: JSON.stringify(product_ids) });
    showToast('Collection order saved', 'success');
    await loadCollectionDetails();
  } catch (e) {
    console.error('Failed to save order', e);
    showToast('Failed to save order: ' + (e.message || e), 'error');
  }
}

async function removeProduct(productId) {
  try {
    await adminApiRequest(`/admin/collections/${collectionId}/products/${productId}`, { method: 'DELETE' });
    collectionProducts = collectionProducts.filter(p => (p.id || p._id) !== productId);
    renderCollectionProducts();
    showToast('Product removed from collection', 'success');
  } catch (e) {
    console.error('Failed to remove product', e);
    showToast('Failed to remove product: ' + (e.message || e), 'error');
  }
}

function attachDragReorderHandlers() {
  const tbody = document.getElementById('collection-products-tbody');
  let dragSrcEl = null;

  Array.from(tbody.querySelectorAll('tr[data-pid]')).forEach(row => {
    row.draggable = true;
    row.addEventListener('dragstart', (e) => {
      dragSrcEl = row;
      row.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    row.addEventListener('dragend', () => { row.classList.remove('dragging'); dragSrcEl = null; });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      const target = e.currentTarget;
      if (dragSrcEl && target !== dragSrcEl) {
        const srcId = dragSrcEl.dataset.pid;
        const tgtId = target.dataset.pid;
        const srcIndex = collectionProducts.findIndex(p => (p.id||p._id) == srcId);
        const tgtIndex = collectionProducts.findIndex(p => (p.id||p._id) == tgtId);
        if (srcIndex > -1 && tgtIndex > -1 && srcIndex !== tgtIndex) {
          collectionProducts.splice(tgtIndex, 0, collectionProducts.splice(srcIndex, 1)[0]);
          renderCollectionProducts();
        }
      }
    });
  });
}

async function handleDeleteCollection() {
  if (!confirm('Delete this collection? This cannot be undone.')) return;
  try {
    await adminApiRequest(`/admin/collections/${collectionId}`, { method: 'DELETE' });
    showToast('Collection deleted', 'success');
    window.location.href = 'collections.html';
  } catch (e) {
    console.error('Failed to delete', e);
    showToast('Failed to delete: ' + (e.message || e), 'error');
  }
}

// -- Add Products modal logic --
function openAddProductsModal() {
  document.getElementById('add-products-modal').classList.add('active');
  loadAddCatalog();
}

function closeAddProductsModal() { document.getElementById('add-products-modal').classList.remove('active'); addSelectedIds = []; }

async function loadAddCatalog() {
  try {
    const res = await adminApiRequest('/admin/products/all?limit=1000');
    let products = [];
    if (!res) products = [];
    else if (Array.isArray(res)) products = res;
    else if (res.products) products = res.products;
    else if (res.data && Array.isArray(res.data)) products = res.data;
    else if (res.items && Array.isArray(res.items)) products = res.items;

    addCatalog = products.map(p => ({
      id: p.id || p._id || (p._id && (typeof p._id === 'object' ? p._id.$oid || String(p._id) : String(p._id))) || p.slug || null,
      name: p.name || p.title || '',
      sku: p.sku || '',
      price: (p.price !== undefined) ? p.price : (p.price_amount || 0),
      thumbnail: p.thumbnail || (p.images && p.images[0]) || p.image || '',
      stock: p.stock || 0,
      is_active: (p.is_active === undefined) ? true : !!p.is_active,
      is_deleted: p.is_deleted || false
    }));

    renderAddProductsList();
  } catch (e) {
    console.error('Failed load catalog', e);
    document.getElementById('add-products-list').innerHTML = '<div style="text-align:center;color:#DC2626;">Failed to load catalog</div>';
  }
}

function renderAddProductsList() {
  const q = document.getElementById('add-search').value.toLowerCase();
  const stock = document.getElementById('add-filter-stock').value;
  const listEl = document.getElementById('add-products-list');
  const filtered = addCatalog.filter(p => {
    if (p.is_deleted) return false;
    if (!p.is_active) return false;
    if (q && !(p.name||'').toLowerCase().includes(q) && !(p.sku||'').toLowerCase().includes(q)) return false;
    if (stock === 'instock' && !(p.stock > 0)) return false;
    if (stock === 'outofstock' && (p.stock > 0)) return false;
    return true;
  });
  if (!filtered.length) {
    listEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);">No matching products</div>';
    return;
  }
  listEl.innerHTML = filtered.map(p => `
    <label style="display:flex; align-items:center; gap:8px; padding:6px; border-radius:6px; border:1px solid var(--border-color); background:#fff;">
      <input type="checkbox" class="add-catalog-checkbox" value="${p.id}" onchange="toggleAddSelected(this.value, this.checked)" ${collectionProducts.find(cp=> (cp.id||cp._id)==p.id)? 'disabled':''}>
      <img src="${getProductImage(p.thumbnail||'')}" style="width:48px;height:56px;object-fit:cover;border-radius:6px;" onerror="handleImageError(this)">
      <div style="flex:1; min-width:0;">
        <div style="font-weight:600; color:var(--primary);">${p.name}</div>
        <div style="font-size:0.82rem; color:var(--text-muted);">SKU: ${p.sku} • ₹${Number(p.price).toFixed(2)}</div>
      </div>
      <div style="min-width:80px; text-align:right;">${p.stock>0? 'In stock':'Out'}</div>
    </label>
  `).join('');
}

function toggleAddSelected(id, checked) {
  if (checked) {
    if (!addSelectedIds.includes(id)) addSelectedIds.push(id);
  } else {
    addSelectedIds = addSelectedIds.filter(x=>x!==id);
  }
}

async function handleAddSelected() {
  if (!addSelectedIds.length) {
    showToast('No products selected', 'error');
    return;
  }
  try {
    await adminApiRequest(`/admin/collections/${collectionId}/products`, { method: 'POST', body: JSON.stringify(addSelectedIds) });
    showToast('Products added to collection', 'success');
    closeAddProductsModal();
    await loadCollectionProducts();
  } catch (e) {
    console.error('Failed to add selected', e);
    showToast('Failed to add products: ' + (e.message || e), 'error');
  }
}
*** End Patch