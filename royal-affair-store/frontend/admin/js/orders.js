/**
 * Royal Affair Admin Orders Module
 * Fetching Real API Data (No hardcoded dummy records)
 */

let allOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAdminAuth();
  if (!user) return;

  await loadOrders();

  // Filter events
  document.getElementById('order-search-input').addEventListener('input', filterOrders);
  document.getElementById('order-status-filter').addEventListener('change', filterOrders);
  document.getElementById('payment-status-filter').addEventListener('change', filterOrders);
  document.getElementById('reset-filters-btn').addEventListener('click', () => {
    document.getElementById('order-search-input').value = '';
    document.getElementById('order-status-filter').value = '';
    document.getElementById('payment-status-filter').value = '';
    filterOrders();
  });

  document.getElementById('update-status-form').addEventListener('submit', handleUpdateStatusSubmit);
});

async function loadOrders() {
  try {
    const res = await adminApiRequest('/admin/orders');
    allOrders = Array.isArray(res) ? res : (res.orders || []);
  } catch (err) {
    console.warn('Orders API unavailable or empty:', err);
    allOrders = [];
  }

  filterOrders();
}

function filterOrders() {
  const query = (document.getElementById('order-search-input').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('order-status-filter').value;
  const paymentFilter = document.getElementById('payment-status-filter').value;

  const filtered = allOrders.filter(o => {
    const matchesQuery = !query || 
      (o.id || '').toLowerCase().includes(query) ||
      (o.customer_name || '').toLowerCase().includes(query) ||
      (o.customer_email || '').toLowerCase().includes(query);

    const matchesStatus = !statusFilter || (o.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesPayment = !paymentFilter || (o.payment_method || '').toLowerCase() === paymentFilter.toLowerCase();

    return matchesQuery && matchesStatus && matchesPayment;
  });

  renderOrdersTable(filtered);
}

function renderOrdersTable(orders) {
  const tbody = document.getElementById('orders-tbody');

  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 0; border: none; background: transparent;">
          <div class="empty-state-card card">
            <div class="empty-state-icon-box">📦</div>
            <h3 class="empty-state-title">No Orders Found</h3>
            <p class="empty-state-subtitle">No customer orders recorded in the system yet.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const formattedDate = o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    }) : '-';

    let statusBadgeClass = 'badge-order-pending';
    if (o.status === 'processing') statusBadgeClass = 'badge-order-processing';
    else if (o.status === 'shipped') statusBadgeClass = 'badge-order-shipped';
    else if (o.status === 'delivered') statusBadgeClass = 'badge-order-delivered';
    else if (o.status === 'cancelled') statusBadgeClass = 'badge-order-cancelled';

    return `
      <tr>
        <td data-label="Order Ref">
          <div style="font-weight: 700; color: var(--primary); font-family: monospace;">${o.id}</div>
        </td>
        <td data-label="Customer">
          <div style="font-weight: 600;">${o.customer_name || 'Guest'}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${o.customer_email || '-'}</div>
        </td>
        <td data-label="Total Amount">
          <strong style="font-size: 0.95rem;">₹${(o.total_amount || 0).toLocaleString('en-IN')}</strong>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${(o.items || []).length} items</div>
        </td>
        <td data-label="Payment">
          <div style="font-size: 0.85rem; font-weight: 500;">${o.payment_method || 'Online'}</div>
          <div style="font-size: 0.75rem; color: ${o.payment_status === 'Paid' ? '#059669' : '#D97706'}; font-weight: 600;">${o.payment_status || 'Pending'}</div>
        </td>
        <td data-label="Status">
          <span class="badge ${statusBadgeClass}" style="text-transform: capitalize;">
            ${o.status || 'Pending'}
          </span>
        </td>
        <td data-label="Order Date" style="font-size: 0.85rem; color: var(--text-muted);">
          ${formattedDate}
        </td>
        <td data-label="Actions" style="text-align: right;">
          <div class="action-icon-group" style="justify-content: flex-end;">
            <button type="button" class="action-icon-btn btn-view" title="View Order Details" onclick="openViewOrderModal('${o.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button type="button" class="action-icon-btn btn-edit" title="Update Fulfillment Status" onclick="openUpdateStatusModal('${o.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openViewOrderModal(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const modalBody = document.getElementById('view-order-modal-body');
  document.getElementById('view-order-title').innerText = `📦 Order Details – ${order.id}`;

  modalBody.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1.25rem;">
      <div style="background-color: var(--bg-ivory); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
        <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--primary); margin-bottom: 0.5rem;">Customer & Delivery Details</h4>
        <div style="font-size: 0.88rem; font-weight: 600;">${order.customer_name || 'Guest Customer'}</div>
        <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.5rem;">${order.customer_email || ''} ${order.customer_phone ? '| ' + order.customer_phone : ''}</div>
        <div style="font-size: 0.82rem; color: var(--text-main);"><strong>Shipping Address:</strong> ${order.shipping_address || 'No address provided.'}</div>
      </div>

      <div>
        <h4 style="font-size: 0.9rem; font-weight: 700; color: var(--primary); margin-bottom: 0.75rem;">Ordered Suit Items</h4>
        <div style="border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden;">
          <table class="data-table" style="font-size: 0.85rem;">
            <thead>
              <tr style="background: #F9FAFB;">
                <th>Item</th>
                <th>Details</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(item => `
                <tr>
                  <td><strong>${item.name}</strong><div style="font-size: 0.75rem; color: var(--text-muted);">${item.sku}</div></td>
                  <td>Color: ${item.color || '-'} | Size: ${item.size || '-'}</td>
                  <td>₹${(item.price || 0).toLocaleString('en-IN')}</td>
                  <td>${item.qty || 1}</td>
                  <td><strong>₹${((item.price || 0) * (item.qty || 1)).toLocaleString('en-IN')}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; background: #FFF; padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
        <div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">Payment Method: <strong>${order.payment_method || 'Online'}</strong></div>
          <div style="font-size: 0.82rem; color: var(--text-muted);">Payment Status: <strong style="color: ${order.payment_status === 'Paid' ? '#059669' : '#D97706'};">${order.payment_status || 'Paid'}</strong></div>
          ${order.razorpay_payment_id ? `<div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.25rem;">Razorpay ID: <code style="font-family:monospace;background:#f3f4f6;padding:1px 4px;border-radius:3px;">${order.razorpay_payment_id}</code></div>` : ''}
          ${order.razorpay_order_id ? `<div style="font-size: 0.78rem; color: var(--text-muted);">RZ Order: <code style="font-family:monospace;background:#f3f4f6;padding:1px 4px;border-radius:3px;">${order.razorpay_order_id}</code></div>` : ''}
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.8rem; color: var(--text-muted);">Total Order Amount</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary);">₹${(order.total_amount || 0).toLocaleString('en-IN')}</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('view-order-modal').classList.add('active');
}

function closeViewOrderModal() {
  document.getElementById('view-order-modal').classList.remove('active');
}

function openUpdateStatusModal(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  document.getElementById('update-order-id').value = order.id;
  document.getElementById('update-order-status').value = order.status || 'pending';
  document.getElementById('update-order-notes').value = order.notes || '';

  document.getElementById('update-status-modal').classList.add('active');
}

function closeUpdateStatusModal() {
  document.getElementById('update-status-modal').classList.remove('active');
}

async function handleUpdateStatusSubmit(e) {
  e.preventDefault();

  const orderId = document.getElementById('update-order-id').value;
  const newStatus = document.getElementById('update-order-status').value;
  const notes = document.getElementById('update-order-notes').value.trim();

  try {
    await adminApiRequest(`/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus, notes })
    });
    showToast(`Order ${orderId} updated to ${newStatus}!`, 'success');
  } catch (err) {
    showToast(`Failed to update order status: ${err.message}`, 'error');
  }

  closeUpdateStatusModal();
  loadOrders();
}
