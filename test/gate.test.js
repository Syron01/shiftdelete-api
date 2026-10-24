const { test } = require('node:test');
const assert = require('node:assert');
const { makeGate } = require('../src/gate');

const retryableErr = (msg = 'hata') => Object.assign(new Error(msg), { retryable: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('geçici hata yeniden denemeden sonra başarıya ulaşır', async () => {
  const gate = makeGate({ maxRetries: 3, baseBackoffMs: 1, minSpacingMs: 0 });
  let calls = 0;
  const out = await gate.request(() => {
    calls++;
    if (calls < 3) throw retryableErr();
    return 'tamam';
  });
  assert.equal(out, 'tamam');
  assert.equal(calls, 3);
  assert.equal(gate.snapshot().retries, 2);
});

test('geçici olmayan hata denemeden fırlatılır', async () => {
  const gate = makeGate({ maxRetries: 3, baseBackoffMs: 1, minSpacingMs: 0 });
  let calls = 0;
  await assert.rejects(
    gate.request(() => {
      calls++;
      throw Object.assign(new Error('404'), { retryable: false });
    }),
    /404/
  );
  assert.equal(calls, 1);
});

test('eşzamanlılık sınırı aşılmaz', async () => {
  const gate = makeGate({ maxConcurrent: 2, minSpacingMs: 0 });
  let active = 0;
  let maxActive = 0;
  await Promise.all(
    Array.from({ length: 6 }, () =>
      gate.request(async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await sleep(10);
        active--;
      })
    )
  );
  assert.equal(maxActive, 2);
});

test('kuyruk dolarsa istek hızla reddedilir', async () => {
  const gate = makeGate({ maxConcurrent: 1, maxQueue: 1, minSpacingMs: 0 });
  let release;
  const hold = gate.request(() => new Promise((r) => (release = r)));
  const queued = gate.request(() => 'ikinci');
  await sleep(10);
  await assert.rejects(gate.request(() => 'üçüncü'), (e) => e.code === 'QUEUE_FULL');
  release();
  await hold;
  assert.equal(await queued, 'ikinci');
});

test('devre kesici eşikte açılır, soğuma sonrası yarı-açıktan kapanır', async () => {
  const gate = makeGate({
    maxRetries: 1,
    breakerFailureThreshold: 2,
    breakerCooldownMs: 50,
    baseBackoffMs: 1,
    minSpacingMs: 0,
  });
  const boom = () => {
    throw retryableErr('upstream dövdü');
  };

  await assert.rejects(gate.request(boom));
  await assert.rejects(gate.request(boom));
  assert.equal(gate.snapshot().breaker.state, 'open');
  assert.equal(gate.snapshot().breakerTrips, 1);

  // Devre açıkken istekler perform'a hiç ulaşmaz
  let reached = false;
  await assert.rejects(gate.request(() => ((reached = true), 'x')), (e) => e.code === 'CIRCUIT_OPEN');
  assert.equal(reached, false);

  await sleep(60); // soğuma süresi doluyor -> yarı-açık

  const out = await gate.request(() => 'iyileşti');
  assert.equal(out, 'iyileşti');
  assert.equal(gate.snapshot().breaker.state, 'closed');
  assert.equal(gate.snapshot().breakerRecoveries, 1);
});
