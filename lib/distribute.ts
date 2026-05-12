export type Player = {
  address: string;
  displayName: string;
  points: number;
};

export type Allocation = {
  address: string;
  displayName: string;
  rank: number;
  points: number;
  amountWei: bigint;
  share: number; // 0..1
};

export type Curve = "linear" | "quadratic" | "equal";

export type DistributeOptions = {
  percentile: number; // 0..1 — top X% by leaderboard order
  curve: Curve;
  excludeBelowStart: boolean; // skip anyone still at starting points
  startingPoints: number;
  poolWei: bigint;
  gasDripPerWinnerWei: bigint;
};

const PRECISION = 1_000_000_000n; // 1e9

export function selectWinners(leaderboard: Player[], opts: DistributeOptions): Player[] {
  const minCount = Math.max(1, Math.floor(leaderboard.length * opts.percentile));
  const trimmed = leaderboard.slice(0, minCount);
  if (!opts.excludeBelowStart) return trimmed;
  return trimmed.filter((p) => p.points > opts.startingPoints);
}

export function computeAllocations(
  leaderboard: Player[],
  opts: DistributeOptions
): { winners: Allocation[]; distributable: bigint; reservedForDrip: bigint } {
  const winners = selectWinners(leaderboard, opts);
  if (winners.length === 0) {
    return { winners: [], distributable: 0n, reservedForDrip: 0n };
  }

  const reservedForDrip = opts.gasDripPerWinnerWei * BigInt(winners.length);
  const distributable =
    opts.poolWei > reservedForDrip ? opts.poolWei - reservedForDrip : 0n;

  if (distributable === 0n) {
    return {
      winners: winners.map((u, i) => ({
        address: u.address,
        displayName: u.displayName,
        rank: i + 1,
        points: u.points,
        amountWei: 0n,
        share: 0,
      })),
      distributable: 0n,
      reservedForDrip,
    };
  }

  const weights = winners.map((u) => {
    if (opts.curve === "equal") return 1;
    if (opts.curve === "linear") return Math.max(0, u.points);
    return Math.sqrt(Math.max(0, u.points));
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

  let allocated = 0n;
  const allocations: Allocation[] = winners.map((u, i) => {
    const share = weights[i] / totalWeight;
    const scaled = BigInt(Math.round(share * Number(PRECISION)));
    const amountWei = (distributable * scaled) / PRECISION;
    allocated += amountWei;
    return {
      address: u.address,
      displayName: u.displayName,
      rank: i + 1,
      points: u.points,
      amountWei,
      share,
    };
  });

  // Drift from rounding -> hand the leftover dust to rank 1.
  const dust = distributable - allocated;
  if (dust > 0n && allocations.length > 0) {
    allocations[0].amountWei += dust;
  }

  return { winners: allocations, distributable, reservedForDrip };
}
