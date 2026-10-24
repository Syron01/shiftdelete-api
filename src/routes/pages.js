const express = require('express');
const { sdnJson } = require('../http');
const { wpBase } = require('../config');
const { normalizePage, htmlToText, stripHtml } = require('../normalize');
const { wrap, getLang, getPagination, paginated } = require('../util');

const router = express.Router();

// GET /api/v1/pages — kurumsal/statik sayfalar (künye, iletişim, alıntı şartları...)
router.get('/', wrap(async (req, res) => {
  const lang = getLang(req);
  const { page, perPage } = getPagination(req, { defaultPerPage: 30 });
  const { data, total, totalPages } = await sdnJson(
    `${wpBase(lang)}/pages?page=${page}&per_page=${perPage}&_fields=id,date,modified,slug,link,title`
  );
  return paginated(res, data.map(normalizePage), total, totalPages, page, perPage);
}));

// GET /api/v1/pages/:slug — sayfa içeriği
router.get('/:slug', wrap(async (req, res) => {
  const lang = getLang(req);
  const { data } = await sdnJson(
    `${wpBase(lang)}/pages?slug=${encodeURIComponent(req.params.slug)}&_fields=id,slug,date,modified,link,title,content`
  );
  if (!data.length) return res.status(404).json({ error: 'Sayfa bulunamadı', slug: req.params.slug });
  const p = data[0];
  return res.json({
    ...normalizePage(p),
    contentHtml: p.content?.rendered || null,
    plainText: htmlToText(p.content?.rendered),
    excerpt: stripHtml(p.excerpt?.rendered) || null,
  });
}));

module.exports = router;
