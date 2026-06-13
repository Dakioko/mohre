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
  updateActiveFiltersBar();
  saveFilterPreference();
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
  updateActiveFiltersBar();
  saveFilterPreference();
}

function resetViewToShop() {
  setFilter("All", document.querySelector('.filter-btn[data-category="All"]'));
  clearSearch();
}

function clearCategoryFilter() {
  setFilter("All", document.querySelector('.filter-btn[data-category="All"]'));
}

// ─── ACTIVE FILTERS BAR ───────────────────────────────────────────────────
function updateActiveFiltersBar() {
  const bar = document.getElementById("activeFiltersBar");
  if (!bar) return;
  const chips = [];

  if (currentFilter !== "All") {
    chips.push(`
      <span class="filter-chip" onclick="clearCategoryFilter()">
        ${escapeHtml(currentFilter)}
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </span>`);
  }

  if (currentSearch) {
    chips.push(`
      <span class="filter-chip" onclick="clearSearch()">
        "${escapeHtml(currentSearch)}"
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </span>`);
  }

  bar.innerHTML = chips.join('');
  bar.classList.toggle("visible", chips.length > 0);
}

// ─── PERSIST / RESTORE FILTER PREFERENCES ────────────────────────────────
function saveFilterPreference() {
  try {
    localStorage.setItem('filterPreference', JSON.stringify({ category: currentFilter }));
  } catch (e) {}
}

function applySavedFilters() {
  try {
    const saved = localStorage.getItem('filterPreference');
    if (!saved) return;
    const prefs = JSON.parse(saved);
    if (prefs.category && prefs.category !== 'All') {
      const filterBtn = document.querySelector(`.filter-btn[data-category="${prefs.category}"]`);
      if (filterBtn) setFilter(prefs.category, filterBtn);
    }
  } catch (e) {}
}