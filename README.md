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
  `cumulativeWorkUnits`) for the current-round readout.
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

## Wallet: MetaMask + Sepolia ETH payment

- **Connect:** the “Connect wallet” button uses the injected provider
  (MetaMask) via `eth_requestAccounts`. No private key or seed phrase
  is ever handled by this site.
- **Pay with Sepolia ETH (testnet only):** type a recipient address
  and an amount (default `0.001`), then “Send Sepolia ETH payment”.
  The page switches the wallet to Sepolia, verifies `eth_chainId` is
  `0xaa36a7` before sending, pins that chain ID, and sends the exact
  amount you typed as the transaction value. Gas is also Sepolia test
  ETH. This is never mainnet ETH and never a real-money payment.
  A safe first test is sending to your own address, which is filled
  in automatically after you connect.
- **Claim a finished tale (Sepolia only):** after a tale finishes, one
  click sends a real Sepolia transaction — **0 ETH to yourself**, with
  the tale result (chapters, score, Hope, Map, ending) encoded in the
  calldata, under the same Sepolia switch-and-verify check. No
  contract, no custody, nothing is collected.

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
npm test   # 11 tests, no dependencies
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
