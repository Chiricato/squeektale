import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyWork, createTale, resolveChapter, endingFor,
  parseSettlements, claimText, textToHex, DEMO_WORKS,
  isEthAddress, ethToWeiHex, actionTxText, sepoliaTxUrl, shortHash,
  wheelDurationForRpm,
} from '../lib/story.js';

test('classifyWork uses the 0 / 1-499 / 500+ round classes', () => {
  assert.equal(classifyWork(0), 'nap');
  assert.equal(classifyWork(-5), 'nap');
  assert.equal(classifyWork(1), 'jog');
  assert.equal(classifyWork(499), 'jog');
  assert.equal(classifyWork(500), 'zoomies');
  assert.equal(classifyWork(9000), 'zoomies');
});

test('rest recovers Hope on a nap, sprint loses Hope on a nap', () => {
  const a = createTale();
  resolveChapter(a, 0, 'rest');
  assert.equal(a.hope, 12);
  assert.equal(a.score, 5);
  const b = createTale();
  resolveChapter(b, 0, 'sprint');
  assert.equal(b.hope, 9);
  assert.equal(b.score, 0);
});

test('sprint scores most on zoomies, scout maps most on jogs', () => {
  const a = createTale();
  resolveChapter(a, 800, 'sprint');
  assert.equal(a.score, 20);
  assert.equal(a.map, 1);
  const b = createTale();
  resolveChapter(b, 200, 'scout');
  assert.equal(b.score, 10);
  assert.equal(b.map, 2);
});

test('a tale finishes after 10 chapters', () => {
  const t = createTale();
  for (const w of DEMO_WORKS) resolveChapter(t, w, 'rest');
  assert.equal(t.chapter, 10);
  assert.equal(t.finished, true);
  assert.equal(t.ending, 'quiet-traveller');
});

test('the demo sequence can reach Dawn Keeper with best play', () => {
  const t = createTale();
  // Best score per demo chapter: rest/scout on naps, jog on jogs, sprint on zoomies.
  const best = ['rest', 'sprint', 'sprint', 'rest', 'sprint', 'sprint', 'sprint', 'rest', 'sprint', 'sprint'];
  DEMO_WORKS.forEach((w, i) => resolveChapter(t, w, best[i]));
  assert.equal(t.score, 115);
  assert.equal(t.ending, 'dawn-keeper');
});

test('scout-only demo play ends as Pathfinder, sprint-only as Brave Courier', () => {
  const s = createTale();
  for (const w of DEMO_WORKS) resolveChapter(s, w, 'scout');
  assert.equal(s.ending, 'pathfinder');
  const p = createTale();
  for (const w of DEMO_WORKS) resolveChapter(p, w, 'sprint');
  assert.equal(p.ending, 'brave-courier');
});

test('Hope hitting zero ends the tale as lost', () => {
  const t = createTale();
  t.hope = 1;
  resolveChapter(t, 0, 'sprint');
  assert.equal(t.finished, true);
  assert.equal(t.ending, 'lost');
});

test('resolveChapter rejects unknown actions and finished tales', () => {
  const t = createTale();
  assert.throws(() => resolveChapter(t, 10, 'fly'), /unknown action/);
  for (const w of DEMO_WORKS) resolveChapter(t, w, 'rest');
  assert.throws(() => resolveChapter(t, 10, 'rest'), /already finished/);
});

test('parseSettlements keeps only settlement_completed, in round order', () => {
  const out = parseSettlements({
    events: [
      { type: 'system.mining_checkpointed', payload: { workAdded: 5 } },
      { type: 'system.settlement_completed', occurredAt: '2026-11-04T16:10:36Z',
        source: { transactionHash: '0xabc' },
        payload: { settledThroughRound: '1310', previousSettledThroughRound: '1309', workAdded: '0' } },
      { type: 'system.settlement_completed',
        payload: { settledThroughRound: '1309', previousSettledThroughRound: '1308', workAdded: 42 } },
    ],
  });
  assert.equal(out.length, 2);
  assert.equal(out[0].settledThroughRound, 1309);
  assert.equal(out[0].workAdded, 42);
  assert.equal(out[1].roundsClosed, 1);
  assert.equal(out[1].transactionHash, '0xabc');
});

test('Sepolia ETH payment helpers validate address and amount exactly', () => {
  assert.equal(isEthAddress('0x8cf51e13f39a3f4e638f57c8f853cc1ee4b9c040'), true);
  assert.equal(isEthAddress('0x123'), false);
  assert.equal(isEthAddress('not-an-address'), false);
  assert.equal(ethToWeiHex('0.001'), '0x38d7ea4c68000');
  assert.equal(ethToWeiHex('1'), '0xde0b6b3a7640000');
  assert.throws(() => ethToWeiHex('0'), /greater than 0/);
  assert.throws(() => ethToWeiHex('-1'), /positive decimal/);
  assert.throws(() => ethToWeiHex('0.0000000000000000001'), /at most 18 decimals/);
});

test('per-chapter action transaction text and explorer link are exact', () => {
  assert.equal(actionTxText(3, 'scout'), 'SqueekTale: chapter=3 action=scout');
  assert.equal(sepoliaTxUrl('0xabc'), 'https://sepolia.etherscan.io/tx/0xabc');
  assert.equal(shortHash('0x1234567890abcdef1234'), '0x12345678…cdef1234');
  assert.throws(() => actionTxText(1, 'fly'), /unknown action/);
});

test('live wheel duration follows RPM and stops at 0', () => {
  assert.equal(wheelDurationForRpm(0), null);
  assert.equal(wheelDurationForRpm(-5), null);
  assert.equal(wheelDurationForRpm(60), 1);
  assert.equal(wheelDurationForRpm(30), 2);
  assert.equal(wheelDurationForRpm(1000), 0.25); // clamped, not a blur
  assert.equal(wheelDurationForRpm(1), 10); // clamped, not a crawl
});

test('claim text is plain ASCII and hex-encodes cleanly', () => {
  const t = createTale();
  resolveChapter(t, 800, 'sprint');
  const text = claimText(t);
  assert.match(text, /^SqueekTale: chapters=1 score=20 /);
  assert.equal(textToHex('AB'), '0x4142');
});
