// ✅ ใส่ลิงก์ API ของคุณตรงนี้
const API_URL =
  "https://script.google.com/macros/s/AKfycbyWfZ_8pXBOl4_xGXppvOQVAy43fOsYUwuP0tl4dc3tzeLei8WAb1CdlEO3kWfyfQQR/exec";

// ─── State ───────────────────────────────────────────────
let apiCache = {};
let pendingRequests = {};

// ─── Sequential Queue ────────────────────────────────────
// ทำให้ทุก request เข้าคิวทีละอัน ป้องกัน Google Apps Script บล็อก
// เพราะถ้ายิงพร้อมกันหลายอัน Google จะ ERR_CONNECTION_REFUSED
let requestQueue = Promise.resolve();
function enqueue(fn) {
  requestQueue = requestQueue.then(fn, fn); // ต่อ chain เสมอ (ไม่ให้คิวพัง)
  return requestQueue;
}

// ─── Retry with Exponential Backoff ──────────────────────
async function fetchWithRetry(url, options = {}, retries = 3, baseDelay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options);
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = baseDelay * Math.pow(2, attempt - 1); // 1s → 2s → 4s
      console.warn(`⚠️ Retry ${attempt}/${retries} (${wait}ms):`, err.message);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

// ─── GET ─────────────────────────────────────────────────
export const apiGet = async (params) => {
  const cacheKey = JSON.stringify(params);

  // ⚡ 1. Cache hit → return immediately
  if (apiCache[cacheKey]) {
    console.log("⚡ Cache:", params.action);
    return apiCache[cacheKey];
  }

  // ⏳ 2. Duplicate in-flight → share the Promise
  if (pendingRequests[cacheKey]) {
    console.log("⏳ Pending:", params.action);
    return pendingRequests[cacheKey];
  }

  // ☁️ 3. New request → join the queue (sequential execution)
  console.log("☁️ Fetch:", params.action);
  const url = new URL(API_URL);
  Object.keys(params).forEach((k) => url.searchParams.append(k, params[k]));

  pendingRequests[cacheKey] = enqueue(async () => {
    try {
      const res = await fetchWithRetry(url.toString());
      const data = await res.json();
      if (!data.error) apiCache[cacheKey] = data;
      return data;
    } catch (err) {
      console.error("❌ API GET Error:", params.action, err.message);
      return { error: err.message };
    } finally {
      delete pendingRequests[cacheKey];
    }
  });

  return pendingRequests[cacheKey];
};

// ─── POST ────────────────────────────────────────────────
export const apiPost = async (payload) => {
  apiCache = {}; // ล้าง cache เมื่อมีการเปลี่ยนแปลงข้อมูล
  console.log("📤 POST:", payload.action);
  try {
    const res = await fetchWithRetry(API_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.json();
  } catch (err) {
    console.error("❌ API POST Error:", err.message);
    return { error: err.message };
  }
};

export const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const clearCache = () => {
  apiCache = {};
};
