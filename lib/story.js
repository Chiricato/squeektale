// SqueekTale — pure story engine. No DOM, no network, no wallet code here,
// so the same rules can be tested in Node and reused by the browser page.
//
// A tale is 10 chapters. Each chapter is resolved by ONE SqueekCore
// settlement batch from api.squeekchain.com. A batch may close more than
// one round; the game never invents a per-round split for it. It treats
// the batch as one chapter and uses its reported total workAdded.

export const TOTAL_CHAPTERS = 10;

export const CHAPTER_TITLES = [
  'Leaving the Burrow',
  'The Acorn River',
  'Whispering Reeds',
  'The Old Mill',
  'Starlight Hollow',
  'The Fog Bridge',
  'Ember Field',
  'The Sleeping Library',
  'Storm Steps',
  'The Dawn Lighthouse',
];

export function classifyWork(work) {
  const n = Number(work);
  if (!Number.isFinite(n) || n <= 0) return 'nap';
  if (n < 500) return 'jog';
  return 'zoomies';
}

export const ROUND_LABEL = {
  nap: '💤 Nap',
  jog: '🐾 Jog',
  zoomies: '🔥 Zoomies',
};

export const ACTIONS = {
  rest: {
    id: 'rest',
    label: '🛏️ Rest by the fire',
    hint: 'Safe. Recovers Hope on naps, but scores little.',
  },
  scout: {
    id: 'scout',
    label: '🔭 Scout ahead',
    hint: 'Maps the road. Best for collecting Map points.',
  },
  sprint: {
    id: 'sprint',
    label: '⚡ Sprint for the lighthouse',
    hint: 'Risky on naps, big score on zoomies.',
  },
};

// [action][roundClass] -> deltas. Kept deliberately small and readable
// so a reviewer can check the whole balance table at a glance.
const MATRIX = {
  rest: {
    nap: { hope: 2, snacks: 1, map: 0, score: 5 },
    jog: { hope: 1, snacks: 0, map: 0, score: 5 },
    zoomies: { hope: -1, snacks: 0, map: 0, score: 5 },
  },
  scout: {
    nap: { hope: 0, snacks: 0, map: 1, score: 5 },
    jog: { hope: 0, snacks: 0, map: 2, score: 10 },
    zoomies: { hope: -1, snacks: 0, map: 1, score: 10 },
  },
  sprint: {
    nap: { hope: -1, snacks: 0, map: 0, score: 0 },
    jog: { hope: 0, snacks: 0, map: 0, score: 10 },
    zoomies: { hope: 0, snacks: 0, map: 1, score: 20 },
  },
};

export function createTale() {
  return {
    chapter: 0,
    hope: 10,
    snacks: 3,
    map: 0,
    score: 0,
    chapters: [],
    finished: false,
    ending: null,
  };
}

export function endingFor(tale) {
  if (!tale.finished) return null;
  if (tale.hope <= 0) return 'lost';
  if (tale.score >= 110) return 'dawn-keeper';
  if (tale.map >= 10) return 'pathfinder';
  if (tale.score >= 85) return 'brave-courier';
  return 'quiet-traveller';
}

export const ENDING_LABEL = {
  'dawn-keeper': '🌅 Dawn Keeper',
  pathfinder: '🗺️ Pathfinder',
  'brave-courier': '📬 Brave Courier',
  'quiet-traveller': '🌙 Quiet Traveller',
  lost: '🕯️ The Tale Fades',
};

export function chapterText(chapterIndex, roundClass, actionId) {
  const place = CHAPTER_TITLES[chapterIndex] || 'The Road';
  const mood = {
    nap: 'Squeektoshi naps, and the world goes soft and quiet.',
    jog: 'Squeektoshi trots along, steady and unhurried.',
    zoomies: 'Squeektoshi zooms! The wheel hums and the road rushes by.',
  }[roundClass];
  const deed = {
    rest: 'Pip rests, eats, and listens to the night.',
    scout: 'Pip climbs high and maps what lies ahead.',
    sprint: 'Pip runs hard toward the next light.',
  }[actionId] || 'Pip carries on.';
  return `${place}. ${mood} ${deed}`;
}

export function resolveChapter(tale, work, actionId) {
  if (tale.finished) throw new Error('tale already finished');
  if (!MATRIX[actionId]) throw new Error(`unknown action: ${actionId}`);
  const roundClass = classifyWork(work);
  const d = MATRIX[actionId][roundClass];
  const chapterNumber = tale.chapter + 1;
  tale.hope = Math.max(0, Math.min(12, tale.hope + d.hope));
  tale.snacks = Math.max(0, tale.snacks + d.snacks);
  tale.map += d.map;
  tale.score += d.score;
  tale.chapters.push({
    chapter: chapterNumber,
    title: CHAPTER_TITLES[tale.chapter],
    work: Number(work) || 0,
    roundClass,
    action: actionId,
    ...d,
    hopeAfter: tale.hope,
    scoreAfter: tale.score,
    text: chapterText(tale.chapter, roundClass, actionId),
  });
  tale.chapter = chapterNumber;
  if (tale.hope <= 0 || tale.chapter >= TOTAL_CHAPTERS) {
    tale.finished = true;
    tale.ending = endingFor(tale);
  }
  return tale.chapters[tale.chapters.length - 1];
}

// Parse a /v1/events?category=protocol payload into settlement batches.
// Only system.settlement_completed events are used. Everything else
// (checkpoints, claims, merges) is ignored by design.
export function parseSettlements(payload) {
  const events = Array.isArray(payload?.events) ? payload.events : [];
  return events
    .filter((e) => e?.type === 'system.settlement_completed')
    .map((e) => {
      const p = e.payload || {};
      const settled = Number(p.settledThroughRound);
      const previous = Number(p.previousSettledThroughRound);
      return {
        settledThroughRound: settled,
        previousSettledThroughRound: previous,
        roundsClosed: Number.isFinite(settled) && Number.isFinite(previous)
          ? settled - previous
          : 1,
        workAdded: Number(p.workAdded) || 0,
        occurredAt: e.occurredAt || null,
        transactionHash: e.source?.transactionHash || null,
      };
    })
    .filter((s) => Number.isFinite(s.settledThroughRound))
    .sort((a, b) => a.settledThroughRound - b.settledThroughRound);
}

export function textToHex(text) {
  return '0x' + [...text].map((c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}

// Per-chapter on-chain action: the calldata written by one Pick action.
// It names only the chapter number and the action id — no invented
// recipient, no amount, no wallet address is baked into the text.
export function actionTxText(chapterNumber, actionId) {
  if (!ACTIONS[actionId]) throw new Error(`unknown action: ${actionId}`);
  return `SqueekTale: chapter=${chapterNumber} action=${actionId}`;
}

// Live wheel: one full turn per 60/RPM seconds. Returns null when the
// wheel is stopped, so the page can pause the animation instead of
// inventing motion. Duration is clamped so an extreme RPM cannot make
// the animation a blur or a crawl.
export function wheelDurationForRpm(rpm) {
  const n = Number(rpm);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(0.25, Math.min(10, 60 / n));
}

export function sepoliaTxUrl(hash) {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}

export function shortHash(hash) {
  const h = String(hash || '');
  return h.length > 18 ? `${h.slice(0, 10)}…${h.slice(-8)}` : h;
}

// Sepolia ETH payment helpers (testnet only). No mainnet code exists here.
// Amounts are decimal strings like "0.001"; the result is a hex wei value
// for an eth_sendTransaction request. BigInt avoids float rounding.
export function isEthAddress(value) {
  return /^0x[0-9a-fA-F]{40}$/.test(String(value || '').trim());
}

export function ethToWeiHex(amount) {
  const s = String(amount || '').trim();
  if (!/^\d+(\.\d{1,18})?$/.test(s)) throw new Error('amount must be a positive decimal with at most 18 decimals');
  const [whole, frac = ''] = s.split('.');
  const wei = BigInt(whole) * 10n ** 18n + BigInt((frac + '0'.repeat(18)).slice(0, 18));
  if (wei <= 0n) throw new Error('amount must be greater than 0');
  return '0x' + wei.toString(16);
}

export const SEPOLIA_CHAIN_ID = '0xaa36a7';

// Demo / recorded sequence. Labelled as simulated wherever it is used;
// it is never presented as live SqueekCore data.
export const DEMO_WORKS = [0, 120, 650, 0, 300, 800, 45, 0, 520, 200];
export const RECORDED_WORKS = [0, 250, 600, 0, 120, 900, 30, 0, 480, 150];
