<div align="center">

# ShiftDelete.Net Unofficial API 📰

<img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js 18+">
<img src="https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express 4">
<img src="https://img.shields.io/badge/Endpoints-29-8b5cf6?style=for-the-badge" alt="29 endpoints">
<img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License">
<img src="https://img.shields.io/badge/Unofficial-%E2%9D%A4-orange?style=for-the-badge" alt="Unofficial">

**ShiftDelete.Net'in tüm içeriğine ulaşan,**
**tek bir temiz JSON API.**

Kişisel ve eğitim amaçlı bir projedir.
Siteyle resmi bir bağı yoktur.

</div>

<br>

> 💌 **Öncelikle teşekkür:**
>
> Bu proje, [ShiftDelete.Net](https://shiftdelete.net) ekibinin
> yıllardır ortaya koyduğu emeğe duyulan hayranlıktan doğdu.
>
> Bu kadar değerli bir içerik arşivi oluşturdukları için
> kendilerine **teşekkür ederiz** 🙏
>
> Tüm içerik hakları ShiftDelete.Net'e aittir.

<br>

## 📑 İçindekiler

- [Neden bu proje?](#-bu-ne)
- [Siteye saygı](#-siteye-saygı)
- [Kurulum](#-kurulum)
- [Ortak kurallar](#-ortak-kurallar)
- [API Referansı](#-api-referansı)
  - [Genel](#-genel)
  - [Haber](#-haber)
  - [Bölümler](#-bölümler)
  - [Kategori](#-kategori)
  - [Arama](#-arama)
  - [Etiket](#-etiket)
  - [Yazar](#-yazar)
  - [Yorum](#-yorum)
  - [Ürün](#-ürün)
  - [Sayfa](#-sayfa)
  - [Medya](#-medya)
- [Örnekler](#-örnekler)
- [Mimari](#-mimari)
- [Bilinen sınırlar](#-bilinen-sınırlar)
- [Sorumluluk reddi](#%EF%B8%8F-sorumluluk-reddi-ve-teşekkürler)

<br>

## 🤔 Bu ne?

Sitenin içeriğini programatik okumak istediğinizde —
bir okuma uygulaması, haftalık özet botu,
araştırma projesi — her seferinde aynı
kazıma ve sıralama kodunu yazmak gerekir.

Bu proje o işi tek bir JSON katmanında toplar.

Kullandığı kaynaklar:

- Sitenin **kamuya açık** WordPress REST altyapısı
- Sitenin **kamuya açık** RSS ve sitemap dosyaları
- `/urun-detay/` ürün sayfalarının HTML'i

Ve bunu yaparken siteyi **asla yormaz.**

<br>

## 💚 Siteye saygı

Bu API, upstream'e karşı "iyi komşu" gibi
davranacak şekilde tasarlandı.

Dört katman üst üste çalışar:

<br>

**1 · Hız sınırı** 🚦

Bu sunucuya gelen istekler IP başına
dakikada 60 ile sınırlıdır (ayarlanabilir).

Aşan isteklere `Retry-After` başlıklı
nazik bir `429` döner.

<br>

**2 · Nazik trafik kapısı** 🚪

Siteye aynı anda en fazla **4** istek gider.

İstekler arasında en az **120 ms**
nefes payı bırakılır.

Dakikada **120** istek üst sınırı vardır.
Kuyruk dolarsa beklemek yerine hızlı `503` döner.

<br>

**3 · Yeniden deneme + devre kesici** 🔌

Geçici hatalarda (429 / 5xx / ağ)
üssel bekleme ve titremeyle
en fazla 3 kez denenir.

Arka arkaya 5 hata, devreyi açar:
30 saniye boyunca siteye hiç istek gitmez.
Periyodik prob ile kendiliğinden düzelir.

<br>

**4 · Önbellek + eski yanıt yedeği** 🗄️

Yanıtlar 5 dakika taze tutulur ve
diske yazılır (yeniden başlatmada
site yorulmaz).

Site tamamen erişilemezse 24 saate
kadarki eski veri servis edilir,
arka planda sessizce tazelenir.

<br>

<details>
<summary><b>⚙️ İnce ayar — tüm ortam değişkenleri</b></summary>

<br>

| Değişken | Ne yapar |
|---|---|
| `PORT` | Sunucu portu (varsayılan 3000) |
| `API_RATE_LIMIT_MAX` | IP başına dakikada istek (60) |
| `GATE_MAX_CONCURRENT` | Siteye eşzamanlı istek (4) |
| `GATE_MIN_SPACING_MS` | İstekler arası boşluk (120) |
| `GATE_MAX_PER_MINUTE` | Siteye dakikada üst sınır (120) |
| `RETRY_MAX` | Yeniden deneme sayısı (3) |
| `BREAKER_FAILURE_THRESHOLD` | Devre kesici eşiği (5) |
| `BREAKER_COOLDOWN_MS` | Dinlenme süresi (30 sn) |
| `CACHE_TTL_MS` | Önbellek tazeliği (5 dk) |
| `CACHE_STALE_MAX_AGE_MS` | Eski veri üst sınırı (24 sa) |

Tam liste: `src/config.js`

</details>

<br>

## 🚀 Kurulum

```bash
npm install
npm start        # → http://localhost:3000
```

Çalışan tam endpoint listesi
`GET http://localhost:3000/` adresinde de var.

<br>

```bash
npm run dev      # dosya değişince yeniden başlar
npm test         # birim testler
PORT=8080 npm start   # port değiştirme
```

<br>

## 🔧 Ortak kurallar

**Sayfalama** 📄

Liste uç noktalarında `?page=` ve `?per_page=`

Varsayılan 12, en fazla 50.

Yanıtın `meta` alanı:
`{ total, totalPages, page, perPage }`

<br>

**Dil** 🌍

Tüm uç noktalarda `?lang=en`
İngilizce site üzerinden veri döner.

Varsayılan: `tr`

<br>

**Önbellek** 🗄️

Upstream yanıtları 5 dk taze tutulur.
`/health` isabet oranını gösterir.

<br>

**Hatalar** 🧯

Tüm hatalar JSON döner:

`UpstreamError` · `CircuitOpen` ·
`RateLimitExceeded` · `Makale bulunamadı`

İç yapı asla sızmaz.

<br>

---

## 📚 API Referansı

Base URL: `http://localhost:3000`

Tümü: `GET /api/v1/...`

<br>

### 🌐 Genel

**`GET /api/v1/health`**

Servis + site + önbellek durumu.

Devre kesici durumu, trafik sayaçları,
önbellek isabet oranı.

<br>

**`GET /api/v1/nav`**

Sitenin ana menüsü — 16 bölüm
ve özel içerik yolları.

<br>

**`GET /api/v1/rss`**

Ana RSS akışının
normalize edilmiş hâli.

<br>

**`GET /api/v1/sitemap/urls`**

Sitemap URL'leri.

Parametreler:

- `?kind=` → `news` | `pages` | `posts`
- `?page=1`

posts: 185 parça · Google News: son 60

<br>

### 📰 Haber

**`GET /api/v1/latest`**

Son haberler. Sayfalanabilir.

<br>

**`GET /api/v1/news/:slug`**

Tam makale:

- İçerik HTML + düz metin
- Yazar, kategoriler, etiketler
- Kapak görseli
- Okuma süresi
- SEO alanları

<br>

**`GET /api/v1/news/:slug/related`**

Aynı ana kategoriden 6 benzer haber.

<br>

**`GET /api/v1/news/:slug/comments`**

Makalenin yorumları.

<br>

### 📚 Bölümler

Hepsi sayfalanabilir liste döner.

**`GET /api/v1/videos`** — SDN TV içerikleri

**`GET /api/v1/gallery`** — Foto galeri yazıları

**`GET /api/v1/reviews`** — İncelemeler

**`GET /api/v1/howto`** — Nasıl Yapılır? yazıları

<br>

### 🗂️ Kategori

**`GET /api/v1/categories`**

166 kategori.
`?search=` ile filtre.

<br>

**`GET /api/v1/categories/:slug`**

Kategori bilgisi + o kategorinin haberleri.

<br>

### 🔎 Arama

**`GET /api/v1/search?q=iphone`**

Hızlı arama — başlık + adres.

<br>

**`GET /api/v1/search/posts?q=iphone`**

Tam haber nesneleriyle arama.

<br>

### 🏷️ Etiket

**`GET /api/v1/tags?search=iphone`**

Etiket arama. 276.000+ etiket.

<br>

**`GET /api/v1/tags/:slug`**

Etiket + o etiketin haberleri.

<br>

### ✍️ Yazar

**`GET /api/v1/authors`**

Yazar listesi — 348 kişi.
`?search=` destekli.

<br>

**`GET /api/v1/authors/:slug`**

Yazar profili: bio, avatar.

<br>

**`GET /api/v1/authors/:slug/posts`**

Yazarın yazıları. Sayfalanabilir.

<br>

### 💬 Yorum

**`GET /api/v1/comments/latest`**

Siteden son yorumlar.

<br>

**`GET /api/v1/comments?post=<id>`**

Belirli makalenin yorumları (id ile).

<br>

### 📱 Ürün

**`GET /api/v1/products?search=redmi`**

Karşılaştırma veritabanında arama.
100+ ürün.

<br>

**`GET /api/v1/products/:slug`**

Tam özellik tablosu (gruplu) +
genel puan + tasarım / ekran / kamera puanları.

<br>

### 📄 Sayfa

**`GET /api/v1/pages`**

Kurumsal sayfalar — künye,
iletişim, alıntı şartları…

<br>

**`GET /api/v1/pages/:slug`**

Sayfa içeriği.

<br>

### 🖼️ Medya

**`GET /api/v1/media/:id`**

Kapak / görsel detayı +
tüm boyut URL'leri.

<br>

---

## 🧪 Örnekler

```bash
curl "http://localhost:3000/api/v1/latest?per_page=5"
```

```bash
curl "http://localhost:3000/api/v1/news/yeni-nesil-ds-n7-turkiyede-satisa-sunuldu"
```

```bash
curl "http://localhost:3000/api/v1/products/xiaomi-redmi-note-15-pro-2"
```

```bash
curl "http://localhost:3000/api/v1/search?q=yapay+zeka&lang=en"
```

<br>

<details>
<summary><b>📁 Mimari</b></summary>

<br>

```
server.js              → http dinleyici
src/app.js             → Express, dokümantasyon, hata yönetimi
src/config.js          → site adresleri (tr/en), menü, ayarlar
src/cache.js           → TTL bellek önbelleği (5 dk) + disk
src/gate.js            → siteye trafik kapısı
src/http.js            → upstream fetch katmanı
src/rateLimit.js       → IP hız sınırı
src/normalize.js       → WP yanıtlarını sade şemaya çevirir
src/scrape/product.js  → /urun-detay/ özellik okuyucu
src/routes/*.js        → uç nokta tanımları
test/                  → birim testler
```

</details>

<br>

## 🚧 Bilinen sınırlar

**Trending ("Enler")**

Sitenin en çok okunanlar sayfası istemci
tarafında yükleniyor ve admin-ajax
robots.txt ile yasak — bu yüzden yok.

En yakın alternatif: `latest`

<br>

**Ürün özellikleri**

REST'te kapalı olduğu için HTML'den okunur.
Site şablonu değişirse
`src/scrape/product.js` güncellenmelidir.

<br>

**Forum**

SDN forum (sdn.com.tr) ayrı bir sitedir —
kapsam dışıdır.

<br>

Ek otomatik davranışlar:

- Aynı URL'e eşzamanlı istekler tek
  site çağrısında birleşir (single-flight)
- WP "geçersiz sayfa" hatasında istek
  otomatik son sayfaya sıkıştırılır
- Beklenmeyen süreç hataları loglanır,
  sunucu düşmez

<br>

---

## ❤️ Sorumluluk reddi ve teşekkürler

Bu proje **resmi değildir.**

ShiftDelete.Net ile hiçbir bağı yoktur.

Tüm içerik hakları **ShiftDelete.Net**'e aittir.

Kişisel, eğitim ve araştırma amaçlıdır.
Ticari kullanım için lütfen doğrudan
siteyle iletişime geçin.

İçeriği kaynağında okumak her zaman
en iyisidir: **[shiftdelete.net](https://shiftdelete.net)** 💙

Site sahipleri bu projenin varlığını istemezse
**memnuniyetle kaldırılır** 🌱

<br>

<div align="center">

<sub>İyi okumalar 📚✨</sub>

</div>
