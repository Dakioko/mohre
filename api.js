// ─── API ──────────────────────────────────────────────────────────────────

/**
 * Fetch all products from the backend with retry + exponential backoff.
 * @param {number} retries - number of attempts before throwing
 */
async function apiGet(retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(
        `${CONFIG.SCRIPT_URL}?action=getProducts&_t=${Date.now()}`,
        { signal: controller.signal }
      );
      clearTimeout(timer);
      const data = await res.json();
      return data.products || [];
    } catch (e) {
      clearTimeout(timer);
      if (attempt === retries - 1) throw e;
      // Exponential backoff: 800ms, 1600ms, 3200ms …
      await new Promise(r => setTimeout(r, 800 * Math.pow(2, attempt)));
    }
  }
}

/**
 * POST an admin action to the backend.
 * SECURITY NOTE: The secret should be validated server-side, not here.
 * @param {object} body - action payload
 */
async function apiPost(body) {
  const res = await fetch(CONFIG.SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ ...body, secret: ADMIN_SECRET_KEY }),
  });
  return res.json();
}
