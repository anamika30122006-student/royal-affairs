/**
 * Royal Affair Admin Reviews Management
 * Fetching Real API Data (No hardcoded dummy records)
 */

let allReviews = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAdminAuth();
  if (!user) return;

  await loadReviews();

  document.getElementById('review-search-input').addEventListener('input', filterReviews);
  document.getElementById('review-rating-filter').addEventListener('change', filterReviews);
  document.getElementById('review-status-filter').addEventListener('change', filterReviews);
  document.getElementById('reset-review-filters').addEventListener('click', () => {
    document.getElementById('review-search-input').value = '';
    document.getElementById('review-rating-filter').value = '';
    document.getElementById('review-status-filter').value = '';
    filterReviews();
  });
});

async function loadReviews() {
  try {
    const res = await adminApiRequest('/admin/reviews');
    if (Array.isArray(res)) allReviews = res;
    else if (res.reviews) allReviews = res.reviews;
    else allReviews = [];
  } catch (err) {
    console.warn('Reviews API unavailable or empty:', err);
    allReviews = [];
  }
  filterReviews();
}

function filterReviews() {
  const query = (document.getElementById('review-search-input').value || '').toLowerCase().trim();
  const ratingFilter = document.getElementById('review-rating-filter').value;
  const statusFilter = document.getElementById('review-status-filter').value;

  const filtered = allReviews.filter(r => {
    const matchesQuery = !query ||
      (r.product_name || '').toLowerCase().includes(query) ||
      (r.customer_name || '').toLowerCase().includes(query) ||
      (r.comment || '').toLowerCase().includes(query);

    const matchesRating = !ratingFilter || r.rating === parseInt(ratingFilter, 10);
    const matchesStatus = !statusFilter || (r.status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesQuery && matchesRating && matchesStatus;
  });

  renderReviewsTable(filtered);
}

function renderReviewsTable(reviews) {
  const tbody = document.getElementById('reviews-tbody');

  if (reviews.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 0; border: none; background: transparent;">
          <div class="empty-state-card card">
            <div class="empty-state-icon-box">⭐</div>
            <h3 class="empty-state-title">No Reviews Found</h3>
            <p class="empty-state-subtitle">No customer product reviews available in the system yet.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = reviews.map(r => {
    const formattedDate = r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    }) : '-';

    const ratingVal = r.rating || 5;
    const starsHtml = '★'.repeat(ratingVal) + '☆'.repeat(5 - ratingVal);

    let statusBadgeClass = 'badge-status-published';
    if (r.status === 'pending') statusBadgeClass = 'badge-status-draft';
    else if (r.status === 'rejected') statusBadgeClass = 'badge-status-deleted';

    return `
      <tr>
        <td data-label="Product">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <img src="${getProductImage(r.product_image)}" alt="${r.product_name || 'Product'}" class="product-thumb" style="width: 48px; height: 60px;" onerror="handleImageError(this)">
            <div>
              <div style="font-weight: 600; font-size: 0.9rem; color: var(--primary);">${r.product_name || 'Designer Suit'}</div>
            </div>
          </div>
        </td>
        <td data-label="Customer">
          <div style="font-weight: 600;">${r.customer_name || 'Verified Customer'}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${r.customer_email || '-'}</div>
        </td>
        <td data-label="Rating">
          <div style="color: #D97706; font-size: 0.95rem; font-weight: 700; letter-spacing: 1px;">${starsHtml}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${ratingVal}.0 / 5</div>
        </td>
        <td data-label="Review Comment">
          <div style="font-weight: 600; font-size: 0.88rem; color: var(--primary);">${r.title || 'Product Review'}</div>
          <div style="font-size: 0.82rem; color: var(--text-main); line-height: 1.3;">"${r.comment || ''}"</div>
          ${Array.isArray(r.images) && r.images.length ? `<div style="display:flex;gap:5px;margin-top:7px;flex-wrap:wrap;">${r.images.map((image, index) => `<a href="${getProductImage(image)}" target="_blank" rel="noopener"><img src="${getProductImage(image)}" alt="Review photo ${index + 1}" style="width:42px;height:42px;object-fit:cover;border-radius:5px;border:1px solid var(--border-color);" onerror="handleImageError(this)"></a>`).join('')}</div>` : ''}
        </td>
        <td data-label="Status">
          <span class="badge ${statusBadgeClass}" style="text-transform: capitalize;">
            ${r.status === 'pending' ? 'Pending Review' : (r.status || 'Approved')}
          </span>
        </td>
        <td data-label="Date" style="font-size: 0.82rem; color: var(--text-muted);">
          ${formattedDate}
        </td>
        <td data-label="Moderation Actions" style="text-align: right;">
          <div class="action-icon-group" style="justify-content: flex-end;">
            ${r.status !== 'approved' ? `
              <button type="button" class="action-icon-btn btn-view" style="color: #059669; border-color: #A7F3D0;" title="Approve Review" onclick="updateReviewStatus('${r.id}', 'approved')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </button>
            ` : ''}

            ${r.status !== 'rejected' ? `
              <button type="button" class="action-icon-btn btn-restore" style="color: #D97706;" title="Reject Review" onclick="updateReviewStatus('${r.id}', 'rejected')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
              </button>
            ` : ''}

            <button type="button" class="action-icon-btn btn-delete" title="Delete Review" onclick="deleteReview('${r.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function updateReviewStatus(reviewId, newStatus) {
  try {
    await adminApiRequest(`/admin/reviews/${reviewId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    showToast(`Review status updated to '${newStatus}'!`, 'success');
  } catch (err) {
    showToast(`Failed to update status: ${err.message}`, 'error');
  }
  loadReviews();
}

async function deleteReview(reviewId) {
  showConfirmModal('Delete Review Confirmation', 'Are you sure you want to permanently delete this customer review?', async () => {
    try {
      await adminApiRequest(`/admin/reviews/${reviewId}`, { method: 'DELETE' });
      showToast('Review permanently deleted.', 'success');
    } catch (err) {
      showToast(`Failed to delete review: ${err.message}`, 'error');
    }
    loadReviews();
  });
}
