# Hunch Live

Swipe-based prediction markets for live presentations on Monad. Host runs a
room; the audience scans a QR, swipes YES/NO on timed questions, racks up
points, and at the end of the presentation the host distributes an onchain
MON prize pool to the leaderboard via a quadratic split — winners claim
straight from a burner wallet to their phone.

**Live:** https://hunch-live.vercel.app

### 🎬 Try the seeded demo room

A "Monad Blitz Demo" room is pre-populated with 16 NPCs, votes, and questions
in every phase — open all three on different screens at once:

- **Audience (swipe view):** https://hunch-live.vercel.app/room/J93VJP
- **Admin (questions + prize pool + distribute wizard):** https://hunch-live.vercel.app/room/J93VJP/admin?key=2FZYS8
- **Projector (countdown + reveal moment + leaderboard):** https://hunch-live.vercel.app/room/J93VJP/screen

(If the seeded room is stale, regenerate with `npx convex run seed:wipeDemo --prod && npx convex run seed:populateDemo --prod` — the new URLs are returned in the output.)

## Onchain footprint (Monad testnet)

| Thing | Address / link |
|---|---|
| `HunchLivePool` (deposit / finalize / claim) | [`0xf0c37a1b992f13e36b2acf94e1f1b204f0c17b41`](https://testnet.monadexplorer.com/address/0xf0c37a1b992f13e36b2acf94e1f1b204f0c17b41) |
| Chain | Monad Testnet · `chainId 10143` |
| RPC | `https://testnet-rpc.monad.xyz` |
| Explorer | https://testnet.monadexplorer.com |

The pool contract holds MON, lets the room admin finalize a quadratic split,
drips a tiny amount of gas to each winner so their burner can self-claim, and
emits `PoolDeposited` / `PoolFinalized` / `Claimed` events. Source:
[`contracts/HunchLivePool.sol`](./contracts/HunchLivePool.sol).

Convex remains the source of truth for points, votes, and the leaderboard.
Every resolution also signs a lightweight `QuestionResolved` event log on the
older [`HunchLive.sol`](./contracts/HunchLive.sol) (optional, set
`NEXT_PUBLIC_HUNCH_CONTRACT` if you redeploy it).

## Run locally

```bash
pnpm install
pnpm convex:dev      # in one terminal — local/dev Convex backend
pnpm dev             # in another — Next.js on http://localhost:3000
```

To talk to the *deployed* Convex prod backend and the *deployed* pool contract
from local dev, pull the env vars Vercel already has:

```bash
vercel env pull .env.local
```

## What's in the box

### Routes

| Route | Audience |
|---|---|
| `/` | Landing — Create room / Join with code |
| `/room/[code]` | Audience swipe view (timed questions, claim card after finalize) |
| `/room/[code]/admin?key=…` | Admin: questions, resolve, prize pool, distribute wizard |
| `/room/[code]/screen` | Projector view: giant countdown, vote pulses, reveal moment, leaderboard |

### Flow

1. Host opens `/`, creates a room → lands on `/room/[code]/admin?key=[adminCode]`.
2. Audience scans QR → name → a burner wallet is generated in their browser → swipe deck.
3. Host adds questions, presses **▶ Start** when ready. Each question has a
   countdown (15s / 30s / 60s / 2m); votes are rejected after expiry.
4. Each vote stakes 100 points. Correct on resolve → +200 (net +100). First three
   correct voters get a +25 speed bonus; 3-in-a-row streak → 1.5×, 5+ → 2×.
5. Host opens the **Prize pool** panel, connects a wallet (MetaMask, Rabby,
   Coinbase Wallet — anything that announces via EIP-6963), and deposits MON.
6. **End presentation & distribute** opens the wizard — top X% cut, curve
   (linear / quadratic / equal), live charts of allocations + curve comparison +
   gini coefficient + sqrt curve plot. One signature sends every winner their
   share onchain.
7. Each winning phone shows a **Claim** card — burner signs `claim()`, MON
   lands in their wallet, confetti.

### Distribution math

`share_i = weight_i / Σ weight_j` where `weight_i = √points_i` for the
quadratic (default) curve. See [`lib/distribute.ts`](./lib/distribute.ts).
This isn't classic Vitalik-style QF (no matching pool) — it's a sqrt-weighted
proportional split, which compresses the gap between #1 and #N so participation
pays as much as hoarding.

## Stack

- **Next.js 15** (App Router) + **Tailwind v3**
- **Convex** for realtime rooms / questions / votes / users / payouts
- **viem** for burner wallets (in localStorage) + onchain calls
- **EIP-6963** multi-wallet discovery (lib/walletProviders.ts)
- **framer-motion** swipe deck + reveal animations
- **canvas-confetti** + **sonner** for the dopamine layer
- **solc 0.8.26** via npm for local contract deploys (no Foundry required)

## Demo scripts (Convex CLI)

Populate a "Monad Blitz Demo" room with 16 NPCs across 6 questions in every
phase (draft / active / locked / resolved) so every screen is full at once:

```bash
npx convex run seed:populateDemo --prod
# → returns { code, adminUrl, audienceUrl, screenUrl }
```

Reset between dry runs:

```bash
npx convex run seed:wipeDemo --prod
```

## Deploying `HunchLivePool` from scratch

No Foundry needed. Local-only deploy with viem + npm solc:

```bash
# Generate a deployer key (writes DEPLOYER_PK to .env.local)
node scripts/generate-deployer.mjs

# Send 0.05–0.1 MON on Monad testnet to the printed address, then:
node scripts/deploy-pool.mjs
```

The script compiles, deploys, and appends
`NEXT_PUBLIC_HUNCH_POOL_CONTRACT=0x…` to `.env.local`. To make it live for
production:

```bash
vercel env add NEXT_PUBLIC_HUNCH_POOL_CONTRACT production
vercel --prod --yes
```

If you don't want to deploy a contract at all, the wizard runs in
**simulated** mode — same UI, no onchain calls, claims are marked as
`(simulated)`.

## Repository layout

```
app/                       Next.js routes
  page.tsx                   landing
  room/[code]/page.tsx       audience swipe view
  room/[code]/admin/page.tsx admin dashboard
  room/[code]/screen/page.tsx projector view
components/
  SwipeDeck.tsx · QuestionCard.tsx · CountdownRing.tsx
  AdminQuestionForm.tsx · AdminQuestionRow.tsx
  PoolPanel.tsx · WalletPicker.tsx · ClaimCard.tsx
  DistributeWizard.tsx
  distribute/                charts for the wizard
    AllocationBars.tsx · CurveCompare.tsx · MetricTiles.tsx · SqrtCurve.tsx
  WinCelebration.tsx · VotePulseFeed.tsx · Leaderboard.tsx
  PointsPill.tsx · RoomQR.tsx
convex/
  schema.ts                  rooms / questions / users / votes / payouts
  rooms.ts · questions.ts · votes.ts · users.ts
  leaderboard.ts · payouts.ts · seed.ts
contracts/
  HunchLive.sol              event-only resolve log (optional)
  HunchLivePool.sol          deposit + finalize + claim (prize pool)
lib/
  burnerWallet.ts            getOrCreateBurner / readBurnerPk
  hunchContract.ts           HunchLive helpers
  hunchPool.ts               HunchLivePool helpers (deposit, finalize, claim)
  walletProviders.ts         EIP-6963 multi-wallet discovery
  distribute.ts              quadratic / linear / equal split math
  useCountdown.ts            reactive countdown hook
  wagmi.ts                   Monad testnet chain definition
scripts/
  generate-deployer.mjs      writes DEPLOYER_PK to .env.local
  deploy-pool.mjs            compiles + deploys HunchLivePool to Monad testnet
```

## Environment variables

| Var | Required | Used by |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | yes | Convex client |
| `CONVEX_DEPLOY_KEY` | prod only | `vercel.json` auto-`convex deploy` on build |
| `NEXT_PUBLIC_HUNCH_POOL_CONTRACT` | optional | Pool deposit / finalize / claim (falls back to simulated if unset) |
| `NEXT_PUBLIC_HUNCH_CONTRACT` | optional | `recordResolve` event log on each resolve |
| `DEPLOYER_PK` | dev only | scripts/deploy-pool.mjs |
