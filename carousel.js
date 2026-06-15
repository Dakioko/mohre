// ─── HERO CAROUSEL ────────────────────────────────────────────────────────
(function () {
  let currentIndex  = 0;
  let slideInterval = null;

  function updateHeroSlider(index) {
    const slides     = document.querySelectorAll('.hero-carousel-container .slide-img');
    const indicators = document.querySelectorAll('.hero-carousel-container .indicator-dash');
    slides.forEach(s => s.classList.remove('active'));
    indicators.forEach(i => i.classList.remove('active'));
    if (slides[index]) slides[index].classList.add('active');
    if (indicators[index]) indicators[index].classList.add('active');
  }

  function nextHeroSlide() {
    const slides = document.querySelectorAll('.hero-carousel-container .slide-img');
    if (!slides.length) return;
    currentIndex = (currentIndex + 1) % slides.length;
    updateHeroSlider(currentIndex);
  }

  window.jumpToSlide = function (index) {
    currentIndex = index;
    updateHeroSlider(currentIndex);
    clearInterval(slideInterval);
    slideInterval = setInterval(nextHeroSlide, 7000);
  };

  /**
   * Called from products.js after products are loaded.
   * Picks up to 3 products with photos and builds the carousel.
   */
  window.initHeroCarousel = function (products) {
    // Featured products sorted by featuredAt descending — most recently starred win.
    // Falls back to newest unsold products if fewer than 3 are featured.
    const featured = products
      .filter(p => !p.isSold && p.isFeatured && (p.photo || _parseJSON(p.variants, []).some(v => v.photo)))
      .sort((a, b) => new Date(b.featuredAt || 0) - new Date(a.featuredAt || 0))
      .slice(0, 3);

    const fallback = products
      .filter(p => !p.isSold && (p.photo || _parseJSON(p.variants, []).some(v => v.photo)) && !p.isFeatured)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    const pool = [...featured, ...fallback].slice(0, 3);

    // Resolve the display image — use primary photo or first variant photo
    pool.forEach(p => {
      if (!p.photo) {
        const v = _parseJSON(p.variants, []).find(v => v.photo);
        if (v) p._heroPhoto = v.photo;
      } else {
        p._heroPhoto = p.photo;
      }
    });

    const wrapper    = document.getElementById('heroSlideWrapper');
    const indicators = document.getElementById('heroIndicators');
    if (!wrapper || !indicators || !pool.length) return;

    wrapper.innerHTML = pool.map((p, i) => `
      <img class="slide-img${i === 0 ? ' active' : ''}"
        src="${p._heroPhoto || p.photo}"
        alt="${p.name}"
        onerror="this.style.display='none'">`
    ).join('');

    indicators.innerHTML = pool.map((_, i) => `
      <div class="indicator-dash${i === 0 ? ' active' : ''}"
        onclick="jumpToSlide(${i})"></div>`
    ).join('');

    currentIndex = 0;
    clearInterval(slideInterval);
    if (pool.length > 1) {
      slideInterval = setInterval(nextHeroSlide, 7000);

      // Swipe on mobile
      let startX = 0;
      wrapper.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
      }, { passive: true });
      wrapper.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 50) jumpToSlide((currentIndex + (dx < 0 ? 1 : -1) + pool.length) % pool.length);
      }, { passive: true });
    }
  };
})();