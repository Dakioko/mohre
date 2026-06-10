// ─── PRICE FILTER STATE ───────────────────────────────────────────────────
let priceFilterActive = false;
let priceMinVal = 0;
let priceMaxVal = 50000;

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

// Attach filter button listeners (called after DOM ready)
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

    // Keep both search inputs in sync
    const desktopSearch = document.getElementById("desktopSearch");
    const mobileSearch = document.getElementById("mobileSearch");
    if (desktopSearch) desktopSearch.value = val;
    if (mobileSearch) mobileSearch.value = val;

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
  const mobileSearch = document.getElementById("mobileSearch");
  if (desktopSearch) desktopSearch.value = "";
  if (mobileSearch) mobileSearch.value = "";
  const bar = document.getElementById("searchInfoBar");
  if (bar) bar.style.display = "none";
  renderProducts();
  updateActiveFiltersBar();
  saveFilterPreference();
}

function resetViewToShop() {
  setFilter("All", document.querySelector('.filter-btn[data-category="All"]'));
  clearSearch();
  clearPriceFilter();
}

// ─── PRICE FILTER DROPDOWN ────────────────────────────────────────────────
function togglePriceFilter() {
  const dropdown = document.getElementById("priceFilterDropdown");
  const trigger = document.getElementById("priceFilterTrigger");
  if (!dropdown || !trigger) return;

  const isOpen = dropdown.classList.contains("open");
  if (isOpen) {
    dropdown.classList.remove("open");
    trigger.classList.remove("active");
    return;
  }

  dropdown.classList.add("open");
  trigger.classList.add("active");

  // Close when clicking outside — use AbortController to avoid stacking listeners
  const ac = new AbortController();
  document.addEventListener('click', function closeDropdown(e) {
    if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
      dropdown.classList.remove("open");
      trigger.classList.remove("active");
      ac.abort();
    }
  }, { signal: ac.signal });
}

function updatePriceRange(e) {
  const minSlider = document.getElementById("priceMinSlider");
  const maxSlider = document.getElementById("priceMaxSlider");
  const minInput = document.getElementById("priceMinInput");
  const maxInput = document.getElementById("priceMaxInput");

  if (!minSlider || !maxSlider) return;

  priceMinVal = parseInt(minSlider.value);
  priceMaxVal = parseInt(maxSlider.value);

  // Prevent sliders crossing
  if (priceMinVal > priceMaxVal) {
    if (e && e.target === minSlider) {
      priceMinVal = priceMaxVal;
      minSlider.value = priceMaxVal;
    } else {
      priceMaxVal = priceMinVal;
      maxSlider.value = priceMinVal;
    }
  }

  if (minInput) minInput.value = priceMinVal;
  if (maxInput) maxInput.value = priceMaxVal;

  // Update the range fill track
  const fill = document.getElementById("priceRangeFill");
  const max = parseInt(maxSlider.max);
  if (fill) {
    const left = (priceMinVal / max) * 100;
    const right = (priceMaxVal / max) * 100;
    fill.style.left = left + '%';
    fill.style.width = (right - left) + '%';
  }

  // Update trigger label
  const label = document.getElementById("priceFilterLabel");
  if (label) {
    if (priceMinVal > 0 || priceMaxVal < max) {
      label.textContent = `KSh ${priceMinVal.toLocaleString()} - ${priceMaxVal.toLocaleString()}`;
      priceFilterActive = true;
    } else {
      label.textContent = "All prices";
      priceFilterActive = false;
    }
  }

  renderProducts();
  updateActiveFiltersBar();
  saveFilterPreference();
}

function updatePriceFromInput() {
  const minInput = document.getElementById("priceMinInput");
  const maxInput = document.getElementById("priceMaxInput");
  const minSlider = document.getElementById("priceMinSlider");
  const maxSlider = document.getElementById("priceMaxSlider");

  if (!minInput || !maxInput || !maxSlider) return;

  const maxLimit = parseInt(maxSlider.max);
  let newMin = Math.max(0, Math.min(parseInt(minInput.value) || 0, maxLimit));
  let newMax = Math.min(maxLimit, Math.max(parseInt(maxInput.value) || maxLimit, newMin));

  if (minSlider) minSlider.value = newMin;
  if (maxSlider) maxSlider.value = newMax;

  updatePriceRange();
}

function setPricePreset(min, max) {
  const minSlider = document.getElementById("priceMinSlider");
  const maxSlider = document.getElementById("priceMaxSlider");
  if (!maxSlider) return;
  const maxLimit = parseInt(maxSlider.max);
  if (minSlider) minSlider.value = min;
  if (maxSlider) maxSlider.value = Math.min(max, maxLimit);
  updatePriceRange();
}

function clearPriceFilter() {
  const minSlider = document.getElementById("priceMinSlider");
  const maxSlider = document.getElementById("priceMaxSlider");
  if (!maxSlider) return;
  const max = parseInt(maxSlider.max);
  if (minSlider) minSlider.value = 0;
  if (maxSlider) maxSlider.value = max;
  updatePriceRange();
}

// ─── ACTIVE FILTERS BAR ───────────────────────────────────────────────────
function updateActiveFiltersBar() {
  const bar = document.getElementById("activeFiltersBar");
  if (!bar) return;
  const chips = [];

  if (currentFilter !== "All") {
    chips.push(`
      <span class="filter-chip" onclick="resetViewToShop()">
        ${escapeHtml(currentFilter)}
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </span>`);
  }

  if (priceFilterActive && (priceMinVal > 0 || priceMaxVal < 50000)) {
    chips.push(`
      <span class="filter-chip" onclick="clearPriceFilter()">
        KSh ${priceMinVal.toLocaleString()}–${priceMaxVal.toLocaleString()}
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

// ─── PERSIST / RESTORE FILTER PREFERENCES ─────────────────────────────────
function saveFilterPreference() {
  const preference = {
    category: currentFilter,
    priceRange: { min: priceMinVal, max: priceMaxVal },
    sortBy: document.getElementById("sortSelect")?.value,
    priceActive: priceFilterActive
  };
  try { localStorage.setItem('filterPreference', JSON.stringify(preference)); } catch (e) {}
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
    if (prefs.sortBy) {
      const sortSelect = document.getElementById("sortSelect");
      if (sortSelect) sortSelect.value = prefs.sortBy;
    }
    if (prefs.priceActive && prefs.priceRange) {
      priceFilterActive = true;
      priceMinVal = prefs.priceRange.min;
      priceMaxVal = prefs.priceRange.max;
      const minSlider = document.getElementById("priceMinSlider");
      const maxSlider = document.getElementById("priceMaxSlider");
      if (minSlider) minSlider.value = priceMinVal;
      if (maxSlider) maxSlider.value = priceMaxVal;
      updatePriceRange();
      document.getElementById("priceFilterDropdown")?.classList.add("open");
      document.getElementById("priceFilterTrigger")?.classList.add("active");
    }
  } catch (e) {}
}

// ─── PRICE SLIDER INIT ────────────────────────────────────────────────────
function initPriceSliders() {
  const minSlider = document.getElementById("priceMinSlider");
  const maxSlider = document.getElementById("priceMaxSlider");
  if (minSlider) minSlider.addEventListener('input', e => updatePriceRange(e));
  if (maxSlider) maxSlider.addEventListener('input', e => updatePriceRange(e));
}

// ─── FILTER COUNTS (stub kept for backward compat) ────────────────────────
function updateFilterCounts() {
  // Badge counts removed (cluttered the filter bar).
  // Stub retained so callers don't throw after product load.
}
