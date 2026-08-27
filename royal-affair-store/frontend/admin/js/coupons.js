/**
 * Royal Affair Admin Coupons Management
 * Fetching Real API Data (No hardcoded dummy records)
 */

let editingCouponId = null;
let allCoupons = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAdminAuth();
  if (!user) return;

  await loadCoupons();

  document.getElementById('coupon-search-input').addEventListener('input', filterCoupons);
  document.getElementById('coupon-status-filter').addEventListener('change', filterCoupons);
  document.getElementById('reset-coupon-filters').addEventListener('click', () => {
    document.getElementById('coupon-search-input').value = '';
    document.getElementById('coupon-status-filter').value = '';
    filterCoupons();
  });

  document.getElementById('coupon-form').addEventListener('submit', handleCouponSubmit);
});

async function loadCoupons() {
  try {
    const res = await adminApiRequest('/admin/coupons');
    if (Array.isArray(res)) allCoupons = res;
    else if (res.coupons) allCoupons = res.coupons;
    else allCoupons = [];
  } catch (err) {
    console.warn('Coupons API unavailable or empty:', err);
    allCoupons = [];
  }
  filterCoupons();
}

function filterCoupons() {
  const query = (document.getElementById('coupon-search-input').value || '').toUpperCase().trim();
  const statusFilter = document.getElementById('coupon-status-filter').value;
  const today = new Date().toISOString().split('T')[0];

  const filtered = allCoupons.filter(c => {
    const matchesQuery = !query || (c.code || '').toUpperCase().includes(query);

    const isExpired = c.expiry_date && c.expiry_date < today;
    const isActive = c.is_active && !isExpired;
    const isDisabled = !c.is_active;

    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = isActive;
    else if (statusFilter === 'disabled') matchesStatus = isDisabled;
    else if (statusFilter === 'expired') matchesStatus = isExpired;

    return matchesQuery && matchesStatus;
  });

  renderCouponsTable(filtered);
}

function renderCouponsTable(coupons) {
  const tbody = document.getElementById('coupons-tbody');
  const today = new Date().toISOString().split('T')[0];

  if (coupons.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 0; border: none; background: transparent;">
          <div class="empty-state-card card">
            <div class="empty-state-icon-box">🎟️</div>
            <h3 class="empty-state-title">No Coupons Found</h3>
            <p class="empty-state-subtitle">No promo discount codes available in the system yet.</p>
            <button type="button" class="btn btn-primary" onclick="openCouponModal()">+ Create Coupon</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = coupons.map(c => {
    const isExpired = c.expiry_date && c.expiry_date < today;

    let statusBadge = `<span class="badge badge-status-published">Active</span>`;
    if (isExpired) statusBadge = `<span class="badge badge-status-deleted">Expired</span>`;
    else if (!c.is_active) statusBadge = `<span class="badge badge-status-archived">Disabled</span>`;

    const discountText = c.discount_type === 'percentage' 
      ? `${c.discount_value}% OFF` 
      : `₹${(c.discount_value || 0).toLocaleString('en-IN')} OFF`;

    const formattedExpiry = c.expiry_date 
      ? new Date(c.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'No Expiry';

    return `
      <tr>
        <td data-label="Coupon Code">
          <code style="background-color: var(--accent-gold-light); color: var(--primary); font-weight: 700; font-size: 0.92rem; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--accent-gold); letter-spacing: 0.5px;">${c.code}</code>
        </td>
        <td data-label="Discount Rule">
          <div style="font-weight: 700; color: var(--primary); font-size: 0.95rem;">${discountText}</div>
        </td>
        <td data-label="Min Spend">
          <div style="font-size: 0.85rem; font-weight: 600;">₹${(c.min_spend || 0).toLocaleString('en-IN')}</div>
        </td>
        <td data-label="Validity" style="font-size: 0.85rem; color: ${isExpired ? '#DC2626' : 'var(--text-muted)'};">
          ${formattedExpiry}
        </td>
        <td data-label="Total Usage">
          <span class="badge badge-secondary">${c.usage_count || 0} / ${c.usage_limit || '∞'} uses</span>
        </td>
        <td data-label="Status">
          ${statusBadge}
        </td>
        <td data-label="Actions" style="text-align: right;">
          <div class="action-icon-group" style="justify-content: flex-end;">
            <button type="button" class="action-icon-btn ${c.is_active ? 'btn-restore' : 'btn-view'}" style="${c.is_active ? 'color:#D97706;' : 'color:#059669;'}" title="${c.is_active ? 'Disable Coupon' : 'Enable Coupon'}" onclick="toggleCouponStatus('${c.id}')">
              ${c.is_active ? '⏸️' : '▶️'}
            </button>
            <button type="button" class="action-icon-btn btn-edit" title="Edit Coupon" onclick="openCouponModal('${c.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
            <button type="button" class="action-icon-btn btn-delete" title="Delete Coupon" onclick="deleteCoupon('${c.id}', '${c.code}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openCouponModal(couponId = null) {
  editingCouponId = couponId;
  const modal = document.getElementById('coupon-modal');
  const title = document.getElementById('coupon-modal-title');
  const submitBtn = document.getElementById('coupon-submit-btn');

  if (editingCouponId) {
    title.innerText = '🎟️ Edit Coupon Code';
    submitBtn.innerText = 'Save Changes';
    const c = allCoupons.find(item => item.id === editingCouponId);
    if (c) {
      document.getElementById('coupon-code').value = c.code || '';
      document.getElementById('coupon-type').value = c.discount_type || 'percentage';
      document.getElementById('coupon-value').value = c.discount_value || '';
      document.getElementById('coupon-min-spend').value = c.min_spend || '';
      document.getElementById('coupon-expiry').value = c.expiry_date || '';
      document.getElementById('coupon-usage-limit').value = c.usage_limit || '';
      document.getElementById('coupon-active').checked = !!c.is_active;
    }
  } else {
    title.innerText = '🎟️ Create New Coupon';
    submitBtn.innerText = 'Save Coupon';
    document.getElementById('coupon-form').reset();
    document.getElementById('coupon-active').checked = true;
  }

  modal.classList.add('active');
}

function closeCouponModal() {
  document.getElementById('coupon-modal').classList.remove('active');
  editingCouponId = null;
}

async function handleCouponSubmit(e) {
  e.preventDefault();

  const code = document.getElementById('coupon-code').value.trim().toUpperCase();
  const discount_type = document.getElementById('coupon-type').value;
  const discount_value = parseFloat(document.getElementById('coupon-value').value);
  const min_spend = parseFloat(document.getElementById('coupon-min-spend').value) || 0;
  const expiry_date = document.getElementById('coupon-expiry').value;
  const usage_limit = parseInt(document.getElementById('coupon-usage-limit').value, 10) || null;
  const is_active = document.getElementById('coupon-active').checked;

  if (!code || isNaN(discount_value)) {
    showToast('Coupon code and valid discount value are required.', 'error');
    return;
  }

  const payload = { code, discount_type, discount_value, min_spend, expiry_date, usage_limit, is_active };

  try {
    if (editingCouponId) {
      await adminApiRequest(`/admin/coupons/${editingCouponId}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showToast(`Coupon '${code}' updated successfully!`, 'success');
    } else {
      await adminApiRequest('/admin/coupons', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      showToast(`Coupon '${code}' created successfully!`, 'success');
    }
  } catch (err) {
    showToast(`Failed to save coupon: ${err.message}`, 'error');
  }

  closeCouponModal();
  loadCoupons();
}

async function toggleCouponStatus(couponId) {
  const c = allCoupons.find(item => item.id === couponId);
  if (!c) return;

  try {
    await adminApiRequest(`/admin/coupons/${couponId}/toggle`, { method: 'POST' });
    showToast(`Coupon '${c.code}' status updated.`, 'success');
  } catch (err) {
    showToast(`Status change note: ${err.message}`, 'info');
  }
  loadCoupons();
}

async function deleteCoupon(couponId, code) {
  showConfirmModal('Delete Coupon Confirmation', `Are you sure you want to delete coupon code '${code}'?`, async () => {
    try {
      await adminApiRequest(`/admin/coupons/${couponId}`, { method: 'DELETE' });
      showToast(`Coupon '${code}' deleted.`, 'success');
    } catch (err) {
      showToast(`Failed to delete coupon: ${err.message}`, 'error');
    }
    loadCoupons();
  });
}
