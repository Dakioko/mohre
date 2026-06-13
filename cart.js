// ─── CART STATE (persisted to localStorage) ───────────────────────────────
let cart = JSON.parse(localStorage.getItem('mohrehub_cart') || '[]');

function saveCart() {
  try { localStorage.setItem('mohrehub_cart', JSON.stringify(cart)); } catch (e) {}
}

/**
 * Remove cart items whose product no longer exists or has been marked sold.
 * Called after products are loaded. Shows a toast if anything was removed.
 */
function reconcileCart() {
  if (!products.length) return;
  const before = cart.length;
  cart = cart.filter(c => {
    const p = products.find(x => x.id === c.id);
    return p && !p.isSold;
  });
  if (cart.length !== before) {
    saveCart();
    updateCartBadge();
    renderCartBody();
    const removed = before - cart.length;
    showToast(`${removed} item${removed > 1 ? 's' : ''} removed — no longer available.`);
  }
}

// ─── WISHLIST DRAWER ──────────────────────────────────────────────────────
function updateWishlistBadge() {
  const el = document.getElementById("wishlistCount");
  if (!el) return;
  el.textContent = wishlist.length;
  el.classList.toggle("visible", wishlist.length > 0);
}

function renderWishlistBody() {
  const body = document.getElementById("wishlistBody");
  if (!body) return;

  if (wishlist.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
        </svg>
        <p>Your wishlist is empty.</p>
        <p style="font-size:0.75rem;">Tap the heart on any piece to save it here.</p>
        <button class="retry-btn" style="margin-top:0.75rem;"
          onclick="closeWishlist();scrollToShop()">Browse collection →</button>
      </div>`;
    return;
  }

  const wishlistProducts = wishlist.map(w => {
    const p = products.find(x => x.id === w.id);
    if (!p) return null;
    return { ...p, _wishlistPhoto: w.photo || p.photo, _wishlistColor: w.color };
  }).filter(Boolean);

  body.innerHTML = wishlistProducts.map(p => `
    <div class="cart-item">
      <img class="cart-item-img"
        src="${escapeHtml(p._wishlistPhoto || '')}"
        alt="${escapeHtml(p.name)}"
        onerror="this.style.background='var(--border)';this.src=''"
        style="background:var(--border)">
      <div class="cart-item-info">
        <p class="cart-item-name">${escapeHtml(p.name)}</p>
        ${p._wishlistColor ? `<p class="cart-item-meta">${escapeHtml(p._wishlistColor)}</p>` : ''}
        <p class="cart-item-price">${fmtPrice(p.price)}</p>
        <div style="display:flex;gap:0.5rem;margin-top:0.35rem;flex-wrap:wrap;">
          <button class="wishlist-item-view-btn" onclick="closeWishlist();openDetailPanel(${p.id})">
            View item →
          </button>
          ${!p.isSold ? `
          <button class="wishlist-move-to-cart-btn" onclick="wishlistMoveToCart(${p.id})">
            Add to cart
          </button>` : ''}
        </div>
      </div>
      <button class="cart-item-remove" onclick="toggleWishlist(${p.id})" aria-label="Remove ${escapeHtml(p.name)}">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `).join("");
}

/**
 * Add a wishlist item directly to the cart without opening the detail panel.
 * Uses the stored variant photo and colour if available.
 */
function wishlistMoveToCart(productId) {
  const w = wishlist.find(x => x.id === productId);
  const p = products.find(x => x.id === productId);
  if (!p || p.isSold) return;

  const sizes = p.sizes ? p.sizes.split(",").map(s => s.trim()).filter(Boolean) : [];

  if (sizes.length) {
    // Product has sizes — close wishlist, open detail panel so user can pick one
    closeWishlist();
    openDetailPanel(productId);
    showToast("Please choose a size to add to cart.");
    return;
  }

  // No sizes — add directly using _pushToCart so the variant photo
  // resolves correctly (same path as addToCart / detailSaveToCart).
  _pushToCart(p, null, w?.color || null, 1);
  showToast(`${p.name} added to cart.`);
}

function openWishlist() {
  renderWishlistBody();
  document.getElementById("wishlistDrawer")?.classList.add("open");
  document.getElementById("wishlistOverlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeWishlist() {
  document.getElementById("wishlistDrawer")?.classList.remove("open");
  document.getElementById("wishlistOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
}

// ─── WISHLIST STATE ────────────────────────────────────────────────────────
// Migrate legacy plain-ID arrays to object format {id, photo, color}
(function migrateWishlist() {
  if (wishlist.length && typeof wishlist[0] !== 'object') {
    wishlist = wishlist.map(id => ({ id, photo: null, color: null }));
    try { localStorage.setItem('wishlist', JSON.stringify(wishlist)); } catch (e) {}
  }
})();

function saveWishlist() {
  try { localStorage.setItem('wishlist', JSON.stringify(wishlist)); } catch (e) {}
}

function toggleWishlist(productId, variantPhoto, colorName) {
  const idx = wishlist.findIndex(w => w.id === productId);
  if (idx > -1) {
    wishlist.splice(idx, 1);
  } else {
    let photo = variantPhoto || null;
    if (!photo) {
      const p = products.find(x => x.id === productId);
      photo = p ? (p.photo || null) : null;
    }
    wishlist.push({ id: productId, photo, color: colorName || null });
  }
  saveWishlist();
  updateWishlistBadge();
  _updateWishlistStates();
  if (document.getElementById("wishlistDrawer")?.classList.contains("open")) {
    renderWishlistBody();
  }
}

function isInWishlist(id) {
  return wishlist.some(w => w.id === id);
}

// ─── BADGE ────────────────────────────────────────────────────────────────
function updateCartBadge() {
  const el = document.getElementById("cartCount");
  if (!el) return;
  const total = cart.reduce((s, c) => s + (c.qty || 1), 0);
  el.textContent = total;
  el.classList.toggle("visible", total > 0);
}

// ─── TOTALS ───────────────────────────────────────────────────────────────
function updateCartWithDetails() {
  const subtotal   = cart.reduce((s, c) => s + Number(c.price) * (c.qty || 1), 0);
  const deliveryFee = subtotal > 5000 ? 0 : 200;
  const total      = subtotal + deliveryFee;

  const subtotalEl = document.getElementById("cartSubtotal");
  const deliveryEl = document.getElementById("cartDelivery");
  const totalEl    = document.getElementById("cartTotal");

  if (subtotalEl) subtotalEl.textContent = fmtPrice(subtotal);
  if (deliveryEl) deliveryEl.textContent = deliveryFee === 0 ? "FREE" : fmtPrice(deliveryFee);
  if (totalEl)    totalEl.textContent    = fmtPrice(total);

  const progressDiv  = document.getElementById("freeDeliveryProgress");
  const progressMsg  = document.getElementById("freeDeliveryMsg");
  const progressFill = document.getElementById("progressFill");

  if (!progressDiv) return;

  if (subtotal > 0 && subtotal < 5000) {
    const remaining = 5000 - subtotal;
    if (progressMsg)  progressMsg.innerHTML = `Add ${fmtPrice(remaining)} more for FREE delivery ✨`;
    if (progressFill) progressFill.style.width = `${(subtotal / 5000) * 100}%`;
    progressDiv.style.display = "block";
  } else if (subtotal >= 5000) {
    if (progressMsg)  progressMsg.innerHTML = "🎉 You qualify for FREE delivery!";
    if (progressFill) progressFill.style.width = "100%";
    progressDiv.style.display = "block";
  } else {
    progressDiv.style.display = "none";
  }
}

// ─── ADD / REMOVE / CHANGE QTY ────────────────────────────────────────────

/**
 * Resolve the correct photo for a cart entry, preferring the variant photo
 * when a colour is selected.
 * @param {object} p - product
 * @param {string|null} color
 * @returns {string}
 */
function _resolveCartPhoto(p, color) {
  if (!color) return p.photo;
  try {
    const variants = p.variants ? JSON.parse(p.variants) : [];
    const match    = variants.find(v => v.name === color);
    if (match && match.photo) return match.photo;
  } catch (e) {}
  return p.photo;
}

/**
 * Add qty copies of a product/size/colour to the cart array and persist.
 * Does NOT open the cart drawer — callers decide that themselves.
 * @param {object} p - full product object
 * @param {string|null} size
 * @param {string|null} color
 * @param {number} qty
 */
function _pushToCart(p, size, color, qty = 1) {
  const existing = cart.find(c =>
    c.id    === p.id &&
    c.size  === size &&
    c.color === color
  );
  if (existing) {
    existing.qty = (existing.qty || 1) + qty;
  } else {
    cart.push({
      id:    p.id,
      name:  p.name,
      price: p.price,
      size:  size  || null,
      color: color || null,
      photo: _resolveCartPhoto(p, color),
      qty,
    });
  }
  saveCart();
  updateCartBadge();
  renderCartBody();
}

function addToCart(productId, size, color) {
  const p = products.find(x => x.id === productId);
  if (!p) return;

  const card    = document.querySelector(`.product-card[data-id="${productId}"]`);
  const cartBtn = card?.querySelector('.card-cart-btn');
  if (cartBtn) {
    cartBtn.disabled = true;
    cartBtn.classList.add('btn-loading');
    setTimeout(() => {
      cartBtn.disabled = false;
      cartBtn.classList.remove('btn-loading');
    }, 600);
  }

  _pushToCart(p, size, color, 1);

  const navCartBtn = document.querySelector('.cart-btn');
  if (navCartBtn) {
    navCartBtn.classList.add('cart-bump');
    setTimeout(() => navCartBtn.classList.remove('cart-bump'), 300);
  }

  const itemCount = cart.reduce((s, c) => s + (c.qty || 1), 0);
  announce(`${p.name} added to cart. ${itemCount} item${itemCount > 1 ? 's' : ''} in cart.`);
  showToast(`Added "${p.name}" to cart`);
  vibrateOnAction();
}

function removeFromCart(idx) {
  // Resolve to a stable object reference before mutating so that rapid
  // re-renders between click and execution can't shift the wrong item out.
  const item = cart[idx];
  if (!item) return;
  cart = cart.filter(c => c !== item);
  saveCart();
  updateCartBadge();
  renderCartBody();
}

/**
 * Change quantity of a cart item by delta.
 * At qty 1, decreasing removes the item after a brief confirmation flash
 * on the button rather than silently clamping — consistent with standard
 * cart behaviour.
 */
function changeCartQty(idx, delta) {
  const item = cart[idx];
  if (!item) return;

  if (delta < 0 && (item.qty || 1) <= 1) {
    // Already at minimum — remove the item by object reference
    cart = cart.filter(c => c !== item);
    saveCart();
    updateCartBadge();
    renderCartBody();
    return;
  }

  item.qty = (item.qty || 1) + delta;
  saveCart();
  updateCartBadge();
  renderCartBody();
}

// ─── STABLE CART KEY ─────────────────────────────────────────────────────
/**
 * Build a stable string key for a cart item based on its product ID,
 * size, and colour — the three fields that make an entry unique.
 * Used to identify items in button handlers so render-time index shifts
 * don't cause the wrong item to be mutated.
 * @param {object} item
 * @returns {string}
 */
function _cartKey(item) {
  return `${item.id}|${item.size || ''}|${item.color || ''}`;
}

function removeFromCartByKey(key) {
  cart = cart.filter(c => _cartKey(c) !== key);
  saveCart();
  updateCartBadge();
  renderCartBody();
}

function changeCartQtyByKey(key, delta) {
  const item = cart.find(c => _cartKey(c) === key);
  if (!item) return;
  if (delta < 0 && (item.qty || 1) <= 1) {
    cart = cart.filter(c => c !== item);
  } else {
    item.qty = (item.qty || 1) + delta;
  }
  saveCart();
  updateCartBadge();
  renderCartBody();
}

// ─── RENDER CART BODY ─────────────────────────────────────────────────────
function renderCartBody() {
  const body   = document.getElementById("cartBody");
  const footer = document.getElementById("cartFooter");
  if (!body) return;

  if (cart.length === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 7H4l1-7z"/>
        </svg>
        <p>Your selection is empty.</p>
        <p style="font-size:0.75rem;">Tap <strong>Order</strong> on any piece to add it here.</p>
        <button class="retry-btn" style="margin-top:0.75rem;"
          onclick="closeCart();scrollToShop()">Browse collection →</button>
      </div>`;
    if (footer) footer.style.display = "none";
    return;
  }

  if (footer) footer.style.display = "flex";

  body.innerHTML = cart.map((item, i) => {
    // Build a stable key from the item's identifying fields so button
    // clicks remain correct even if the array shifts between renders.
    const key = _cartKey(item);
    return `
    <div class="cart-item" data-cart-key="${escapeHtml(key)}">
      <img class="cart-item-img"
        src="${escapeHtml(item.photo || '')}"
        alt="${escapeHtml(item.name)}"
        onerror="this.style.background='var(--border)';this.src=''"
        style="background:var(--border)">
      <div class="cart-item-info">
        <p class="cart-item-name">${escapeHtml(item.name)}</p>
        <p class="cart-item-meta">
          ${[item.size, item.color].filter(Boolean).map(escapeHtml).join(' · ') || 'No size / colour selected'}
        </p>
        <p class="cart-item-price">${fmtPrice(item.price)}</p>
        <div class="cart-qty-row">
          <button class="cart-qty-btn${(item.qty || 1) <= 1 ? ' cart-qty-btn--remove' : ''}"
            onclick="changeCartQtyByKey('${escapeHtml(key)}',-1)"
            aria-label="${(item.qty || 1) <= 1 ? 'Remove item' : 'Decrease quantity'}">
            ${(item.qty || 1) <= 1 ? '✕' : '−'}
          </button>
          <span class="cart-qty-val">${item.qty || 1}</span>
          <button class="cart-qty-btn" onclick="changeCartQtyByKey('${escapeHtml(key)}',1)" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCartByKey('${escapeHtml(key)}')" aria-label="Remove ${escapeHtml(item.name)}">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>`;
  }).join("");

  updateCartWithDetails();
}

// ─── OPEN / CLOSE CART ────────────────────────────────────────────────────
function openCart() {
  renderCartBody();
  document.getElementById("cartDrawer")?.classList.add("open");
  document.getElementById("cartOverlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  document.getElementById("cartDrawer")?.classList.remove("open");
  document.getElementById("cartOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
}

// ─── CHECKOUT ─────────────────────────────────────────────────────────────
let pendingOrderData = null;

function checkoutCart() {
  if (cart.length === 0) return;

  const subtotal    = cart.reduce((s, c) => s + Number(c.price) * (c.qty || 1), 0);
  const deliveryFee = subtotal > 5000 ? 0 : 200;
  const total       = subtotal + deliveryFee;

  const orderItems = cart.map(c => ({
    name:  c.name,
    price: c.price,
    qty:   c.qty || 1,
    size:  c.size,
    color: c.color
  }));

  pendingOrderData = { orderItems, subtotal, deliveryFee, total };
  showOrderSummaryModal();
}