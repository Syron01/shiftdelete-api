const express = require('express');
const { sdnJson } = require('../http');
const { wpBase } = require('../config');
const { normalizeTag, normalizePost } = require('../normalize');
const { wrap, getLang, getPagination, paginated } = require('../util');

const router = express.Router();
const LIST_FIELDS = 'id,date,modified,slug,link,title,excerpt,author,categories,tags,featured_media,jetpack_featured_media_url';
const EMBED = '_embed=wp:featuredmedia,wp:term,author';

// GET /api/v1/tags?search=iphone — etiket ara/listele (276k etiket)
router.get('/', wrap(async (req, res) => {
  const lang = getLang(req);
  const { page, perPage } = getPagination(req, { defaultPerPage: 50 });
  let url = `${wpBase(lang)}/tags?per_page=${perPage}`;
  if (req.query.search) url += `&search=${encodeURIComponent(req.query.search)}`;
  if (req.query.slug) url += `&slug=${encodeURIComponent(req.query.slug)}`;
  if (page > 1) url += `&page=${page}`;
  const { data, total, totalPages } = await sdnJson(url);
  return paginated(res, data.map(normalizeTag), total, totalPages, page, perPage);
}));

// GET /api/v1/tags/:slug — etiket bilgisi + haberleri
router.get('/:slug', wrap(async (req, res) => {
  const lang = getLang(req);
  const { page, perPage } = getPagination(req);
  const tag = await sdnJson(`${wpBase(lang)}/tags?slug=${encodeURIComponent(req.params.slug)}`);
  if (!tag.data.length) return res.status(404).json({ error: 'Etiket bulunamadı', slug: req.params.slug });

  const t = normalizeTag(tag.data[0]);
  const { data, total, totalPages } = await sdnJson(
    `${wpBase(lang)}/posts?tags=${t.id}&page=${page}&per_page=${perPage}&${EMBED}`
  );
  return res.json({
    tag: t,
    meta: { total, totalPages, page, perPage },
    posts: data.map(normalizePost),
  });
}));

module.exports = router;
