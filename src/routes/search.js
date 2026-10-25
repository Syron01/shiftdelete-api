const express = require('express');
const { sdnJson } = require('../http');
const { wpBase } = require('../config');
const { normalizePost } = require('../normalize');
const { wrap, getLang, getPagination, paginated } = require('../util');

const router = express.Router();
const LIST_FIELDS = 'id,date,modified,slug,link,title,excerpt,author,categories,tags,featured_media,jetpack_featured_media_url';
const EMBED = '_embed=wp:featuredmedia,wp:term,author';

function requireQuery(req, res) {
  const q = (req.query.q || req.query.search || '').trim();
  if (!q) {
    res.status(400).json({ error: 'Arama için ?q= parametresi gerekli' });
    return null;
  }
  return q;
}

// GET /api/v1/search?q= — hızlı arama (başlık + özet)
router.get('/', wrap(async (req, res) => {
  const q = requireQuery(req, res);
  if (!q) return;
  const lang = getLang(req);
  const { page, perPage } = getPagination(req, { defaultPerPage: 10 });
  const { data, total, totalPages } = await sdnJson(
    `${wpBase(lang)}/search?search=${encodeURIComponent(q)}&page=${page}&per_page=${perPage}`
  );
  return paginated(
    res,
    data.map((r) => ({ id: r.id, title: r.title, url: r.url, type: r.type })),
    total, totalPages, page, perPage
  );
}));

// GET /api/v1/search/posts?q= — tam haber nesneleriyle arama
router.get('/posts', wrap(async (req, res) => {
  const q = requireQuery(req, res);
  if (!q) return;
  const lang = getLang(req);
  const { page, perPage } = getPagination(req);
  const { data, total, totalPages } = await sdnJson(
    `${wpBase(lang)}/posts?search=${encodeURIComponent(q)}&page=${page}&per_page=${perPage}&${EMBED}`
  );
  return paginated(res, data.map(normalizePost), total, totalPages, page, perPage);
}));

module.exports = router;
