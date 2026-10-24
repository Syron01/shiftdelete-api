// Upstream trafik kapısı: shiftdelete.net'e giden yükü disipline eder.
// - eşzamanlılık sınırı + istek kuyruğu (dolarsa hızlı reddet)
// - istekler arası minimum boşluk + dakikalık üst sınır
// - geçici hatalarda üssel bekleme ile yeniden deneme (Retry-After'a saygılı)
// - devre kesici: arka arkaya hata gelirse upstream'e ara verir, periyodik prob ile iyileşir
class GateError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'GateError';
    this.code = code;
  }
}

function makeGate(opts = {}) {
  const o = {
    maxConcurrent: 4,
    minSpacingMs: 120,
    maxPerMinute: 120,
    maxQueue: 100,
    maxRetries: 3,
    baseBackoffMs: 400,
    maxBackoffMs: 8000,
    breakerFailureThreshold: 5,
    breakerCooldownMs: 30000,
    ...opts,
  };

  const st = { inflight: 0, lastStart: 0, queued: 0, minuteStart: Date.now(), minuteCount: 0 };
  const breaker = { state: 'closed', failures: 0, openedAt: 0, lastError: null };
  const stats = { requests: 0, retries: 0, queueRejected: 0, breakerTrips: 0, breakerRecoveries: 0, throttleWaits: 0 };
  const waiting = [];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function noteSuccess() {
    if (breaker.state !== 'closed') stats.breakerRecoveries++;
    breaker.state = 'closed';
    breaker.failures = 0;
  }

  function noteFailure(err) {
    breaker.failures++;
    breaker.lastError = err.message;
    if (breaker.failures >= o.breakerFailureThreshold) {
      if (breaker.state !== 'open') stats.breakerTrips++;
      breaker.state = 'open';
      breaker.openedAt = Date.now();
    }
  }

  // Devre açıkken istek engellenir; bekleme süresi dolduysa yarı-açık duruma geçer
  function breakerBlocked() {
    if (breaker.state !== 'open') return false;
    if (Date.now() - breaker.openedAt >= o.breakerCooldownMs) {
      breaker.state = 'half-open';
      return false;
    }
    return true;
  }

  async function acquireSlot() {
    if (st.inflight >= o.maxConcurrent) {
      if (st.queued >= o.maxQueue) {
        stats.queueRejected++;
        throw new GateError('İstek kuyruğu dolu, daha sonra tekrar deneyin', 'QUEUE_FULL');
      }
      st.queued++;
      await new Promise((resolve) => waiting.push(resolve));
      st.queued--;
    }
    st.inflight++;
    const gap = o.minSpacingMs - (Date.now() - st.lastStart);
    if (gap > 0) await sleep(gap);
    st.lastStart = Date.now();
  }

  async function enforceMinuteCap() {
    if (Date.now() - st.minuteStart >= 60000) {
      st.minuteStart = Date.now();
      st.minuteCount = 0;
    }
    if (st.minuteCount >= o.maxPerMinute) {
      const waitMs = 60000 - (Date.now() - st.minuteStart);
      if (waitMs > 5000) throw new GateError('Dakikalık upstream sınırı aşıldı', 'THROTTLED');
      stats.throttleWaits++;
      await sleep(waitMs);
      st.minuteStart = Date.now();
      st.minuteCount = 0;
    }
    st.minuteCount++;
  }

  async function request(perform) {
    if (breakerBlocked()) {
      throw new GateError(`Upstream geçici olarak erişilemez (devre kesici açık): ${breaker.lastError}`, 'CIRCUIT_OPEN');
    }
    stats.requests++;
    let attempt = 0;
    for (;;) {
      await acquireSlot();
      try {
        await enforceMinuteCap();
        const out = await perform();
        noteSuccess();
        return out;
      } catch (err) {
        if (err?.retryable) noteFailure(err);
        if (!err?.retryable || attempt >= o.maxRetries - 1) throw err;
        attempt++;
        stats.retries++;
        let delay = Math.min(o.baseBackoffMs * 2 ** attempt, o.maxBackoffMs);
        delay += Math.floor(Math.random() * o.baseBackoffMs); // titreme: eşzamanlı isteklerin çakışmasını önler
        if (err.retryAfterMs) delay = Math.max(delay, err.retryAfterMs);
        await sleep(delay);
      } finally {
        st.inflight--;
        if (waiting.length) waiting.shift()();
      }
    }
  }

  const snapshot = () => ({
    ...stats,
    inflight: st.inflight,
    queued: st.queued,
    minuteCount: st.minuteCount,
    breaker: { state: breaker.state, failures: breaker.failures, lastError: breaker.lastError },
  });

  return { request, snapshot, options: o };
}

module.exports = { makeGate, GateError };
