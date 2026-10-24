// /urun-detay/ sayfasından tam özellik tablosu ve puanı kazır.
// Ürün spesifikasyonları REST API'de kapalı olduğu için HTML'den alınır;
// aps-* class yapısına dayanır, site şablonu değişirse burası güncellenmelidir.
const { sdnFetch } = require('../http');
const { stripHtml, absoluteImage } = require('../normalize');
const { siteBase, DEFAULT_LANG } = require('../config');

function extractGroups(html) {
  const groups = [];
  const groupRe = /<tr[^>]*class="aps-group-title"[^>]*>([\s\S]*?)<\/tr>([\s\S]*?)(?=<tr[^>]*class="aps-group-title"|$)/gi;
  for (const m of html.matchAll(groupRe)) {
    const groupName = stripHtml(m[1]);
    const items = [];
    const rowRe = /<tr[^>]*class="[^"]*aps-attr[^"]*"[^>]*>\s*<td[^>]*class="aps-attr-co"[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*class="aps-attr-value"[^>]*>([\s\S]*?)<\/td>/gi;
    for (const r of m[2].matchAll(rowRe)) {
      const name = stripHtml(r[1]);
      const value = stripHtml(r[2]);
      if (name) items.push({ name, value });
    }
    if (groupName && items.length) groups.push({ group: groupName, items });
  }

  // Grup başlığı olmadan düz satır kalmışsa tek grupta topla
  if (!groups.length) {
    const items = [];
    for (const r of html.matchAll(/class="aps-attr-co"[^>]*>([\s\S]*?)<\/td>[\s\S]*?class="aps-attr-value"[^>]*>([\s\S]*?)<\/td>/gi)) {
      items.push({ name: stripHtml(r[1]), value: stripHtml(r[2]) });
    }
    if (items.length) groups.push({ group: 'Özellikler', items });
  }
  return groups;
}

function extractScores(html) {
  const overall = html.match(/aps-rating-total[^>]*>\s*([\d.,]+)/)?.[1]?.replace(',', '.');
  const ratingValue = html.match(/itemprop="ratingValue"\s+content="([\d.]+)"/)?.[1] || null;
  const reviewCount = html.match(/itemprop="reviewCount"\s+content="(\d+)"/)?.[1] || null;

  // Kategori puanları: <div class="aps-rating-box" data-rating="9">…<strong>Tasarım</strong>
  const seen = new Set();
  const aspects = [];
  for (const m of html.matchAll(/aps-rating-box"[^>]*data-rating="([\d.]+)"[\s\S]*?<strong>([\s\S]*?)<\/strong>/g)) {
    const name = stripHtml(m[2]);
    if (name && !seen.has(name)) {
      seen.add(name);
      aspects.push({ name, score: Number(m[1]) });
    }
  }
  return { score: overall || null, ratingValue, reviewCount, aspects };
}

async function scrapeProduct(slug, lang = DEFAULT_LANG) {
  const base = siteBase(lang);
  const html = (await sdnFetch(`${base}/urun-detay/${slug}`)).text;
  const groups = extractGroups(html);
  const { score, ratingValue, reviewCount, aspects } = extractScores(html);

  const title =
    stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) ||
    stripHtml(html.match(/<title>([^<]+)</i)?.[1]) || slug;
  const ogImage = absoluteImage(html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1], base);

  return {
    id: null, slug, name: title, link: `${base}/urun-detay/${slug}`,
    image: ogImage, score, ratingValue, reviewCount, aspects, groups,
  };
}

module.exports = { scrapeProduct, extractGroups, extractScores };
