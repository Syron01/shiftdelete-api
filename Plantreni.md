# PlanTreni

Değer: shiftdelete.net'in tüm bölümlerine (haberler, kategoriler, arama, yazarlar, yorumlar, ürün karşılaştırma, SDN TV, galeri, sayfalar, medya, RSS, sitemap) tek bir temiz JSON API üzerinden erişim sağlar.

Veri kaynağı: site WordPress tabanlı ve REST API'si tamamen açık (`/wp-json/wp/v2/*`). Ürün özellikleri REST'te kapalı → `/urun-detay/` HTML'inden kazınır. Trending sayfası client-side render + admin-ajax robots'ta yasak → atlandı.

## Bağlantılar
- server.js → src/app.js → routes/* → cache.js, http.js, normalize.js
- app.js → rateLimit.js (IP başına API rate limit)
- routes/* → http.js → gate.js (eşzamanlılık/ara/limit kuyruk) + cache.js (bellek+disk+stale fallback)
- routes/products → scrape/product.js → http.js
- normalize.js → test/normalize.test.js
- gate.js, cache.js → test/gate.test.js, test/cache.test.js
- config.js → tüm modüller (base URL, cache TTL, lang param, koruma eşikleri)

## Endpoint haritası
- GET /                          → self dokümantasyon
- GET /api/v1/health             → uplink kontrolü
- GET /api/v1/latest             → son haberler
- GET /api/v1/news/:slug         → makale detayı (+plain_text)
- GET /api/v1/news/:slug/related → benzer haberler
- GET /api/v1/news/:slug/comments→ makale yorumları
- GET /api/v1/categories         → 166 kategori
- GET /api/v1/categories/:slug   → kategori + postları
- GET /api/v1/search             → arama
- GET /api/v1/tags, /tags/:slug, /tags/:slug/posts
- GET /api/v1/authors, /authors/:slug, /authors/:slug/posts
- GET /api/v1/comments/latest    → son yorumlar
- GET /api/v1/products           → ürün listesi (aps-products)
- GET /api/v1/products/:slug     → tam özellik tablosu + puan (scrape)
- GET /api/v1/pages, /pages/:slug
- GET /api/v1/media/:id
- GET /api/v1/videos             → SDN TV
- GET /api/v1/gallery            → foto galeri
- GET /api/v1/rss                → normalize edilmiş RSS
- GET /api/v1/sitemap/urls       → sitemap URL'leri (news|pages|posts)
- GET /api/v1/nav                → ana menü
- Tüm endpointlerde ?lang=en → en.shiftdelete.net

## Durum
[x] Site incelemesi (robots, sitemap, REST, nav, makale, ürün, arama)
[x] Veri kaynağı doğrulaması (REST 200, aps-products, comments, users)
[x] config.js, cache.js, http.js, normalize.js
[x] routes/* (posts, categories, search, tags, authors, comments, pages, products, media, misc)
[x] scrape/product.js
[x] test/normalize.test.js
[x] Sunucu çalıştırma + endpoint testleri (26 endpoint test edildi, hepsi veri döndü)
[x] README.md
[x] Koruma katmanları (IP yasaklanmasın): rateLimit.js, gate.js, cache disk+stale, retry+backoff+breaker
[x] Otomatik düzeltmeler: single-flight dedup, rest_post_invalid_page_number clamp, süreç guard'ları
[x] test/gate.test.js + test/cache.test.js (14/14 test geçti)
[x] Doğrulama: 70 istek burst → 58×200 + 12×429 (Retry-After), 20 endpoint taraması 200, disk cache aktif
[x] README koruma bölümü eklendi, .gitignore

## Notlar / riskler
- ?s= ve /arama/ robots'ta yasak → arama REST /wp/v2/search üzerinden (izinli alan).
- admin-ajax (trending) kullanılmıyor: robots'ta yasak + nonce bağımlı.
- Ürün scrape'i sitesel HTML değişimine kırılgan (aps-* class isimleri) → hata durumunda temel alanlarla dön.
- Unofficial API: 4 katmanlı koruma (API rate limit 60/dk IP, upstream gate, retry+breaker, cache+stale) yasaklanma riskini büyük ölçüde azaltır; uzun vadeli garanti verilemez.
- Breaker gerçek upstream arızasında yalnızca birim testle doğrulandı (canlı arıza simüle edilmedi).
- Gallery slug'ı: REST kategori id=18 "galeri". Videos: "sdntv" kategorisi REST'te var (doğrulandı).
