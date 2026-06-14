// ─── CONFIG ───────────────────────────────────────────────────────────────
const CONFIG = {
  WA_NUMBER: "254717545221",
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxNPu4-mF6DBhZEaBmM_Y4bSRcVMlvAs3zBBxteZkt61etWcfBuaNAppjgUxkKaGsQ1/exec",
  // Number of times apiGet will retry before giving up.
  API_RETRIES: 3,
};

// How many days after creation a product is considered a new arrival.
// Adjust this number to change the window — 14 days is the default.
const NEW_ARRIVAL_DAYS = 14;

// ─── DELIVERY FEE ─────────────────────────────────────────────────────────
// Single source of truth for the delivery fee threshold and amount.
// Update these two values to change delivery pricing everywhere at once.
const DELIVERY_FREE_THRESHOLD = 5000; // orders at or above this value get free delivery
const DELIVERY_FEE            = 200;  // flat fee charged below the threshold

/**
 * Calculate the delivery fee for a given subtotal.
 * @param {number} subtotal
 * @returns {number} 0 or DELIVERY_FEE
 */
function calcDeliveryFee(subtotal) {
  return subtotal >= DELIVERY_FREE_THRESHOLD ? 0 : DELIVERY_FEE;
}

// ─── SIZE GUIDE ───────────────────────────────────────────────────────────
const SIZE_GUIDE_DATA = [
  { label: "XS",  uk: "6",   eu: "34", chest: "82–86",   waist: "62–66"  },
  { label: "S",   uk: "8",   eu: "36", chest: "87–91",   waist: "67–71"  },
  { label: "M",   uk: "10",  eu: "38", chest: "92–96",   waist: "72–76"  },
  { label: "L",   uk: "12",  eu: "40", chest: "97–101",  waist: "77–81"  },
  { label: "XL",  uk: "14",  eu: "42", chest: "102–106", waist: "82–86"  },
  { label: "XXL", uk: "16",  eu: "44", chest: "107–112", waist: "87–92"  },
];

// ─── COLOUR NAME → HEX ────────────────────────────────────────────────────
// Used by the admin colour-variant picker to auto-fill a hex value when a
// colour name is typed. Kept here (not in admin.js) as pure static data.
const COLOR_NAME_TO_HEX = {
  "black":"#000000","jet black":"#1a1a1a","charcoal":"#333333","dark charcoal":"#333333",
  "dim grey":"#555555","dim gray":"#555555","grey":"#777777","gray":"#777777",
  "medium grey":"#888888","medium gray":"#888888","silver grey":"#999999","silver gray":"#999999",
  "silver":"#aaaaaa","light silver":"#bbbbbb","light grey":"#cccccc","light gray":"#cccccc",
  "pale grey":"#dddddd","pale gray":"#dddddd","off white":"#eeeeee","ghost white":"#f5f5f5","white":"#ffffff",
  "red":"#ff0000","dark red":"#cc0000","crimson":"#990000","coral red":"#ff4444",
  "light red":"#ff6666","blush":"#ff9999","pale pink":"#ffcccc",
  "hot pink":"#ff69b4","deep pink":"#ff1493","berry":"#c71585",
  "salmon":"#ff6b6b","rose":"#e8748a","dusty rose":"#c9536a","blush pink":"#ffb6c1",
  "dark orange":"#ff8c00","burnt orange":"#ff6600","orange red":"#ff4500",
  "orange":"#ffa500","peach":"#ffb347","gold":"#ffd700","yellow":"#ffff00",
  "lemon":"#f5e642","cream":"#fffacd","ivory":"#f5f0e8","antique white":"#faebd7",
  "saddle brown":"#8b4513","sienna":"#a0522d","peru":"#cd853f","burlywood":"#deb887",
  "tan":"#d2b48c","sand":"#c8a882","champagne":"#e8d5b0","wheat":"#f5deb3","camel":"#c19a6b",
  "dark green":"#006400","green":"#008000","forest green":"#228b22",
  "sea green":"#2e8b57","medium green":"#3cb371","light green":"#90ee90",
  "pale green":"#98fb98","yellow green":"#adff2f","olive green":"#556b2f",
  "olive":"#808000","moss green":"#6b8e23","sage":"#8fbc8f","mint":"#98ff98",
  "teal":"#008080","light teal":"#20b2aa","turquoise":"#40e0d0","cyan":"#00bcd4",
  "navy":"#000080","dark blue":"#00008b","medium blue":"#0000cd","blue":"#0000ff",
  "royal blue":"#4169e1","cornflower blue":"#6495ed","sky blue":"#87ceeb",
  "light blue":"#add8e6","steel blue":"#b0c4de","baby blue":"#89cff0",
  "midnight blue":"#191970","deep navy":"#1e3a5f","denim":"#1560bd","cobalt":"#0047ab",
  "indigo":"#4b0082","dark violet":"#9400d3","purple":"#800080",
  "dark orchid":"#9932cc","medium orchid":"#ba55d3","plum":"#dda0dd",
  "violet":"#ee82ee","orchid":"#da70d6","magenta":"#ff00ff","lavender":"#e6e6fa",
  "lilac":"#c8a2c8","mauve":"#e0b0ff",
  "burgundy":"#800020","wine":"#722f37","brown":"#a52a2a","maroon":"#800000",
  "dark goldenrod":"#b8860b","warm taupe":"#8c7e6c","taupe":"#a89b8a",
  "linen":"#d4c9bc","pearl":"#e8e0d5","eggshell":"#f0ebe3","nude":"#e3bc9a",
  "mustard":"#ffdb58","terracotta":"#e2725b","rust":"#b7410e","copper":"#b87333",
  "emerald":"#50c878","jade":"#00a86b","khaki":"#c3b091","beige":"#f5f5dc",
  "chocolate":"#7b3f00","coffee":"#6f4e37","mocha":"#967259",
};

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

// ─── ADMIN BULK SELECT ────────────────────────────────────────────────────
let adminSelectMode = false;
let adminSelectedIds = new Set();