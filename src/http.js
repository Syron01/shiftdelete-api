const { USER_AGENT, UPSTREAM_TIMEOUT_MS, GATE_MAX_CONCURRENT, GATE_MIN_SPACING_MS, GATE_MAX_PER_MINUTE, GATE_MAX_QUEUE, RETRY_MAX, RETRY_BASE_BACKOFF_MS, RETRY_MAX_BACKOFF_MS, BREAKER_FAILURE_THRESHOLD, BREAKER_COOLDOWN_MS } = require('./config');
const { makeGate } = require('./gate');
const cache = require('./cache');

class UpstreamError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'UpstreamError';
    this.status = status || 502;
  }
}

const gate = makeGate({
  maxConcurrent: GATE_MAX_CONCURRENT,
  minSpacingMs: GATE_MIN_SPACING_MS,
  maxPerMinute: GATE_MAX_PER_MINUTE,
  maxQueue: GATE_MAX_QUEUE,
  maxRetries: RETRY_MAX,
  baseBackoffMs: RETRY_BASE_BACKOFF_MS,
  maxBackoffMs: RETRY_MAX_BACKOFF_MS,
  breakerFailureThreshold: BREAKER_FAILURE_THRESHOLD,
  breakerCooldownMs: BREAKER_COOLDOWN_MS,
});

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

// Tek bir HTTP denemesi. Geçici hataları err.retryable ile işaretler.
async function attemptFetch(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json,text/html;q=0.9,*/*;q=0.8' },
      signal: controller.signal,
      redirect: 'follow',
    });
  } catch (err) {
    const e = new UpstreamError(`shiftdelete.net'e ulaşılamadı: ${err.cause?.code || err.message}`);
    e.retryable = true;
    throw e;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let upstreamCode = null;
    let body = '';
    if (res.status < 500) {
      body = await res.text().catch(() => '');
      try {
        upstreamCode = JSON.parse(body)?.code || null;
      } catch { /* HTML gövde — kod yok */ }
    }
    const e = new UpstreamError(`Upstream ${res.status} döndü: ${url}`, res.status === 404 ? 404 : 502);
    e.status = res.status === 404 ? 404 : 502;
    e.httpStatus = res.status;
    e.retryable = RETRYABLE_STATUSES.has(res.status);
    e.upstreamCode = upstreamCode;
    const retryAfter = res.headers.get('retry-after');
    e.retryAfterMs = retryAfter && Number.isFinite(Number(retryAfter)) ? Number(retryAfter) * 1000 : null;
    throw e;
  }

  return {
    text: await res.text(),
    total: Number(res.headers.get('x-wp-total')) || null,
    totalPages: Number(res.headers.get('x-wp-totalpages')) || null,
  };
}

const inflight = new Map(); // tek uçuş: aynı url'e eşzamanlı istekler tek upstream çağrısı paylaşır

async function fetchWithFallback(url, { ttl, cached = true } = {}) {
  try {
    const result = await gate.request(() => attemptFetch(url));
    if (cached) cache.set(url, result, ttl);
    return result;
  } catch (err) {
    // Upstream tamamen erişilemezse son bilinen iyi yanıtı servis et
    const stale = cached ? cache.getStale(url) : undefined;
    if (stale) return stale.value;
    throw err;
  }
}

// Arka plan tazelemesi: eski yanıt servis edilirken upstream sessizce güncellenir
function bgRefresh(url, opts) {
  if (inflight.has(url)) return;
  const p = gate
    .request(() => attemptFetch(url))
    .then((result) => cache.set(url, result, opts?.ttl))
    .catch(() => {})
    .finally(() => inflight.delete(url));
  inflight.set(url, p);
}

async function sdnFetch(url, { ttl, cached = true, allowStale = true } = {}) {
  if (cached) {
    const fresh = cache.get(url);
    if (fresh !== undefined) return fresh;
    if (inflight.has(url)) return inflight.get(url);
    const stale = cache.getStale(url);
    if (stale && allowStale) {
      bgRefresh(url, { ttl });
      return stale.value;
    }
  }
  if (!inflight.has(url)) {
    const p = fetchWithFallback(url, { ttl, cached }).finally(() => inflight.delete(url));
    inflight.set(url, p);
  }
  return inflight.get(url);
}

async function sdnJson(url, opts) {
  try {
    const { text, total, totalPages } = await sdnFetch(url, opts);
    const data = JSON.parse(text);
    return { data, total, totalPages };
  } catch (err) {
    // WP liste aralığı dışı sayfada 400 + rest_post_invalid_page_number döner:
    // otomatik düzeltme — son sayfaya sıkıştır ve oradan devam et
    if (err.upstreamCode === 'rest_post_invalid_page_number' && !opts?.noClamp) {
      return clampToLastPage(url, opts);
    }
    throw err;
  }
}

async function clampToLastPage(url, opts) {
  const metaUrl = url.replace(/([?&])page=\d+/, '$1page=1') + '&_fields=id';
  const meta = await sdnFetch(metaUrl, { ttl: 60 * 1000 });
  if (!meta.totalPages) return { data: [], total: meta.total, totalPages: 1 };
  const lastUrl = url.replace(/([?&])page=\d+/, `$1page=${meta.totalPages}`);
  return sdnJson(lastUrl, { ...opts, noClamp: true });
}

module.exports = { sdnFetch, sdnJson, UpstreamError, gate };
