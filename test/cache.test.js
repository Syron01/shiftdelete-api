const { test } = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');
const { makeCache } = require('../src/cache');

test('taze girdi döner, süresi geçen girdi get ile dönmez ama getStale ile döner', async () => {
  const c = makeCache({ ttl: 20 });
  c.set('a', { x: 1 });
  assert.deepEqual(c.get('a'), { x: 1 });
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(c.get('a'), undefined);
  const stale = c.getStale('a');
  assert.deepEqual(stale.value, { x: 1 });
  assert.equal(stale.expired, true);
});

test('girdi diskte kalıcıdır ve yeni örnekte yüklenir', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdncache-'));
  const c1 = makeCache({ dir, ttl: 60000 });
  c1.set('url-1', { text: 'merhaba' });

  const c2 = makeCache({ dir, ttl: 60000 });
  assert.deepEqual(c2.get('url-1'), { text: 'merhaba' });
  assert.equal(c2.stats().diskLoads, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('staleMaxAgeMs aşılırsa eski girdi de dönmez', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sdncache-'));
  // ttl=0 -> anında bayat; staleMaxAgeMs=1 -> eski girdi de geçersiz
  const c = makeCache({ dir, ttl: 0, staleMaxAgeMs: 1 });
  c.set('eski', 42);
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(c.getStale('eski'), undefined);
  fs.rmSync(dir, { recursive: true, force: true });
});
