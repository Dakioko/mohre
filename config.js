// ─── CONFIG ───────────────────────────────────────────────────────────────
const CONFIG = {
  WA_NUMBER: "254717545221",
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbx00K-zyj1ILT9cF3zvoyQM8_iGOKb3WamB8Qm3wZeYx-0lYkaCGGbUO3YMs3YkHYVf/exec",
};

// ─── ADMIN ────────────────────────────────────────────────────────────────
// NOTE: Move admin authentication to the server side.
// The secret key should never live here in production.
let ADMIN_SECRET_KEY = "";

// ─── GLOBAL STATE ─────────────────────────────────────────────────────────
let products = [];
let currentFilter = "All";
let currentSearch = "";
let pendingOrderId = null;
let selectedSize = null;
let logoTapCount = 0;
let logoTapTimer = null;
let colorVariants = [];
let currentGalleryImages = [];
let currentGalleryIndex = 0;
let socialProofInterval = null;
let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
