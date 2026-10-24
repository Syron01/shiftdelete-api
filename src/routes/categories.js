const express = require('express');
const { sdnJson } = require('../http');
const { wpBase } = require('../config');
const { normalizeCategory, normalizePost } = require('../normalize');
const { wrap, getLang, getPagination, paginated } = require('../util');

const router = express.Router();
const LIST_FIELDS = 'id,date,modified,slug,link,title,excerpt,author,categories,tags,featured_media,jetpack_featured_media_url';
const EMBED = '_embed=wp:featuredmedia,wp:term,author';

// GET /api/v1/categories — tüm kategoriler (166)
router.get('/', wrap(async (req, res) => {
  const lang = getLang(req);
  const { page, perPage } = getPagination(req, { defaultPerPage: 100, maxPerPage: 100 });
  let url = `${wpBase(lang)}/categories?per_page=${perPage}`;
  if (req.query.search) url += `&search=${encodeURIComponent(req.query.search)}`;
  if (req.query.hide_empty === 'true') url += '&hide_empty=true';
  if (perPage <= 100 && page > 1) url += `&page=${page}`;
  const { data, total, totalPages } = await sdnJson(url);
  return paginated(res, data.map(normalizeCategory), total, totalPages, page, perPage);
}));

// GET /api/v1/categories/:slug — kategori bilgisi + o kategorinin haberleri
router.get('/:slug', wrap(async (req, res) => {
  const lang = getLang(req);
  const { page, perPage } = getPagination(req);
  const cat = await sdnJson(`${wpBase(lang)}/categories?slug=${encodeURIComponent(req.params.slug)}`);
  if (!cat.data.length) return res.status(404).json({ error: 'Kategori bulunamadı', slug: req.params.slug });

  const category = normalizeCategory(cat.data[0]);
  const { data, total, totalPages } = await sdnJson(
    `${wpBase(lang)}/posts?categories=${category.id}&page=${page}&per_page=${perPage}&_fields=${LIST_FIELDS}&${EMBED}`
  );
  return res.json({
    category,
    meta: { total, totalPages, page, perPage },
    posts: data.map(normalizePost),
  });
}));

module.exports = router;
