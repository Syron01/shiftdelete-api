const express = require('express');
const { sdnJson } = require('../http');
const { wpBase } = require('../config');
const { normalizeComment } = require('../normalize');
const { wrap, getLang, getPagination, paginated } = require('../util');

const router = express.Router();

// GET /api/v1/comments/latest — siteden son yorumlar
router.get('/latest', wrap(async (req, res) => {
  const lang = getLang(req);
  const { page, perPage } = getPagination(req, { defaultPerPage: 20 });
  const { data, total, totalPages } = await sdnJson(
    `${wpBase(lang)}/comments?page=${page}&per_page=${perPage}`
  );
  return paginated(res, data.map(normalizeComment), total, totalPages, page, perPage);
}));

// GET /api/v1/comments?post=<id> — belirli makaleye ait yorumlar (ham id sorgusu)
router.get('/', wrap(async (req, res) => {
  const lang = getLang(req);
  const postId = parseInt(req.query.post, 10);
  if (!postId) return res.status(400).json({ error: '?post=<makale_id> gerekli' });
  const { page, perPage } = getPagination(req, { defaultPerPage: 20 });
  const { data, total, totalPages } = await sdnJson(
    `${wpBase(lang)}/comments?post=${postId}&page=${page}&per_page=${perPage}`
  );
  return paginated(res, data.map(normalizeComment), total, totalPages, page, perPage);
}));

module.exports = router;
