// TTL bellek önbelleği + disk kalıcılığı (yeniden başlatmada upstream'i yormaz)
// + eski yanıt servisi: upstream erişilemezse son bilinen iyi veri döner
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function makeCache({ dir = null, ttl = 5 * 60 * 1000, maxEntries = 500, staleMaxAgeMs = 24 * 60 * 60 * 1000 } = {}) {
  const store = new Map();
  const counters = { hits: 0, misses: 0, staleHits: 0, diskLoads: 0, diskWrites: 0, diskErrors: 0 };
  let writeCount = 0;

  const fileFor = (key) => path.join(dir, crypto.createHash('sha1').update(key).digest('hex') + '.json');

  function persist(key, entry) {
    if (!dir) return;
    try {
      fs.mkdirSync(dir, { recursive: true });
      // Senkron yazı: küçük payload, cache-isabet yolu zaten bellek; belirlemezlik olmasın
      fs.writeFileSync(fileFor(key), JSON.stringify(entry), 'utf8');
      counters.diskWrites++;
      if (++writeCount % 200 === 0) cleanupDisk();
    } catch {
      counters.diskErrors++;
    }
  }

  function cleanupDisk() {
    if (!dir) return;
    fs.promises.readdir(dir).then((files) => {
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        fs.promises
          .readFile(path.join(dir, f), 'utf8')
          .then((txt) => {
            const e = JSON.parse(txt);
            if (Date.now() - e.expiresAt > staleMaxAgeMs) fs.promises.unlink(path.join(dir, f)).catch(() => {});
          })
          .catch(() => {});
      }
    }).catch(() => {});
  }

  function loadFromDisk(key) {
    if (!dir) return null;
    try {
      const txt = fs.readFileSync(fileFor(key), 'utf8');
      const e = JSON.parse(txt);
      if (Date.now() - e.expiresAt > staleMaxAgeMs) return null;
      counters.diskLoads++;
      store.set(key, e);
      return e;
    } catch {
      return null;
    }
  }

  function get(key) {
    const entry = store.get(key) || loadFromDisk(key);
    if (!entry) {
      counters.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      counters.misses++;
      return undefined;
    }
    counters.hits++;
    return entry.value;
  }

  // Süresi geçmiş olsa bile döndürür (staleMaxAgeMs içindeyse) — http katmanı upstream
  // erişilemediğinde bunu kullanır. { value, expired } döner.
  function getStale(key) {
    const entry = store.get(key) || loadFromDisk(key);
    if (!entry) return undefined;
    if (Date.now() - entry.expiresAt > staleMaxAgeMs) return undefined;
    return { value: entry.value, expired: Date.now() > entry.expiresAt };
  }

  function set(key, value, entryTtl = ttl) {
    if (store.size >= maxEntries) {
      const oldest = store.keys().next().value;
      store.delete(oldest);
    }
    const entry = { value, expiresAt: Date.now() + entryTtl };
    store.set(key, entry);
    persist(key, entry);
  }

  const stats = () => {
    const total = counters.hits + counters.misses;
    return { ...counters, total, hitRatio: total ? +(counters.hits / total).toFixed(2) : 0, entries: store.size };
  };

  return { get, getStale, set, stats };
}

// Varsayılan örnek: disk kalıcı, süreç yenilense bile upstream ilk istekte sıcak döner
const defaultCache = makeCache({
  dir: path.resolve(__dirname, '..', process.env.CACHE_DISK_DIR || '.cache'),
  ttl: Number(process.env.CACHE_TTL_MS) || 5 * 60 * 1000,
  maxEntries: Number(process.env.CACHE_MAX_ENTRIES) || 500,
  staleMaxAgeMs: Number(process.env.CACHE_STALE_MAX_AGE_MS) || 24 * 60 * 60 * 1000,
});

module.exports = { makeCache, ...defaultCache };
