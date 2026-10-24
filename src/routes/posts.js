const express = require('express');
const { sdnJson } = require('../http');
const { wpBase, SECTIONS } = require('../config');
const { normalizePost, normalizePostDetail, normalizeComment } = require('../normalize');
const { wrap, getLang, getPagination, paginated } = require('../util');

const router = express.Router();
const POST_FIELDS = 'id,date,modified,slug,link,title,excerpt,content,author,categories,tags,featured_media,jetpack_featured_media_url,yoast_head_json';
const LIST_FIELDS = POST_FIELDS.replace(',content', '').replace(',yoast_head_json', '');
const EMBED = '_embed=wp:featuredmedia,wp:term,author';

// GET /api/v1/latest — son haberler
router.get('/latest', wrap(async (req, res) => {
  const lang = getLang(req);
  const { page, perPage } = getPagination(req);
  const { data, total, totalPages } = await sdnJson(
    `${wpBase(lang)}/posts?page=${page}&per_page=${perPage}&_fields=${LIST_FIELDS}&${EMBED}`
  );
  return paginated(res, data.map(normalizePost), total, totalPages, page, perPage);
}));

// GET /api/v1/videos — SDN TV içerikleri
// GET /api/v1/gallery — foto galeri
// GET /api/v1/reviews — incelemeler
// GET /api/v1/howto — nasıl yapılır
for (const [path, sectionSlug] of [
  ['/videos', SECTIONS.videos],
  ['/gallery', SECTIONS.gallery],
  ['/reviews', SECTIONS.reviews],
  ['/howto', SECTIONS.howto],
]) {
  router.get(path, wrap(async (req, res) => {
    const lang = getLang(req);
    const { page, perPage } = getPagination(req);
    const cat = await sdnJson(`${wpBase(lang)}/categories?slug=${sectionSlug}&_fields=id,slug,name,count`);
    if (!cat.data.length) return res.status(404).json({ error: 'Bölüm bulunamadı', slug: sectionSlug });
    const catId = cat.data[0].id;
    const { data, total, totalPages } = await sdnJson(
      `${wpBase(lang)}/posts?categories=${catId}&page=${page}&per_page=${perPage}&_fields=${LIST_FIELDS}&${EMBED}`
    );
    return paginated(res, data.map(normalizePost), total, totalPages, page, perPage);
  }));
}

// GET /api/v1/news/:slug — makale detayı (tam içerik + düz metin + SEO)
router.get('/news/:slug', wrap(async (req, res) => {
  const lang = getLang(req);
  const { data } = await sdnJson(
    `${wpBase(lang)}/posts?slug=${encodeURIComponent(req.params.slug)}&_fields=${POST_FIELDS}&${EMBED}`
  );
  if (!data.length) return res.status(404).json({ error: 'Makale bulunamadı', slug: req.params.slug });
  return res.json(normalizePostDetail(data[0]));
}));

// GET /api/v1/news/:slug/related — aynı ana kategoriden benzer haberler
router.get('/news/:slug/related', wrap(async (req, res) => {
  const lang = getLang(req);
  const { data } = await sdnJson(
    `${wpBase(lang)}/posts?slug=${encodeURIComponent(req.params.slug)}&_fields=id,categories`
  );
  if (!data.length) return res.status(404).json({ error: 'Makale bulunamadı', slug: req.params.slug });
  const self = data[0];
  const catId = self.categories?.[0];
  const { data: rel } = await sdnJson(
    `${wpBase(lang)}/posts?categories=${catId}&exclude=${self.id}&per_page=6&_fields=${LIST_FIELDS}&${EMBED}`
  );
  return res.json({ count: rel.length, data: rel.map(normalizePost) });
}));

// GET /api/v1/news/:slug/comments — makalenin yorumları
router.get('/news/:slug/comments', wrap(async (req, res) => {
  const lang = getLang(req);
  const { page, perPage } = getPagination(req, { defaultPerPage: 20 });
  const { data } = await sdnJson(
    `${wpBase(lang)}/posts?slug=${encodeURIComponent(req.params.slug)}&_fields=id`
  );
  if (!data.length) return res.status(404).json({ error: 'Makale bulunamadı', slug: req.params.slug });
  const { data: comments, total, totalPages } = await sdnJson(
    `${wpBase(lang)}/comments?post=${data[0].id}&page=${page}&per_page=${perPage}&order=asc`
  );
  return paginated(res, comments.map(normalizeComment), total, totalPages, page, perPage);
}));

module.exports = router;
