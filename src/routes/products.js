const express = require('express');
const { sdnJson } = require('../http');
const { wpBase } = require('../config');
const { stripHtml } = require('../normalize');
const { scrapeProduct } = require('../scrape/product');
const { wrap, getLang, getPagination, paginated } = require('../util');

const router = express.Router();

// GET /api/v1/products — karşılaştırma veritabanındaki ürünler
router.get('/', wrap(async (req, res) => {
  const lang = getLang(req);
  const { page, perPage } = getPagination(req, { defaultPerPage: 20 });
  let url = `${wpBase(lang)}/aps-products?per_page=${perPage}&_fields=id,slug,title,link`;
  if (req.query.search) url += `&search=${encodeURIComponent(req.query.search)}`;
  if (page > 1) url += `&page=${page}`;
  const { data, total, totalPages } = await sdnJson(url);
  return paginated(
    res,
    data.map((p) => ({ id: p.id, slug: p.slug, name: stripHtml(p.title?.rendered), link: p.link })),
    total, totalPages, page, perPage
  );
}));

// GET /api/v1/products/:slug — ürünün tam özellik tablosu + puan (sayfadan kazınır)
router.get('/:slug', wrap(async (req, res) => {
  const lang = getLang(req);
  const spec = await scrapeProduct(req.params.slug, lang);
  return res.json(spec);
}));

module.exports = router;
