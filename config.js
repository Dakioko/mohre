// ─── CONFIG ───────────────────────────────────────────────────────────────
const CONFIG = {
  WA_NUMBER: "254717545221",
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwMtkLzhMcFhkoClWDcBhAIr-MPIFLAqj5q47XMHbQ_5Cr0g8Hv_E8nLVpaOSZ-3bSF/exec",
  // Number of times apiGet will retry before giving up.
  API_RETRIES: 3,
};

// How many days after creation a product is considered a new arrival.
// Adjust this number to change the window — 14 days is the default.
const NEW_ARRIVAL_DAYS = 14;

// ─── SIZE GUIDE ───────────────────────────────────────────────────────────
const SIZE_GUIDE_DATA = [
  { label: "XS",  uk: "6",   eu: "34", chest: "82–86",   waist: "62–66"  },
  { label: "S",   uk: "8",   eu: "36", chest: "87–91",   waist: "67–71"  },
  { label: "M",   uk: "10",  eu: "38", chest: "92–96",   waist: "72–76"  },
  { label: "L",   uk: "12",  eu: "40", chest: "97–101",  waist: "77–81"  },
  { label: "XL",  uk: "14",  eu: "42", chest: "102–106", waist: "82–86"  },
  { label: "XXL", uk: "16",  eu: "44", chest: "107–112", waist: "87–92"  },
];

// ─── ADMIN ────────────────────────────────────────────────────────────────
// NOTE: Move admin authentication to the server side.
// The secret key should never live here in production.
let ADMIN_SECRET_KEY = "";

// ─── GLOBAL STATE ─────────────────────────────────────────────────────────
let products = [];
let currentFilter = "All";
let currentSearch = "";
let currentSort   = "newest"; // "default" | "price-asc" | "price-desc" | "newest"
let pendingOrderId = null;
let selectedSize = null;
let logoTapCount = 0;
let logoTapTimer = null;
let colorVariants = [];
let currentGalleryImages = [];
let currentGalleryIndex = 0;
let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');