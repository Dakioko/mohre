// ─── HELPER FUNCTIONS ─────────────────────────────────────────────────────

/**
 * Shared size-selection validator used by both the detail panel and the
 * size modal. Returns true if the product requires no size, or a size
 * has already been selected. Otherwise shows an inline error, shakes the
 * chips container, announces the issue, and scrolls the error into view.
 *
 * @param {object|undefined} product - the product being validated
 * @param {string|null} selectedSize - currently selected size, if any
 * @param {string} errElId - id of the error message element to show
 * @param {string} chipsElId - id of the size-chips container to shake
 * @returns {boolean} true if valid (or no size required), false otherwise
 */
function _validateSizeSelection(product, selectedSize, errElId, chipsElId) {
  if (!product) return true;
  const sizes = product.sizes ? product.sizes.split(",").map(s => s.trim()).filter(Boolean) : [];
  if (!sizes.length) return true; // no sizes defined — nothing to validate
  if (selectedSize) return true;

  const errEl = document.getElementById(errElId);
  if (errEl) {
    errEl.style.display = "block";
    errEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  announce("Please select a size before continuing.");

  const chipsEl = document.getElementById(chipsElId);
  if (chipsEl) {
    chipsEl.classList.add("shake");
    setTimeout(() => chipsEl.classList.remove("shake"), 500);
  }

  return false;
}

/**
 * Format a number as a KSh price string with two decimal places.
 * e.g. 2500 → "KSh 2,500.00"
 * @param {number|string} amount
 * @returns {string}
 */
function fmtPrice(amount) {
  return `KSh ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


/**
 * Escape HTML special characters to prevent XSS when injecting into innerHTML.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    if (m === "'") return '&#39;';
    return m;
  });
}

/**
 * Safely parse a JSON string. Returns fallback on any error.
 * Centralises the try/catch pattern used throughout the codebase.
 * @param {string|null|undefined} str
 * @param {*} fallback - value returned when str is falsy or invalid JSON
 * @returns {*}
 */
function _parseJSON(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch (e) { return fallback; }
}

/**
 * Announce a message to screen readers via the ARIA live region.
 * @param {string} message
 */
function announce(message) {
  const announcer = document.getElementById("announcer");
  if (announcer) announcer.textContent = message;
}

/**
 * Trigger a short haptic vibration on mobile devices.
 */
function vibrateOnAction() {
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(20);
  }
}

// ─── TOAST ────────────────────────────────────────────────────────────────
let toastTimeout;

/**
 * Show a brief toast notification.
 * @param {string} msg
 */
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove("show"), 3000);
}

// ─── DARK MODE ────────────────────────────────────────────────────────────

/**
 * Toggle dark mode class and persist preference to localStorage.
 */
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  try { localStorage.setItem('darkMode', JSON.stringify(isDark)); } catch (e) {}
}

/**
 * Read saved dark mode preference and apply on page load.
 */
function initDarkMode() {
  try {
    const saved = localStorage.getItem('darkMode');
    if (saved && JSON.parse(saved)) {
      document.body.classList.add("dark-mode");
    }
  } catch (e) {}
}

// ─── SWIPE TO CLOSE ───────────────────────────────────────────────────────

/**
 * Attach a right-swipe gesture listener to close a panel.
 * @param {HTMLElement} el - the panel element
 * @param {Function} closeFn - function to call on swipe-right
 */
function attachSwipeClose(el, closeFn) {
  let startX = 0;
  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
  }, { passive: true });
  el.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (dx > 60) closeFn();
  }, { passive: true });
}

// ─── BACK TO TOP ──────────────────────────────────────────────────────────
function initBackToTop() {
  const backTopBtn = document.getElementById("backToTop");
  if (!backTopBtn) return;
  window.addEventListener("scroll", () => {
    backTopBtn.classList.toggle("visible", window.pageYOffset > 400);
  });
}

// ─── SCROLL TO SHOP ───────────────────────────────────────────────────────
function scrollToShop() {
  const el = document.getElementById("mainContent");
  const header = document.getElementById("mainContent");
  const stickyHeader = document.querySelector(".global-sticky-header");
  const mobileSearchBar = document.getElementById("mobileSearchBar");
  if (!el) return;
  const stickyH = stickyHeader ? stickyHeader.offsetHeight : 60;
  const searchBarH = (mobileSearchBar && mobileSearchBar.offsetParent !== null)
    ? mobileSearchBar.offsetHeight : 0;
  const offset = el.getBoundingClientRect().top + window.pageYOffset
    - stickyH - searchBarH - 10;
  window.scrollTo({ top: offset, behavior: "smooth" });
}

// ─── MOBILE SEARCH ────────────────────────────────────────────────────────
function openMobileSearch() {
  const overlay = document.getElementById("mobileSearchOverlay");
  const actions = document.querySelector(".nav-actions");
  if (!overlay) return;
  overlay.classList.add("open");
  if (actions) actions.style.visibility = "hidden";
  setTimeout(() => document.getElementById("mobileSearch")?.focus(), 50);
}

function closeMobileSearch() {
  const overlay = document.getElementById("mobileSearchOverlay");
  const actions = document.querySelector(".nav-actions");
  if (!overlay) return;
  overlay.classList.remove("open");
  if (actions) actions.style.visibility = "";
  const input = document.getElementById("mobileSearch");
  if (input && !input.value) clearSearch();
}

function toggleMobileSearch(open) {
  if (open) openMobileSearch(); else closeMobileSearch();
}

// ─── DESKTOP SEARCH EXPAND / COLLAPSE ────────────────────────────────────
function expandSearch() {
  const wrapper = document.getElementById("desktopSearchWrapper");
  const input = document.getElementById("desktopSearch");
  if (wrapper) wrapper.classList.add("active");
  if (input) {
    input.style.width = "220px";
    input.style.opacity = "1";
    input.style.pointerEvents = "auto";
    input.focus();
  }
}

function collapseSearch() {
  setTimeout(() => {
    const input = document.getElementById("desktopSearch");
    if (input && input.value) return;
    const wrapper = document.getElementById("desktopSearchWrapper");
    if (wrapper) wrapper.classList.remove("active");
  }, 150);
}

// ─── WHATSAPP HELPER ──────────────────────────────────────────────────────
function openWhatsApp() {
  const msg = encodeURIComponent("Hi! I'm browsing Mohre Hub and I'd like to ask about your latest pieces.");
  window.open(`https://wa.me/${CONFIG.WA_NUMBER}?text=${msg}`, "_blank");
}

// ─── MOBILE TOUCH FEEDBACK ────────────────────────────────────────────────
function initTouchFeedback() {
  const selector = '.cart-btn, .filter-btn, .card-order-btn, .card-cart-btn, .price-filter-trigger';
  const setScale = (e, val) => {
    const el = e.target.closest(selector);
    if (el) el.style.transform = val;
  };
  document.addEventListener('touchstart', e => setScale(e, 'scale(0.98)'), { passive: true });
  document.addEventListener('touchend',   e => setScale(e, ''), { passive: true });
  document.addEventListener('touchcancel', e => setScale(e, ''), { passive: true });
}