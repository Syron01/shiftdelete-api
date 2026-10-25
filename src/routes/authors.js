const express = require('express');
const { sdnJson } = require('../http');
const { wpBase } = require('../config');
const { normalizeAuthor, normalizePost } = require('../normalize');
const { wrap, getLang, getPagination, paginated } = require('../util');

const router = express.Router();
const LIST_FIELDS = 'id,date,modified,slug,link,title,excerpt,author,categories,tags,featured_media,jetpack_featured_media_url';
const EMBED = '_embed=wp:featuredmedia,wp:term,author';

// GET /api/v1/authors — yazarlar
router.get('/', wrap(async (req, res) => {
  const lang = getLang(req);
  const { page, perPage } = getPagination(req, { defaultPerPage: 20 });
  let url = `${wpBase(lang)}/users?per_page=${perPage}&has_published_posts=true`;
  if (req.query.search) url += `&search=${encodeURIComponent(req.query.search)}`;
  if (page > 1) url += `&page=${page}`;
  const { data, total, totalPages } = await sdnJson(url);
  return paginated(res, data.map(normalizeAuthor), total, totalPages, page, perPage);
}));

// GET /api/v1/authors/:slug — yazar profili + son yazıları
router.get('/:slug', wrap(async (req, res) => {
  const lang = getLang(req);
  const { page, perPage } = getPagination(req);
  const author = await sdnJson(`${wpBase(lang)}/users?slug=${encodeURIComponent(req.params.slug)}`);
  if (!author.data.length) return res.status(404).json({ error: 'Yazar bulunamadı', slug: req.params.slug });

  const profile = normalizeAuthor(author.data[0]);
  const { data, total, totalPages } = await sdnJson(
    `${wpBase(lang)}/posts?author=${profile.id}&page=${page}&per_page=${perPage}&${EMBED}`
  );
  return res.json({
    author: profile,
    meta: { total, totalPages, page, perPage },
    posts: data.map(normalizePost),
  });
}));

// GET /api/v1/authors/:slug/posts — sadece yazıları
router.get('/:slug/posts', wrap(async (req, res) => {
  const lang = getLang(req);
  const { page, perPage } = getPagination(req);
  const author = await sdnJson(
    `${wpBase(lang)}/users?slug=${encodeURIComponent(req.params.slug)}&_fields=id`
  );
  if (!author.data.length) return res.status(404).json({ error: 'Yazar bulunamadı', slug: req.params.slug });
  const { data, total, totalPages } = await sdnJson(
    `${wpBase(lang)}/posts?author=${author.data[0].id}&page=${page}&per_page=${perPage}&${EMBED}`
  );
  return paginated(res, data.map(normalizePost), total, totalPages, page, perPage);
}));

module.exports = router;
