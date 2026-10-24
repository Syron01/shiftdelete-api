const PORT = process.env.PORT || 3000;

// Ortam değişkeninden pozitif sayı okur, yoksa varsayılanı kullanır
const num = (name, def) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : def;
};

// Dil -> site kök adresi. Tüm endpointler ?lang=en ile EN sürüme geçebilir.
const SITES = {
  tr: 'https://shiftdelete.net',
  en: 'https://en.shiftdelete.net',
};

const DEFAULT_LANG = 'tr';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 (shiftdelete-api/1.0 unofficial)';

const UPSTREAM_TIMEOUT_MS = num('UPSTREAM_TIMEOUT_MS', 15000);

// --- Önbellek ---
const CACHE_TTL_MS = num('CACHE_TTL_MS', 5 * 60 * 1000);
const CACHE_MAX_ENTRIES = num('CACHE_MAX_ENTRIES', 500);
// Süresi geçse bile upstream erişilemezse kaç süre kadar eski yanıt servis edilebilir
const CACHE_STALE_MAX_AGE_MS = num('CACHE_STALE_MAX_AGE_MS', 24 * 60 * 60 * 1000);
const CACHE_DISK_DIR = process.env.CACHE_DISK_DIR || '.cache';

// --- Upstream kapısı: IP'nin yasaklanmaması için trafik disiplini ---
const GATE_MAX_CONCURRENT = num('GATE_MAX_CONCURRENT', 4);        // aynı anda en fazla istek
const GATE_MIN_SPACING_MS = num('GATE_MIN_SPACING_MS', 120);      // iki istek arası minimum boşluk
const GATE_MAX_PER_MINUTE = num('GATE_MAX_PER_MINUTE', 120);      // dakikalık üst sınır
const GATE_MAX_QUEUE = num('GATE_MAX_QUEUE', 100);                // kuyruk dolarsa hızlı reddet
const RETRY_MAX = num('RETRY_MAX', 3);                            // geçici hatalarda deneme sayısı
const RETRY_BASE_BACKOFF_MS = num('RETRY_BASE_BACKOFF_MS', 400);
const RETRY_MAX_BACKOFF_MS = num('RETRY_MAX_BACKOFF_MS', 8000);
const BREAKER_FAILURE_THRESHOLD = num('BREAKER_FAILURE_THRESHOLD', 5); // arka arkaya kaç hata devreyi açar
const BREAKER_COOLDOWN_MS = num('BREAKER_COOLDOWN_MS', 30000);         // devre açıldıktan sonra bekleme

// --- API istemci hız sınırı (bu sunucuya gelen istekler, IP başına) ---
const API_RATE_LIMIT_MAX = num('API_RATE_LIMIT_MAX', 60);
const API_RATE_LIMIT_WINDOW_MS = num('API_RATE_LIMIT_WINDOW_MS', 60000);

// wp-json kök adresi: lang parametresine göre üretilir
const wpBase = (lang) => `${siteBase(lang)}/wp-json/wp/v2`;
const siteBase = (lang) => SITES[lang] || SITES[DEFAULT_LANG];

// Sitenin ana menüsü (nav HTML'inden doğrulandı; her kategori REST'te mevcut)
const MAIN_NAV = [
  { title: 'Teknoloji Haberleri', slug: 'teknoloji-haberleri' },
  { title: 'Son Haberler', slug: 'haberler' },
  { title: 'Yapay Zeka', slug: 'yapay-zeka' },
  { title: 'Otomobil', slug: 'otomobil' },
  { title: 'Mobil', slug: 'mobil' },
  { title: '5G', slug: '5g' },
  { title: 'Oyun', slug: 'oyun' },
  { title: 'Savunma Sanayi', slug: 'savunma-sanayi' },
  { title: 'İnceleme', slug: 'inceleme' },
  { title: 'Nasıl Yapılır?', slug: 'nasil-yapilir' },
  { title: 'Donanım', slug: 'donanim' },
  { title: 'Yazılım', slug: 'yazilim' },
  { title: 'Android', slug: 'android' },
  { title: 'Giyilebilir Teknoloji', slug: 'giyilebilir-teknoloji' },
  { title: 'Güvenlik', slug: 'guvenlik' },
];

// Özel içerik bölümleri (kategori slug'ları REST'te doğrulandı)
const SECTIONS = {
  videos: 'sdntv',
  gallery: 'galeri',
  reviews: 'inceleme',
  howto: 'nasil-yapilir',
};

module.exports = {
  PORT,
  SITES,
  DEFAULT_LANG,
  USER_AGENT,
  UPSTREAM_TIMEOUT_MS,
  CACHE_TTL_MS,
  CACHE_MAX_ENTRIES,
  CACHE_STALE_MAX_AGE_MS,
  CACHE_DISK_DIR,
  GATE_MAX_CONCURRENT,
  GATE_MIN_SPACING_MS,
  GATE_MAX_PER_MINUTE,
  GATE_MAX_QUEUE,
  RETRY_MAX,
  RETRY_BASE_BACKOFF_MS,
  RETRY_MAX_BACKOFF_MS,
  BREAKER_FAILURE_THRESHOLD,
  BREAKER_COOLDOWN_MS,
  API_RATE_LIMIT_MAX,
  API_RATE_LIMIT_WINDOW_MS,
  wpBase,
  siteBase,
  MAIN_NAV,
  SECTIONS,
};
