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

function handleVariantImageFile(input, idx) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    colorVariants[idx].photo = e.target.result;
    // Update the preview thumbnail next to the input
    const row = input.closest('.color-variant-row');
    if (row) {
      const preview = row.querySelector('.variant-img-preview');
      if (preview) { preview.src = e.target.result; preview.style.display = 'block'; }
    }
  };
  reader.readAsDataURL(file);
}

// ─── COLOR NAME LOOKUP ────────────────────────────────────────────────────
// Maps a hex color to the nearest human-readable name using a curated palette.
const COLOR_NAMES = {
  "#000000":"Black","#111111":"Black","#1a1a1a":"Jet Black","#222222":"Charcoal",
  "#333333":"Dark Charcoal","#444444":"Charcoal","#555555":"Dim Grey",
  "#666666":"Grey","#777777":"Grey","#888888":"Medium Grey","#999999":"Silver Grey",
  "#aaaaaa":"Silver","#bbbbbb":"Light Silver","#cccccc":"Light Grey",
  "#dddddd":"Pale Grey","#eeeeee":"Off White","#f5f5f5":"Ghost White","#ffffff":"White",
  "#ff0000":"Red","#cc0000":"Dark Red","#990000":"Crimson","#ff4444":"Coral Red",
  "#ff6666":"Light Red","#ff9999":"Blush","#ffcccc":"Pale Pink",
  "#ff69b4":"Hot Pink","#ff1493":"Deep Pink","#c71585":"Berry",
  "#ff6b6b":"Salmon","#e8748a":"Rose","#c9536a":"Dusty Rose",
  "#ff8c00":"Dark Orange","#ff6600":"Burnt Orange","#ff4500":"Orange Red",
  "#ffa500":"Orange","#ffb347":"Peach","#ffd700":"Gold","#ffff00":"Yellow",
  "#f5e642":"Lemon","#fffacd":"Cream","#f5f0e8":"Ivory","#faebd7":"Antique White",
  "#8b4513":"Saddle Brown","#a0522d":"Sienna","#cd853f":"Peru","#deb887":"Burlywood",
  "#d2b48c":"Tan","#c8a882":"Sand","#e8d5b0":"Champagne","#f5deb3":"Wheat",
  "#006400":"Dark Green","#008000":"Green","#228b22":"Forest Green",
  "#2e8b57":"Sea Green","#3cb371":"Medium Green","#90ee90":"Light Green",
  "#98fb98":"Pale Green","#adff2f":"Yellow Green","#556b2f":"Olive Green",
  "#808000":"Olive","#6b8e23":"Moss Green","#8fbc8f":"Sage",
  "#008080":"Teal","#20b2aa":"Light Teal","#48d1cc":"Medium Turquoise",
  "#40e0d0":"Turquoise","#00ced1":"Dark Turquoise","#00bcd4":"Cyan",
  "#000080":"Navy","#00008b":"Dark Blue","#0000cd":"Medium Blue",
  "#0000ff":"Blue","#4169e1":"Royal Blue","#6495ed":"Cornflower Blue",
  "#87ceeb":"Sky Blue","#add8e6":"Light Blue","#b0c4de":"Steel Blue",
  "#191970":"Midnight Blue","#1e3a5f":"Deep Navy","#2c3e6b":"Denim",
  "#4b0082":"Indigo","#8b008b":"Dark Magenta","#9400d3":"Dark Violet",
  "#9932cc":"Dark Orchid","#ba55d3":"Medium Orchid","#dda0dd":"Plum",
  "#ee82ee":"Violet","#da70d6":"Orchid","#ff00ff":"Magenta",
  "#800020":"Burgundy","#722f37":"Wine","#a52a2a":"Brown","#800000":"Maroon",
  "#b8860b":"Dark Goldenrod","#8c7e6c":"Warm Taupe","#a89b8a":"Taupe",
  "#d4c9bc":"Linen","#e8e0d5":"Pearl","#f0ebe3":"Eggshell",
};

function hexToColorName(hex) {
  // Exact match first
  const lower = hex.toLowerCase();
  if (COLOR_NAMES[lower]) return COLOR_NAMES[lower];

  // Find nearest by RGB distance
  const r1 = parseInt(lower.slice(1,3),16);
  const g1 = parseInt(lower.slice(3,5),16);
  const b1 = parseInt(lower.slice(5,7),16);
  let best = null, bestDist = Infinity;
  for (const [k, name] of Object.entries(COLOR_NAMES)) {
    const r2 = parseInt(k.slice(1,3),16);
    const g2 = parseInt(k.slice(3,5),16);
    const b2 = parseInt(k.slice(5,7),16);
    const dist = (r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2;
    if (dist < bestDist) { bestDist = dist; best = name; }
  }
  return best || "";
}

function onVariantColorChange(idx, hex) {
  colorVariants[idx].color = hex;
  // Only auto-fill name if the user hasn't typed a custom one
  const nameInput = document.getElementById(`variantName_${idx}`);
  if (nameInput && !nameInput.dataset.userEdited) {
    const suggested = hexToColorName(hex);
    nameInput.value = suggested;
    colorVariants[idx].name = suggested;
  }
}

function renderColorVariants() {
  const list = document.getElementById("colorVariantsList");
  if (!list) return;
  list.innerHTML = colorVariants.map((v, i) => `
    <div class="color-variant-row">
      <div class="color-picker-wrap">
        <input type="color" class="color-swatch-input"
          value="${v.color || '#8c7e6c'}"
          oninput="onVariantColorChange(${i}, this.value)"
          title="Pick a colour" />
        <span class="color-hex-label">${v.color || '#8c7e6c'}</span>
      </div>
      <input type="text" id="variantName_${i}" placeholder="e.g. Midnight Blue"
        value="${escapeHtml(v.name)}"
        oninput="colorVariants[${i}].name=this.value; this.dataset.userEdited='1';"
        style="padding:0.4rem;font-size:0.75rem;" />
      <div style="display:flex;align-items:center;gap:0.4rem;">
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

  // Update hex labels live as color picker moves
  list.querySelectorAll('.color-swatch-input').forEach((input, i) => {
    input.addEventListener('input', () => {
      const label = input.closest('.color-picker-wrap')?.querySelector('.color-hex-label');
      if (label) label.textContent = input.value;
    });
  });
}

// ─── SUBMIT (add or update) ───────────────────────────────────────────────
async function submitItem() {
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

  document.getElementById("editingId") && (document.getElementById("editingId").value = id);
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

function handleExtraPhotos(input) {
  const files = Array.from(input.files || []);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      extraPhotos.push(e.target.result);
      renderExtraPhotos();
    };
    reader.readAsDataURL(file);
  });
  input.value = ""; // reset so same file can be added again if needed
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
function handleAdminImageFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  const label = document.getElementById("adminDropzoneLabel");
  if (label) label.textContent = file.name;

  const reader = new FileReader();
  reader.onload = function (e) {
    const urlInput = document.getElementById("itemPhotoUrl");
    if (urlInput) urlInput.value = e.target.result;
    previewAdminImage(e.target.result);
  };
  reader.readAsDataURL(file);
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
        // Log out
        ADMIN_SECRET_KEY = "";
        document.body.classList.remove("is-admin");
        document.getElementById("addItemBtn") && (document.getElementById("addItemBtn").style.display = "none");
        document.getElementById("adminPanel")?.classList.remove("visible");
        showToast("Logged out.");
        renderProducts();
      } else {
        openLoginModal();
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
}

// ─── VERIFY ADMIN LOGIN (server-side check) ───────────────────────────────
async function verifyAdminLogin() {
  const key = document.getElementById("adminPasswordInput")?.value;
  if (!key) { showToast("Enter admin password"); return; }
  showToast("Verifying…");
  try {
    const res = await fetch(CONFIG.SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "toggleSold", id: -1, secret: key }),
    });
    const data = await res.json();
    if (data.error === "Unauthorised") {
      showToast("❌ Incorrect password.");
    } else {
      ADMIN_SECRET_KEY = key;
      document.body.classList.add("is-admin");
      const addBtn = document.getElementById("addItemBtn");
      if (addBtn) addBtn.style.display = "flex";
      closeLoginModal();
      renderProducts();
      showToast("✅ Admin mode active.");
    }
  } catch {
    showToast("Connection error. Try again.");
  }
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