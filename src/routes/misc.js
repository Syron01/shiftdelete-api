const express = require('express');
const { sdnFetch, gate } = require('../http');
const { siteBase, wpBase, MAIN_NAV, SITES } = require('../config');
const cache = require('../cache');
const { stripHtml } = require('../normalize');
const { wrap, getLang, getPagination, paginated } = require('../util');

const router = express.Router();

// GET /api/v1/health — servis + upstream + koruma katmanları durumu
router.get('/health', wrap(async (req, res) => {
  let upstream = 'ok';
  try {
    await sdnFetch(`${siteBase(getLang(req))}/wp-json/`, { ttl: 60 * 1000 });
  } catch {
    upstream = 'unreachable';
  }
  const g = gate.snapshot();
  res.json({
    status: 'ok',
    upstream,
    breaker: g.breaker,
    upstreamTraffic: {
      inflight: g.inflight,
      queued: g.queued,
      minuteCount: g.minuteCount,
      retries: g.retries,
      breakerTrips: g.breakerTrips,
    },
    cache: cache.stats(),
  });
}));

// GET /api/v1/nav — sitenin ana menüsü
router.get('/nav', (req, res) => {
  const lang = getLang(req);
  const base = siteBase(lang);
  res.json({
    lang,
    sections: MAIN_NAV.map((s) => ({ ...s, url: `${base}/${s.slug}` })),
    special: [
      { title: 'SDN TV', path: '/api/v1/videos' },
      { title: 'Foto Galeri', path: '/api/v1/gallery' },
      { title: 'İncelemeler', path: '/api/v1/reviews' },
      { title: 'Nasıl Yapılır?', path: '/api/v1/howto' },
      { title: 'Ürün Karşılaştırma', path: '/api/v1/products' },
    ],
  });
});

// GET /api/v1/rss — normalize edilmiş RSS akışı
function parseRss(xml) {
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const pick = (tag) => stripHtml(m[1].match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))?.[1] || '') || null;
    items.push({
      title: pick('title'),
      link: m[1].match(/<link>([\s\S]*?)<\/link>/i)?.[1]?.trim() || null,
      date: pick('pubDate'),
      excerpt: pick('description'),
      categories: [...m[1].matchAll(/<category[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/category>/gi)].map((c) => c[1]),
    });
  }
  return items;
}

router.get('/rss', wrap(async (req, res) => {
  const lang = getLang(req);
  const xml = (await sdnFetch(`${siteBase(lang)}/feed/`)).text;
  res.json({ lang, count: parseRss(xml).length, items: parseRss(xml) });
}));

// GET /api/v1/sitemap/urls?kind=news|pages|posts&page=1 — sitemap URL'leri
router.get('/sitemap/urls', wrap(async (req, res) => {
  const lang = getLang(req);
  const base = siteBase(lang);
  const kind = req.query.kind || 'news';
  const { page } = getPagination(req, { defaultPerPage: 500, maxPerPage: 5000 });

  const urlsFrom = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  if (kind === 'news' || kind === 'pages') {
    const file = kind === 'news' ? 'news-sitemap.xml' : 'page-sitemap.xml';
    const xml = (await sdnFetch(`${base}/${file}`)).text;
    const all = urlsFrom(xml);
    return res.json({ kind, count: all.length, urls: all });
  }

  if (kind === 'posts') {
    const indexXml = (await sdnFetch(`${base}/sitemap_index.xml`)).text;
    const postSitemaps = urlsFrom(indexXml).filter((u) => /post-sitemap\d*\.xml$/.test(u));
    const n = Math.max(1, parseInt(req.query.page, 10) || 1);
    if (n > postSitemaps.length) {
      return res.status(404).json({ error: 'Böyle bir post-sitemap yok', availablePages: postSitemaps.length });
    }
    const xml = (await sdnFetch(postSitemaps[n - 1])).text;
    const all = urlsFrom(xml);
    return res.json({ kind, page: n, availablePages: postSitemaps.length, count: all.length, urls: all });
  }

  return res.status(400).json({ error: 'kind=news|pages|posts olmalı' });
}));

module.exports = router;
