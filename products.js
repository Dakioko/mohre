// ─── FILTER LOGIC ─────────────────────────────────────────────────────────

// Slideshow timer registry — declared here so swapVariant can access it
const _slideshowTimers = new Map();

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
function renderProducts() {
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
    _slideshowTimers.forEach(timerId => clearInterval(timerId));
    _slideshowTimers.clear();
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="32" height="32">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2"
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/>
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
  const sameSet     = currentIds.length === filteredIds.length && filteredIds.every((id, i) => id === currentIds[i]);

  if (sameSet) {
    _updateWishlistStates();
    const isAdmin = document.body.classList.contains("is-admin");
    if (isAdmin) addAdminControls();
    return;
  }

  // Full rebuild
  _slideshowTimers.forEach(timerId => clearInterval(timerId));
  _slideshowTimers.clear();

  grid.innerHTML = filtered.map((p, i) => {
    let variants = [];
    try { if (p.variants) variants = JSON.parse(p.variants); } catch (e) {}
    const hasVariants = variants.length > 0;
    const inWishlist  = isInWishlist(p.id);
    const showNewBadge = isNewArrival(p);

    const swatchesHTML = hasVariants ? `
      <div class="card-swatches">
        ${variants.slice(0, 5).map((v, vi) => `
          <span class="card-swatch ${vi === 0 ? 'active' : ''}"
            style="background:${v.color || '#ccc'}"
            title="${escapeHtml(v.name || '')}"
            data-color="${escapeHtml(v.name || '')}"
            onclick="event.stopPropagation();swapVariant(event,${p.id},${vi},'${(v.photo || p.photo || '').replace(/'/g, "\\'")}','${(v.name || '').replace(/'/g, "\\'")}')">
          </span>`).join('')}
      </div>` : '';

    return `
      <article class="product-card${p.isSold ? ' sold-out' : ''}"
        data-id="${p.id}"
        style="animation-delay:${Math.min(i * 0.05, 0.4)}s"
        onclick="openDetailPanel(${p.id})"
        role="button"
        tabindex="0"
        aria-label="${escapeHtml(p.name)}, ${fmtPrice(p.price)}${p.isSold ? ', sold out' : ''}">
        <div class="card-img-wrap" id="imgWrap${p.id}">
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
          <div class="card-quick-view" onclick="event.stopPropagation();openDetailPanel(${p.id})">
            Shop Now
          </div>
        </div>
        <div class="card-meta-minimal">
          <h3 class="card-title-minimal">${escapeHtml(p.name)}</h3>
          ${swatchesHTML}
          <p class="card-price-minimal">${fmtPrice(p.price)}</p>
        </div>
      </article>`;
  }).join("");

  const isAdmin = document.body.classList.contains("is-admin");
  if (isAdmin) addAdminControls();

  initCardSlideshows();
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

  card._swatchSwapped = true;
  clearInterval(_slideshowTimers.get(productId));
  _slideshowTimers.delete(productId);

  card.querySelectorAll('.card-swatch').forEach((s, i) => s.classList.toggle('active', i === variantIdx));

  if (photoUrl) {
    const imgWrap = card.querySelector('.card-img-wrap');
    const img     = card.querySelector('.card-img');
    if (img) {
      imgWrap?.classList.remove('img-loaded');
      img.src    = photoUrl;
      img.onload = () => imgWrap?.classList.add('img-loaded');
    }
  }
}

// ─── CARD CROSSFADE SLIDESHOW ─────────────────────────────────────────────
function initCardSlideshows() {
  _slideshowTimers.forEach(timerId => clearInterval(timerId));
  _slideshowTimers.clear();

  products.filter(p => !p.isSold).forEach(p => {
    const images = [];
    if (p.photo) images.push(p.photo);
    try {
      if (p.photos) {
        const extras = JSON.parse(p.photos);
        extras.forEach(src => { if (src && src !== p.photo) images.push(src); });
      }
    } catch (e) {}
    try {
      if (p.variants) {
        const variants = JSON.parse(p.variants);
        variants.forEach(v => { if (v.photo && !images.includes(v.photo)) images.push(v.photo); });
      }
    } catch (e) {}

    if (images.length < 2) return;

    const imgEl = document.getElementById(`img${p.id}`);
    if (!imgEl) return;

    let idx = 0;
    const timerId = setInterval(() => {
      const card = document.querySelector(`.product-card[data-id="${p.id}"]`);
      if (!card || card._swatchSwapped) return;

      idx = (idx + 1) % images.length;
      const img = document.getElementById(`img${p.id}`);
      if (!img) return;

      img.style.transition = 'opacity 0.6s ease';
      img.style.opacity    = '0';
      setTimeout(() => {
        img.src    = images[idx];
        img.onload = () => { img.style.opacity = '1'; };
        setTimeout(() => { img.style.opacity = '1'; }, 100);
      }, 600);
    }, 3500);

    _slideshowTimers.set(p.id, timerId);

    const card = document.querySelector(`.product-card[data-id="${p.id}"]`);
    if (card) {
      card.addEventListener('mouseenter', () => {
        clearInterval(_slideshowTimers.get(p.id));
        _slideshowTimers.delete(p.id);
      }, { once: true });
      card.addEventListener('touchstart', () => {
        clearInterval(_slideshowTimers.get(p.id));
        _slideshowTimers.delete(p.id);
      }, { passive: true, once: true });
    }
  });
}

// ─── HERO GALLERY ─────────────────────────────────────────────────────────
function populateHeroGallery() {
  const available = products.filter(p => !p.isSold && p.photo);
  const picks     = available.slice(0, 2);
  if (picks.length < 2) return;

  const gallery = document.getElementById("heroGallery");
  if (!gallery) return;

  gallery.innerHTML = picks.map(p => `
    <div class="hero-img-wrap" onclick="openLightbox('${p.photo.replace(/'/g, "\\'")}')">
      <img src="${escapeHtml(p.photo)}" alt="${escapeHtml(p.name)}"
        onload="this.closest('.hero-img-wrap').classList.add('loaded')"
        loading="lazy">
    </div>`).join("");
}

// ─── LOAD PRODUCTS ────────────────────────────────────────────────────────
async function loadProducts() {
  showSkeletons(6);
  try {
    products = await apiGet();
    setTimeout(reconcileCart, 0); // defer so UI renders before toast fires
    renderProducts();
    populateHeroGallery();
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