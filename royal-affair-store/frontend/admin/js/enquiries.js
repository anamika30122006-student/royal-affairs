/**
 * Royal Affair Admin Enquiries Management
 * Fetching Real API Data (No hardcoded dummy records)
 */

let allEnquiries = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAdminAuth();
  if (!user) return;

  await loadEnquiries();

  document.getElementById('enquiry-search-input').addEventListener('input', filterEnquiries);
  document.getElementById('enquiry-status-filter').addEventListener('change', filterEnquiries);
  document.getElementById('reset-enquiry-filters').addEventListener('click', () => {
    document.getElementById('enquiry-search-input').value = '';
    document.getElementById('enquiry-status-filter').value = '';
    filterEnquiries();
  });

  document.getElementById('reply-enquiry-form').addEventListener('submit', handleReplySubmit);
});

async function loadEnquiries() {
  try {
    const res = await adminApiRequest('/admin/enquiries');
    if (Array.isArray(res)) allEnquiries = res;
    else if (res.enquiries) allEnquiries = res.enquiries;
    else allEnquiries = [];
  } catch (err) {
    console.warn('Enquiries API unavailable or empty:', err);
    allEnquiries = [];
  }
  filterEnquiries();
}

function filterEnquiries() {
  const query = (document.getElementById('enquiry-search-input').value || '').toLowerCase().trim();
  const statusFilter = document.getElementById('enquiry-status-filter').value;

  const filtered = allEnquiries.filter(e => {
    const matchesQuery = !query ||
      (e.name || '').toLowerCase().includes(query) ||
      (e.email || '').toLowerCase().includes(query) ||
      (e.subject || '').toLowerCase().includes(query) ||
      (e.message || '').toLowerCase().includes(query);

    const matchesStatus = !statusFilter || (e.status || '').toLowerCase() === statusFilter.toLowerCase();

    return matchesQuery && matchesStatus;
  });

  renderEnquiriesTable(filtered);
}

function renderEnquiriesTable(enquiries) {
  const tbody = document.getElementById('enquiries-tbody');

  if (enquiries.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="padding: 0; border: none; background: transparent;">
          <div class="empty-state-card card">
            <div class="empty-state-icon-box">✉️</div>
            <h3 class="empty-state-title">No Enquiries Found</h3>
            <p class="empty-state-subtitle">No customer message enquiries recorded in the system yet.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = enquiries.map(e => {
    const isUnread = e.status === 'unread';
    const isReplied = e.status === 'replied';
    const formattedDate = e.created_at ? new Date(e.created_at).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    }) : '-';

    let rowStyle = isUnread ? 'background-color: #F0F9FF; font-weight: 500;' : '';

    return `
      <tr style="${rowStyle}">
        <td data-label="Customer Name">
          <div style="font-weight: ${isUnread ? '700' : '600'}; color: var(--primary);">${e.name || 'Customer'}</div>
        </td>
        <td data-label="Contact Info">
          <div style="font-size: 0.85rem; font-weight: 600;">${e.email || '-'}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${e.phone || ''}</div>
        </td>
        <td data-label="Subject">
          <div style="font-weight: ${isUnread ? '700' : '500'}; font-size: 0.88rem; color: var(--text-main);">${e.subject || 'General Inquiry'}</div>
        </td>
        <td data-label="Message Preview">
          <div style="font-size: 0.82rem; color: var(--text-muted); max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${e.message || ''}
          </div>
        </td>
        <td data-label="Received Date" style="font-size: 0.82rem; color: var(--text-muted);">
          ${formattedDate}
        </td>
        <td data-label="Status">
          ${isUnread ? `
            <span class="badge" style="background-color: #DBEAFE; color: #1E40AF; font-weight: 700;">⚡ NEW</span>
          ` : isReplied ? `
            <span class="badge" style="background-color: #DEF7EC; color: #03543F;">💬 Replied</span>
          ` : `
            <span class="badge badge-status-archived">✓ Read</span>
          `}
        </td>
        <td data-label="Actions" style="text-align: right;">
          <div class="action-icon-group" style="justify-content: flex-end;">
            <button type="button" class="action-icon-btn btn-view" title="Read Full Enquiry" onclick="openViewEnquiryModal('${e.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button type="button" class="action-icon-btn btn-edit" title="Send Email Reply" onclick="openReplyEnquiryModal('${e.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </button>
            <button type="button" class="action-icon-btn btn-delete" title="Delete Enquiry" onclick="deleteEnquiry('${e.id}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function openViewEnquiryModal(enquiryId) {
  const enquiry = allEnquiries.find(e => e.id === enquiryId);
  if (!enquiry) return;

  if (enquiry.status === 'unread') {
    enquiry.status = 'read';
    filterEnquiries();
  }

  const modalBody = document.getElementById('view-enquiry-modal-body');
  document.getElementById('view-enquiry-title').innerText = `✉️ Enquiry from ${enquiry.name || 'Customer'}`;

  modalBody.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="background-color: var(--bg-ivory); padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color);">
        <div style="font-size: 0.82rem; color: var(--text-muted);">From</div>
        <div style="font-size: 1rem; font-weight: 700; color: var(--primary);">${enquiry.name || 'Customer'}</div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">${enquiry.email || ''} ${enquiry.phone ? '| ' + enquiry.phone : ''}</div>
      </div>

      <div>
        <div style="font-size: 0.82rem; color: var(--text-muted);">Subject</div>
        <div style="font-size: 0.95rem; font-weight: 700; color: var(--primary);">${enquiry.subject || 'Inquiry'}</div>
      </div>

      <div>
        <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 4px;">Message Content</div>
        <div style="background: #FFF; padding: 1rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.9rem; line-height: 1.5; color: var(--text-main);">
          ${enquiry.message || ''}
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem;">
        <button type="button" class="btn btn-secondary" onclick="closeViewEnquiryModal()">Close</button>
        <button type="button" class="btn btn-primary" onclick="closeViewEnquiryModal(); openReplyEnquiryModal('${enquiry.id}');">💬 Reply to Customer</button>
      </div>
    </div>
  `;

  document.getElementById('view-enquiry-modal').classList.add('active');
}

function closeViewEnquiryModal() {
  document.getElementById('view-enquiry-modal').classList.remove('active');
}

function openReplyEnquiryModal(enquiryId) {
  const enquiry = allEnquiries.find(e => e.id === enquiryId);
  if (!enquiry) return;

  document.getElementById('reply-enquiry-id').value = enquiry.id;
  document.getElementById('reply-recipient-email').value = `${enquiry.name || 'Customer'} <${enquiry.email || ''}>`;
  document.getElementById('reply-subject').value = `Re: ${enquiry.subject || 'Inquiry'}`;
  document.getElementById('reply-message').value = `Dear ${enquiry.name || 'Customer'},\n\nThank you for reaching out to Royal Affair.\n\n`;

  document.getElementById('reply-enquiry-modal').classList.add('active');
}

function closeReplyEnquiryModal() {
  document.getElementById('reply-enquiry-modal').classList.remove('active');
}

async function handleReplySubmit(e) {
  e.preventDefault();

  const enquiryId = document.getElementById('reply-enquiry-id').value;
  const replyMessage = document.getElementById('reply-message').value.trim();

  if (!replyMessage) {
    showToast('Reply message content is required.', 'error');
    return;
  }

  const btn = document.getElementById('reply-submit-btn');
  btn.disabled = true;
  btn.innerText = 'Sending...';

  try {
    await adminApiRequest(`/admin/enquiries/${enquiryId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message: replyMessage })
    });
    showToast('Email response sent successfully!', 'success');
  } catch (err) {
    showToast(`Failed to send email response: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = '✉️ Send Reply';
    closeReplyEnquiryModal();
    loadEnquiries();
  }
}

async function deleteEnquiry(enquiryId) {
  showConfirmModal('Delete Enquiry Confirmation', 'Are you sure you want to delete this customer enquiry?', async () => {
    try {
      await adminApiRequest(`/admin/enquiries/${enquiryId}`, { method: 'DELETE' });
      showToast('Enquiry deleted.', 'success');
    } catch (err) {
      showToast(`Failed to delete enquiry: ${err.message}`, 'error');
    }
    loadEnquiries();
  });
}
