<div align="center">

# ShiftDelete.Net Unofficial API 📰

<img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js 18+">
<img src="https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express 4">
<img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="MIT License">
<img src="https://img.shields.io/badge/Unofficial-%E2%9D%A4-orange?style=for-the-badge" alt="Unofficial">

</div>

<br>

> 💌 **Öncelikle:**
>
> Bu proje, [ShiftDelete.Net](https://shiftdelete.net) ekibinin
> yıllardır ortaya koyduğu emeğe duyulan hayranlıktan doğdu.
>
> Harika bir içerik arşivi oluşturdukları için
> kendilerine **çok teşekkür ederiz** 🙏

<br>

## ❓ Bu ne?

Kişisel ve eğitim amaçlı, küçük bir JSON API projesidir.

Sitenin kamuya açık WordPress altyapısını kullanır.

Siteyle **resmi bir bağlantısı yoktur.**
Ticari hiçbir amacı yoktur.

<br>

Diyelim ki bir okuma uygulaması ya da
haftalık özet botu yazmak istiyorsunuz.

Her seferinde aynı kazıma kodunu
yazmak yerine — bu API tek bir
temiz JSON katmanı sunar.

Ve bunu yaparken siteyi **asla yormaz.**

<br>

## 💚 Siteye saygı

Bu API, siteye karşı "iyi komşu" gibi davranır.

Dört katman üst üste çalışır:

<br>

**1. Hız sınırı** 🚦

Dakikada en fazla 60 istek (IP başına).

Aşan isteklere nazik bir `429` döner.

<br>

**2. Nazik trafik kapısı** 🚪

Aynı anda en fazla 4 istek gider.

İstekler arasında 120 ms nefes payı bırakılır.

Dakikada 120 istek üst sınırı vardır.

<br>

**3. Devre kesici** 🔌

Geçici hata olursa üssel beklemeyle
en fazla 3 deneme yapılır.

Site 5 hatada bir 30 saniyelik
sessizliğe alınır ve dinlendirilir.

<br>

**4. Önbellek** 🗄️

Yanıtlar 5 dakika taze tutulur,
diske de yazılır.

Aynı içerik için site
tekrar tekrar yorulmaz.

<br>

<details>
<summary>⚙️ İnce ayar (tıkla)</summary>

<br>

Tüm eşikler ortam değişkenleriyle
ayarlanabilir.

Tam liste: `src/config.js`

Anlık durum: `GET /api/v1/health`

</details>

<br>

## 🚀 Çalıştırma

```bash
npm install
npm start
```

Bitti ✨

Adres: `http://localhost:3000`

<br>

<details>
<summary>Diğer komutlar</summary>

<br>

```bash
npm run dev    # değişince yeniden başlar
npm test       # birim testler
```

Port değiştirmek için:

```bash
PORT=8080 npm start
```

</details>

<br>

## ✨ Ortak özellikler

**Sayfalama** 📄

`?page=` ve `?per_page=`

Varsayılan 12, en fazla 50.

<br>

**Dil** 🌍

`?lang=en` ile İngilizce veri.

Varsayılan: `tr`

<br>

**Önbellek** 🗄️

Site geçici olarak düşerse
eski yanıt servis edilir.

<br>

**Hatalar** 🧯

Her hata düzgün JSON döner.
İç yapı sızmaz.

<br>

## 🗺️ Uç noktalar

<br>

### 🌐 Genel

`GET /api/v1/health`

Servis + site + önbellek durumu

<br>

`GET /api/v1/nav`

Sitenin ana menüsü

<br>

`GET /api/v1/rss`

RSS akışı, normalize edilmiş hâli

<br>

`GET /api/v1/sitemap/urls`

Sitemap URL'leri

<br>

### 📰 Haber

`GET /api/v1/latest`

Son haberler

<br>

`GET /api/v1/news/:slug`

Tam makale — içerik, yazar,
kapak görseli, okuma süresi

<br>

`GET /api/v1/news/:slug/related`

6 benzer haber

<br>

`GET /api/v1/news/:slug/comments`

Makalenin yorumları

<br>

### 📚 Bölümler

`GET /api/v1/videos` — SDN TV 🎬

`GET /api/v1/gallery` — Foto galeri 📷

`GET /api/v1/reviews` — İncelemer 🔍

`GET /api/v1/howto` — Nasıl Yapılır 🛠️

<br>

### 🗂️ Kategori

`GET /api/v1/categories`

Kategori listesi

<br>

`GET /api/v1/categories/:slug`

Kategori + haberleri

<br>

### 🔎 Arama

`GET /api/v1/search?q=iphone`

Hızlı arama

<br>

`GET /api/v1/search/posts?q=iphone`

Tam nesnelerle arama

<br>

### 🏷️ Etiket

`GET /api/v1/tags?search=iphone`

Etiket arama

<br>

`GET /api/v1/tags/:slug`

Etiket + haberleri

<br>

### ✍️ Yazar

`GET /api/v1/authors`

Yazarlar

<br>

`GET /api/v1/authors/:slug`

Yazar profili + yazıları

<br>

### 💬 Yorum

`GET /api/v1/comments/latest`

Son yorumlar

<br>

`GET /api/v1/comments?post=<id>`

Makalenin yorumları (id ile)

<br>

### 📱 Ürün

`GET /api/v1/products?search=redmi`

Ürün arama

<br>

`GET /api/v1/products/:slug`

Tam özellik tablosu + puanlar

<br>

### 📄 Sayfa & Medya

`GET /api/v1/pages` — Kurumsal sayfalar

`GET /api/v1/pages/:slug` — Sayfa içeriği

`GET /api/v1/media/:id` — Görsel detayı

<br>

## 🧪 Örnek

```bash
curl "http://localhost:3000/api/v1/latest?per_page=5"
```

```bash
curl "http://localhost:3000/api/v1/search?q=yapay+zeka"
```

<br>

<details>
<summary>📁 Mimari (tıkla)</summary>

<br>

```
server.js              → http dinleyici
src/app.js             → Express + hata yönetimi
src/config.js          → ayarlar
src/cache.js           → önbellek
src/http.js            → siteye bağlantı katmanı
src/normalize.js       → yanıtları sadeleştirir
src/scrape/product.js  → ürün özellik okuyucu
src/routes/*.js        → uç noktalar
test/                  → birim testler
```

</details>

<br>

## 🚧 Bilinen sınırlar

**Trending ("Enler")** — sitede yok,
en yakını `latest` uç noktası.

**Ürün özellikleri** — HTML'den okunur,
şablon değişirse güncellenmeli.

**Forum** — ayrı site, kapsam dışı.

<br>

---

<br>

## ❤️ Teşekkürler

Bu proje **resmi değildir.**

ShiftDelete.Net ile hiçbir bağı yoktur.

Tüm içerik hakları **ShiftDelete.Net**'e aittir.

Kişisel, eğitim ve araştırma amaçlıdır.

İçeriği kaynağında okumak her zaman
en iyisidir: **[shiftdelete.net](https://shiftdelete.net)** 💙

Site sahipleri istemezse,
proje **memnuniyetle kaldırılır** 🌱

<br>

<div align="center">

<sub>İyi okumalar 📚✨</sub>

</div>
