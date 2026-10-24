# ShiftDelete.Net Unofficial API

ShiftDelete.Net'in tüm bölümlerine tek bir temiz JSON API üzerinden erişim sağlar. Sitenin WordPress REST altyapısı ile `/urun-detay/` özellik sayfalarını kullanır; siteyle resmi bir bağı yoktur.

## Koruma katmanları (IP yasaklanmasın)

Bu API, shiftdelete.net'e karşı "iyi vatandaş" davranacak şekilde tasarlandı — dört katman üst üste çalışır:

1. **API hız sınırı** — Bu sunucuya gelen istekler IP başına dakikada 60'a (ayarlabilir) sınırlandırılır. Aşan istekler `Retry-After` başlıklı 429 alır; böylece kötü niyetli bir istemci upstream'i yoramaz.
2. **Upstream kapısı (gate)** — shiftdelete.net'e aynı anda en fazla 4 istek gider; istekler arası en az 120 ms boşluk vardır, dakikada 120 istek üst sınırı vardır ve kuyruk dolarsa beklemek yerine hızlı 503 döner.
3. **Yeniden deneme + devre kesici** — Geçici hatalar (429/5xx/ağ) üssel bekleme ve titremeyle en fazla 3 kez denenir; `Retry-After` başlığına saygı gösterilir. Arka arkaya 5 upstream hatası devreyi açar: 30 saniye boyunca upstream'e hiç istek gitmez, periyodik prob ile kendiliğinden iyileşir.
4. **Önbellek + eski yanıt yedeği** — Yanıtlar 5 dakika taze tutulur, diske yazılır (yeniden başlatmada upstream yorulmaz) ve upstream tamamen erişilemezse 24 saate kadarki eski veri servis edilip upstream arka planda sessizce tazelenir.

Ek otomatik düzeltmeler: aynı URL'e eşzamanlı istekler tek upstream çağrısında birleşir (single-flight); WP'nin "geçersiz sayfa" hatasında istek otomatik olarak son sayfaya sıkıştırılır; beklenmeyen süreç hataları loglanır, sunucu düşmez.

Tüm eşikler ortam değişkenleriyle ayarlanabilir: `API_RATE_LIMIT_MAX`, `GATE_MAX_CONCURRENT`, `GATE_MIN_SPACING_MS`, `GATE_MAX_PER_MINUTE`, `RETRY_MAX`, `BREAKER_FAILURE_THRESHOLD`, `BREAKER_COOLDOWN_MS`, `CACHE_TTL_MS`, `CACHE_STALE_MAX_AGE_MS` (tam liste: `src/config.js`).

Anlık durum: `GET /api/v1/health` devre kesici durumunu, upstream trafik sayaçlarını ve önbellek isabet oranını verir.

## Çalıştırma

```bash
npm install
npm start          # http://localhost:3000
npm run dev        # dosya değişince yeniden başlar
npm test           # birim testleri çalıştırır
```

Port değiştirmek için: `PORT=8080 npm start`

Tüm endpoint listesi çalışırken `GET http://localhost:3000/` adresinden de alınabilir.

## Ortak özellikler

- **Sayfalama**: Liste uç noktalarında `?page=` ve `?per_page=` (varsayılan 12, en fazla 50). Yanıt `meta: { total, totalPages, page, perPage }` içerir.
- **Dil**: Tüm uç noktalarda `?lang=en` ile İngilizce site (en.shiftdelete.net) üzerinden veri döner; varsayılan `tr`.
- **Önbellek**: Upstream yanıtları 5 dakika taze tutulur ve diske yazılır; upstream erişilemezse eski yanıt servis edilir. `GET /api/v1/health` isabet oranını gösterir.
- **Hatalar**: Tüm hatalar JSON döner (`UpstreamError`, `CircuitOpen`, `RateLimitExceeded`, `Makale bulunamadı` vb.); iç yapı sızmaz.

## Uç noktalar

| Bölüm | Uç nokta | Ne verir |
|---|---|---|
| Genel | `GET /api/v1/health` | Servis + upstream + önbellek durumu |
| Genel | `GET /api/v1/nav` | Sitenin ana menüsü (16 bölüm) ve özel içerik yolları |
| Genel | `GET /api/v1/rss` | Ana RSS akışının normalize edilmiş hâli |
| Genel | `GET /api/v1/sitemap/urls?kind=news\|pages\|posts&page=1` | Sitemap URL'leri (posts: 185 parça, Google News: son 60) |
| Haber | `GET /api/v1/latest` | Son haberler (184.000+ makale) |
| Haber | `GET /api/v1/news/:slug` | Tam makale: içerik HTML + düz metin, yazar, kategoriler, etiketler, kapak görseli, okuma süresi, SEO alanları |
| Haber | `GET /api/v1/news/:slug/related` | Aynı ana kategoriden 6 benzer haber |
| Haber | `GET /api/v1/news/:slug/comments` | Makalenin yorumları (1,7M+ yorum arşivi) |
| Bölüm | `GET /api/v1/videos` | SDN TV içerikleri (12.000+) |
| Bölüm | `GET /api/v1/gallery` | Foto galeri yazıları |
| Bölüm | `GET /api/v1/reviews` | İncelemeler |
| Bölüm | `GET /api/v1/howto` | Nasıl Yapılır? yazıları |
| Kategori | `GET /api/v1/categories` | 166 kategori (`?search=` ile filtre) |
| Kategori | `GET /api/v1/categories/:slug` | Kategori bilgisi + o kategorinin haberleri |
| Arama | `GET /api/v1/search?q=iphone` | Hızlı arama (başlık + adres) |
| Arama | `GET /api/v1/search/posts?q=iphone` | Tam haber nesneleriyle arama |
| Etiket | `GET /api/v1/tags?search=iphone` | Etiket arama (276.000+ etiket) |
| Etiket | `GET /api/v1/tags/:slug` | Etiket + o etiketin haberleri |
| Yazar | `GET /api/v1/authors` | Yazarlar (348 kişi, `?search=` destekli) |
| Yazar | `GET /api/v1/authors/:slug` | Yazar profili (bio, avatar) + yazıları |
| Yorum | `GET /api/v1/comments/latest` | Siteden son yorumlar |
| Yorum | `GET /api/v1/comments?post=<id>` | Belirli makalenin yorumları (id ile) |
| Ürün | `GET /api/v1/products?search=redmi` | Karşılaştırma veritabanındaki 100+ ürün |
| Ürün | `GET /api/v1/products/:slug` | Tam özellik tablosu (gruplu), genel puan, tasarım/ekran/kamera puanları |
| Sayfa | `GET /api/v1/pages` | Kurumsal sayfalar (künye, iletişim, alıntı şartları…) |
| Sayfa | `GET /api/v1/pages/:slug` | Sayfa içeriği |
| Medya | `GET /api/v1/media/:id` | Kapak/görsel detayı + tüm boyut URL'leri |

## Örnek

```bash
curl "http://localhost:3000/api/v1/latest?per_page=5"
curl "http://localhost:3000/api/v1/news/yeni-nesil-ds-n7-turkiyede-satisa-sunuldu"
curl "http://localhost:3000/api/v1/products/xiaomi-redmi-note-15-pro-2"
curl "http://localhost:3000/api/v1/search?q=yapay+zeka&lang=en"
```

## Mimari

```
server.js              → http dinleyici
src/app.js             → Express uygulaması, dokümantasyon, merkezi hata yönetimi
src/config.js          → site adresleri (tr/en), ana menü, önbellek ayarları
src/cache.js           → TTL bellek önbelleği (5 dk)
src/http.js            → upstream fetch katmanı (zaman aşımı, sayfalama başlıkları)
src/normalize.js       → WP yanıtlarını sade şemaya çevirir + HTML→metin
src/scrape/product.js  → /urun-detay/ özellik tablosu kazıyıcı
src/routes/*.js        → uç nokta tanımları
test/normalize.test.js → birim testleri
```

## Bilinen sınırlar

- **Unofficial**: Site sahibi bu API'yi bilmiyor; yoğun kullanım IP'nize yasak getirebilir. Önbellek ve makul `per_page` değerleri kullanın.
- **Trending ("Enler")**: Sitenin en çok okunanlar sayfası istemci tarafında ve admin-ajax robots.txt ile yasak olduğu için bu API'de yoktur; en yakın alternatif `latest` uç noktasıdır.
- **Ürün özellikleri**: REST'te kapalı olduğu için HTML'den kazınır; site şablonu değişirse `src/scrape/product.js` güncellenmelidir.
- **Forum**: SDN forum (sdn.com.tr) ayrı bir site olduğundan kapsam dışıdır.
