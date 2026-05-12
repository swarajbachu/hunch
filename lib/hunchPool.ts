"use client";

import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "./wagmi";

export const HUNCH_POOL_ADDRESS =
  (process.env.NEXT_PUBLIC_HUNCH_POOL_CONTRACT as Address | undefined) ?? null;

export const poolAbi = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "payable",
    inputs: [{ name: "roomCode", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "finalize",
    stateMutability: "nonpayable",
    inputs: [
      { name: "roomCode", type: "string" },
      { name: "winners", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "gasDripPerWinner", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "roomCode", type: "string" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimableOf",
    stateMutability: "view",
    inputs: [
      { name: "roomCode", type: "string" },
      { name: "user", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "poolInfo",
    stateMutability: "view",
    inputs: [{ name: "roomCode", type: "string" }],
    outputs: [
      { name: "admin", type: "address" },
      { name: "deposited", type: "uint256" },
      { name: "distributed", type: "uint256" },
      { name: "finalized", type: "bool" },
    ],
  },
] as const;

export function getPublicClient() {
  return createPublicClient({ chain: monadTestnet, transport: http() });
}

function getInjectedWallet() {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eth = (window as any).ethereum;
  if (!eth) return null;
  return createWalletClient({ chain: monadTestnet, transport: custom(eth) });
}

async function ensureCorrectChain(wallet: ReturnType<typeof createWalletClient>) {
  try {
    await wallet.switchChain({ id: monadTestnet.id });
  } catch {
    await wallet.addChain({ chain: monadTestnet });
  }
}

export async function depositToPool(
  roomCode: string,
  amountMon: string
): Promise<{ txHash: Hex; amountWei: bigint } | null> {
  if (!HUNCH_POOL_ADDRESS) return null;
  const wallet = getInjectedWallet();
  if (!wallet) return null;
  const [account] = await wallet.requestAddresses();
  await ensureCorrectChain(wallet);
  const value = parseEther(amountMon);
  const txHash = await wallet.writeContract({
    address: HUNCH_POOL_ADDRESS,
    abi: poolAbi,
    functionName: "deposit",
    account,
    args: [roomCode],
    value,
  });
  return { txHash, amountWei: value };
}

export async function finalizePool(args: {
  roomCode: string;
  winners: Address[];
  amountsWei: bigint[];
  gasDripPerWinnerWei: bigint;
}): Promise<Hex | null> {
  if (!HUNCH_POOL_ADDRESS) return null;
  const wallet = getInjectedWallet();
  if (!wallet) return null;
  const [account] = await wallet.requestAddresses();
  await ensureCorrectChain(wallet);
  return await wallet.writeContract({
    address: HUNCH_POOL_ADDRESS,
    abi: poolAbi,
    functionName: "finalize",
    account,
    args: [args.roomCode, args.winners, args.amountsWei, args.gasDripPerWinnerWei],
  });
}

export async function claimFromPool(args: {
  roomCode: string;
  burnerPrivateKey: Hex;
}): Promise<Hex | null> {
  if (!HUNCH_POOL_ADDRESS) return null;
  const account = privateKeyToAccount(args.burnerPrivateKey);
  const wallet = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(),
  });
  return await wallet.writeContract({
    address: HUNCH_POOL_ADDRESS,
    abi: poolAbi,
    functionName: "claim",
    args: [args.roomCode],
  });
}

export function explorerTxUrl(hash: string) {
  return `${monadTestnet.blockExplorers.default.url}/tx/${hash}`;
}

export function explorerAddrUrl(addr: string) {
  return `${monadTestnet.blockExplorers.default.url}/address/${addr}`;
}
