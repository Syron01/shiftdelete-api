const express = require('express');
const path = require('path');
const fs = require('fs');
const { UpstreamError, gate } = require('./http');
const cache = require('./cache');
const { apiRateLimit } = require('./rateLimit');
const { API_RATE_LIMIT_MAX, API_RATE_LIMIT_WINDOW_MS } = require('./config');

const app = express();

// API istemcilerine hız sınırı: upstream'i koruyan ilk katman
app.use(apiRateLimit({ windowMs: API_RATE_LIMIT_WINDOW_MS, max: API_RATE_LIMIT_MAX }));

// Basit istek günlüğü
app.use((req, res, next) => {
  const t0 = Date.now();
  res.on('finish', () => {
    if (req.path !== '/') console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - t0}ms)`);
  });
  next();
});

// Web arayüzü: tek dosyalık docs + canlı deneme sayfası (PC ve mobil)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// API dokümantasyonu (JSON): tüm endpointleri listeler
app.get('/api', (req, res) => {
  const B = '/api/v1';
  res.json({
    name: 'ShiftDelete.Net Unofficial API',
    version: '1.1.0',
    note: 'Bu API shiftdelete.net üzerinden çalışır, siteyle resmi bir bağı yoktur. Tüm endpointlerde ?lang=en ile İngilizce sürüm kullanılabilir.',
    protection: {
      apiRateLimit: { max: API_RATE_LIMIT_MAX, windowMs: API_RATE_LIMIT_WINDOW_MS, scope: 'IP başına', headers: 'X-RateLimit-*' },
      upstreamGate: 'Eşzamanlılık sınırı, istek aralığı, dakikalık üst sınır, yeniden deneme ve devre kesici',
      cache: '5 dk taze + 24 saate kadar eski yanıt yedeği (upstream erişilemezse)',
    },
    endpoints: {
      genel: [
        `${B}/health`,
        `${B}/nav`,
        `${B}/rss`,
        `${B}/sitemap/urls?kind=news|pages|posts&page=1`,
      ],
      haberler: [
        `${B}/latest?page=1&per_page=12`,
        `${B}/news/:slug`,
        `${B}/news/:slug/related`,
        `${B}/news/:slug/comments`,
        `${B}/videos`,
        `${B}/gallery`,
        `${B}/reviews`,
        `${B}/howto`,
      ],
      kategoriler: [
        `${B}/categories?search=&page=1`,
        `${B}/categories/:slug?page=1&per_page=12`,
      ],
      arama: [
        `${B}/search?q=iphone`,
        `${B}/search/posts?q=iphone`,
      ],
      etiketler: [
        `${B}/tags?search=iphone`,
        `${B}/tags/:slug`,
      ],
      yazarlar: [
        `${B}/authors?search=`,
        `${B}/authors/:slug`,
        `${B}/authors/:slug/posts`,
      ],
      yorumlar: [
        `${B}/comments/latest`,
        `${B}/comments?post=<makale_id>`,
      ],
      urunler: [
        `${B}/products?search=redmi`,
        `${B}/products/:slug`,
      ],
      sayfalar: [
        `${B}/pages`,
        `${B}/pages/:slug`,
      ],
      medya: [
        `${B}/media/:id`,
      ],
    },
    status: { cache: cache.stats(), gate: gate.snapshot() },
  });
});

app.use('/api/v1', require('./routes/posts'));
app.use('/api/v1/categories', require('./routes/categories'));
app.use('/api/v1/search', require('./routes/search'));
app.use('/api/v1/tags', require('./routes/tags'));
app.use('/api/v1/authors', require('./routes/authors'));
app.use('/api/v1/comments', require('./routes/comments'));
app.use('/api/v1/pages', require('./routes/pages'));
app.use('/api/v1/products', require('./routes/products'));
app.use('/api/v1/media', require('./routes/media'));
app.use('/api/v1', require('./routes/misc'));

// 404 — bilinmeyen endpoint
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint bulunamadı', hint: 'Dokümantasyon için GET / (web) veya GET /api (JSON) çağırın' });
});

// Merkezi hata yönetimi
app.use((err, req, res, _next) => {
  if (err instanceof UpstreamError) {
    return res.status(err.status).json({
      error: 'UpstreamError',
      message: err.message,
      status: err.status,
      hint: err.status >= 500 ? 'Upstream geçici olarak sorunlu olabilir; kısa süre içinde tekrar deneyin' : undefined,
    });
  }
  if (err && err.code === 'CIRCUIT_OPEN') {
    return res.status(503).json({
      error: 'CircuitOpen',
      message: err.message,
      hint: 'Önbellekteki eski veri süresi doldu; devre kapanınca istekler otomatik devam eder',
    });
  }
  if (err && (err.code === 'QUEUE_FULL' || err.code === 'THROTTLED')) {
    return res.status(503).json({ error: 'Busy', message: err.message });
  }
  if (err.type === 'entity.parse.failed' || err.status === 400) {
    return res.status(400).json({ error: 'BadRequest', message: err.message });
  }
  console.error('Beklenmeyen hata:', err.message);
  return res.status(500).json({ error: 'InternalServerError', message: 'Beklenmeyen bir hata oluştu' });
});

module.exports = app;
