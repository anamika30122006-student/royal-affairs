/* Per-customer browser storage isolation for Royal Affair. */
const CUSTOMER_DATA_KEYS = [
  "royal_affair_cart",
  "royal_affair_wishlist",
  "royal_affair_addresses",
  "royal_affair_orders",
  "royal_affair_compare",
  "royal_affair_recently_viewed",
  "royal_affair_promo",
  "royal_affair_promo_details",
  "royal_affair_last_order"
];

function customerStorageKey(email) {
  return `royal_affair_customer_data_${encodeURIComponent(String(email || "").trim().toLowerCase())}`;
}

function saveCurrentCustomerData(email) {
  if (!email) return;
  const snapshot = {};
  CUSTOMER_DATA_KEYS.forEach(key => {
    const value = localStorage.getItem(key);
    if (value !== null) snapshot[key] = value;
  });
  localStorage.setItem(customerStorageKey(email), JSON.stringify(snapshot));
}

function clearActiveCustomerData() {
  CUSTOMER_DATA_KEYS.forEach(key => localStorage.removeItem(key));
}

function switchCustomerSession(email, options = {}) {
  const targetEmail = String(email || "").trim().toLowerCase();
  if (!targetEmail) return;
  const ownerKey = "royal_affair_storage_owner";
  const previousOwner = localStorage.getItem(ownerKey);

  // Legacy data had no owner and included demo records, so never assign it to
  // the first real customer after this migration.
  if (previousOwner && previousOwner !== targetEmail) {
    saveCurrentCustomerData(previousOwner);
  }

  if (!previousOwner || previousOwner !== targetEmail || options.forceFresh) {
    clearActiveCustomerData();
    if (!options.forceFresh) {
      const saved = JSON.parse(localStorage.getItem(customerStorageKey(targetEmail)) || "null");
      if (saved) Object.entries(saved).forEach(([key, value]) => localStorage.setItem(key, value));
    }
  }

  localStorage.setItem(ownerKey, targetEmail);
}

function ensureCustomerStorageIsolation() {
  const auth = JSON.parse(localStorage.getItem("royal_affair_auth_state") || "null");
  if (auth?.loggedIn && auth.email) switchCustomerSession(auth.email);
}

window.switchCustomerSession = switchCustomerSession;
window.ensureCustomerStorageIsolation = ensureCustomerStorageIsolation;
