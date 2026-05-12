"use client";

import { generatePrivateKey, privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

const KEY = (roomCode: string) => `hunch:wallet:${roomCode.toUpperCase()}`;
const NAME_KEY = (roomCode: string) => `hunch:name:${roomCode.toUpperCase()}`;

export function getOrCreateBurner(roomCode: string): PrivateKeyAccount {
  if (typeof window === "undefined") {
    throw new Error("burner wallet only available in browser");
  }
  let pk = window.localStorage.getItem(KEY(roomCode)) as `0x${string}` | null;
  if (!pk || !pk.startsWith("0x")) {
    pk = generatePrivateKey();
    window.localStorage.setItem(KEY(roomCode), pk);
  }
  return privateKeyToAccount(pk);
}

export function readBurner(roomCode: string): PrivateKeyAccount | null {
  if (typeof window === "undefined") return null;
  const pk = window.localStorage.getItem(KEY(roomCode)) as `0x${string}` | null;
  if (!pk || !pk.startsWith("0x")) return null;
  try {
    return privateKeyToAccount(pk);
  } catch {
    return null;
  }
}

export function saveDisplayName(roomCode: string, name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_KEY(roomCode), name);
}

export function readDisplayName(roomCode: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(NAME_KEY(roomCode));
}
