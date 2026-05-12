#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import solc from "solc";
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  formatEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
  blockExplorers: {
    default: { name: "Monad Explorer", url: "https://testnet.monadexplorer.com" },
  },
});

// Load .env.local manually (no dotenv dep)
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const pk = process.env.DEPLOYER_PK;
if (!pk) {
  console.error("DEPLOYER_PK missing. Run: pnpm tsx scripts/generate-deployer.mjs");
  process.exit(1);
}

const account = privateKeyToAccount(pk);
console.log("Deployer:", account.address);

const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });
const balance = await publicClient.getBalance({ address: account.address });
console.log("Balance: ", formatEther(balance), "MON");
if (balance === 0n) {
  console.error("Wallet has 0 MON. Send some testnet MON to the deployer address first.");
  process.exit(1);
}

console.log("Compiling HunchLivePool.sol...");
const source = fs.readFileSync(
  path.resolve(process.cwd(), "contracts/HunchLivePool.sol"),
  "utf8"
);
const input = {
  language: "Solidity",
  sources: { "HunchLivePool.sol": { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const out = JSON.parse(solc.compile(JSON.stringify(input)));
if (out.errors) {
  const fatal = out.errors.filter((e) => e.severity === "error");
  for (const e of out.errors) console.log(e.formattedMessage ?? e.message);
  if (fatal.length > 0) {
    console.error("Solidity errors — aborting.");
    process.exit(1);
  }
}
const contract = out.contracts["HunchLivePool.sol"]["HunchLivePool"];
const bytecode = ("0x" + contract.evm.bytecode.object);
const abi = contract.abi;
console.log("Bytecode size:", (bytecode.length - 2) / 2, "bytes");

const wallet = createWalletClient({
  account,
  chain: monadTestnet,
  transport: http(),
});

console.log("Deploying...");
const hash = await wallet.deployContract({ abi, bytecode });
console.log("Tx:", `${monadTestnet.blockExplorers.default.url}/tx/${hash}`);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (!receipt.contractAddress) {
  console.error("No contract address in receipt — deploy may have failed.");
  process.exit(1);
}
console.log("");
console.log("✓ HunchLivePool deployed at:", receipt.contractAddress);
console.log("  Explorer:", `${monadTestnet.blockExplorers.default.url}/address/${receipt.contractAddress}`);

// Append/replace NEXT_PUBLIC_HUNCH_POOL_CONTRACT in .env.local
let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
if (/^NEXT_PUBLIC_HUNCH_POOL_CONTRACT=/m.test(env)) {
  env = env.replace(
    /^NEXT_PUBLIC_HUNCH_POOL_CONTRACT=.*$/m,
    `NEXT_PUBLIC_HUNCH_POOL_CONTRACT=${receipt.contractAddress}`
  );
} else {
  if (env.length > 0 && !env.endsWith("\n")) env += "\n";
  env += `NEXT_PUBLIC_HUNCH_POOL_CONTRACT=${receipt.contractAddress}\n`;
}
fs.writeFileSync(envPath, env);
console.log("Updated .env.local with NEXT_PUBLIC_HUNCH_POOL_CONTRACT");
console.log("");
console.log("Next:");
console.log("  1. vercel env add NEXT_PUBLIC_HUNCH_POOL_CONTRACT production");
console.log("     (paste " + receipt.contractAddress + ")");
console.log("  2. vercel --prod --yes");
