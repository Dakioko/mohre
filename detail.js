// ─── DETAIL PANEL STATE ───────────────────────────────────────────────────
let detailProductId = null;
let detailSelectedSize = null;
let detailSelectedColor = null;

// ─── OPEN DETAIL PANEL ────────────────────────────────────────────────────
function openDetailPanel(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  detailProductId = id;
  detailSelectedSize = null;
  detailSelectedColor = null;

  let variants = [];
  try { if (p.variants) variants = JSON.parse(p.variants); } catch (e) {}
  const hasVariants = variants.length > 0;

  const placeholder = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'%3E%3Crect width='300' height='400' fill='%23eae8e4'/%3E%3Ctext x='150' y='200' text-anchor='middle' fill='%23b0a898' font-size='13'%3ENo image%3C/text%3E%3C/svg%3E`;

  // Build gallery image list: primary + extra photos + variant photos
  const galleryPhotos = [];
  if (p.photo) galleryPhotos.push(p.photo);
  // Extra uploaded photos
  try { if (p.photos) { const extras = JSON.parse(p.photos); extras.forEach(src => { if (src && src !== p.photo) galleryPhotos.push(src); }); } } catch (e) {}
  // Variant photos
  if (hasVariants) {
    variants.forEach(v => { if (v.photo && !galleryPhotos.includes(v.photo)) galleryPhotos.push(v.photo); });
  }
  if (!galleryPhotos.length) galleryPhotos.push(placeholder);

  const galleryHTML = `
    <div class="detail-gallery ${galleryPhotos.length === 1 ? 'single' : ''}">
      ${galleryPhotos.map((src, idx) => `
        <img class="detail-gallery-img"
          src="${escapeHtml(src)}"
          alt="${escapeHtml(p.name)}"
          onerror="this.src='${placeholder}'"
          onclick="openLightboxWithGallery(${JSON.stringify(galleryPhotos).replace(/"/g, '&quot;')}, ${idx})">
      `).join('')}
    </div>`;

  // Sizes
  const sizes = p.sizes ? p.sizes.split(",").map(s => s.trim()).filter(Boolean) : [];
  const sizesHTML = sizes.length ? `
    <p class="detail-section-label">Select size</p>
    <div class="detail-sizes" id="detailSizes">
      ${sizes.map(s => `
        <button class="detail-size-chip"
          onclick="selectDetailSize(this,'${escapeHtml(s)}')">${escapeHtml(s)}</button>
      `).join('')}
    </div>
    <p class="size-skip-note" style="margin-bottom:1rem;">
      Not sure? We'll help you find the right fit over WhatsApp.
    </p>` : '';

  // Colours
  const colorsHTML = hasVariants ? `
    <p class="detail-section-label">Colour</p>
    <div class="detail-colors" id="detailColors">
      ${variants.map((v, i) => `
        <span class="detail-color-swatch ${i === 0 ? 'active' : ''}"
          style="background:${v.color || '#ccc'}"
          title="${escapeHtml(v.name || '')}"
          onclick="selectDetailColor(this,'${(v.name || '').replace(/'/g, "\\'")}','${(v.photo || p.photo || '').replace(/'/g, "\\'")}',${p.id},${i})">
        </span>
      `).join('')}
      ${variants[0]?.name
        ? `<span style="font-size:0.75rem;color:var(--muted);align-self:center;" id="detailColorName">
            ${escapeHtml(variants[0].name)}
           </span>`
        : ''}
    </div>` : '';

  if (hasVariants && variants[0]) detailSelectedColor = variants[0].name || null;

  // Inject body
  const bodyEl = document.getElementById("detailBody");
  if (bodyEl) {
    bodyEl.innerHTML = `
      ${galleryHTML}
      <div class="detail-info">
        <p class="detail-category">${escapeHtml(p.category)}</p>
        <h2 class="detail-name">${escapeHtml(p.name)}</h2>
        <p class="detail-price">KSh ${Number(p.price).toLocaleString()}</p>
        <span class="detail-auth-badge" onclick="openGuaranteeModal()">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          Authenticity guaranteed
        </span>
        ${p.desc ? `<p class="detail-desc">${escapeHtml(p.desc)}</p>` : ''}
        ${sizesHTML}
        ${colorsHTML}
        <div class="detail-delivery">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
          </svg>
          <p>
            <strong>Ships across Kenya.</strong>
            Delivery details confirmed over WhatsApp after ordering.
            Orders typically dispatched within 1–2 business days.
          </p>
        </div>
      </div>`;
  }

  // Show/hide footer for sold items
  const footerEl = document.getElementById("detailFooter");
  if (footerEl) footerEl.style.display = p.isSold ? 'none' : 'flex';

  // Open panel
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

// ─── SIZE / COLOUR SELECTION IN DETAIL PANEL ─────────────────────────────
function selectDetailSize(el, size) {
  document.querySelectorAll(".detail-size-chip").forEach(c => c.classList.remove("selected"));
  el.classList.add("selected");
  detailSelectedSize = size;
}

function selectDetailColor(el, colorName, photoUrl, productId, variantIdx) {
  document.querySelectorAll(".detail-color-swatch").forEach(s => s.classList.remove("active"));
  el.classList.add("active");
  detailSelectedColor = colorName;

  const nameEl = document.getElementById("detailColorName");
  if (nameEl) nameEl.textContent = colorName;

  // Swap the first gallery image to the selected colour's photo
  if (photoUrl) {
    const firstImg = document.querySelector(".detail-gallery-img");
    if (firstImg) firstImg.src = photoUrl;
  }

  // Also update the product card swatch state
  swapVariant({ stopPropagation: () => {} }, productId, variantIdx, photoUrl, colorName);
}

// ─── DETAIL PANEL ACTIONS ─────────────────────────────────────────────────
function detailOrder() {
  if (!detailProductId) return;
  const p = products.find(x => x.id === detailProductId);
  if (!p) return;
  sendWhatsApp(p, detailSelectedSize, detailSelectedColor);
}

function detailSaveToCart() {
  if (!detailProductId) return;
  addToCart(detailProductId, detailSelectedSize, detailSelectedColor);
  showToast("Added to bag ✨");
}

function shareProduct() {
  if (!detailProductId) return;
  const p = products.find(x => x.id === detailProductId);
  if (!p) return;
  const url = window.location.href.split('?')[0] + `?product=${detailProductId}`;
  if (navigator.share) {
    navigator.share({
      title: p.name,
      text: `KSh ${Number(p.price).toLocaleString()} — ${p.name} on Mohre Hub`,
      url
    });
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
  currentGalleryIndex = startIndex;
  updateLightboxImage();
  document.getElementById("lightbox")?.classList.add("open");
  document.body.style.overflow = "hidden";
}

function updateLightboxImage() {
  const img = document.getElementById("lightboxImg");
  if (img && currentGalleryImages[currentGalleryIndex]) {
    img.src = currentGalleryImages[currentGalleryIndex];
  }
  // Show/hide nav arrows
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

// ─── SWIPE TO NAVIGATE LIGHTBOX ───────────────────────────────────────────
function initLightboxSwipe() {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;
  let startX = 0;
  lightbox.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) {
      dx < 0 ? nextImage() : previousImage();
    }
  }, { passive: true });
}
