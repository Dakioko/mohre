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

  grid.innerHTML = filtered.map((p, i) => {
    let variants = _parseJSON(p.variants, []);
    const hasVariants = variants.length > 0;
    const inWishlist  = isInWishlist(p.id);
    const showNewBadge = isNewArrival(p);
    const images = _cardImageList(p);
    const hasMultipleImages = images.length > 1;

    const swatchesHTML = hasVariants ? `
      <div class="card-swatches">
        ${variants.slice(0, 5).map((v, vi) => `
          <span class="card-swatch ${vi === 0 ? 'active' : ''}"
            style="background:${v.color || '#ccc'}"
            title="${escapeHtml(v.name || '')}"
            data-product-id="${p.id}"
            data-variant-idx="${vi}"
            data-photo="${escapeHtml(v.photo || p.photo || '')}"
            data-color="${escapeHtml(v.name || '')}">
          </span>`).join('')}
      </div>` : '';

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
      <span class="card-img-counter" id="imgCounter${p.id}">1/${images.length}</span>` : '';

    return `
      <article class="product-card${p.isSold ? ' sold-out' : ''}"
        data-id="${p.id}"
        style="animation-delay:${Math.min(i * 0.05, 0.4)}s"
        onclick="openDetailPanel(${p.id})"
        onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openDetailPanel(${p.id});}"
        role="button"
        tabindex="0"
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

  // Attach swatch click listeners via delegation — avoids inline onclick photo URL injection
  grid.addEventListener('click', _handleSwatchClick, { once: false });
}

/**
 * Delegated handler for card swatch clicks.
 * Reads product/variant data from data-* attributes instead of inline JS.
 */
function _handleSwatchClick(e) {
  const swatch = e.target.closest('.card-swatch');
  if (!swatch) return;
  e.stopPropagation();
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

  card.querySelectorAll('.card-swatch').forEach((s, i) => s.classList.toggle('active', i === variantIdx));

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
        const counter = document.getElementById(`imgCounter${productId}`);
        if (counter) counter.textContent = `${(idx > -1 ? idx : 0) + 1}/${images.length}`;
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
      card.querySelectorAll('.card-swatch').forEach((s, i) => s.classList.toggle('active', i === vi));
    }
  }

  const counter = document.getElementById(`imgCounter${productId}`);
  if (counter) counter.textContent = `${idx + 1}/${images.length}`;
}

// ─── HERO GALLERY SLIDESHOW ───────────────────────────────────────────────
let _heroSlideTimer = null;
let _heroCurrentSlide = 0;

function populateHeroGallery() {
  const gallery = document.getElementById("heroGallery");
  if (!gallery) return;

  // Newest 4 unsold products with photos — more variety in the slideshow
  const picks = products
    .filter(p => !p.isSold && p.photo)
    .sort((a, b) => {
      if (!a.createdAt && !b.createdAt) return 0;
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    })
    .slice(0, 4);

  if (!picks.length) return;

  // Single-slide layout — gallery becomes a slider not a grid
  gallery.classList.add('hero-gallery--slider');

  gallery.innerHTML = `
    <div class="hero-slides" id="heroSlides">
      ${picks.map((p, i) => {
        const isNew = isNewArrival(p);
        return `
        <div class="hero-slide${i === 0 ? ' active' : ''}"
          data-product-id="${p.id}"
          role="button"
          tabindex="${i === 0 ? '0' : '-1'}"
          aria-label="View ${escapeHtml(p.name)}, ${fmtPrice(p.price)}">
          <img src="${escapeHtml(p.photo)}" alt="${escapeHtml(p.name)}"
            onload="this.closest('.hero-slide').classList.add('loaded')"
            loading="${i === 0 ? 'eager' : 'lazy'}">
          ${isNew ? `<span class="hero-badge">New Arrival</span>` : ''}
          <div class="hero-img-overlay">
            <p class="hero-overlay-name">${escapeHtml(p.name)}</p>
            <p class="hero-overlay-price">${fmtPrice(p.price)}</p>
          </div>
        </div>`;
      }).join('')}
    </div>
    ${picks.length > 1 ? `
    <div class="hero-dots" role="tablist" aria-label="Slide indicators">
      ${picks.map((_, i) => `
        <button class="hero-dot${i === 0 ? ' active' : ''}"
          role="tab"
          aria-selected="${i === 0}"
          aria-label="Slide ${i + 1}"
          data-slide-idx="${i}">
        </button>`).join('')}
    </div>` : ''}
  `;

  // Click/keyboard → open detail panel
  gallery.querySelectorAll('.hero-slide').forEach(slide => {
    const id = parseInt(slide.dataset.productId, 10);
    slide.addEventListener('click', () => openDetailPanel(id));
    slide.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetailPanel(id); }
    });
  });

  // Dot navigation
  gallery.querySelectorAll('.hero-dot').forEach(dot => {
    dot.addEventListener('click', e => {
      e.stopPropagation();
      _heroGoToSlide(parseInt(dot.dataset.slideIdx, 10));
      _heroResetTimer();
    });
  });

  // Touch swipe
  let _swipeStartX = 0;
  gallery.addEventListener('touchstart', e => { _swipeStartX = e.touches[0].clientX; }, { passive: true });
  gallery.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - _swipeStartX;
    if (Math.abs(dx) < 40) return;
    _heroGoToSlide(dx < 0
      ? (_heroCurrentSlide + 1) % picks.length
      : (_heroCurrentSlide - 1 + picks.length) % picks.length);
    _heroResetTimer();
  }, { passive: true });

  // Auto-advance
  _heroCurrentSlide = 0;
  _heroResetTimer();
}

function _heroGoToSlide(idx) {
  const gallery = document.getElementById("heroGallery");
  if (!gallery) return;
  const slides = gallery.querySelectorAll('.hero-slide');
  const dots   = gallery.querySelectorAll('.hero-dot');
  slides.forEach((s, i) => {
    s.classList.toggle('active', i === idx);
    s.tabIndex = i === idx ? 0 : -1;
  });
  dots.forEach((d, i) => {
    d.classList.toggle('active', i === idx);
    d.setAttribute('aria-selected', i === idx ? 'true' : 'false');
  });
  _heroCurrentSlide = idx;
}

function _heroResetTimer() {
  const gallery = document.getElementById("heroGallery");
  if (!gallery) return;
  const count = gallery.querySelectorAll('.hero-slide').length;
  if (count < 2) return;
  clearInterval(_heroSlideTimer);
  _heroSlideTimer = setInterval(() => {
    _heroGoToSlide((_heroCurrentSlide + 1) % count);
  }, 4500);
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