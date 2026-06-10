// ─── MAIN INIT ────────────────────────────────────────────────────────────
// All one-time setup that requires the DOM to be ready.

document.addEventListener('DOMContentLoaded', () => {

  // 1. Theme
  initDarkMode();

  // 2. Cart badge + render (restores persisted cart)
  updateCartBadge();
  renderCartBody();
  updateWishlistBadge();

  // 3. Filter buttons
  initFilterButtons();

  // 5. Back-to-top
  initBackToTop();

  // 7. Admin trigger (logo triple-tap)
  injectAdminNavButton();
  initAdminTrigger();

  // 8. Swipe-to-close gestures on panels
  const cartDrawer  = document.getElementById("cartDrawer");
  const detailPanel = document.getElementById("detailPanel");
  if (cartDrawer)  attachSwipeClose(cartDrawer,  closeCart);
  if (detailPanel) attachSwipeClose(detailPanel, closeDetailPanel);
  const wishlistDrawer = document.getElementById("wishlistDrawer");
  if (wishlistDrawer) attachSwipeClose(wishlistDrawer, closeWishlist);

  // 9. Lightbox swipe navigation
  initLightboxSwipe();

  // 10. Touch feedback on buttons
  initTouchFeedback();

  // 11. Admin form helpers
  //     Live price validation
  const priceInput = document.getElementById('itemPrice');
  if (priceInput) {
    priceInput.addEventListener('input', e => {
      const val = parseInt(e.target.value);
      if (val < 0)       e.target.value = 0;
      if (val > 1000000) e.target.value = 1000000;
    });
  }

  // 12. Load catalogue
  loadProducts();

});

// ─── GLOBAL KEYBOARD HANDLERS ─────────────────────────────────────────────
document.addEventListener("keydown", e => {

  // Escape — close any open overlay/panel/modal
  if (e.key === "Escape") {
    closeLightbox();
    closeSizeModal("");
    closeLoginModal();
    closeGuaranteeModal();
    closeCart();
    closeWishlist();
    closeDetailPanel();
    closeSizeGuideModal();
    closeOrderSummaryModal();
    cancelAdminPanel();
    return;
  }

  // Lightbox arrow navigation
  const lightbox = document.getElementById("lightbox");
  if (lightbox?.classList.contains("open")) {
    if (e.key === "ArrowLeft")  { previousImage(); e.preventDefault(); }
    if (e.key === "ArrowRight") { nextImage();     e.preventDefault(); }
    return;
  }

  // Ctrl+Enter — submit admin form if open
  if (e.ctrlKey && e.key === "Enter") {
    const adminPanel = document.getElementById("adminPanel");
    if (adminPanel?.classList.contains("visible")) {
      e.preventDefault();
      submitItem();
    }
  }

});