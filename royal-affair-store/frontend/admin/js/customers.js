/**
 * Royal Affair Admin Customers Management
 * Fetching Real API Data (No hardcoded dummy records)
 */

let allCustomers = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAdminAuth();
  if (!user) return;

  await loadCustomers();

  document.getElementById('customer-search-input').addEventListener('input', filterCustomers);
  document.getElementById('customer-tier-filter').addEventListener('change', filterCustomers);
  document.getElementById('reset-customer-filters').addEventListener('click', () => {
    document.getElementById('customer-search-input').value = '';
    document.getElementById('customer-tier-filter').value = '';
    filterCustomers();
  });
});

async function loadCustomers() {
  try {
    const res = await adminApiRequest('/admin/customers');
    allCustomers = Array.isArray(res) ? res : (res.customers || []);
  } catch (err) {
    console.warn('Customers API unavailable or empty:', err);
    allCustomers = [];
  }

  filterCustomers();
}

function filterCustomers() {
  const query = (document.getElementById('customer-search-input').value || '').toLowerCase().trim();
  const tierFilter = document.getElementById('customer-tier-filter').value;

  const filtered = allCustomers.filter(c => {
    const matchesQuery = !query ||
      (c.name || '').toLowerCase().includes(query) ||
      (c.email || '').toLowerCase().includes(query) ||
      (c.city || '').toLowerCase().includes(query);

    const matchesTier = !tierFilter || (c.tier || '').toLowerCase() === tierFilter.toLowerCase();

    return matchesQuery && matchesTier;
  });

  renderCustomersTable(filtered);
}

function renderCustomersTable(customers) {
  const tbody = document.getElementById('customers-tbody');

  if (customers.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 0; border: none; background: transparent;">
          <div class="empty-state-card card">
            <div class="empty-state-icon-box">👥</div>
            <h3 class="empty-state-title">No Customers Found</h3>
            <p class="empty-state-subtitle">No customer directory records available yet.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = customers.map(c => {
    const formattedDate = c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    }) : '-';

    const nameStr = c.name || 'Customer';
    const initials = nameStr.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const isVip = c.tier === 'vip';

    return `
      <tr>
        <td data-label="Customer Profile">
          <div style="display: flex; align-items: center; gap: 0.85rem;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: ${isVip ? 'var(--accent-gold-light)' : '#E5E7EB'}; color: ${isVip ? 'var(--accent-gold-hover)' : 'var(--primary)'}; display: flex; align-items: center; justify-content: center; font-weight: 700; border: 1px solid ${isVip ? 'var(--accent-gold)' : '#D1D5DB'}; font-size: 0.9rem;">
              ${initials}
            </div>
            <div>
              <div style="font-weight: 600; color: var(--primary); font-size: 0.92rem;">${nameStr}</div>
              <div style="font-size: 0.78rem; color: var(--text-muted);">${c.city || 'India'}</div>
            </div>
          </div>
        </td>
        <td data-label="Contact Details">
          <div style="font-size: 0.85rem; font-weight: 600;">${c.email || '-'}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${c.phone || ''}</div>
        </td>
        <td data-label="Total Spent">
          <strong style="font-size: 0.95rem; color: var(--primary);">₹${(c.total_spent || 0).toLocaleString('en-IN')}</strong>
        </td>
        <td data-label="Orders Count">
          <span class="badge badge-secondary">${c.orders_count || 0} orders</span>
        </td>
        <td data-label="Joined Date" style="font-size: 0.82rem; color: var(--text-muted);">
          ${formattedDate}
        </td>
        <td data-label="Tier Status">
          ${isVip ? `
            <span class="badge" style="background-color: #FEFCE8; color: #D4AF37; border: 1px solid #FDE047; font-weight: 700;">👑 VIP Member</span>
          ` : `
            <span class="badge badge-status-published">Active</span>
          `}
        </td>
        <td data-label="Actions" style="text-align: right;">
          <div class="action-icon-group" style="justify-content: flex-end;">
            <button type="button" class="action-icon-btn btn-view" title="View Customer Profile" onclick="openViewCustomerModal('${c.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openViewCustomerModal(customerId) {
  const c = allCustomers.find(item => item.id === customerId);
  if (!c) return;

  const modalBody = document.getElementById('view-customer-modal-body');
  document.getElementById('view-customer-title').innerText = `👥 Profile – ${c.name}`;

  modalBody.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      <div style="display: flex; align-items: center; gap: 1rem; background-color: var(--bg-ivory); padding: 1.25rem; border-radius: 8px; border: 1px solid var(--border-color);">
        <div style="width: 56px; height: 56px; border-radius: 50%; background: var(--accent-gold-light); color: var(--accent-gold-hover); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.2rem; border: 2px solid var(--accent-gold);">
          ${c.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--primary); margin-bottom: 2px;">${c.name}</h3>
          <div style="font-size: 0.85rem; color: var(--text-muted);">${c.email || ''} ${c.phone ? '| ' + c.phone : ''}</div>
          <div style="font-size: 0.82rem; color: var(--text-main); margin-top: 4px;">Location: <strong>${c.city || 'India'}</strong></div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
        <div style="background: #FFF; padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); text-align: center;">
          <div style="font-size: 0.8rem; color: var(--text-muted);">Total Customer Spend</div>
          <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary); margin-top: 4px;">₹${(c.total_spent || 0).toLocaleString('en-IN')}</div>
        </div>

        <div style="background: #FFF; padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); text-align: center;">
          <div style="font-size: 0.8rem; color: var(--text-muted);">Completed Orders</div>
          <div style="font-size: 1.3rem; font-weight: 700; color: var(--primary); margin-top: 4px;">${c.orders_count || 0} orders</div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
        <button type="button" class="btn btn-secondary" onclick="closeViewCustomerModal()">Close Profile</button>
      </div>
    </div>
  `;

  document.getElementById('view-customer-modal').classList.add('active');
}

function closeViewCustomerModal() {
  document.getElementById('view-customer-modal').classList.remove('active');
}
