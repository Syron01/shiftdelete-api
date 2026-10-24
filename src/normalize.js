// WP REST yanıtlarını sade, tutarlı API şemasına çevirir

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–',
  laquo: '«', raquo: '»', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', bull: '•', copy: '©',
  deg: '°', times: '×', euro: '€', middot: '·',
  '#8217': '’', '#8220': '“', '#8221': '”', '#8216': '‘', '#8211': '–',
  '#8212': '—', '#8230': '…', '#38': '&', '#160': ' ', '#231': 'ç',
};

function decodeEntities(str) {
  return String(str)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&([a-zA-Z#0-9]+);/g, (m, name) => (name in NAMED_ENTITIES ? NAMED_ENTITIES[name] : m));
}

function stripHtml(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
}

// Paragraf yapısını koruyan düz metin çıkarımı
function htmlToText(html) {
  const withBreaks = String(html || '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<\/(p|h[1-6]|li|blockquote)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(withBreaks)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function absoluteImage(url, base) {
  if (!url) return null;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return base + url;
  return url;
}

const avatar = (u) => (u && u['96']) || (u && u['48']) || null;

function normalizePost(raw, base) {
  const emb = raw._embedded || {};
  const media = emb['wp:featuredmedia']?.[0];
  const authorRaw = emb.author?.[0];
  const terms = emb['wp:term'] || [];
  const cats = (terms[0] || []).map((c) => ({ id: c.id, slug: c.slug, name: c.name }));
  const tags = (terms[1] || []).map((t) => ({ id: t.id, slug: t.slug, name: t.name }));

  return {
    id: raw.id,
    slug: raw.slug,
    title: stripHtml(raw.title?.rendered),
    excerpt: stripHtml(raw.excerpt?.rendered) || null,
    link: raw.link,
    date: raw.date,
    modified: raw.modified,
    image: media?.source_url || raw.jetpack_featured_media_url || null,
    imageAlt: media?.alt_text || null,
    author: authorRaw
      ? { id: authorRaw.id, name: authorRaw.name, slug: authorRaw.slug, avatar: avatar(authorRaw.avatar_urls) }
      : null,
    categories: cats,
    tags,
    readingTimeMinutes: raw.content?.rendered
      ? Math.max(1, Math.round(stripHtml(raw.content.rendered).split(/\s+/).length / 200))
      : null,
  };
}

function normalizePostDetail(raw, base) {
  const plain = htmlToText(raw.content?.rendered);
  const common = normalizePost({ ...raw, _embedded: raw._embedded || {} }, base);
  const seo = raw.yoast_head_json || {};
  return {
    ...common,
    contentHtml: raw.content?.rendered || null,
    plainText: plain,
    wordCount: plain ? plain.split(/\s+/).filter(Boolean).length : 0,
    seo: {
      title: seo.title || null,
      description: seo.description || null,
      ogImage: seo.og_image?.[0]?.url || null,
      canonical: seo.canonical || raw.link,
    },
  };
}

const normalizeCategory = (c) => ({ id: c.id, slug: c.slug, name: c.name, description: stripHtml(c.description) || null, postCount: c.count, parent: c.parent, link: c.link });

const normalizeTag = (t) => ({ id: t.id, slug: t.slug, name: t.name, postCount: t.count, link: t.link });

const normalizeAuthor = (u) => ({
  id: u.id,
  slug: u.slug,
  name: u.name,
  bio: stripHtml(u.description) || null,
  url: u.link,
  avatar: avatar(u.avatar_urls),
});

const normalizeComment = (c) => ({
  id: c.id,
  postId: c.post,
  authorName: c.author_name,
  date: c.date,
  contentText: stripHtml(c.content?.rendered),
  contentHtml: c.content?.rendered,
  link: c.link,
  status: c.status,
});

const normalizePage = (p) => ({
  id: p.id,
  slug: p.slug,
  title: stripHtml(p.title?.rendered),
  link: p.link,
  date: p.date,
  modified: p.modified,
});

// Ürün sayfası HTML'inden kazınmış özellik tablosunu sadeleştirir
function normalizeProductSpecs(spec) {
  return {
    id: spec.id,
    slug: spec.slug,
    name: spec.name,
    link: spec.link,
    image: spec.image,
    score: spec.score,
    scoreCount: spec.scoreCount,
    specs: spec.groups,
  };
}

module.exports = {
  decodeEntities,
  stripHtml,
  htmlToText,
  absoluteImage,
  normalizePost,
  normalizePostDetail,
  normalizeCategory,
  normalizeTag,
  normalizeAuthor,
  normalizeComment,
  normalizePage,
  normalizeProductSpecs,
};
