# Hunch Live

Swipe-based prediction markets for live presentations on Monad.

## Run locally

```bash
pnpm install
# In two terminals:
pnpm convex:dev       # local Convex backend
pnpm dev              # Next.js on http://localhost:3000
```

## Flow

1. Host opens `/`, creates a room → lands on `/room/[code]/admin?key=[adminCode]`.
2. Audience scans QR (or visits `/room/[code]`) → name → burner wallet → swipe.
3. Each vote stakes 100 points. Correct on resolve → +200 (net +100).
4. Host clicks **Resolve YES/NO** per question. Leaderboard updates live.
5. `/room/[code]/screen` is the projector view.

## Monad contract (optional)

`contracts/HunchLive.sol` emits a `QuestionResolved` event on every resolve.

```bash
forge create contracts/HunchLive.sol:HunchLive \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key $PRIVATE_KEY
```

Paste the deployed address into `.env.local`:

```
NEXT_PUBLIC_HUNCH_CONTRACT=0x...
```

When set, the admin's browser wallet (`window.ethereum`) is asked to sign a
`recordResolve` call on each resolution. The tx hash is stored on the question
and rendered as a "view on Monad" link.

## Stack

- Next.js 15 (App Router) + Tailwind
- Convex (realtime data, points, leaderboard)
- viem burner wallets (in localStorage) per audience member
- framer-motion swipe deck
- sonner + canvas-confetti for dopamine
