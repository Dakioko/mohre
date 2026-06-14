// ─── SIZE MODAL ───────────────────────────────────────────────────────────

function openSizeModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  pendingOrderId = id;
  selectedSize = null;

  const nameEl = document.getElementById("sizeModalName");
  const priceEl = document.getElementById("sizeModalPrice");
  if (nameEl) nameEl.textContent = p.name;
  if (priceEl) priceEl.textContent = fmtPrice(p.price);

  const sizes = p.sizes ? p.sizes.split(",").map(s => s.trim()).filter(Boolean) : [];
  if (!sizes.length) {
    directOrder(id);
    return;
  }

  const chipsEl = document.getElementById("sizeModalChips");
  if (chipsEl) {
    chipsEl.innerHTML = sizes.map(s =>
      `<button class="size-modal-chip" aria-pressed="false"
        onclick="selectModalSize(this,'${escapeHtml(s)}')">${escapeHtml(s)}</button>`
    ).join("");
  }

  // Confirm button → WhatsApp order flow
  const confirmBtn = document.getElementById("sizeModalConfirmBtn");
  if (confirmBtn) {
    confirmBtn.textContent = "Order via WhatsApp →";
    confirmBtn.onclick = confirmOrder;
  }

  document.getElementById("sizeModal")?.classList.add("open");
}

function selectModalSize(el, size) {
  document.querySelectorAll(".size-modal-chip").forEach(c => {
    c.classList.remove("selected");
    c.setAttribute("aria-pressed", "false");
  });
  el.classList.add("selected");
  el.setAttribute("aria-pressed", "true");
  selectedSize = size;
  announce(`Size ${size} selected`);
  const errEl = document.getElementById("sizeModalError");
  if (errEl) errEl.style.display = "none";
}

function closeSizeModal(e) {
  // Allow close via backdrop click or Cancel button (event target check),
  // or when called programmatically — use _closeSizeModalNow() for the latter.
  if (!e || e.target === document.getElementById("sizeModal")) {
    _closeSizeModalNow();
  }
}

/** Internal: unconditionally close the size modal and reset state. */
function _closeSizeModalNow() {
  document.getElementById("sizeModal")?.classList.remove("open");
  pendingOrderId = null;
  selectedSize = null;
  const errEl = document.getElementById("sizeModalError");
  if (errEl) errEl.style.display = "none";
}

/**
 * Validate that a size has been selected when the product has sizes defined.
 * Delegates to the shared _validateSizeSelection helper (see ui.js).
 * @returns {boolean} true if valid (or no size required), false otherwise
 */
function _validateModalSize() {
  const p = products.find(x => x.id === pendingOrderId);
  return _validateSizeSelection(p, selectedSize, "sizeModalError", "sizeModalChips");
}

function confirmOrder() {
  if (!_validateModalSize()) return;
  const p = products.find(x => x.id === pendingOrderId);
  if (!p) return;
  _closeSizeModalNow();

  const subtotal    = Number(p.price);
  const deliveryFee = calcDeliveryFee(subtotal);
  const total       = subtotal + deliveryFee;

  pendingOrderData = {
    orderItems: [{ name: p.name, price: p.price, qty: 1, size: selectedSize, color: null }],
    subtotal,
    deliveryFee,
    total
  };
  showOrderSummaryModal();
}

// ─── DIRECT ORDER (no sizes) ──────────────────────────────────────────────
function directOrder(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  const subtotal    = Number(p.price);
  const deliveryFee = calcDeliveryFee(subtotal);
  const total       = subtotal + deliveryFee;

  pendingOrderData = {
    orderItems: [{ name: p.name, price: p.price, qty: 1, size: null, color: null }],
    subtotal,
    deliveryFee,
    total
  };
  showOrderSummaryModal();
}

// ─── WHATSAPP ORDER ───────────────────────────────────────────────────────
function sendWhatsApp(p, size, color, qty, triggerEl) {
  // Brief visual feedback on the button that triggered this
  if (triggerEl) {
    triggerEl.disabled = true;
    triggerEl.classList.add('btn-loading');
    setTimeout(() => {
      triggerEl.disabled = false;
      triggerEl.classList.remove('btn-loading');
    }, 800);
  }
  const qtyVal = qty && qty > 1 ? qty : 1;
  const sizeStr  = size  ? `\nSize: *${size}*`   : "";
  const colorStr = color ? `\nColour: *${color}*` : "";
  const qtyStr   = qtyVal > 1 ? `\nQuantity: *${qtyVal}*` : "";
  const msg = encodeURIComponent(
    `Hi! I'd love to order from Mohre Hub 🛍️\n\n*${p.name}*\nPrice: ${fmtPrice(p.price)}${sizeStr}${colorStr}${qtyStr}\n\nPlease share payment and delivery details.`
  );
  window.open(`https://wa.me/${CONFIG.WA_NUMBER}?text=${msg}`, "_blank");
  vibrateOnAction();
}

// ─── ORDER SUMMARY MODAL (multi-item checkout) ────────────────────────────
function showOrderSummaryModal() {
  if (!pendingOrderData) return;
  const { orderItems, subtotal, deliveryFee, total } = pendingOrderData;

  const modalContent = `
    <div class="order-items">
      ${orderItems.map(item => `
        <div class="summary-item">
          <span>
            ${escapeHtml(item.name)}
            ${item.size  ? `(Size: ${escapeHtml(item.size)})`   : ''}
            ${item.color ? `(${escapeHtml(item.color)})`        : ''}
            ×${item.qty}
          </span>
          <span>${fmtPrice(item.price * item.qty)}</span>
        </div>`).join('')}
    </div>
    <div class="order-totals">
      <div><span>Subtotal</span><span>${fmtPrice(subtotal)}</span></div>
      <div>
        <span>Delivery</span>
        <span>${deliveryFee === 0 ? 'FREE' : fmtPrice(deliveryFee)}</span>
      </div>
      <div class="total"><span>Total</span><span>${fmtPrice(total)}</span></div>
    </div>`;

  const summaryDiv = document.getElementById("orderSummaryContent");
  if (summaryDiv) summaryDiv.innerHTML = modalContent;

  document.getElementById("orderSummaryModal")?.classList.add("open");
}

function closeOrderSummaryModal() {
  document.getElementById("orderSummaryModal")?.classList.remove("open");
  const addressField = document.getElementById("deliveryAddress");
  if (addressField) addressField.value = "";
  pendingOrderData = null;
}

function confirmOrderWithAddress() {
  if (!pendingOrderData) return;
  const { orderItems, total } = pendingOrderData;
  const address = document.getElementById("deliveryAddress")?.value.trim() || "";

  const lines = orderItems.map(item => {
    const details = [
      item.size  && `Size: *${item.size}*`,
      item.color && `Colour: *${item.color}*`
    ].filter(Boolean).join(', ');
    return `• *${item.name}* ×${item.qty} — ${fmtPrice(item.price * item.qty)}${details ? ` (${details})` : ''}`;
  });

  let msg = `Hi! I'd like to order from Mohre Hub 🛍️\n\n${lines.join('\n')}\n\n*Total: ${fmtPrice(total)}*`;
  if (address) msg += `\n\nDelivery address: ${address}`;
  msg += `\n\nPlease share payment and delivery details.`;

  window.open(`https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  closeOrderSummaryModal();
  vibrateOnAction();
}

// ─── ADMIN LOGIN MODAL ────────────────────────────────────────────────────
function openLoginModal() {
  document.getElementById("loginModal")?.classList.add("open");
  setTimeout(() => document.getElementById("adminPasswordInput")?.focus(), 100);
}

function closeLoginModal() {
  document.getElementById("loginModal")?.classList.remove("open");
  const input = document.getElementById("adminPasswordInput");
  if (input) input.value = "";
}

// ─── AUTHENTICITY GUARANTEE MODAL ─────────────────────────────────────────
function openGuaranteeModal() {
  document.getElementById("guaranteeModal")?.classList.add("open");
}

function closeGuaranteeModal() {
  document.getElementById("guaranteeModal")?.classList.remove("open");
}

// ─── RETURN POLICY MODAL ──────────────────────────────────────────────────
// The guarantee modal contains two inner sections: .guarantee-content and
// .return-policy-content. Only one is visible at a time, toggled with the
// "hidden" class — no innerHTML swapping, no race conditions.

function openReturnPolicy() {
  const modal = document.getElementById("guaranteeModal");
  if (!modal) return;
  modal.querySelector(".guarantee-content")?.classList.add("hidden");
  modal.querySelector(".return-policy-content")?.classList.remove("hidden");
  modal.classList.add("open");
}

function closeReturnPolicy() {
  const modal = document.getElementById("guaranteeModal");
  if (!modal) return;
  modal.classList.remove("open");
  // Restore to guarantee view for next open — safe to do immediately
  // since the panel is already closing.
  modal.querySelector(".return-policy-content")?.classList.add("hidden");
  modal.querySelector(".guarantee-content")?.classList.remove("hidden");
}

// ─── SIZE GUIDE MODAL ─────────────────────────────────────────────────────
// SIZE_GUIDE_DATA is defined in config.js

function showSizeGuide() {
  const tbody = document.getElementById("sizeGuideBody");
  if (tbody) {
    tbody.innerHTML = SIZE_GUIDE_DATA.map(row => `
      <tr style="border-bottom:1px solid var(--border);">
        <td style="padding:0.4rem 0.5rem;font-weight:600;">${row.label}</td>
        <td style="padding:0.4rem 0.5rem;text-align:center;">${row.uk}</td>
        <td style="padding:0.4rem 0.5rem;text-align:center;">${row.eu}</td>
        <td style="padding:0.4rem 0.5rem;text-align:center;">${row.chest}</td>
        <td style="padding:0.4rem 0.5rem;text-align:center;">${row.waist}</td>
      </tr>`).join('');
  }
  document.getElementById("sizeGuideModal")?.classList.add("open");
}

function closeSizeGuideModal() {
  document.getElementById("sizeGuideModal")?.classList.remove("open");
}