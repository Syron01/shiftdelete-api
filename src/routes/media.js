const express = require('express');
const { sdnJson } = require('../http');
const { wpBase } = require('../config');
const { wrap, getLang } = require('../util');

const router = express.Router();

// GET /api/v1/media/:id — görsel detayı (haber kapak görselleri dahil)
router.get('/:id', wrap(async (req, res) => {
  const lang = getLang(req);
  const id = parseInt(req.params.id, 10);
  if (!id) return res.status(400).json({ error: 'Geçersiz medya id' });
  const { data } = await sdnJson(
    `${wpBase(lang)}/media/${id}?_fields=id,slug,date,link,source_url,mime_type,media_type,alt_text,media_details`
  );
  const d = data;
  return res.json({
    id: d.id,
    slug: d.slug,
    date: d.date,
    link: d.link,
    url: d.source_url,
    mimeType: d.mime_type,
    altText: d.alt_text,
    width: d.media_details?.width || null,
    height: d.media_details?.height || null,
    sizes: d.media_details?.sizes || {},
  });
}));

module.exports = router;
