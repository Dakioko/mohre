// ─── DETAIL PANEL STATE ───────────────────────────────────────────────────
let detailProductId    = null;
let detailSelectedSize  = null;
let detailSelectedColor = null;
let detailQty          = 1;

// ─── OPEN DETAIL PANEL ────────────────────────────────────────────────────
function openDetailPanel(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  detailProductId    = id;
  detailSelectedSize  = null;
  detailSelectedColor = null;
  detailQty          = 1;

  const variants = _parseJSON(p.variants, []);
  const hasVariants = variants.length > 0;
  detailSelectedColor = hasVariants ? (variants[0].name || null) : null;

  const placeholder = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'%3E%3Crect width='300' height='400' fill='%23eae8e4'/%3E%3Ctext x='150' y='200' text-anchor='middle' fill='%23b0a898' font-size='13'%3ENo image%3C/text%3E%3C/svg%3E`;

  // Build gallery image list
  const galleryPhotos = [];
  // Always include main photo first when present and no variants (avoids duplicate with variant photos)
  if (p.photo && !hasVariants) galleryPhotos.push(p.photo);
  // Extra photos
  _parseJSON(p.photos, []).forEach(src => { if (src && src !== p.photo) galleryPhotos.push(src); });
  // Variant photos
  if (hasVariants) {
    variants.forEach(v => { if (v.photo && !galleryPhotos.includes(v.photo)) galleryPhotos.push(v.photo); });
  }
  // Fallback: if nothing resolved, use the main photo regardless of variant state
  if (!galleryPhotos.length && p.photo) galleryPhotos.push(p.photo);
  if (!galleryPhotos.length) galleryPhotos.push(placeholder);

  // Left column: main image + thumbnails
  const galleryHTML = `
    <div class="detail-gallery-col">
      <div class="detail-main-img-wrap">
        <img class="detail-main-img" id="detailMainImg"
          src="${escapeHtml(galleryPhotos[0])}"
          alt="${escapeHtml(p.name)}"
          onerror="this.src='${placeholder}'"
          onclick="openLightboxWithGallery(${JSON.stringify(galleryPhotos).replace(/"/g, '&quot;')}, 0)">
        ${hasVariants && variants[0]?.name ? `
          <div class="detail-img-color-badge" id="detailImgColorBadge">
            <span id="detailImgColorDot" style="width:10px;height:10px;border-radius:50%;background:${variants[0].color || '#ccc'};display:inline-block;flex-shrink:0;border:1px solid rgba(255,255,255,0.4)"></span>
            <span id="detailImgColorText">${escapeHtml(variants[0].name)}</span>
          </div>` : ''}
      </div>
      ${galleryPhotos.length > 1 ? `
        <div class="detail-thumbs">
          ${galleryPhotos.map((src, idx) => `
            <button class="detail-thumb${idx === 0 ? ' active' : ''}" onclick="switchDetailMainImg('${escapeHtml(src)}', this)">
              <img src="${escapeHtml(src)}" alt="${escapeHtml(p.name)} photo ${idx + 1}"
                onerror="this.src='${placeholder}'">
            </button>
          `).join('')}
        </div>` : ''}
    </div>`;

  // Sizes
  const sizes    = p.sizes ? p.sizes.split(",").map(s => s.trim()).filter(Boolean) : [];
  const sizesHTML = sizes.length ? `
    <div class="detail-field">
      <div class="detail-field-label">
        Size <span class="required-indicator" aria-hidden="true">*</span>
        <span class="sr-only"> (required)</span>
        <button class="detail-size-guide-link" onclick="showSizeGuide()">Size guide</button>
      </div>
      <div class="detail-sizes" id="detailSizes">
        ${sizes.map(s => `
          <button class="detail-size-chip"
            onclick="selectDetailSize(this,'${escapeHtml(s)}')">${escapeHtml(s)}</button>
        `).join('')}
      </div>
      <p class="detail-size-error" id="detailSizeError" style="display:none;font-size:0.72rem;color:var(--danger);margin-top:0.4rem;">
        Please select a size to continue.
      </p>
    </div>` : '';

  // Colours — use data-* attributes; JS listener attached after innerHTML set
  const colorsHTML = hasVariants ? `
    <div class="detail-field">
      <div class="detail-field-label">Colour</div>
      <div class="detail-colors" id="detailColors">
        ${variants.map((v, i) => `
          <button class="detail-color-chip${i === 0 ? ' selected' : ''}"
            data-color-name="${escapeHtml(v.name || '')}"
            data-photo="${escapeHtml(v.photo || p.photo || '')}"
            data-variant-idx="${i}"
            data-product-id="${p.id}">
            <span class="detail-color-chip-dot" style="background:${v.color || '#ccc'}"></span>
            ${escapeHtml(v.name || 'Colour ' + (i + 1))}
          </button>
        `).join('')}
      </div>
    </div>` : '';

  const inWishlist = isInWishlist(p.id);

  // Right column
  const infoHTML = `
    <div class="detail-info-col">
      <div class="detail-info-top">
        <p class="detail-category-label">${escapeHtml(p.category)}</p>
        <h2 class="detail-name">${escapeHtml(p.name)}</h2>
        <p class="detail-price">${fmtPrice(p.price)}</p>
      </div>

      ${sizesHTML}
      ${colorsHTML}

      <!-- Quantity -->
      <div class="detail-field">
        <div class="detail-field-label">Quantity</div>
        <div class="detail-qty-row">
          <button class="detail-qty-btn" onclick="changeDetailQty(-1)" aria-label="Decrease">−</button>
          <span class="detail-qty-val" id="detailQtyVal">1</span>
          <button class="detail-qty-btn" onclick="changeDetailQty(1)" aria-label="Increase">+</button>
        </div>
      </div>

      ${p.isSold ? `
        <p class="detail-sold-label">This item is no longer available.</p>
      ` : `
        <div class="detail-actions">
          <button class="detail-buynow-btn" onclick="detailOrder()">
            <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
            </svg>
            Buy Now
          </button>
          <button class="detail-addcart-btn" onclick="detailSaveToCart()">
            Add to Cart
          </button>
          <button class="detail-wishlist-btn${inWishlist ? ' active' : ''}" id="detailWishlistBtn"
            onclick="detailToggleWishlist()">
            <svg fill="${inWishlist ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            ${inWishlist ? 'Wishlisted' : 'Add to Wishlist'}
          </button>
        </div>
      `}

      <!-- Accordions -->
      <div class="detail-accordions">
        ${p.desc ? `
        <div class="detail-accordion">
          <button class="detail-accordion-trigger" onclick="toggleAccordion(this)">
            Product Details
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div class="detail-accordion-body">
            <p>${escapeHtml(p.desc)}</p>
          </div>
        </div>` : ''}

        <div class="detail-accordion">
          <button class="detail-accordion-trigger" onclick="toggleAccordion(this)">
            Delivery
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div class="detail-accordion-body">
            <p>Ships across Kenya. Delivery details confirmed over WhatsApp after ordering. Orders typically dispatched within 1–2 business days. Free delivery on orders over KSh 5,000.</p>
          </div>
        </div>

        <div class="detail-accordion">
          <button class="detail-accordion-trigger" onclick="toggleAccordion(this)">
            Returns & Exchanges
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div class="detail-accordion-body">
            <p>Contact us within 48 hours of receiving your order via WhatsApp. Items must be unworn, unwashed, and in original condition with tags intact. Sale items and accessories are final sale. Refunds processed within 5–7 business days.</p>
          </div>
        </div>
        <div class="detail-accordion">
          <button class="detail-accordion-trigger" onclick="toggleAccordion(this)">
            Authenticity Guarantee
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div class="detail-accordion-body">
            <p>Every item is personally sourced and verified by our team before listing. If you have concerns, contact us within 48 hours via WhatsApp — full refund or replacement.</p>
          </div>
        </div>
      </div>

    </div><!-- /.detail-info-col -->`;

  const bodyEl = document.getElementById("detailBody");
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div class="detail-two-col">
        ${galleryHTML}
        ${infoHTML}
      </div>`;

    // Attach colour chip listeners via JS — avoids inline onclick photo URL injection
    bodyEl.querySelectorAll('.detail-color-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const colorName  = btn.dataset.colorName  || '';
        const photoUrl   = btn.dataset.photo       || '';
        const variantIdx = parseInt(btn.dataset.variantIdx, 10);
        const productId  = parseInt(btn.dataset.productId,  10);
        selectDetailColor(btn, colorName, photoUrl, productId, variantIdx);
      });
    });
  }

  // ── Mobile enhancements ──────────────────────────────────────────────────
  const isMobile = window.innerWidth < 768;

  // Mini name + price in header
  const headerName  = document.getElementById("detailHeaderName");
  const headerPrice = document.getElementById("detailHeaderPrice");
  if (headerName)  headerName.textContent  = p.name;
  if (headerPrice) headerPrice.textContent = fmtPrice(p.price);

  // Sticky bottom CTA bar
  const stickyBar = document.getElementById("detailStickyBar");
  if (stickyBar) {
    if (isMobile && !p.isSold) {
      stickyBar.style.display = "flex";
      stickyBar.innerHTML = `
        <button class="sticky-bar-buynow" onclick="detailOrder()">
          <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
          </svg>
          Buy Now
        </button>
        <button class="sticky-bar-addcart" onclick="detailSaveToCart()">Add to Cart</button>`;
    } else {
      stickyBar.style.display = "none";
    }
  }

  document.getElementById("detailPanel")?.classList.add("open");
  document.getElementById("detailOverlay")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

// ─── CLOSE DETAIL PANEL ───────────────────────────────────────────────────
function closeDetailPanel() {
  document.getElementById("detailPanel")?.classList.remove("open");
  document.getElementById("detailOverlay")?.classList.remove("open");
  document.body.style.overflow = "";
  detailProductId = null;
}

// ─── THUMBNAIL SWITCH ─────────────────────────────────────────────────────
function switchDetailMainImg(src, thumbEl) {
  const mainImg = document.getElementById("detailMainImg");
  if (mainImg) mainImg.src = src;
  document.querySelectorAll(".detail-thumb").forEach(t => t.classList.remove("active"));
  if (thumbEl) thumbEl.classList.add("active");
}

// ─── SIZE / COLOUR SELECTION ──────────────────────────────────────────────
function selectDetailSize(el, size) {
  document.querySelectorAll(".detail-size-chip").forEach(c => c.classList.remove("selected"));
  el.classList.add("selected");
  detailSelectedSize = size;
  // Clear the error message as soon as a size is chosen
  _hideSizeError();
}

function selectDetailColor(el, colorName, photoUrl, productId, variantIdx) {
  document.querySelectorAll(".detail-color-chip").forEach(s => s.classList.remove("selected"));
  el.classList.add("selected");
  detailSelectedColor = colorName;

  const badgeDot  = document.getElementById("detailImgColorDot");
  const badgeText = document.getElementById("detailImgColorText");
  const dot       = el.querySelector(".detail-color-chip-dot");
  if (badgeDot && dot)  badgeDot.style.background = dot.style.background;
  if (badgeText) badgeText.textContent = colorName;

  if (photoUrl) {
    const mainImg = document.getElementById("detailMainImg");
    if (mainImg) mainImg.src = photoUrl;
    document.querySelectorAll(".detail-thumb").forEach(t => {
      t.classList.remove("active");
      const img = t.querySelector("img");
      if (img && (img.getAttribute("src") === photoUrl || img.src.endsWith(photoUrl))) {
        t.classList.add("active");
      }
    });
  }
  swapVariant({ stopPropagation: () => {} }, productId, variantIdx, photoUrl, colorName);
}

// ─── SIZE VALIDATION HELPERS ──────────────────────────────────────────────

/**
 * Returns true if the product requires a size and one has been selected.
 * Delegates to the shared _validateSizeSelection helper (see ui.js).
 */
function _validateSize() {
  const p = products.find(x => x.id === detailProductId);
  return _validateSizeSelection(p, detailSelectedSize, "detailSizeError", "detailSizes");
}

function _hideSizeError() {
  const errEl = document.getElementById("detailSizeError");
  if (errEl) errEl.style.display = "none";
}

// ─── QUANTITY ─────────────────────────────────────────────────────────────
function changeDetailQty(delta) {
  detailQty = Math.max(1, detailQty + delta);
  const el  = document.getElementById("detailQtyVal");
  if (el) el.textContent = detailQty;
}

// ─── ACCORDION ────────────────────────────────────────────────────────────
function toggleAccordion(trigger) {
  const accordion = trigger.closest(".detail-accordion");
  const isOpen    = accordion.classList.contains("open");
  document.querySelectorAll(".detail-accordion").forEach(a => a.classList.remove("open"));
  if (!isOpen) accordion.classList.add("open");
}

// ─── DETAIL PANEL ACTIONS ─────────────────────────────────────────────────

/**
 * Buy Now — send to WhatsApp.
 * Validates size selection first.
 */
function detailOrder() {
  if (!detailProductId) return;
  if (!_validateSize()) return;
  const p = products.find(x => x.id === detailProductId);
  if (!p) return;

  const qty         = detailQty || 1;
  const subtotal    = Number(p.price) * qty;
  const deliveryFee = subtotal > 5000 ? 0 : 200;
  const total       = subtotal + deliveryFee;

  pendingOrderData = {
    orderItems: [{ name: p.name, price: p.price, qty, size: detailSelectedSize, color: detailSelectedColor }],
    subtotal,
    deliveryFee,
    total
  };
  showOrderSummaryModal();
}

/**
 * Add to Cart.
 * Validates size selection first.
 * Adds detailQty copies in a single cart operation to avoid
 * opening the cart drawer multiple times.
 */
function detailSaveToCart() {
  if (!detailProductId) return;
  if (!_validateSize()) return;

  const p = products.find(x => x.id === detailProductId);
  if (!p) return;

  _pushToCart(p, detailSelectedSize, detailSelectedColor, detailQty);

  const navCartBtn = document.querySelector('.cart-btn');
  if (navCartBtn) {
    navCartBtn.classList.add('cart-bump');
    setTimeout(() => navCartBtn.classList.remove('cart-bump'), 300);
  }

  const itemCount = cart.reduce((s, c) => s + (c.qty || 1), 0);
  announce(`${p.name} added to cart. ${itemCount} item${itemCount > 1 ? 's' : ''} in cart.`);
  vibrateOnAction();
  openCart();
}

function detailToggleWishlist() {
  if (!detailProductId) return;
  toggleWishlist(detailProductId);
  const btn = document.getElementById("detailWishlistBtn");
  if (!btn) return;
  const inWishlist = isInWishlist(detailProductId);
  btn.classList.toggle("active", inWishlist);
  btn.innerHTML = `
    <svg fill="${inWishlist ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
    </svg>
    ${inWishlist ? 'Wishlisted' : 'Add to Wishlist'}`;
}

function shareProduct() {
  if (!detailProductId) return;
  const p = products.find(x => x.id === detailProductId);
  if (!p) return;
  const url = window.location.href.split('?')[0] + `?product=${detailProductId}`;
  if (navigator.share) {
    navigator.share({ title: p.name, text: `${fmtPrice(p.price)} — ${p.name} on Mohre Hub`, url });
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url);
    showToast("Link copied to clipboard!");
  } else {
    showToast("Copy this link: " + url);
  }
}

// ─── LIGHTBOX ─────────────────────────────────────────────────────────────
function openLightbox(src) {
  openLightboxWithGallery([src], 0);
}

function openLightboxWithGallery(images, startIndex = 0) {
  currentGalleryImages = images;
  currentGalleryIndex  = startIndex;
  updateLightboxImage();
  document.getElementById("lightbox")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function updateLightboxImage() {
  const img = document.getElementById("lightboxImg");
  if (img && currentGalleryImages[currentGalleryIndex]) {
    img.src = currentGalleryImages[currentGalleryIndex];
  }
  const prev = document.querySelector(".lightbox-prev");
  const next = document.querySelector(".lightbox-next");
  if (prev) prev.style.display = currentGalleryImages.length > 1 ? '' : 'none';
  if (next) next.style.display = currentGalleryImages.length > 1 ? '' : 'none';
}

function closeLightbox() {
  document.getElementById("lightbox")?.classList.remove("open");
  document.body.style.overflow = "";
}

function previousImage() {
  if (!currentGalleryImages.length) return;
  currentGalleryIndex = (currentGalleryIndex - 1 + currentGalleryImages.length) % currentGalleryImages.length;
  updateLightboxImage();
}

function nextImage() {
  if (!currentGalleryImages.length) return;
  currentGalleryIndex = (currentGalleryIndex + 1) % currentGalleryImages.length;
  updateLightboxImage();
}

function initLightboxSwipe() {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;
  let startX = 0;
  lightbox.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) { dx < 0 ? nextImage() : previousImage(); }
  }, { passive: true });
}