// ─── CONFIG ───────────────────────────────────────────────────────────────
const CONFIG = {
  WA_NUMBER: "254717545221",
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbz6jPChSsC2BVLLlxnjsLl351lrPR7oRXyem4-3_xbArqbAfZ0nVuVZLDQIAcN8Ay6z/exec",
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
let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');