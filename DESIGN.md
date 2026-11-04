# SqueekTale — design

## Why a story, not another dashboard

Genesis explicitly lists “a living story every round moves forward” as
something to build, and explicitly skips read-only dashboards,
explorers, trackers, landing pages, thin API wrappers and copies.
SqueekTale is built to that line: the page is useless without a choice,
and a choice is useless without a real settled round to resolve it.

## The tale

Pip, a young courier hamster, carries one last letter to the Dawn
Lighthouse. The ten chapter titles trace the road: Leaving the Burrow,
The Acorn River, Whispering Reeds, The Old Mill, Starlight Hollow,
The Fog Bridge, Ember Field, The Sleeping Library, Storm Steps,
The Dawn Lighthouse.

Each chapter's text is assembled from three honest parts: the place,
the round class (nap / jog / zoomies), and the player's action. No
chapter claims a hamster did something it did not — the round class
comes straight from the settlement batch's `workAdded`.

## Balance, checked by the tests

- Rest is the survival action: it is the only action that gains Hope
  on naps, but it can never score more than 5 per chapter.
- Scout is the map action: it is the only reliable way to reach the
  Pathfinder ending (Map ≥ 10).
- Sprint is the score action: it scores 0 on a nap and 20 on zoomies,
  so sprinting blindly through a sleepy night costs Hope.
- Demo walkthrough (sequence in `lib/story.js`): best play scores
  115 → Dawn Keeper; sprint-only scores 100 → Brave Courier;
  scout-only maps 14 → Pathfinder; rest-only → Quiet Traveller.
  Every ending is reachable from the same demo sequence, by play
  alone — no ending is locked behind a real-money payment; the only
  on-chain cost is Sepolia test ETH gas for recording each action.

## Live, demo and recorded — kept apart

- Live: poll `/v1/events?category=protocol` every 30 seconds. A new
  `settledThroughRound` resolves the pending chapter. The live panel
  always shows the latest settled round and the current wheel state.
- Demo: 8-second simulated rounds, labelled “Demo (simulated
  rounds)” in the header and in every chapter line.
- Recorded: only entered automatically when the live API fetch fails,
  labelled “Recorded sample (API unavailable)”. The sample sequence is
  fixed in the engine and is not claimed to be any particular day's
  real rounds.

## Wallet, MetaMask and Sepolia ETH — safety notes

- Every action shares one guard, `ensureSepolia()`, in
  this order: SWITCH to Sepolia first (the no-op when Sepolia is
  already there, and it never overwrites the user's own RPC); only
  on error 4902 ADD Sepolia with the standard params; then read
  `eth_chainId` and abort unless it is exactly `0xaa36a7`, and pin
  that chain ID on the transaction. User rejection (4001) and an
  already-pending wallet request (-32002) are reported in plain words.
- There is no separate "send" panel. Picking an action sends one
  Sepolia transaction (0 ETH to yourself, calldata
  `SqueekTale: chapter=N action=<id>`, gas in Sepolia ETH) and the
  action only becomes the pending action after the transaction hash
  returns. A second pick is ignored while one action is already
  pending, so one chapter cannot be recorded twice.
- The transaction table (saved in `localStorage` under
  `squeektale-txs-v1`, cleared on a new tale) lists every action
  with its Sepolia Etherscan link, and polls
  `eth_getTransactionReceipt` every 15 seconds while the page is
  open to move a row from "Sent" to "Confirmed" (receipt status
  0x1) or "Failed" (0x0).
- Screen-change bugs probed and fixed: a chosen action stranded by a
  live-API failure now resolves at once in recorded mode; the wait
  text is reset on every mode change; account/chain changes in the
  wallet update the page instead of leaving a stale address; an API
  answer with no settled rounds shows a retry notice instead of
  hanging on “loading”; every element id used by `site.js` was
  checked against `index.html` (none missing).
- The site never invents a recipient, never defaults to a creator
  address, and never sends mainnet ETH. Every transaction is to the
  user's own connected address.
- A rejected action is shown as text and changes nothing
  in the tale.
- There is no final-tale claim button and no reward attached to
  finishing a tale: the ending is shown in the tale panel, and the
  per-action transactions are the whole on-chain record.

## Limits, stated honestly

- Live tales are slow by design: real SqueekCore rounds are 10 minutes
  each, so a live tale takes about 100 minutes. That is why demo mode
  exists, and why it is labelled.
- Recent live settlements at the time of building often reported
  `workAdded: 0` (the hamster was idle). A live tale during a long nap
  stretch will therefore be a Rest/Scout tale, not a Sprint tale —
  that is the game working as intended, not a bug.
- The page has no server, no leaderboard and no multiplayer. Scores
  are local, so they are for fun and endings, not for ranked prizes.
