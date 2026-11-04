# SqueekTale 🐹📖

A living story that moves with Squeektoshi's real SqueekCore rounds on Squeekchain.

Pip the courier must reach the Dawn Lighthouse in 10 chapters. You pick one
action for the next chapter — Rest, Scout or Sprint — and the next real
settled round writes what happens. No betting, no real money, no forced
running: naps are worth as much as zoomies, just in different ways.

**Play it:** serve this folder over HTTP (ES modules do not work reliably
through `file://`) and open `index.html`:

```bash
npm start   # http://127.0.0.1:8765
```

## How it uses Squeekchain

All chapter outcomes come from Squeekchain's public API, which mirrors
SqueekCore on Sepolia:

- `GET /v1/events?category=protocol` — `system.settlement_completed`
  events. Each one closes a batch with `settledThroughRound`,
  `previousSettledThroughRound` and `workAdded`.
- `GET /v1/status` — live wheel telemetry (`coreStatus`, `rpmMilli`,
  `cumulativeWorkUnits`) for the current-round readout, and for the
  live hamster wheel on the page: the wheel turns once every
  60/RPM seconds, and stops with a resting hamster at 0 RPM. In
  demo/recorded mode the wheel is paused and labelled as showing
  only the last live reading.
- Round classes, the same bands used across the Squeekchain ecosystem:
  `0` work = 💤 Nap, `1–499` = 🐾 Jog, `500+` = 🔥 Zoomies.

Honesty rules, stated on the page itself:

- A settlement batch that closes several rounds is treated as **one
  chapter using its total work**. The game never invents a per-round split.
- If the API is down, the page switches to a labelled recorded sample so
  a tale can still finish. Recorded and demo rounds are never presented
  as live data.
- Demo mode simulates 8-second rounds so a whole tale can be finished
  in about a minute for review.

## Wallet: MetaMask + Sepolia ETH (per action, not a separate send)

- **Connect:** the “Connect wallet” button is at the very top of the
  page, because it is the first thing a player needs. It uses the
  injected provider (MetaMask) via `eth_requestAccounts`. No private
  key or seed phrase is ever handled by this site. Picking an action
  also connects automatically if you are not connected yet.
- **Every Pick action is a Sepolia transaction (testnet only):**
  clicking Rest, Scout or Sprint opens MetaMask for a real Sepolia
  transaction — **0 ETH to yourself**, gas in Sepolia test ETH, with
  `SqueekTale: chapter=N action=<id>` encoded in the calldata.
  The page switches the wallet to Sepolia, verifies `eth_chainId` is
  `0xaa36a7` before sending, and pins that chain ID. The action
  only counts after you confirm; rejecting it changes nothing in
  the tale. This is never mainnet ETH and never a real-money
  payment, and the site never invents a recipient.
- **On-chain transaction table:** every confirmed action (and the
  final claim) is listed below the chapters, newest first, with
  chapter, action, transaction hash linked to Sepolia Etherscan,
  and a status that updates from “Sent” to “Confirmed” while the
  page stays open. The table is saved in this browser only
  (`localStorage`, key `squeektale-txs-v1`) and is cleared when a
  new tale starts.
- **Claim a finished tale (Sepolia only):** after a tale finishes, one
  click sends a real Sepolia transaction — **0 ETH to yourself**, with
  the tale result (chapters, score, Hope, Map, ending) encoded in the
  calldata, under the same Sepolia switch-and-verify check. No
  contract, no custody, nothing is collected. The claim also appears
  in the transaction table.

## The rules in short

- One tale = 10 chapters. Start: Hope 10, Snacks 3, Map 0, Score 0.
- Pick 1 action per chapter, before the next settlement resolves it:

  | Action | Nap (0) | Jog (1–499) | Zoomies (500+) |
  | --- | --- | --- | --- |
  | 🛏️ Rest | Hope +2, Snacks +1, Score +5 | Hope +1, Score +5 | Hope −1, Score +5 |
  | 🔭 Scout | Map +1, Score +5 | Map +2, Score +10 | Hope −1, Map +1, Score +10 |
  | ⚡ Sprint | Hope −1, Score +0 | Score +10 | Map +1, Score +20 |

- Hope reaching 0 ends the tale early as `lost`.
- Endings after 10 chapters: Score ≥ 110 → Dawn Keeper; else
  Map ≥ 10 → Pathfinder; else Score ≥ 85 → Brave Courier; else
  Quiet Traveller.
- Your tale is saved in this browser only (`localStorage`, key
  `squeektale-v1`). No server, no account.

## Files

- `index.html` + `styles.css` + `site.js` — the playable one-page site.
- `lib/story.js` — pure rules (round classes, action matrix, endings,
  settlement parsing, claim text), shared by the page and the tests.
- `test/story.test.js` — unit tests for the pure rules.
- `DESIGN.md` — full design, balance and the demo-tale walkthrough.
- `GENESIS.md` — the Genesis submission pack (name, one-sentence
  integration answer, verification steps).

## Run the tests

```bash
npm test   # 16 tests, no dependencies
```

## What this is not

This is not a copy of SqueekRaid (a boss raid on nightly distance and
sleep), Squeek Garden (plants growing on rounds), SqueekPulse (a
telemetry console / OBS overlay), or any dashboard, tracker or betting
app. It is a choice-driven story: the same real rounds, a different
game — the player's action, not just the hamster, decides the ending.
It was built as original code for this project; the sample repositories
were used only as structural references (static one-page site, pure
engine + tests, documented live-API use).
