# ShiftDelete.Net Unofficial API 📰

> **Öncelikle:** Bu proje, [ShiftDelete.Net](https://shiftdelete.net) ekibinin yıllardır ortaya koyduğu emeğe duyulan hayranlıktan doğdu. Harika bir içerik arşivi oluşturdukları için kendilerine **çok teşekkür ederiz**. 🙏

ShiftDelete.Net'in kamuya açık WordPress altyapısını kullanan, kişisel ve eğitim amaçlı hazırlanmış küçük bir JSON API projesidir. Siteyle resmi bir bağlantısı yoktur; ticari hiçbir amacı yoktur.

## Peki ama neden? 🤔

Sitenin içeriğini programatik olarak okumak istediğinizde (bir okuma uygulaması, haftalık özet botu, araştırma projesi…) her seferinde aynı kazıma/sıralama kodunu yazmak gerekir. Bu proje o işi tek bir temiz JSON katmanında toplar — ve bunu yaparken siteyi asla yormamayı ilke edinir.

## Siteye saygı: nasıl nazik davranıyoruz? 💚

Bu API, upstream'e (shiftdelete.net) karşı bilerek "iyi komşu" gibi davranacak şekilde tasarlandı:

1. **Hız sınırı** — Bu sunucuya gelen istekler IP başına dakikada 60 ile sınırlıdır (ayarlanabilir). Aşan isteklere nazik bir 429 ve `Retry-After` döner.
2. **Nazik trafik kapısı** — Siteye aynı anda en fazla 4 istek gider, istekler arasında en az 120 ms nefes payı bırakılır, dakikada 120 istek üst sınırı vardır.
3. **Yeniden deneme + devre kesici** — Geçici hatalarda üssel beklemeyle en fazla 3 deneme yapılır; siteye 5 hatada bir 30 saniyelik "sessizlik" verilir ve periyodik probla durum düzelir.
4. **Önbellek** — Yanıtlar 5 dakika taze tutulur ve diske yazılır; aynı içerik için site tekrar tekrar yorulmaz.

Tüm eşikler ortam değişkenleriyle ayarlanabilir (tam liste: `src/config.js`). Anlık durumu `GET /api/v1/health` gösterir.

## Çalıştırma 🚀

```bash
npm install
npm start          # http://localhost:3000
npm run dev        # dosya değişince yeniden başlar
npm test           # birim testleri
```

Port değiştirmek için: `PORT=8080 npm start`

Çalışan endpoint listesi `GET http://localhost:3000/` adresinden de alınabilir.

## Ortak özellikler

- **Sayfalama**: Liste uç noktalarında `?page=` ve `?per_page=` (varsayılan 12, en fazla 50). Yanıt `meta: { total, totalPages, page, perPage }` içerir.
- **Dil**: Tüm uç noktalarda `?lang=en` ile İngilizce site (en.shiftdelete.net) üzerinden veri döner; varsayılan `tr`.
- **Önbellek**: Upstream yanıtları 5 dakika taze tutulur ve diske yazılır; upstream geçici olarak erişilemezse eski yanıt servis edilir.
- **Hatalar**: Tüm hatalar düzgün JSON döner; iç yapı sızmaz.

## Uç noktalar

| Bölüm | Uç nokta | Ne verir |
|---|---|---|
| Genel | `GET /api/v1/health` | Servis + upstream + önbellek durumu |
| Genel | `GET /api/v1/nav` | Sitenin ana menüsü ve özel içerik yolları |
| Genel | `GET /api/v1/rss` | Ana RSS akışının normalize edilmiş hâli |
| Genel | `GET /api/v1/sitemap/urls?kind=news\|pages\|posts&page=1` | Sitemap URL'leri (posts: 185 parça, Google News: son 60) |
| Haber | `GET /api/v1/latest` | Son haberler |
| Haber | `GET /api/v1/news/:slug` | Tam makale: içerik, yazar, kategoriler, etiketler, kapak görseli, okuma süresi |
| Haber | `GET /api/v1/news/:slug/related` | Aynı ana kategoriden 6 benzer haber |
| Haber | `GET /api/v1/news/:slug/comments` | Makalenin yorumları |
| Bölüm | `GET /api/v1/videos` | SDN TV içerikleri |
| Bölüm | `GET /api/v1/gallery` | Foto galeri yazıları |
| Bölüm | `GET /api/v1/reviews` | İncelemeler |
| Bölüm | `GET /api/v1/howto` | Nasıl Yapılır? yazıları |
| Kategori | `GET /api/v1/categories` | Kategori listesi (`?search=` ile filtre) |
| Kategori | `GET /api/v1/categories/:slug` | Kategori bilgisi + haberleri |
| Arama | `GET /api/v1/search?q=iphone` | Hızlı arama (başlık + adres) |
| Arama | `GET /api/v1/search/posts?q=iphone` | Tam haber nesneleriyle arama |
| Etiket | `GET /api/v1/tags?search=iphone` | Etiket arama |
| Etiket | `GET /api/v1/tags/:slug` | Etiket + o etiketin haberleri |
| Yazar | `GET /api/v1/authors` | Yazarlar (`?search=` destekli) |
| Yazar | `GET /api/v1/authors/:slug` | Yazar profili (bio, avatar) + yazıları |
| Yorum | `GET /api/v1/comments/latest` | Siteden son yorumlar |
| Yorum | `GET /api/v1/comments?post=<id>` | Belirli makalenin yorumları (id ile) |
| Ürün | `GET /api/v1/products?search=redmi` | Karşılaştırma veritabanındaki ürünler |
| Ürün | `GET /api/v1/products/:slug` | Tam özellik tablosu (gruplu) ve puanlar |
| Sayfa | `GET /api/v1/pages` | Kurumsal sayfalar (künye, iletişim…) |
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
test/                  → birim testleri
```

## Bilinen sınırlar

- **Trending ("Enler")**: Sitenin en çok okunanlar sayfası istemci tarafında ve admin-ajax robots.txt ile yasak olduğu için bu API'de yoktur; en yakın alternatif `latest` uç noktasıdır.
- **Ürün özellikleri**: REST'te kapalı olduğu için HTML'den okunur; site şablonu değişirse `src/scrape/product.js` güncellenmelidir.
- **Forum**: SDN forum (sdn.com.tr) ayrı bir site olduğundan kapsam dışıdır.

## Sorumluluk reddi ve teşekkürler ❤️

- Bu proje **resmi değildir**; ShiftDelete.Net ile hiçbir bağı yoktur. Tüm içerik hakları ShiftDelete.Net'e aittir.
- Kişisel, eğitim ve araştırma amaçlıdır. Ticari kullanım için lütfen doğrudan siteyle iletişime geçin.
- İçeriği kaynağında ziyaret etmek her zaman için en iyisidir: **[shiftdelete.net](https://shiftdelete.net)** 💙
- Site sahipleri bu projenin varlığını istemezlerse, memnuniyetle kaldırılır — yeter ki haberi olsun. 🌱
