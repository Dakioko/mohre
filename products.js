// ─── FILTER LOGIC ─────────────────────────────────────────────────────────

/**
 * Build the ordered list of images for a product card: main photo,
 * extra photos, then any variant photos not already included.
 * Used by both the arrow navigation and swatch reset logic.
 * @param {object} p - product
 * @returns {string[]}
 */
function _cardImageList(p) {
  const images = [];
  const variants = _parseJSON(p.variants, []);
  const extras   = _parseJSON(p.photos,   []);

  // Use primary photo if set; otherwise fall back to the first variant photo
  // so products with colour variants don't need a redundant duplicate image.
  if (p.photo) {
    images.push(p.photo);
  } else if (variants.length && variants[0].photo) {
    images.push(variants[0].photo);
  }

  extras.forEach(src => { if (src && !images.includes(src)) images.push(src); });
  variants.forEach(v => { if (v.photo && !images.includes(v.photo)) images.push(v.photo); });

  return images;
}

/**
 * Returns true if a product was created within NEW_ARRIVAL_DAYS days.
 * Products without a createdAt value (pre-existing stock) return false.
 * @param {object} product
 * @returns {boolean}
 */
function isNewArrival(product) {
  if (!product.createdAt) return false;
  const age = Date.now() - new Date(product.createdAt).getTime();
  return age < NEW_ARRIVAL_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Return the filtered + sorted product list based on current state.
 */
function getFiltered() {
  let base =
    currentFilter === "All"  ? products.filter(p => !p.isSold) :
    currentFilter === "New"  ? products.filter(p => isNewArrival(p) && !p.isSold) :
    products.filter(p => p.category === currentFilter && !p.isSold);

  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    base = base.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.desc && p.desc.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }

  // ── Sort ──────────────────────────────────────────────────
  if (currentSort === "price-asc") {
    base = [...base].sort((a, b) => Number(a.price) - Number(b.price));
  } else if (currentSort === "price-desc") {
    base = [...base].sort((a, b) => Number(b.price) - Number(a.price));
  } else if (currentSort === "newest") {
    base = [...base].sort((a, b) => {
      // Products without createdAt sort to the end
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }
  // "default" — preserve backend order, no sort needed

  return base;
}

// ─── SKELETONS ────────────────────────────────────────────────────────────
function showSkeletons(count = 6) {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  grid.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-line medium"></div>
      <div class="skeleton-line short"></div>
    </div>`).join("");
}

// ─── RENDER PRODUCTS ──────────────────────────────────────────────────────
function renderProducts(forceRebuild = false) {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  const filtered = getFiltered();
  const searchVal =
    document.getElementById("desktopSearch")?.value.trim() ||
    document.getElementById("mobileSearch")?.value.trim() || "";

  const titleEl = document.getElementById("sectionTitle");
  if (titleEl) {
    titleEl.innerHTML = currentSearch
      ? `Results for "${escapeHtml(searchVal)}"`
      : currentFilter !== "All" ? currentFilter : "All Collection";
  }

  const countEl = document.getElementById("sectionCount");
  if (countEl) countEl.textContent = `${filtered.length} piece${filtered.length !== 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32">
            <circle cx="10" cy="10" r="7" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"/>
            <line x1="15" y1="15" x2="21" y2="21" stroke-linecap="round" stroke-width="1.5"/>
            <line x1="7.5" y1="7.5" x2="12.5" y2="12.5" stroke-linecap="round" stroke-width="1.5"/>
            <line x1="12.5" y1="7.5" x2="7.5" y2="12.5" stroke-linecap="round" stroke-width="1.5"/>
          </svg>
        </div>
        <p class="empty-state-title">Nothing here yet</p>
        <p class="empty-state-sub">Try a different category or adjust your filters</p>
        <button class="retry-btn" onclick="resetViewToShop()">Browse all pieces</button>
      </div>`;
    return;
  }

  const placeholder = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'%3E%3Crect width='300' height='400' fill='%23eae8e4'/%3E%3Ctext x='150' y='200' text-anchor='middle' fill='%23b0a898' font-size='13'%3ENo image%3C/text%3E%3C/svg%3E`;

  // Check if the filtered set has changed — if same IDs in same order, skip full rebuild
  const currentIds  = Array.from(grid.querySelectorAll('.product-card')).map(c => parseInt(c.dataset.id));
  const filteredIds = filtered.map(p => p.id);
  const sameSet     = !forceRebuild && currentIds.length === filteredIds.length && filteredIds.every((id, i) => id === currentIds[i]);

  if (sameSet) {
    _updateWishlistStates();
    const isAdmin = document.body.classList.contains("is-admin");
    if (isAdmin) addAdminControls();
    return;
  }

  grid.innerHTML = filtered.map((p, i) => {
    let variants = _parseJSON(p.variants, []);
    const hasVariants = variants.length > 0;
    const inWishlist  = isInWishlist(p.id);
    const showNewBadge = isNewArrival(p);
    const images = _cardImageList(p);
    const hasMultipleImages = images.length > 1;

    const navArrowsHTML = hasMultipleImages ? `
      <button class="card-nav-arrow card-nav-prev" aria-label="Previous photo"
        onclick="event.stopPropagation();cycleCardImage(${p.id},-1)">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <button class="card-nav-arrow card-nav-next" aria-label="Next photo"
        onclick="event.stopPropagation();cycleCardImage(${p.id},1)">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </button>
` : '';

    return `
      <article class="product-card${p.isSold ? ' sold-out' : ''}${adminSelectedIds.has(p.id) ? ' selected-for-bulk' : ''}"
        data-id="${p.id}"
        style="animation-delay:${Math.min(i * 0.05, 0.4)}s"
        onclick="_handleCardActivate(${p.id})"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();_handleCardActivate(${p.id});}"
        role="button"
        tabindex="0"
        ${adminSelectMode ? `aria-pressed="${adminSelectedIds.has(p.id) ? 'true' : 'false'}"` : ''}
        aria-label="${escapeHtml(p.name)}, ${fmtPrice(p.price)}${p.isSold ? ', sold out' : ''}">
        <div class="card-img-wrap" id="imgWrap${p.id}" data-img-idx="0">
          <div class="card-img-placeholder">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span>Mohre Hub</span>
          </div>
          ${p.photo ? `<img class="card-img" id="img${p.id}"
            src="${escapeHtml(p.photo)}"
            alt="${escapeHtml(p.name)}"
            loading="lazy"
            onload="this.closest('.card-img-wrap').classList.add('img-loaded')"
            onerror="this.src='${placeholder}'">` : ''}
          ${p.isSold
            ? `<span class="card-badge sold">Sold</span>`
            : showNewBadge
              ? `<span class="card-badge new-arrival">New</span>`
              : ''}
          <button class="card-wishlist-btn${inWishlist ? ' active' : ''}"
            onclick="event.stopPropagation();toggleWishlist(${p.id})"
            aria-label="${inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">
            <svg fill="${inWishlist ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </button>
          ${navArrowsHTML}
          <div class="admin-select-checkbox" aria-hidden="true">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
        </div>
        <div class="card-meta-minimal">
          <h3 class="card-title-minimal">${escapeHtml(p.name)}</h3>
          <p class="card-price-minimal">${fmtPrice(p.price)}</p>
        </div>
      </article>`;
  }).join("");

  const isAdmin = document.body.classList.contains("is-admin");
  if (isAdmin) addAdminControls();

  // Attach swatch click listeners via delegation — avoids inline onclick photo URL injection
  grid.addEventListener('click', _handleSwatchClick, { once: false });
  grid.addEventListener('keydown', _handleSwatchKeydown, { once: false });
}

/**
 * Delegated handler for card swatch clicks.
 * Reads product/variant data from data-* attributes instead of inline JS.
 */
function _handleSwatchClick(e) {
  const swatch = e.target.closest('.card-swatch');
  if (!swatch) return;
  e.stopPropagation();
  _activateSwatch(e, swatch);
}

/**
 * Delegated handler for keyboard activation (Enter/Space) of card swatches.
 */
function _handleSwatchKeydown(e) {
  const swatch = e.target.closest('.card-swatch');
  if (!swatch) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  e.stopPropagation();
  _activateSwatch(e, swatch);
}

/**
 * Shared activation logic for mouse and keyboard swatch interaction.
 */
function _activateSwatch(e, swatch) {
  const productId  = parseInt(swatch.dataset.productId, 10);
  const variantIdx = parseInt(swatch.dataset.variantIdx, 10);
  const photo      = swatch.dataset.photo || '';
  const color      = swatch.dataset.color || '';
  swapVariant(e, productId, variantIdx, photo, color);
}

/**
 * Update only the wishlist button states on existing cards
 * without rebuilding the grid or restarting slideshows.
 */
function _updateWishlistStates() {
  document.querySelectorAll('.product-card').forEach(card => {
    const id  = parseInt(card.dataset.id);
    const btn = card.querySelector('.card-wishlist-btn');
    const svg = btn?.querySelector('svg');
    if (!btn || !svg) return;
    const active = isInWishlist(id);
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-label', active ? 'Remove from wishlist' : 'Add to wishlist');
    svg.setAttribute('fill', active ? 'currentColor' : 'none');
  });
}

// ─── ADMIN OVERLAY CONTROLS ON CARDS ─────────────────────────────────────
function addAdminControls() {
  document.querySelectorAll(".product-card").forEach(card => {
    const id = parseInt(card.dataset.id);
    if (!id || card.querySelector('.admin-card-btns')) return;
    const btns = document.createElement('div');
    btns.className = 'admin-card-btns';
    btns.innerHTML = `
      <button onclick="event.stopPropagation();toggleSold(${id})">Sold</button>
      <button onclick="event.stopPropagation();openEditPanel(${id})">Edit</button>
      <button class="btn-danger" onclick="event.stopPropagation();deleteItem(${id})">✕</button>`;
    card.appendChild(btns);
  });
}

// ─── COLOUR VARIANT SWAP ON CARD ─────────────────────────────────────────
function swapVariant(e, productId, variantIdx, photoUrl, colorName) {
  e.stopPropagation();
  const card = document.querySelector(`.product-card[data-id="${productId}"]`);
  if (!card) return;

  card.querySelectorAll('.card-swatch').forEach((s, i) => {
    const active = i === variantIdx;
    s.classList.toggle('active', active);
    s.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  if (photoUrl) {
    const imgWrap = card.querySelector('.card-img-wrap');
    const img     = card.querySelector('.card-img');
    if (img) {
      imgWrap?.classList.remove('img-loaded');
      img.src    = photoUrl;
      img.onload = () => imgWrap?.classList.add('img-loaded');
    }
    // Reset arrow navigation to point at this variant's photo as the
    // current position, so prev/next continues from here.
    if (imgWrap) {
      const p = products.find(x => x.id === productId);
      if (p) {
        const images = _cardImageList(p);
        const idx = images.indexOf(photoUrl);
        imgWrap.dataset.imgIdx = idx > -1 ? idx : 0;

      }
    }
  }
}

// ─── CARD IMAGE NAVIGATION (manual arrows) ────────────────────────────────
/**
 * Step the card's main image forward/back through its image list.
 * @param {number} productId
 * @param {number} dir - +1 for next, -1 for previous
 */
function cycleCardImage(productId, dir) {
  const p = products.find(x => x.id === productId);
  if (!p) return;

  const images = _cardImageList(p);
  if (images.length < 2) return;

  const card   = document.querySelector(`.product-card[data-id="${productId}"]`);
  const imgWrap = card?.querySelector('.card-img-wrap');
  const img     = document.getElementById(`img${productId}`);
  if (!imgWrap || !img) return;

  let idx = parseInt(imgWrap.dataset.imgIdx || '0', 10);
  idx = (idx + dir + images.length) % images.length;
  imgWrap.dataset.imgIdx = idx;

  imgWrap.classList.remove('img-loaded');
  img.style.transition = 'opacity 0.25s ease';
  img.style.opacity = '0';
  setTimeout(() => {
    img.src = images[idx];
    img.onload = () => { img.style.opacity = '1'; imgWrap.classList.add('img-loaded'); };
  }, 150);

  // Keep swatch state in sync if this image belongs to a variant
  const variants = _parseJSON(p.variants, []);
  if (variants.length) {
    const vi = variants.findIndex(v => v.photo === images[idx]);
    if (vi > -1) {
      card.querySelectorAll('.card-swatch').forEach((s, i) => {
        const active = i === vi;
        s.classList.toggle('active', active);
        s.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }
  }


}

// ─── LOAD PRODUCTS ────────────────────────────────────────────────────────
async function loadProducts() {
  showSkeletons(6);
  try {
    products = await apiGet();
    setTimeout(reconcileCart, 0); // defer so UI renders before toast fires
    renderProducts();
    if (typeof initHeroCarousel === 'function') initHeroCarousel(products);
    checkProductParam();
    applySavedFilters();
  } catch (e) {
    console.error('Failed to load products:', e);
    const grid = document.getElementById("productGrid");
    if (grid) {
      grid.innerHTML = `
        <div class="empty-state">
          <p style="font-size:1.5rem;margin-bottom:0.5rem;">⚠️</p>
          <p>Couldn't load catalogue right now.</p>
          <button class="retry-btn" onclick="loadProducts()">Try again</button>
        </div>`;
    }
  }
}

// ─── DEEP LINK: ?product=ID ───────────────────────────────────────────────
function checkProductParam() {
  const id = parseInt(new URLSearchParams(location.search).get('product'));
  if (id && products.find(x => x.id === id)) openDetailPanel(id);
}