// ─── FILTER / SORT LOGIC ──────────────────────────────────────────────────

/**
 * Return the filtered and sorted product list based on current UI state.
 */
function getFiltered() {
  const sort = document.getElementById("sortSelect")?.value || "default";

  let base =
    currentFilter === "All"  ? products.filter(p => !p.isSold) :
    currentFilter === "New"  ? products.filter(p => p.isNew && !p.isSold) :
    products.filter(p => p.category === currentFilter && !p.isSold);

  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    base = base.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.desc && p.desc.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  }

  if (priceFilterActive) {
    base = base.filter(p => Number(p.price) >= priceMinVal && Number(p.price) <= priceMaxVal);
  }

  // Calibrate price slider max to actual product range (once per load)
  if (products.length && !window._priceCalibrated) {
    window._priceCalibrated = true;
    const maxPrice = Math.max(...products.map(p => Number(p.price) || 0));
    const rounded = Math.ceil(maxPrice / 1000) * 1000 + 2000;
    ['priceMinSlider', 'priceMaxSlider'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.max = rounded;
        if (id === 'priceMaxSlider') {
          el.value = rounded;
          priceMaxVal = rounded;
        }
      }
    });
    const label = document.getElementById("priceFilterLabel");
    if (label && label.textContent === "All prices") updatePriceRange();
  }

  if (sort === "price-asc")  return [...base].sort((a, b) => a.price - b.price);
  if (sort === "price-desc") return [...base].sort((a, b) => b.price - a.price);
  if (sort === "newest")     return [...base].sort((a, b) => b.id - a.id);
  if (sort === "popular")    return [...base].sort((a, b) => (b.views || 0) - (a.views || 0));
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

  grid.innerHTML = filtered.map((p, i) => {
    let variants = [];
    try { if (p.variants) variants = JSON.parse(p.variants); } catch (e) {}
    const hasVariants = variants.length > 0;
    const inWishlist = isInWishlist(p.id);

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
        aria-label="${escapeHtml(p.name)}, KSh ${Number(p.price).toLocaleString()}${p.isSold ? ', sold out' : ''}">
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
          ${p.isSold ? `<span class="card-badge sold">Sold</span>` : ''}
          <!-- Wishlist heart on image -->
          <button class="card-wishlist-btn${inWishlist ? ' active' : ''}"
            onclick="event.stopPropagation();toggleWishlist(${p.id})"
            aria-label="${inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}">
            <svg fill="${inWishlist ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24" width="16" height="16">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
          </button>
          <!-- Quick View (desktop hover only) -->
          <div class="card-quick-view" onclick="event.stopPropagation();openDetailPanel(${p.id})">
            Quick View
          </div>
        </div>
        <div class="card-meta-minimal">
          <h3 class="card-title-minimal">${escapeHtml(p.name)}</h3>
          ${swatchesHTML}
          <p class="card-price-minimal">KSh ${Number(p.price).toLocaleString()}</p>
        </div>
      </article>`;
  }).join("");

  // Admin controls (visible whenever logged in as admin)
  const isAdmin = document.body.classList.contains("is-admin");
  if (isAdmin) addAdminControls();
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

  // Update active swatch
  card.querySelectorAll('.card-swatch').forEach((s, i) => s.classList.toggle('active', i === variantIdx));

  // Swap card image
  if (photoUrl) {
    const imgWrap = card.querySelector('.card-img-wrap');
    const img = card.querySelector('.card-img');
    if (img) {
      imgWrap?.classList.remove('img-loaded');
      img.src = photoUrl;
      img.onload = () => imgWrap?.classList.add('img-loaded');
    }
  }
}

// ─── HERO GALLERY ─────────────────────────────────────────────────────────
function populateHeroGallery() {
  const available = products.filter(p => !p.isSold && p.photo);
  const picks = available.slice(0, 2);
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
  window._priceCalibrated = false; // reset on each load
  showSkeletons(6);
  try {
    products = await apiGet();
    renderProducts();
    populateHeroGallery();
    checkProductParam();
    updateFilterCounts();
    applySavedFilters();

    // Set price slider range to actual product max
    const maxPrice = Math.max(...products.map(p => Number(p.price) || 0));
    const rounded = Math.ceil(maxPrice / 1000) * 1000 + 2000;
    const minSlider = document.getElementById("priceMinSlider");
    const maxSlider = document.getElementById("priceMaxSlider");
    if (minSlider && maxSlider) {
      minSlider.max = rounded;
      maxSlider.max = rounded;
      maxSlider.value = rounded;
      updatePriceRange();
    }
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