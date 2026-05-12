#!/usr/bin/env node
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.local");
let env = "";
if (fs.existsSync(envPath)) {
  env = fs.readFileSync(envPath, "utf8");
}

if (/^DEPLOYER_PK=/m.test(env)) {
  const match = env.match(/^DEPLOYER_PK=(.*)$/m);
  const pk = match?.[1]?.trim();
  if (pk) {
    const acct = privateKeyToAccount(pk);
    console.log("DEPLOYER_PK already set in .env.local");
    console.log("Address:", acct.address);
    process.exit(0);
  }
}

const pk = generatePrivateKey();
const acct = privateKeyToAccount(pk);
const block = `DEPLOYER_PK=${pk}\n`;
const newEnv = env.endsWith("\n") || env.length === 0 ? env + block : env + "\n" + block;
fs.writeFileSync(envPath, newEnv);

console.log("Wrote DEPLOYER_PK to .env.local");
console.log("Address:", acct.address);
console.log("");
console.log("Send some MON to that address on Monad testnet, then run:");
console.log("  pnpm tsx scripts/deploy-pool.mjs");
