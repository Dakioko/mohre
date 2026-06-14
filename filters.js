// ─── HERO CATEGORY LINKS ──────────────────────────────────────────────────
function goToCategory(cat) {
  const btn = document.querySelector(`.filter-btn[data-category="${cat}"]`);
  setFilter(cat, btn);
}

// ─── CATEGORY FILTER ──────────────────────────────────────────────────────
function setFilter(cat, btn) {
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  currentFilter = cat;
  renderProducts();
  scrollToShop();
  saveFilterPreference();

  // Clear the search info bar — its result count is now stale since the
  // category has changed but the search term is still active.
  const bar = document.getElementById("searchInfoBar");
  if (bar) bar.style.display = "none";
}

function initFilterButtons() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => setFilter(btn.getAttribute("data-category"), btn));
  });
}

// ─── SEARCH ───────────────────────────────────────────────────────────────
let searchDebounce;

function handleSearch(val) {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    currentSearch = val.trim().toLowerCase();

    const desktopSearch = document.getElementById("desktopSearch");
    const mobileSearch  = document.getElementById("mobileSearch");
    if (desktopSearch) desktopSearch.value = val;
    if (mobileSearch)  mobileSearch.value  = val;

    renderProducts();
    if (currentSearch) scrollToShop();

    const bar = document.getElementById("searchInfoBar");
    if (currentSearch && bar) {
      bar.style.display = "flex";
      const textEl = document.getElementById("searchInfoText");
      if (textEl) textEl.textContent = `${getFiltered().length} result(s) for "${escapeHtml(val.trim())}"`;
    } else if (bar) {
      bar.style.display = "none";
    }
    saveFilterPreference();
  }, 250);
}

function clearSearch() {
  currentSearch = "";
  const desktopSearch = document.getElementById("desktopSearch");
  const mobileSearch  = document.getElementById("mobileSearch");
  if (desktopSearch) desktopSearch.value = "";
  if (mobileSearch)  mobileSearch.value  = "";
  const bar = document.getElementById("searchInfoBar");
  if (bar) bar.style.display = "none";
  renderProducts();
  saveFilterPreference();
}

function resetViewToShop() {
  setFilter("All", document.querySelector('.filter-btn[data-category="All"]'));
  clearSearch();
}

function clearCategoryFilter() {
  setFilter("All", document.querySelector('.filter-btn[data-category="All"]'));
}

// ─── PERSIST / RESTORE FILTER PREFERENCES ────────────────────────────────
function saveFilterPreference() {
  try {
    localStorage.setItem('filterPreference', JSON.stringify({ category: currentFilter, savedAt: Date.now() }));
  } catch (e) {}
}

function applySavedFilters() {
  try {
    const saved = localStorage.getItem('filterPreference');
    if (!saved) return;
    const prefs = JSON.parse(saved);
    const age = Date.now() - (prefs.savedAt || 0);
    if (age > 24 * 60 * 60 * 1000) {
      localStorage.removeItem('filterPreference');
      return;
    }
    if (prefs.category && prefs.category !== 'All') {
      const filterBtn = document.querySelector(`.filter-btn[data-category="${prefs.category}"]`);
      if (filterBtn) setFilter(prefs.category, filterBtn);
    }
  } catch (e) {}
}