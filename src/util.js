// Route'ların ortak yardımcıları

// Express async handler — hataları tek merkeze taşır
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ?lang= parametresi: tr (varsayılan) veya en
function getLang(req) {
  const l = String(req.query.lang || 'tr').toLowerCase();
  return l === 'en' ? 'en' : 'tr';
}

// Sayfalama parametrelerini güvene al
function getPagination(req, { defaultPerPage = 12, maxPerPage = 50 } = {}) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const perPage = Math.min(maxPerPage, Math.max(1, parseInt(req.query.per_page, 10) || defaultPerPage));
  return { page, perPage };
}

const paginated = (res, data, total, totalPages, page, perPage) =>
  res.json({
    meta: { total, totalPages, page, perPage },
    data,
  });

module.exports = { wrap, getLang, getPagination, paginated };
