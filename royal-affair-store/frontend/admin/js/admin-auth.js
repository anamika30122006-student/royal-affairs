/**
 * Royal Affair Admin Authentication Guard & Layout Utilities
 */

async function requireAdminAuth() {
  const token = localStorage.getItem(ADMIN_CONFIG.TOKEN_KEY);

  if (!token) {
    window.location.href = 'login.html';
    return null;
  }

  try {
    // Verify token with backend /auth/me
    const user = await adminApiRequest('/auth/me');

    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      localStorage.removeItem(ADMIN_CONFIG.TOKEN_KEY);
      localStorage.removeItem(ADMIN_CONFIG.USER_KEY);
      showToast('Admin privilege required.', 'error');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
      return null;
    }

    localStorage.setItem(ADMIN_CONFIG.USER_KEY, JSON.stringify(user));
    setupAdminHeader(user);
    setupSidebarToggle();
    return user;
  } catch (err) {
    console.error('Auth verification error:', err);
    if (err.message === 'Unauthorized' || err.message === 'Forbidden') {
      localStorage.removeItem(ADMIN_CONFIG.TOKEN_KEY);
      localStorage.removeItem(ADMIN_CONFIG.USER_KEY);
      showToast('Session expired or unauthorized. Redirecting to login...', 'error');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1200);
      return null;
    }
    
    // For network errors or server glitches, use cached user info if available so page can render retry UI
    const cachedUser = localStorage.getItem(ADMIN_CONFIG.USER_KEY);
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        setupAdminHeader(parsed);
        setupSidebarToggle();
        return parsed;
      } catch (e) { /* ignore */ }
    }
    
    setupSidebarToggle();
    return { role: 'admin', full_name: 'Admin' };
  }
}

function setupAdminHeader(user) {
  const nameEl = document.getElementById('topbar-admin-name');
  const roleEl = document.getElementById('topbar-admin-role');
  const avatarEl = document.getElementById('topbar-admin-avatar');

  if (nameEl && user.full_name) nameEl.innerText = user.full_name;
  if (roleEl && user.role) roleEl.innerText = user.role.replace('_', ' ');
  if (avatarEl && user.full_name) {
    const initials = user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    avatarEl.innerText = initials || 'RA';
  }
}

function setupSidebarToggle() {
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');
  let overlay = document.querySelector('.sidebar-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
  }

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      if (window.innerWidth <= 1024) {
        // Mobile drawer mode
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active', sidebar.classList.contains('open'));
      } else {
        // Desktop collapse mode
        sidebar.classList.toggle('collapsed');
        if (mainContent) mainContent.classList.toggle('expanded');
      }
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}

async function handleLogout() {
  showConfirmModal('Logout Confirmation', 'Are you sure you want to log out of the admin panel?', async () => {
    try {
      await adminApiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem(ADMIN_CONFIG.TOKEN_KEY);
      localStorage.removeItem(ADMIN_CONFIG.USER_KEY);
      showToast('Logged out successfully.', 'info');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 500);
    }
  });
}
