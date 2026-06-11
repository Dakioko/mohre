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
function addColorVariant() {
  colorVariants.push({ name: "", color: "#8c7e6c", photo: "" });
  renderColorVariants();
}

function removeColorVariant(idx) {
  colorVariants.splice(idx, 1);
  renderColorVariants();
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
// Type a name, get a hex. Reverse of the old flow.
const COLOR_NAME_TO_HEX = {
  "black":"#000000","jet black":"#1a1a1a","charcoal":"#333333","dark charcoal":"#333333",
  "dim grey":"#555555","dim gray":"#555555","grey":"#777777","gray":"#777777",
  "medium grey":"#888888","medium gray":"#888888","silver grey":"#999999","silver gray":"#999999",
  "silver":"#aaaaaa","light silver":"#bbbbbb","light grey":"#cccccc","light gray":"#cccccc",
  "pale grey":"#dddddd","pale gray":"#dddddd","off white":"#eeeeee","ghost white":"#f5f5f5","white":"#ffffff",
  "red":"#ff0000","dark red":"#cc0000","crimson":"#990000","coral red":"#ff4444",
  "light red":"#ff6666","blush":"#ff9999","pale pink":"#ffcccc",
  "hot pink":"#ff69b4","deep pink":"#ff1493","berry":"#c71585",
  "salmon":"#ff6b6b","rose":"#e8748a","dusty rose":"#c9536a","blush pink":"#ffb6c1",
  "dark orange":"#ff8c00","burnt orange":"#ff6600","orange red":"#ff4500",
  "orange":"#ffa500","peach":"#ffb347","gold":"#ffd700","yellow":"#ffff00",
  "lemon":"#f5e642","cream":"#fffacd","ivory":"#f5f0e8","antique white":"#faebd7",
  "saddle brown":"#8b4513","sienna":"#a0522d","peru":"#cd853f","burlywood":"#deb887",
  "tan":"#d2b48c","sand":"#c8a882","champagne":"#e8d5b0","wheat":"#f5deb3","camel":"#c19a6b",
  "dark green":"#006400","green":"#008000","forest green":"#228b22",
  "sea green":"#2e8b57","medium green":"#3cb371","light green":"#90ee90",
  "pale green":"#98fb98","yellow green":"#adff2f","olive green":"#556b2f",
  "olive":"#808000","moss green":"#6b8e23","sage":"#8fbc8f","mint":"#98ff98",
  "teal":"#008080","light teal":"#20b2aa","turquoise":"#40e0d0","cyan":"#00bcd4",
  "navy":"#000080","dark blue":"#00008b","medium blue":"#0000cd","blue":"#0000ff",
  "royal blue":"#4169e1","cornflower blue":"#6495ed","sky blue":"#87ceeb",
  "light blue":"#add8e6","steel blue":"#b0c4de","baby blue":"#89cff0",
  "midnight blue":"#191970","deep navy":"#1e3a5f","denim":"#1560bd","cobalt":"#0047ab",
  "indigo":"#4b0082","dark violet":"#9400d3","purple":"#800080",
  "dark orchid":"#9932cc","medium orchid":"#ba55d3","plum":"#dda0dd",
  "violet":"#ee82ee","orchid":"#da70d6","magenta":"#ff00ff","lavender":"#e6e6fa",
  "lilac":"#c8a2c8","mauve":"#e0b0ff",
  "burgundy":"#800020","wine":"#722f37","brown":"#a52a2a","maroon":"#800000",
  "dark goldenrod":"#b8860b","warm taupe":"#8c7e6c","taupe":"#a89b8a",
  "linen":"#d4c9bc","pearl":"#e8e0d5","eggshell":"#f0ebe3","nude":"#e3bc9a",
  "mustard":"#ffdb58","terracotta":"#e2725b","rust":"#b7410e","copper":"#b87333",
  "emerald":"#50c878","jade":"#00a86b","khaki":"#c3b091","beige":"#f5f5dc",
  "chocolate":"#7b3f00","coffee":"#6f4e37","mocha":"#967259",
};

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
async function deleteItem(id) {
  if (!confirm("Remove this item from the collection?")) return;
  try {
    await apiPost({ action: "deleteProduct", id });
    products = products.filter(p => p.id !== id);
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
    renderProducts();
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
    logoTapTimer = setTimeout(() => { logoTapCount = 0; }, 1200);

    if (logoTapCount >= 3) {
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
  renderProducts();
}

function _deactivateAdminUI() {
  clearAdminSession();
  ADMIN_SECRET_KEY = ""; // keep legacy var neutral
  document.body.classList.remove("is-admin");
  const addBtn = document.getElementById("addItemBtn");
  if (addBtn) addBtn.style.display = "none";
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
}