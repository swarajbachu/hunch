"use client";

import { createPublicClient, createWalletClient, custom, http } from "viem";
import { monadTestnet } from "./wagmi";

// Address gets pasted here after `forge create` against Monad testnet.
// Keep null until the contract is deployed.
export const HUNCH_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_HUNCH_CONTRACT as `0x${string}` | undefined) ?? null;

export const hunchAbi = [
  {
    type: "function",
    name: "recordResolve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "roomCode", type: "string" },
      { name: "questionId", type: "string" },
      { name: "outcome", type: "bool" },
      { name: "yesCount", type: "uint256" },
      { name: "noCount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "QuestionResolved",
    inputs: [
      { name: "roomCode", type: "string", indexed: false },
      { name: "questionId", type: "string", indexed: false },
      { name: "outcome", type: "bool", indexed: false },
      { name: "yesCount", type: "uint256", indexed: false },
      { name: "noCount", type: "uint256", indexed: false },
      { name: "resolver", type: "address", indexed: true },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

export function getPublicClient() {
  return createPublicClient({ chain: monadTestnet, transport: http() });
}

export async function recordResolveTx(args: {
  roomCode: string;
  questionId: string;
  outcome: "YES" | "NO";
  yesCount: number;
  noCount: number;
}): Promise<string | null> {
  if (!HUNCH_CONTRACT_ADDRESS) return null;
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eth = (window as any).ethereum;
  if (!eth) return null;

  const wallet = createWalletClient({ chain: monadTestnet, transport: custom(eth) });
  const [account] = await wallet.requestAddresses();
  await wallet.switchChain({ id: monadTestnet.id }).catch(async () => {
    await wallet.addChain({ chain: monadTestnet });
  });

  const hash = await wallet.writeContract({
    address: HUNCH_CONTRACT_ADDRESS,
    abi: hunchAbi,
    functionName: "recordResolve",
    account,
    args: [
      args.roomCode,
      args.questionId,
      args.outcome === "YES",
      BigInt(args.yesCount),
      BigInt(args.noCount),
    ],
  });
  return hash;
}

export function explorerTxUrl(hash: string) {
  return `${monadTestnet.blockExplorers.default.url}/tx/${hash}`;
}
