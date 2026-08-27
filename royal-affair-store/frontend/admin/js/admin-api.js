/**
 * Royal Affair Admin API Client & UI Helpers
 */

// Toast notification helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerText = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Confirmation modal helper
function showConfirmModal(title, message, onConfirm) {
  let modal = document.getElementById('global-confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'global-confirm-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title" id="confirm-modal-title">Confirm Action</h3>
          <button type="button" class="btn btn-secondary btn-sm" onclick="closeConfirmModal()">&times;</button>
        </div>
        <p id="confirm-modal-message" style="margin-bottom: 1.5rem; color: var(--text-muted);"></p>
        <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button type="button" class="btn btn-secondary" onclick="closeConfirmModal()">Cancel</button>
          <button type="button" id="confirm-modal-btn" class="btn btn-danger">Confirm</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById('confirm-modal-title').innerText = title;
  document.getElementById('confirm-modal-message').innerText = message;
  
  const confirmBtn = document.getElementById('confirm-modal-btn');
  confirmBtn.onclick = async () => {
    closeConfirmModal();
    if (onConfirm) await onConfirm();
  };

  modal.classList.add('active');
}

function closeConfirmModal() {
  const modal = document.getElementById('global-confirm-modal');
  if (modal) modal.classList.remove('active');
}

// Toggle body class when modals are active to prevent background scroll
setInterval(() => {
  try {
    const anyActive = document.querySelectorAll('.modal-overlay.active').length > 0;
    if (anyActive) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
  } catch (e) { /* ignore */ }
}, 250);

// Core API Request Helper
async function adminApiRequest(endpoint, options = {}) {
  const url = `${ADMIN_CONFIG.API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem(ADMIN_CONFIG.TOKEN_KEY);

  const headers = options.headers || {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOptions = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, fetchOptions);

    if (response.status === 401) {
      localStorage.removeItem(ADMIN_CONFIG.TOKEN_KEY);
      localStorage.removeItem(ADMIN_CONFIG.USER_KEY);
      showToast('Session expired. Please log in again.', 'error');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1200);
      throw new Error('Unauthorized');
    }

    if (response.status === 403) {
      showToast('Admin access required.', 'error');
      throw new Error('Forbidden');
    }

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      const errorMessage = (data && data.detail) ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : response.statusText;
      throw new Error(errorMessage || `Request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}

/**
 * Reusable Product Image URL Resolver
 */
function getProductImage(product) {
  if (!product) {
    return "../assets/images/placeholder-product.webp";
  }

  const image =
    (typeof product === 'string' ? product : (
      product.thumbnail ||
      product.image ||
      (product.images && product.images.length > 0 ? product.images[0] : "") ||
      ""
    )) || "";

  if (!image) {
    return "../assets/images/placeholder-product.webp";
  }

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  if (image.startsWith("/uploads/")) {
    return "http://127.0.0.1:8000" + image;
  }

  if (image.startsWith("uploads/")) {
    return "http://127.0.0.1:8000/" + image;
  }

  if (image.startsWith("./assets/")) {
    return "../" + image.substring(2);
  }

  if (image.startsWith("assets/")) {
    return "../" + image;
  }

  return image;
}

/**
 * Image Error Fallback Handler to prevent blank boxes and infinite loops
 */
function handleImageError(imgEl) {
  if (!imgEl) return;
  if (imgEl.dataset.fallbackApplied) return;
  imgEl.dataset.fallbackApplied = "true";
  imgEl.src = "../assets/images/placeholder-product.webp";
  imgEl.onerror = null;
}

