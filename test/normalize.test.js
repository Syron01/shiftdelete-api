const { test } = require('node:test');
const assert = require('node:assert');
const {
  stripHtml, htmlToText, normalizePost, normalizeComment,
} = require('../src/normalize');
const { extractGroups, extractScores } = require('../src/scrape/product');

test('stripHtml html etiketlerini ve varlıkları temizler', () => {
  const html = '<p>Başl&#305;k &amp; özet&#8230;</p><script>kötü()</script>';
  assert.equal(stripHtml(html), 'Başlık & özet…');
});

test('htmlToText paragraf yapısını korur', () => {
  const html = '<p>Birinci</p><p>İkinci</p><script>x</script>';
  assert.equal(htmlToText(html), 'Birinci\n\nİkinci');
});

test('normalizePost gömülü veriden temiz nesne üretir', () => {
  const raw = {
    id: 1, slug: 'deneme', link: 'https://shiftdelete.net/deneme',
    date: '2026-10-24T10:00:00', modified: '2026-10-24T11:00:00',
    title: { rendered: 'Deneme <b>Yazı</b>' },
    excerpt: { rendered: '<p>Kısa özet</p>' },
    content: { rendered: '<p>' + 'kelime '.repeat(300) + '</p>' },
    _embedded: {
      'wp:featuredmedia': [{ source_url: 'https://cdn.example/img.webp', alt_text: 'alt' }],
      author: [{ id: 9, name: 'Yazar', slug: 'yazar', avatar_urls: { '96': 'https://a/96.png' } }],
      'wp:term': [
        [{ id: 5, slug: 'mobil', name: 'Mobil' }],
        [{ id: 7, slug: 'iphone', name: 'iPhone' }],
      ],
    },
  };
  const p = normalizePost(raw, 'https://shiftdelete.net');
  assert.equal(p.title, 'Deneme Yazı');
  assert.equal(p.image, 'https://cdn.example/img.webp');
  assert.equal(p.author.slug, 'yazar');
  assert.deepEqual(p.categories.map((c) => c.slug), ['mobil']);
  assert.deepEqual(p.tags.map((t) => t.slug), ['iphone']);
  assert.equal(p.readingTimeMinutes, 2); // 301 kelime / 200
});

test('normalizeComment yorum içeriğini düz metne çevirir', () => {
  const c = normalizeComment({
    id: 3, post: 10, author_name: 'Ali', date: '2026-10-24T00:00:00',
    content: { rendered: '<p>Güzel&#8230;</p>' }, link: 'l', status: 'approved',
  });
  assert.equal(c.contentText, 'Güzel…');
  assert.equal(c.authorName, 'Ali');
});

test('extractGroups aps özellik tablosunu gruplar halinde çıkarır', () => {
  const html = `
  <table>
    <tr class="aps-group-title"><th>Ekran</th></tr>
    <tr class="aps-attr"><td class="aps-attr-co">Boyut</td><td class="aps-attr-value">6.7"</td></tr>
    <tr class="aps-attr"><td class="aps-attr-co">Panel</td><td class="aps-attr-value">OLED</td></tr>
    <tr class="aps-group-title"><th>Pil</th></tr>
    <tr class="aps-attr"><td class="aps-attr-co">Kapasite</td><td class="aps-attr-value">5000 mAh</td></tr>
  </table>`;
  const groups = extractGroups(html);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].group, 'Ekran');
  assert.equal(groups[0].items[1].value, 'OLED');
  assert.equal(groups[1].items[0].value, '5000 mAh');
});

test('extractScores toplam puan, kategori puanları ve yorum sayısını bulur', () => {
  const html = `
  <div class="aps-overall-rating" data-rating="8.4">
    <span class="aps-rating-total" data-type="num">8.4</span>
    <meta itemprop="ratingValue" content="4.2" />
    <meta itemprop="reviewCount" content="1" />
  </div>
  <div class="aps-rating-box" data-bar="false" data-rating="9">
    <strong>Tasarım</strong>
    <span class="aps-rating-num"><span class="aps-rating-fig" data-type="num">9</span> / 10</span>
  </div>
  <div class="aps-rating-box" data-bar="false" data-rating="8">
    <strong>Ekran</strong>
    <span class="aps-rating-num"><span class="aps-rating-fig" data-type="num">8</span> / 10</span>
  </div>`;
  const s = extractScores(html);
  assert.equal(s.score, '8.4');
  assert.equal(s.ratingValue, '4.2');
  assert.equal(s.reviewCount, '1');
  assert.deepEqual(s.aspects, [{ name: 'Tasarım', score: 9 }, { name: 'Ekran', score: 8 }]);
});
