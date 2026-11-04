import {
  createTale, resolveChapter, classifyWork, ROUND_LABEL, ACTIONS,
  ENDING_LABEL, parseSettlements, claimText, textToHex,
  DEMO_WORKS, RECORDED_WORKS, isEthAddress, ethToWeiHex,
  SEPOLIA_CHAIN_ID,
} from './lib/story.js';

// Squeekchain public API. No key, no account: these are the same public
// endpoints Squeek Garden and the other Genesis projects read from.
const API = 'https://api.squeekchain.com';
const SAVE_KEY = 'squeektale-v1';

let tale = load() || createTale();
let mode = 'live'; // live | demo | recorded
let chosen = null;
let lastSeenRound = null;
let demoIndex = 0;
let recordedIndex = 0;
let demoTimer = null;
let wallet = null;

const $ = (id) => document.getElementById(id);

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(tale)); } catch {}
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw);
    return t && Array.isArray(t.chapters) ? t : null;
  } catch { return null; }
}

function render() {
  $('hope').textContent = tale.hope;
  $('snacks').textContent = tale.snacks;
  $('map').textContent = tale.map;
  $('score').textContent = tale.score;
  $('chapter').textContent = `${Math.min(tale.chapter, 10)} / 10`;
  $('modeLabel').textContent = mode === 'live' ? 'Live SqueekCore'
    : mode === 'demo' ? 'Demo (simulated rounds)' : 'Recorded sample (API unavailable)';
  $('log').innerHTML = tale.chapters.length
    ? tale.chapters.slice().reverse().map((c) => `
      <div class="entry"><b>Chapter ${c.chapter}: ${c.title}</b>
      <span>${ROUND_LABEL[c.roundClass]} · work ${c.work} · ${ACTIONS[c.action].label}</span>
      <span>${c.text}</span>
      <span>Hope ${c.hopeAfter} · Score ${c.scoreAfter}</span></div>`).join('')
    : '<p class="muted">No chapters yet. Pick an action below, then a real settled round (or a demo round) will write the next chapter.</p>';
  $('actions').style.display = tale.finished ? 'none' : 'block';
  $('chosen').textContent = chosen ? `Chosen: ${ACTIONS[chosen].label}` : 'No action chosen yet for the next chapter.';
  $('ending').style.display = tale.finished ? 'block' : 'none';
  if (tale.finished) {
    $('endingText').textContent = `${ENDING_LABEL[tale.ending]} — ${tale.chapter} chapters, ${tale.score} points, Hope ${tale.hope}, Map ${tale.map}.`;
    $('claimBtn').disabled = false;
  } else {
    $('claimBtn').disabled = true;
  }
}

function nextChapter(work, source, batchInfo) {
  if (tale.finished || !chosen) return;
  const action = chosen;
  chosen = null;
  const entry = resolveChapter(tale, work, action);
  $('lastRound').textContent = `${source}: ${ROUND_LABEL[entry.roundClass]} (work ${entry.work})${batchInfo || ''} → ${entry.text}`;
  save();
  render();
}

function startDemoTimer() {
  clearInterval(demoTimer);
  if (mode !== 'demo' || tale.finished) return;
  let left = 8;
  $('wait').textContent = `Demo: next round in ${left}s — pick an action first.`;
  demoTimer = setInterval(() => {
    left -= 1;
    if (left <= 0) {
      if (chosen && demoIndex < DEMO_WORKS.length) {
        nextChapter(DEMO_WORKS[demoIndex++], 'Demo round', ' (simulated)');
      }
      left = 8;
    }
    $('wait').textContent = `Demo: next round in ${left}s — pick an action first.`;
  }, 1000);
}

async function pollLive() {
  if (mode !== 'live') return;
  try {
    const [evRes, stRes] = await Promise.all([
      fetch(`${API}/v1/events?category=protocol`),
      fetch(`${API}/v1/status`),
    ]);
    if (!evRes.ok) throw new Error('events API failed');
    const settlements = parseSettlements(await evRes.json());
    const latest = settlements[settlements.length - 1];
    if (latest) {
      if (lastSeenRound === null) lastSeenRound = latest.settledThroughRound;
      else if (latest.settledThroughRound > lastSeenRound) {
        const batch = latest.roundsClosed > 1 ? ` (batch closing ${latest.roundsClosed} rounds, total work)` : '';
        lastSeenRound = latest.settledThroughRound;
        nextChapter(latest.workAdded, `Live round ${latest.settledThroughRound}`, batch);
      }
      $('liveInfo').textContent = `Latest settled round: ${latest.settledThroughRound} · work ${latest.workAdded} (${classifyWork(latest.workAdded)})`;
    }
    if (stRes.ok) {
      const st = await stRes.json();
      const rpm = (Number(st.measurement?.rpmMilli) || 0) / 1000;
      $('wheel').textContent = `Wheel now: ${st.measurement?.coreStatus || 'unknown'} · ${rpm} RPM · cumulative work ${st.measurement?.cumulativeWorkUnits || '?'}`;
    }
    $('apiState').textContent = 'API: live';
  } catch (e) {
    $('apiState').textContent = 'API: unavailable — switching to the labelled recorded sample so the tale can still finish.';
    setMode('recorded');
  }
}

function recordedTick() {
  if (mode !== 'recorded' || tale.finished) return;
  if (chosen && recordedIndex < RECORDED_WORKS.length) {
    nextChapter(RECORDED_WORKS[recordedIndex++], 'Recorded sample round', ' (not live)');
  }
}

function setMode(next) {
  mode = next;
  clearInterval(demoTimer);
  if (mode === 'demo') startDemoTimer();
  render();
}

document.querySelectorAll('[data-action]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (tale.finished) return;
    chosen = btn.dataset.action;
    render();
    if (mode === 'recorded') recordedTick();
  });
});

$('demoBtn').addEventListener('click', () => setMode('demo'));
$('liveBtn').addEventListener('click', () => { setMode('live'); pollLive(); });
$('newBtn').addEventListener('click', () => {
  tale = createTale(); chosen = null; demoIndex = 0; recordedIndex = 0; save(); render(); startDemoTimer();
});
async function ensureSepolia() {
  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [{ chainId: SEPOLIA_CHAIN_ID, chainName: 'Sepolia',
      nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://rpc.sepolia.org'], blockExplorerUrls: ['https://sepolia.etherscan.io'] }],
  });
  const chainId = await window.ethereum.request({ method: 'eth_chainId' });
  if (chainId !== SEPOLIA_CHAIN_ID) throw new Error('Wallet is not on Sepolia after switching; transaction aborted.');
}

$('walletBtn').addEventListener('click', async () => {
  try {
    if (!window.ethereum) { $('walletInfo').textContent = 'No injected wallet found (e.g. MetaMask).'; return; }
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    wallet = accounts[0];
    if (!$('payTo').value) $('payTo').value = wallet;
    $('walletInfo').textContent = `Connected: ${wallet} (Sepolia check runs before any payment or claim, nothing signed yet)`;
  } catch (e) { $('walletInfo').textContent = `Wallet connection failed: ${e.message || e}`; }
});

// Sepolia ETH payment (testnet only). The user types the recipient and
// the amount; the site never invents a recipient and never touches
// mainnet. A safe first test is sending 0.001 Sepolia ETH to your own
// address, which is the default once you connect.
$('payBtn').addEventListener('click', async () => {
  try {
    if (!window.ethereum || !wallet) { $('payInfo').textContent = 'Connect a wallet first.'; return; }
    const to = $('payTo').value.trim();
    const amount = $('payAmount').value.trim();
    if (!isEthAddress(to)) throw new Error('Recipient must be a valid 0x address (40 hex characters).');
    const value = ethToWeiHex(amount);
    await ensureSepolia();
    const hash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: wallet, to, value, chainId: SEPOLIA_CHAIN_ID }],
    });
    $('payInfo').textContent = `Payment sent on Sepolia (test ETH only): ${amount} ETH to ${to}. Tx: ${hash} — check it on Sepolia Etherscan.`;
  } catch (e) { $('payInfo').textContent = `Payment failed or rejected: ${e.message || e}`; }
});
$('claimBtn').addEventListener('click', async () => {
  try {
    if (!tale.finished) return;
    if (!window.ethereum || !wallet) { $('walletInfo').textContent = 'Connect a wallet first.'; return; }
    await ensureSepolia();
    const data = textToHex(claimText(tale));
    const hash = await window.ethereum.request({
      method: 'eth_sendTransaction',
      params: [{ from: wallet, to: wallet, value: '0x0', data, chainId: SEPOLIA_CHAIN_ID }],
    });
    $('walletInfo').textContent = `Claim sent (0 ETH to yourself, tale in calldata): ${hash} — check it on Sepolia Etherscan. Gas is test ETH only.`;
  } catch (e) { $('walletInfo').textContent = `Claim failed or rejected: ${e.message || e}`; }
});

render();
pollLive();
setInterval(pollLive, 30000);
