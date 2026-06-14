// ─── CLOUDINARY CONFIG ────────────────────────────────────────────────────
const CLOUDINARY_CLOUD = "dgvpgo3bw";
const CLOUDINARY_PRESET = "mohrehub_uploads";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;

// Tracks how many uploads are in-flight so submitItem waits for all to finish
let _uploadsInProgress = 0;

function _setUploading(delta) {
  _uploadsInProgress = Math.max(0, _uploadsInProgress + delta);
  const btn = document.getElementById("adminSubmitBtn");
  if (!btn) return;
  if (_uploadsInProgress > 0) {
    btn.disabled = true;
    btn.textContent = `Uploading (${_uploadsInProgress})…`;
  } else {
    btn.disabled = false;
    btn.textContent = document.getElementById("editingId")?.value ? "Save changes" : "Post item";
  }
}

/**
 * Upload a File object to Cloudinary and return the secure URL.
 * @param {File} file
 * @returns {Promise<string>} secure URL
 */
async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_PRESET);
  const res = await fetch(CLOUDINARY_URL, { method: "POST", body: fd });
  if (!res.ok) throw new Error("Cloudinary upload failed");
  const data = await res.json();
  return data.secure_url;
}

// ─── ADMIN PANEL TOGGLE ───────────────────────────────────────────────────
function toggleAdminPanel() {
  const panel = document.getElementById("adminPanel");
  if (!panel) return;
  if (panel.classList.contains("visible")) {
    cancelAdminPanel();
  } else {
    resetAdminForm();
    panel.classList.add("visible");
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

function cancelAdminPanel() {
  document.getElementById("adminPanel")?.classList.remove("visible");
  resetAdminForm();
}

// ─── FORM RESET ───────────────────────────────────────────────────────────
function resetAdminForm() {
  const editingId = document.getElementById("editingId");
  if (editingId) editingId.value = "";

  document.getElementById("adminPanelTitle") && (document.getElementById("adminPanelTitle").textContent = "Add to collection");
  document.getElementById("adminModeBadge")  && (document.getElementById("adminModeBadge").textContent = "New item");
  document.getElementById("adminSubmitBtn")  && (document.getElementById("adminSubmitBtn").textContent = "Post item");

  ["itemName", "itemSizes", "itemShoeEU", "itemDesc", "itemPhotoUrl"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  const price = document.getElementById("itemPrice");
  if (price) price.value = "";

  const stock = document.getElementById("itemStock");
  if (stock) stock.value = "10";

  const cat = document.getElementById("itemCat");
  if (cat) cat.value = "Women";

  const fit = document.getElementById("itemShoeFit");
  if (fit) fit.value = "Unisex";

  const preview = document.getElementById("adminImgPreview");
  if (preview) preview.style.display = "none";

  extraPhotos = [];
  renderExtraPhotos();
  colorVariants = [];
  renderColorVariants();
  _updatePrimaryImageHint();
  onCategoryChange("Women");
}

// ─── CATEGORY CHANGE ──────────────────────────────────────────────────────
function onCategoryChange(cat) {
  const isShoes = cat === "Shoes";
  const isAcc   = cat === "Accessories";
  document.getElementById("sizesClothingGroup")?.classList.toggle("size-field-hidden", isShoes || isAcc);
  document.getElementById("sizesShoesGroup")?.classList.toggle("size-field-hidden", !isShoes);
  document.getElementById("shoeGenderGroup")?.classList.toggle("size-field-hidden", !isShoes);
}

// ─── COLOUR VARIANTS ──────────────────────────────────────────────────────
function _updatePrimaryImageHint() {
  const hint = document.getElementById("primaryImageHint");
  if (!hint) return;
  if (colorVariants.length > 0) {
    hint.textContent = "Optional — first colour photo will be used if left empty";
    hint.style.color = "var(--accent)";
  } else {
    hint.textContent = "Optional if colour variants are added";
    hint.style.color = "var(--muted)";
  }
}

function addColorVariant() {
  colorVariants.push({ name: "", color: "#8c7e6c", photo: "" });
  renderColorVariants();
  _updatePrimaryImageHint();
}

function removeColorVariant(idx) {
  colorVariants.splice(idx, 1);
  renderColorVariants();
  _updatePrimaryImageHint();
}

async function handleVariantImageFile(input, idx) {
  const file = input.files && input.files[0];
  if (!file) return;

  const row = input.closest('.color-variant-row');
  const preview = row?.querySelector('.variant-img-preview');

  _setUploading(+1);
  try {
    const url = await uploadToCloudinary(file);
    colorVariants[idx].photo = url;
    if (preview) { preview.src = url; preview.style.display = 'block'; }
  } catch (e) {
    showToast("Variant photo upload failed. Try again.");
  } finally {
    _setUploading(-1);
  }
}

// ─── COLOR NAME → HEX LOOKUP ─────────────────────────────────────────────
// The COLOR_NAME_TO_HEX lookup table lives in config.js — see that file.

function colorNameToHex(name) {
  return COLOR_NAME_TO_HEX[name.toLowerCase().trim()] || null;
}

// Returns matching color name suggestions for a partial query
function suggestColorNames(query) {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return Object.keys(COLOR_NAME_TO_HEX)
    .filter(name => name.startsWith(q) || name.includes(q))
    .slice(0, 6)
    .map(name => ({ name: name.replace(/\b\w/g, c => c.toUpperCase()), hex: COLOR_NAME_TO_HEX[name] }));
}

function onVariantNameInput(idx, val) {
  colorVariants[idx].name = val;
  const hex = colorNameToHex(val);
  if (hex) {
    colorVariants[idx].color = hex;
    // Update the color swatch preview and hidden input
    const swatch = document.getElementById(`variantSwatch_${idx}`);
    const picker = document.getElementById(`variantPicker_${idx}`);
    if (swatch) swatch.style.background = hex;
    if (picker) picker.value = hex;
  }
  // Show/hide suggestions
  renderVariantSuggestions(idx, val);
}

function onVariantPickerChange(idx, hex) {
  colorVariants[idx].color = hex;
  const swatch = document.getElementById(`variantSwatch_${idx}`);
  if (swatch) swatch.style.background = hex;
}

function selectVariantSuggestion(idx, name, hex) {
  colorVariants[idx].name  = name;
  colorVariants[idx].color = hex;
  const nameInput = document.getElementById(`variantName_${idx}`);
  const swatch    = document.getElementById(`variantSwatch_${idx}`);
  const picker    = document.getElementById(`variantPicker_${idx}`);
  const suggestions = document.getElementById(`variantSuggestions_${idx}`);
  if (nameInput) nameInput.value = name;
  if (swatch)    swatch.style.background = hex;
  if (picker)    picker.value = hex;
  if (suggestions) suggestions.innerHTML = "";
}

function renderVariantSuggestions(idx, query) {
  const container = document.getElementById(`variantSuggestions_${idx}`);
  if (!container) return;
  const matches = suggestColorNames(query);
  if (!matches.length) { container.innerHTML = ""; return; }
  container.innerHTML = matches.map(m => `
    <button type="button" class="color-suggestion-chip"
      onclick="selectVariantSuggestion(${idx},'${m.name}','${m.hex}')"
      style="--chip-color:${m.hex}">
      <span class="chip-dot" style="background:${m.hex}"></span>
      ${escapeHtml(m.name)}
    </button>`).join("");
}

function renderColorVariants() {
  const list = document.getElementById("colorVariantsList");
  if (!list) return;
  list.innerHTML = colorVariants.map((v, i) => `
    <div class="color-variant-row">

      <!-- Color preview swatch + hidden fine-tune picker -->
      <div class="color-preview-wrap" title="Fine-tune color">
        <div class="color-preview-swatch" id="variantSwatch_${i}"
          style="background:${v.color || '#cccccc'}"
          onclick="document.getElementById('variantPicker_${i}').click()"></div>
        <input type="color" id="variantPicker_${i}"
          value="${v.color || '#cccccc'}"
          style="position:absolute;opacity:0;width:0;height:0;pointer-events:none;"
          oninput="onVariantPickerChange(${i}, this.value)" />
      </div>

      <!-- Name input with live suggestions -->
      <div class="variant-name-wrap">
        <input type="text" id="variantName_${i}"
          placeholder="Type a color name e.g. Olive Green"
          value="${escapeHtml(v.name)}"
          oninput="onVariantNameInput(${i}, this.value)"
          autocomplete="off"
          style="padding:0.4rem;font-size:0.75rem;width:100%;" />
        <div class="color-suggestions" id="variantSuggestions_${i}"></div>
      </div>

      <!-- Photo upload -->
      <div style="display:flex;align-items:center;gap:0.4rem;flex-shrink:0;">
        <label class="variant-upload-btn" title="Upload photo for this colour">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          Photo
          <input type="file" accept="image/*" style="display:none" onchange="handleVariantImageFile(this,${i})" />
        </label>
        ${v.photo
          ? `<img class="variant-img-preview" src="${escapeHtml(v.photo)}" style="width:28px;height:34px;object-fit:cover;border-radius:2px;border:1px solid var(--border);">`
          : `<img class="variant-img-preview" style="display:none;width:28px;height:34px;object-fit:cover;border-radius:2px;border:1px solid var(--border);">`}
      </div>

      <button class="remove-variant-btn" onclick="removeColorVariant(${i})" title="Remove colour">✕</button>
    </div>`).join("");
}

// ─── SUBMIT (add or update) ───────────────────────────────────────────────
async function submitItem() {
  if (_uploadsInProgress > 0) {
    showToast("Please wait for uploads to finish.");
    return;
  }
  const editingId = document.getElementById("editingId")?.value;
  const isEdit    = !!editingId;
  const name      = document.getElementById("itemName")?.value.trim();
  const price     = parseInt(document.getElementById("itemPrice")?.value);
  const cat       = document.getElementById("itemCat")?.value;
  const isShoes   = cat === "Shoes";
  const isAcc     = cat === "Accessories";

  let sizes = "";
  if (!isShoes && !isAcc) sizes = document.getElementById("itemSizes")?.value.trim() || "";
  if (isShoes)            sizes = document.getElementById("itemShoeEU")?.value.trim() || "";

  const desc         = document.getElementById("itemDesc")?.value.trim() || "";
  const photo        = document.getElementById("itemPhotoUrl")?.value.trim() || "";
  const stock        = parseInt(document.getElementById("itemStock")?.value) || 10;
  const variantsJSON = colorVariants.length > 0 ? JSON.stringify(colorVariants) : "";

  if (!name || !price) { showToast("Name and price are required."); return; }

  const product = { name, price, category: cat, sizes, desc, photo, variants: variantsJSON, stock, photos: extraPhotos.length ? JSON.stringify(extraPhotos) : "" };
  if (!isEdit) product.createdAt = new Date().toISOString();

  try {
    if (isEdit) {
      await apiPost({ action: "updateProduct", id: parseInt(editingId), product });
      showToast("✅ Item updated.");
    } else {
      await apiPost({ action: "addProduct", product });
      showToast("✨ Item added!");
    }
    cancelAdminPanel();
    await loadProducts();
  } catch {
    showToast("Something went wrong. Check your connection.");
  }
}

// ─── EDIT ─────────────────────────────────────────────────────────────────
function openEditPanel(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  const editingIdEl = document.getElementById("editingId");
  if (!editingIdEl) {
    console.warn("openEditPanel: #editingId element not found — edit cannot be saved correctly.");
    return;
  }
  editingIdEl.value = id;
  document.getElementById("adminPanelTitle") && (document.getElementById("adminPanelTitle").textContent = "Edit item");
  document.getElementById("adminModeBadge")  && (document.getElementById("adminModeBadge").textContent = "Editing");
  document.getElementById("adminSubmitBtn")  && (document.getElementById("adminSubmitBtn").textContent = "Save changes");

  document.getElementById("itemName")  && (document.getElementById("itemName").value  = p.name     || "");
  document.getElementById("itemPrice") && (document.getElementById("itemPrice").value = p.price    || "");
  document.getElementById("itemCat")   && (document.getElementById("itemCat").value   = p.category || "Women");
  document.getElementById("itemDesc")  && (document.getElementById("itemDesc").value  = p.desc     || "");
  document.getElementById("itemStock") && (document.getElementById("itemStock").value = p.stock    || 10);

  onCategoryChange(p.category || "Women");

  if (p.category === "Shoes") {
    const shoeEU = document.getElementById("itemShoeEU");
    if (shoeEU) shoeEU.value = p.sizes || "";
  } else {
    const sizesInput = document.getElementById("itemSizes");
    if (sizesInput) sizesInput.value = p.sizes || "";
  }

  // Image preview
  const fileInput = document.getElementById("itemPhotoFile");
  if (fileInput) fileInput.value = "";
  const dropLabel = document.getElementById("adminDropzoneLabel");
  if (dropLabel) dropLabel.textContent = "Tap to choose a photo";

  const hasPhoto = p.photo && (p.photo.startsWith("http") || p.photo.startsWith("data:"));
  if (hasPhoto) {
    document.getElementById("itemPhotoUrl") && (document.getElementById("itemPhotoUrl").value = p.photo);
    previewAdminImage(p.photo);
  } else {
    const wrap = document.getElementById("adminImgPreview");
    if (wrap) wrap.style.display = "none";
  }

  // Colour variants
  colorVariants = [];
  try { if (p.variants) colorVariants = JSON.parse(p.variants); } catch (e) {}
  renderColorVariants();
  _updatePrimaryImageHint();

  // Extra photos
  extraPhotos = [];
  try { if (p.photos) extraPhotos = JSON.parse(p.photos); } catch (e) {}
  renderExtraPhotos();

  const panel = document.getElementById("adminPanel");
  if (panel) {
    panel.classList.add("visible");
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────
/**
 * Two-step delete: first tap turns the ✕ button into a "Confirm?" prompt.
 * A second tap within 3 seconds executes the delete. Any other interaction
 * resets the button automatically — no native confirm() dialog needed.
 */
function deleteItem(id) {
  const card = document.querySelector(`.product-card[data-id="${id}"]`);
  const btn  = card?.querySelector('.admin-delete-btn');
  if (!btn) return;

  if (btn.dataset.confirming === 'true') {
    // Second tap — execute delete
    _executeDelete(id);
    return;
  }

  // First tap — enter confirmation state
  btn.dataset.confirming = 'true';
  btn.textContent = 'Sure?';
  btn.style.background = 'var(--danger, #e53e3e)';
  btn.style.color = '#fff';

  // Auto-reset after 3 seconds if no second tap
  const timer = setTimeout(() => _resetDeleteBtn(btn), 3000);
  btn.dataset.confirmTimer = timer;

  // Reset if the user clicks anywhere else
  const reset = e => {
    if (!btn.contains(e.target)) {
      _resetDeleteBtn(btn);
      document.removeEventListener('click', reset);
    }
  };
  document.addEventListener('click', reset);
}

function _resetDeleteBtn(btn) {
  clearTimeout(btn.dataset.confirmTimer);
  btn.dataset.confirming = 'false';
  btn.textContent = '✕';
  btn.style.background = '';
  btn.style.color = '';
}

async function _executeDelete(id) {
  try {
    await apiPost({ action: "deleteProduct", id });
    products = products.filter(p => p.id !== id);

    // Remove from cart if present
    const cartBefore = cart.length;
    cart = cart.filter(c => c.id !== id);
    if (cart.length !== cartBefore) {
      saveCart();
      updateCartBadge();
      renderCartBody();
    }

    // Remove from wishlist if present
    const wishlistBefore = wishlist.length;
    wishlist = wishlist.filter(w => w.id !== id);
    if (wishlist.length !== wishlistBefore) {
      saveWishlist();
      updateWishlistBadge();
    }

    renderProducts();
    showToast("Item removed.");
  } catch {
    showToast("Couldn't delete item. Try again.");
  }
}

// ─── TOGGLE SOLD ──────────────────────────────────────────────────────────
async function toggleSold(id) {
  try {
    const result = await apiPost({ action: "toggleSold", id });
    const p = products.find(x => x.id === id);
    if (p) p.isSold = result.isSold;
    renderProducts(true);
    showToast(result.isSold ? "Marked as sold." : "Back in collection.");
  } catch {
    showToast("Couldn't update item.");
  }
}

// ─── EXTRA PHOTOS ─────────────────────────────────────────────────────────
let extraPhotos = []; // array of base64 strings

async function handleExtraPhotos(input) {
  const files = Array.from(input.files || []);
  if (!files.length) return;
  input.value = ""; // reset immediately so same file can be re-added

  // Upload all selected files in parallel
  _setUploading(+files.length);
  await Promise.all(files.map(async file => {
    try {
      const url = await uploadToCloudinary(file);
      extraPhotos.push(url);
      renderExtraPhotos();
    } catch (e) {
      showToast(`Failed to upload ${file.name}. Try again.`);
    } finally {
      _setUploading(-1);
    }
  }));
}

function removeExtraPhoto(idx) {
  extraPhotos.splice(idx, 1);
  renderExtraPhotos();
}

function renderExtraPhotos() {
  const list = document.getElementById("extraPhotosList");
  if (!list) return;
  list.innerHTML = extraPhotos.map((src, i) => `
    <div class="extra-photo-item">
      <img src="${src}" alt="Photo ${i + 1}">
      <button type="button" onclick="removeExtraPhoto(${i})" aria-label="Remove photo">✕</button>
    </div>`).join("");
}

// ─── IMAGE PREVIEW ────────────────────────────────────────────────────────
function previewAdminImage(url) {
  const wrap  = document.getElementById("adminImgPreview");
  const img   = document.getElementById("adminPreviewImg");
  const trimmed = (url || "").trim();
  if (trimmed && (trimmed.startsWith("http") || trimmed.startsWith("https") || trimmed.startsWith("data:"))) {
    if (img) img.src = trimmed;
    if (wrap) wrap.style.display = "flex";
  } else {
    if (wrap) wrap.style.display = "none";
    if (img) img.src = "";
  }
}

// ─── FILE UPLOAD ──────────────────────────────────────────────────────────
async function handleAdminImageFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  const label = document.getElementById("adminDropzoneLabel");
  if (label) label.textContent = "Uploading…";

  _setUploading(+1);
  try {
    const url = await uploadToCloudinary(file);
    const urlInput = document.getElementById("itemPhotoUrl");
    if (urlInput) urlInput.value = url;
    previewAdminImage(url);
    if (label) label.textContent = file.name;
  } catch (e) {
    showToast("Photo upload failed. Check your connection.");
    if (label) label.textContent = "Tap to choose a photo";
  } finally {
    _setUploading(-1);
  }
}

function clearAdminImage() {
  const urlInput  = document.getElementById("itemPhotoUrl");
  const fileInput = document.getElementById("itemPhotoFile");
  const label     = document.getElementById("adminDropzoneLabel");
  const wrap      = document.getElementById("adminImgPreview");

  if (urlInput)  urlInput.value  = "";
  if (fileInput) fileInput.value = "";
  if (label)     label.textContent = "Tap to choose a photo";
  if (wrap)      wrap.style.display = "none";
}

// ─── LOGO TAP → ADMIN LOGIN ───────────────────────────────────────────────
function initAdminTrigger() {
  const logoBtn = document.getElementById("logoTrigger");
  if (!logoBtn) return;

  logoBtn.addEventListener("click", () => {
    logoTapCount++;
    clearTimeout(logoTapTimer);
    logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 1800);

    // Subtle pulse feedback so the user knows taps are being counted
    logoBtn.classList.remove("logo-tap-pulse");
    // restart animation even if triggered again before it finishes
    void logoBtn.offsetWidth;
    logoBtn.classList.add("logo-tap-pulse");

    if (logoTapCount >= 5) {
      logoTapCount = 0;
      if (document.body.classList.contains("is-admin")) {
        _deactivateAdminUI();
      } else {
        openLoginModal();
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

// ─── ADMIN SESSION (HMAC token, stored in sessionStorage) ────────────────
const ADMIN_SESSION_KEY = 'mohrehub_admin_token';
const ADMIN_SESSION_EXP = 'mohrehub_admin_exp';

function getAdminToken() {
  try {
    const token = sessionStorage.getItem(ADMIN_SESSION_KEY);
    const exp   = parseInt(sessionStorage.getItem(ADMIN_SESSION_EXP) || '0');
    if (!token || Date.now() > exp) {
      clearAdminSession();
      return null;
    }
    return token;
  } catch (e) { return null; }
}

function saveAdminSession(token, expiresAt) {
  try {
    sessionStorage.setItem(ADMIN_SESSION_KEY, token);
    sessionStorage.setItem(ADMIN_SESSION_EXP, String(expiresAt));
  } catch (e) {}
}

function clearAdminSession() {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_EXP);
  } catch (e) {}
}

// ─── VERIFY ADMIN LOGIN (HMAC token flow) ─────────────────────────────────
async function verifyAdminLogin() {
  const password = document.getElementById("adminPasswordInput")?.value;
  if (!password) { showToast("Enter admin password"); return; }
  showToast("Verifying…");
  try {
    const res  = await fetch(CONFIG.SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "login", password }),
    });
    const data = await res.json();
    if (data.error || !data.token) {
      showToast("❌ Incorrect password.");
      return;
    }
    saveAdminSession(data.token, data.expiresAt);
    _activateAdminUI();
    closeLoginModal();
    showToast("✅ Admin mode active.");
  } catch {
    showToast("Connection error. Try again.");
  }
}

function _activateAdminUI() {
  document.body.classList.add("is-admin");
  const addBtn = document.getElementById("addItemBtn");
  if (addBtn) addBtn.style.display = "flex";
  const selectBtn = document.getElementById("adminSelectBtn");
  if (selectBtn) selectBtn.style.display = "flex";
  renderProducts();
}

function _deactivateAdminUI() {
  clearAdminSession();
  document.body.classList.remove("is-admin");
  const addBtn = document.getElementById("addItemBtn");
  if (addBtn) addBtn.style.display = "none";
  const selectBtn = document.getElementById("adminSelectBtn");
  if (selectBtn) selectBtn.style.display = "none";
  if (adminSelectMode) toggleAdminSelectMode();
  document.getElementById("adminPanel")?.classList.remove("visible");
  document.querySelectorAll('.admin-card-btns').forEach(el => el.remove());
  renderProducts();
  showToast("Logged out.");
}

// Restore session on page load if token is still valid
function restoreAdminSession() {
  if (getAdminToken()) _activateAdminUI();
}

// ─── INJECT ADD-ITEM BUTTON INTO NAV ─────────────────────────────────────
function injectAdminNavButton() {
  const navActions = document.querySelector('.nav-actions');
  if (!navActions || document.getElementById("addItemBtn")) return;

  const adminBtn = document.createElement('button');
  adminBtn.id = "addItemBtn";
  adminBtn.className = "icon-btn";
  adminBtn.setAttribute('aria-label', 'Add item');
  adminBtn.innerHTML = `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
    </svg>`;
  adminBtn.style.display = "none";
  adminBtn.onclick = toggleAdminPanel;
  navActions.appendChild(adminBtn);

  injectAdminSelectButton(navActions);
}

// ─── BULK SELECT MODE ─────────────────────────────────────────────────────

/**
 * Inject the "Select" toggle button into the nav, shown only in admin mode.
 */
function injectAdminSelectButton(navActions) {
  if (document.getElementById("adminSelectBtn")) return;

  const selectBtn = document.createElement('button');
  selectBtn.id = "adminSelectBtn";
  selectBtn.className = "icon-btn";
  selectBtn.setAttribute('aria-label', 'Select multiple items');
  selectBtn.innerHTML = `
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>`;
  selectBtn.style.display = "none";
  selectBtn.onclick = toggleAdminSelectMode;
  navActions.appendChild(selectBtn);
}

/**
 * Toggle bulk-select mode on/off. Clears any current selection when exiting.
 */
function toggleAdminSelectMode() {
  adminSelectMode = !adminSelectMode;
  if (!adminSelectMode) adminSelectedIds.clear();
  document.body.classList.toggle("admin-select-mode", adminSelectMode);

  const selectBtn = document.getElementById("adminSelectBtn");
  if (selectBtn) {
    selectBtn.classList.toggle("active", adminSelectMode);
    selectBtn.setAttribute('aria-label', adminSelectMode ? 'Exit selection mode' : 'Select multiple items');
  }

  renderBulkActionBar();
  renderProducts(true);
}

/**
 * Called from each product card's onclick. In select mode, toggles that
 * card's selection instead of opening the detail panel.
 */
function _handleCardActivate(id) {
  if (adminSelectMode) {
    toggleCardSelection(id);
    return;
  }
  openDetailPanel(id);
}

function toggleCardSelection(id) {
  if (adminSelectedIds.has(id)) {
    adminSelectedIds.delete(id);
  } else {
    adminSelectedIds.add(id);
  }

  const card = document.querySelector(`.product-card[data-id="${id}"]`);
  if (card) {
    const selected = adminSelectedIds.has(id);
    card.classList.toggle("selected-for-bulk", selected);
    card.setAttribute('aria-pressed', selected ? 'true' : 'false');
  }

  renderBulkActionBar();
}

/**
 * Render (or remove) the floating bulk action bar based on current
 * select mode + selection count.
 */
function renderBulkActionBar() {
  let bar = document.getElementById("bulkActionBar");

  if (!adminSelectMode) {
    bar?.remove();
    return;
  }

  if (!bar) {
    bar = document.createElement('div');
    bar.id = "bulkActionBar";
    bar.className = "bulk-action-bar";
    document.body.appendChild(bar);
  }

  const count    = adminSelectedIds.size;
  const total    = products.filter(p => !p.isSold).length; // visible, non-sold cards
  const allSelected = count === total && total > 0;

  bar.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.5rem;">
      <span class="bulk-action-count">${count} selected</span>
      <button class="btn-ghost" style="font-size:0.72rem;padding:0.2rem 0.5rem;"
        onclick="${allSelected ? 'bulkDeselectAll()' : 'bulkSelectAll()'}">
        ${allSelected ? 'Deselect all' : 'Select all'}
      </button>
    </div>
    <div class="bulk-action-buttons">
      <button class="btn-ghost" ${count === 0 ? 'disabled' : ''} onclick="bulkSetSold(true)">Mark Sold</button>
      <button class="btn-ghost" ${count === 0 ? 'disabled' : ''} onclick="bulkSetSold(false)">Mark Available</button>
      <button class="btn-primary" onclick="toggleAdminSelectMode()">Done</button>
    </div>`;
}

/**
 * Select all currently visible (non-sold) product cards.
 */
function bulkSelectAll() {
  products.filter(p => !p.isSold).forEach(p => {
    adminSelectedIds.add(p.id);
    const card = document.querySelector(`.product-card[data-id="${p.id}"]`);
    if (card) {
      card.classList.add('selected-for-bulk');
      card.setAttribute('aria-pressed', 'true');
    }
  });
  renderBulkActionBar();
}

/**
 * Deselect all currently selected cards.
 */
function bulkDeselectAll() {
  adminSelectedIds.forEach(id => {
    const card = document.querySelector(`.product-card[data-id="${id}"]`);
    if (card) {
      card.classList.remove('selected-for-bulk');
      card.setAttribute('aria-pressed', 'false');
    }
  });
  adminSelectedIds.clear();
  renderBulkActionBar();
}

/**
 * Apply a sold/available status to all selected products.
 * Sends one toggleSold-equivalent request per item; only fires for
 * items whose current state differs from the target.
 * @param {boolean} sold - target isSold value
 */
async function bulkSetSold(sold) {
  const ids = Array.from(adminSelectedIds);
  if (!ids.length) return;

  const bar = document.getElementById("bulkActionBar");
  if (bar) {
    bar.querySelectorAll('button').forEach(b => b.disabled = true);
    const countEl = bar.querySelector('.bulk-action-count');
    if (countEl) countEl.textContent = `Updating ${ids.length} item${ids.length > 1 ? 's' : ''}…`;
  }

  let succeeded = 0;
  let failed = 0;

  for (const id of ids) {
    const p = products.find(x => x.id === id);
    if (!p || p.isSold === sold) { succeeded++; continue; }
    try {
      const result = await apiPost({ action: "toggleSold", id });
      p.isSold = result.isSold;
      succeeded++;
    } catch (e) {
      failed++;
    }
  }

  adminSelectedIds.clear();
  renderProducts(true);

  if (failed === 0) {
    showToast(`${succeeded} item${succeeded > 1 ? 's' : ''} updated.`);
  } else {
    showToast(`${succeeded} updated, ${failed} failed. Try again for the rest.`);
  }

  toggleAdminSelectMode();
}