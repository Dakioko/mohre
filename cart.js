// ─── CART STATE (persisted to localStorage) ───────────────────────────────
let cart = JSON.parse(localStorage.getItem('mohrehub_cart') || '[]');

function saveCart() {
  try { localStorage.setItem('mohrehub_cart', JSON.stringify(cart)); } catch (e) {}
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
      </div>`;
    return;
  }

  const wishlistProducts = wishlist.map(id => products.find(p => p.id === id)).filter(Boolean);
  body.innerHTML = wishlistProducts.map(p => `
    <div class="cart-item">
      <img class="cart-item-img"
        src="${escapeHtml(p.photo || '')}"
        alt="${escapeHtml(p.name)}"
        onerror="this.style.background='var(--border)';this.src=''"
        style="background:var(--border)">
      <div class="cart-item-info">
        <p class="cart-item-name">${escapeHtml(p.name)}</p>
        <p class="cart-item-price">KSh ${Number(p.price).toLocaleString()}</p>
        <button class="wishlist-item-view-btn" onclick="closeWishlist();openDetailPanel(${p.id})">
          View item →
        </button>
      </div>
      <button class="cart-item-remove" onclick="toggleWishlist(${p.id})" aria-label="Remove ${escapeHtml(p.name)}">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `).join("");
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
function saveWishlist() {
  try { localStorage.setItem('wishlist', JSON.stringify(wishlist)); } catch (e) {}
}

function toggleWishlist(productId) {
  const idx = wishlist.indexOf(productId);
  if (idx > -1) {
    wishlist.splice(idx, 1);
    showToast("Removed from wishlist");
  } else {
    wishlist.push(productId);
    showToast("Saved to wishlist ❤️");
  }
  saveWishlist();
  updateWishlistBadge();
  renderProducts();
  // Re-render wishlist drawer if open
  if (document.getElementById("wishlistDrawer")?.classList.contains("open")) {
    renderWishlistBody();
  }
}

function isInWishlist(id) {
  return wishlist.includes(id);
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
  const subtotal = cart.reduce((s, c) => s + Number(c.price) * (c.qty || 1), 0);
  const deliveryFee = subtotal > 5000 ? 0 : 350;
  const total = subtotal + deliveryFee;

  const subtotalEl = document.getElementById("cartSubtotal");
  const deliveryEl = document.getElementById("cartDelivery");
  const totalEl = document.getElementById("cartTotal");

  if (subtotalEl) subtotalEl.textContent = `KSh ${subtotal.toLocaleString()}`;
  if (deliveryEl) deliveryEl.textContent = deliveryFee === 0 ? "FREE" : `KSh ${deliveryFee.toLocaleString()}`;
  if (totalEl) totalEl.textContent = `KSh ${total.toLocaleString()}`;

  // Free delivery progress bar
  const progressDiv = document.getElementById("freeDeliveryProgress");
  const progressMsg = document.getElementById("freeDeliveryMsg");
  const progressFill = document.getElementById("progressFill");

  if (!progressDiv) return;

  if (subtotal > 0 && subtotal < 5000) {
    const remaining = 5000 - subtotal;
    if (progressMsg) progressMsg.innerHTML = `Add KSh ${remaining.toLocaleString()} more for FREE delivery ✨`;
    if (progressFill) progressFill.style.width = `${(subtotal / 5000) * 100}%`;
    progressDiv.style.display = "block";
  } else if (subtotal >= 5000) {
    if (progressMsg) progressMsg.innerHTML = "🎉 You qualify for FREE delivery!";
    if (progressFill) progressFill.style.width = "100%";
    progressDiv.style.display = "block";
  } else {
    progressDiv.style.display = "none";
  }
}

// ─── ADD / REMOVE / CHANGE QTY ────────────────────────────────────────────
function addToCart(productId, size, color) {
  const p = products.find(x => x.id === productId);
  if (!p) return;

  const existing = cart.find(c => c.id === productId && c.size === size && c.color === color);
  if (existing) {
    existing.qty = (existing.qty || 1) + 1;
  } else {
    cart.push({
      id: productId,
      name: p.name,
      price: p.price,
      size: size || null,
      color: color || null,
      photo: p.photo,
      qty: 1
    });
  }
  saveCart();
  updateCartBadge();
  renderCartBody();

  // Bump animation on cart button
  const cartBtn = document.querySelector('.cart-btn');
  if (cartBtn) {
    cartBtn.classList.add('cart-bump');
    setTimeout(() => cartBtn.classList.remove('cart-bump'), 300);
  }

  const itemCount = cart.reduce((s, c) => s + (c.qty || 1), 0);
  announce(`${p.name} added to cart. ${itemCount} item${itemCount > 1 ? 's' : ''} in cart.`);
  vibrateOnAction();
  showToast(`✨ Added — ${itemCount} item${itemCount > 1 ? 's' : ''} in selection`);
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  saveCart();
  updateCartBadge();
  renderCartBody();
}

function changeCartQty(idx, delta) {
  const item = cart[idx];
  if (!item) return;
  item.qty = Math.max(1, (item.qty || 1) + delta);
  saveCart();
  updateCartBadge();
  renderCartBody();
}

// ─── RENDER CART BODY ─────────────────────────────────────────────────────
function renderCartBody() {
  const body = document.getElementById("cartBody");
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
      </div>`;
    if (footer) footer.style.display = "none";
    return;
  }

  if (footer) footer.style.display = "flex";

  body.innerHTML = cart.map((item, i) => `
    <div class="cart-item">
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
        <p class="cart-item-price">KSh ${Number(item.price).toLocaleString()}</p>
        <div class="cart-qty-row">
          <button class="cart-qty-btn" onclick="changeCartQty(${i},-1)" aria-label="Decrease quantity">−</button>
          <span class="cart-qty-val">${item.qty || 1}</span>
          <button class="cart-qty-btn" onclick="changeCartQty(${i},1)" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart(${i})" aria-label="Remove ${escapeHtml(item.name)}">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  `).join("");

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

  const subtotal = cart.reduce((s, c) => s + Number(c.price) * (c.qty || 1), 0);
  const deliveryFee = subtotal > 5000 ? 0 : 350;
  const total = subtotal + deliveryFee;

  const orderItems = cart.map(c => ({
    name: c.name,
    price: c.price,
    qty: c.qty || 1,
    size: c.size,
    color: c.color
  }));

  pendingOrderData = { orderItems, subtotal, deliveryFee, total };
  showOrderSummaryModal();
}