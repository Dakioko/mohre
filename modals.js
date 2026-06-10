// ─── SIZE MODAL ───────────────────────────────────────────────────────────

function openSizeModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  pendingOrderId = id;
  selectedSize = null;

  const nameEl = document.getElementById("sizeModalName");
  const priceEl = document.getElementById("sizeModalPrice");
  if (nameEl) nameEl.textContent = p.name;
  if (priceEl) priceEl.textContent = `KSh ${Number(p.price).toLocaleString()}`;

  const sizes = p.sizes ? p.sizes.split(",").map(s => s.trim()).filter(Boolean) : [];
  if (!sizes.length) {
    directOrder(id);
    return;
  }

  const chipsEl = document.getElementById("sizeModalChips");
  if (chipsEl) {
    chipsEl.innerHTML = sizes.map(s =>
      `<button class="size-modal-chip"
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

/** Open size modal with "Add to bag" flow instead of WhatsApp */
function openSizeModalForCart(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;

  const sizes = p.sizes ? p.sizes.split(",").map(s => s.trim()).filter(Boolean) : [];

  // No sizes defined — add directly to cart without showing the modal
  if (!sizes.length) {
    const card = document.querySelector(`.product-card[data-id="${id}"]`);
    const activeColor = card?.querySelector('.card-swatch.active');
    const colorName = activeColor ? activeColor.getAttribute('data-color') : null;
    addToCart(id, null, colorName);
    return;
  }

  pendingOrderId = id;
  selectedSize = null;

  const nameEl = document.getElementById("sizeModalName");
  const priceEl = document.getElementById("sizeModalPrice");
  if (nameEl) nameEl.textContent = p.name;
  if (priceEl) priceEl.textContent = `KSh ${Number(p.price).toLocaleString()}`;

  const chipsEl = document.getElementById("sizeModalChips");
  if (chipsEl) {
    chipsEl.innerHTML = sizes.map(s =>
      `<button class="size-modal-chip"
        onclick="selectModalSize(this,'${escapeHtml(s)}')">${escapeHtml(s)}</button>`
    ).join("");
  }

  // Confirm button → Add to cart flow
  const confirmBtn = document.getElementById("sizeModalConfirmBtn");
  if (confirmBtn) {
    confirmBtn.textContent = "Add to bag →";
    confirmBtn.onclick = confirmSizeAddToCart;
  }

  document.getElementById("sizeModal")?.classList.add("open");
}

function selectModalSize(el, size) {
  document.querySelectorAll(".size-modal-chip").forEach(c => c.classList.remove("selected"));
  el.classList.add("selected");
  selectedSize = size;
}

function closeSizeModal(e) {
  // Allow close via: backdrop click, Cancel button, or string call
  if (!e || e.target === document.getElementById("sizeModal") || typeof e === "string") {
    document.getElementById("sizeModal")?.classList.remove("open");
    pendingOrderId = null;
    selectedSize = null;
  }
}

function confirmOrder() {
  const p = products.find(x => x.id === pendingOrderId);
  if (!p) return;
  closeSizeModal("");
  sendWhatsApp(p, selectedSize);
}

function confirmSizeAddToCart() {
  const p = products.find(x => x.id === pendingOrderId);
  if (!p) return;
  const card = document.querySelector(`.product-card[data-id="${pendingOrderId}"]`);
  const activeColor = card?.querySelector('.card-swatch.active');
  const colorName = activeColor ? activeColor.getAttribute('data-color') : null;
  closeSizeModal("");
  addToCart(pendingOrderId, selectedSize, colorName);

  // Restore confirm button for WhatsApp flow
  const confirmBtn = document.getElementById("sizeModalConfirmBtn");
  if (confirmBtn) {
    confirmBtn.textContent = "Order via WhatsApp →";
    confirmBtn.onclick = confirmOrder;
  }
}

// ─── DIRECT ORDER (no sizes) ──────────────────────────────────────────────
function directOrder(id) {
  const p = products.find(x => x.id === id);
  if (p) sendWhatsApp(p, null);
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
    `Hi! I'd love to order from Mohre Hub 🛍️\n\n*${p.name}*\nPrice: KSh ${Number(p.price).toLocaleString()}${sizeStr}${colorStr}${qtyStr}\n\nPlease share payment and delivery details.`
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
          <span>KSh ${(item.price * item.qty).toLocaleString()}</span>
        </div>`).join('')}
    </div>
    <div class="order-totals">
      <div><span>Subtotal</span><span>KSh ${subtotal.toLocaleString()}</span></div>
      <div>
        <span>Delivery</span>
        <span>${deliveryFee === 0 ? 'FREE' : `KSh ${deliveryFee.toLocaleString()}`}</span>
      </div>
      <div class="total"><span>Total</span><span>KSh ${total.toLocaleString()}</span></div>
    </div>`;

  const summaryDiv = document.getElementById("orderSummaryContent");
  if (summaryDiv) summaryDiv.innerHTML = modalContent;

  document.getElementById("orderSummaryModal")?.classList.add("open");
}

function closeOrderSummaryModal() {
  document.getElementById("orderSummaryModal")?.classList.remove("open");
  const addressField = document.getElementById("deliveryAddress");
  if (addressField) addressField.value = "";
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
    return `• *${item.name}* ×${item.qty} — KSh ${(item.price * item.qty).toLocaleString()}${details ? ` (${details})` : ''}`;
  });

  let msg = `Hi! I'd like to order from Mohre Hub 🛍️\n\n${lines.join('\n')}\n\n*Total: KSh ${total.toLocaleString()}*`;
  if (address) msg += `\n\nDelivery address: ${address}`;
  msg += `\n\nPlease share payment and delivery details.`;

  window.open(`https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  closeOrderSummaryModal();
  showConfetti();
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
function openReturnPolicy() {
  // Reuse the guarantee modal structure with return-policy text
  const modal = document.getElementById("guaranteeModal");
  const content = modal?.querySelector(".auth-guarantee-modal");
  if (!content) return;

  content.innerHTML = `
    <h3 class="modal-title">Returns & Exchanges</h3>
    <p style="font-size:0.8rem;color:var(--muted);line-height:1.6;margin-bottom:1rem;">
      We want you to love every piece. If something isn't right, contact us within <strong>48 hours</strong>
      of receiving your order via WhatsApp.
    </p>
    <p style="font-size:0.8rem;color:var(--muted);line-height:1.6;margin-bottom:1rem;">
      Items must be unworn, unwashed, and in original condition with tags intact.
      Sale items and accessories are final sale.
    </p>
    <p style="font-size:0.8rem;color:var(--muted);line-height:1.6;margin-bottom:1rem;">
      Exchanges subject to availability. Refunds processed within 5–7 business days.
    </p>
    <button class="btn-primary" style="width:100%;" onclick="closeReturnPolicy()">Got it</button>`;
  modal.classList.add("open");
}

function closeReturnPolicy() {
  const modal = document.getElementById("guaranteeModal");
  modal?.classList.remove("open");

  // Restore original guarantee content after animation
  setTimeout(() => {
    const content = modal?.querySelector(".auth-guarantee-modal");
    if (content) {
      content.innerHTML = `
        <h3 class="modal-title">Authenticity guaranteed</h3>
        <p style="font-size:0.8rem;color:var(--muted);line-height:1.6;margin-bottom:1rem;">
          Every item is personally sourced and verified by our team before listing.
        </p>
        <p style="font-size:0.8rem;color:var(--muted);line-height:1.6;margin-bottom:1rem;">
          If you have concerns, contact us within 48 hours via WhatsApp — full refund or replacement.
        </p>
        <button class="btn-primary" style="width:100%;" onclick="closeGuaranteeModal()">Got it</button>`;
    }
  }, 300);
}

// ─── SIZE GUIDE MODAL ─────────────────────────────────────────────────────
const SIZE_GUIDE_DATA = [
  { label: "XS",  uk: "6",   eu: "34", chest: "82–86",  waist: "62–66"  },
  { label: "S",   uk: "8",   eu: "36", chest: "87–91",  waist: "67–71"  },
  { label: "M",   uk: "10",  eu: "38", chest: "92–96",  waist: "72–76"  },
  { label: "L",   uk: "12",  eu: "40", chest: "97–101", waist: "77–81"  },
  { label: "XL",  uk: "14",  eu: "42", chest: "102–106",waist: "82–86"  },
  { label: "XXL", uk: "16",  eu: "44", chest: "107–112",waist: "87–92"  },
];

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