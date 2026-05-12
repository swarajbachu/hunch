"use client";

// EIP-6963: multi-injected provider discovery. Modern wallets (MetaMask,
// Rabby, Coinbase Wallet, etc.) announce themselves on the window so we
// can let the user pick between them instead of being stuck with whichever
// one happened to grab window.ethereum.

export type EIP6963Provider = {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any;
};

const SELECTED_KEY = "hunch:wallet:provider-rdns";

const providers = new Map<string, EIP6963Provider>();
const listeners = new Set<() => void>();
let initialized = false;

function notify() {
  for (const l of listeners) l();
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.addEventListener("eip6963:announceProvider", (event: any) => {
    const detail = event?.detail;
    if (!detail?.info || !detail?.provider) return;
    providers.set(detail.info.rdns ?? detail.info.uuid, {
      uuid: detail.info.uuid,
      name: detail.info.name,
      icon: detail.info.icon,
      rdns: detail.info.rdns,
      provider: detail.provider,
    });
    notify();
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

export function listProviders(): EIP6963Provider[] {
  ensureInit();
  return Array.from(providers.values());
}

export function subscribeProviders(listener: () => void): () => void {
  ensureInit();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function refreshProviders() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  }
}

export function setSelectedProviderRdns(rdns: string | null) {
  if (typeof window === "undefined") return;
  if (rdns) window.localStorage.setItem(SELECTED_KEY, rdns);
  else window.localStorage.removeItem(SELECTED_KEY);
  notify();
}

export function getSelectedProviderRdns(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SELECTED_KEY);
}

export function getSelectedProvider(): EIP6963Provider | null {
  ensureInit();
  const rdns = getSelectedProviderRdns();
  if (!rdns) return null;
  return providers.get(rdns) ?? null;
}

// Returns the EIP-6963 selected provider when one is chosen, falling back
// to window.ethereum (legacy single-injected) otherwise.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getActiveProvider(): any | null {
  ensureInit();
  const selected = getSelectedProvider();
  if (selected) return selected.provider;
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).ethereum ?? null;
}
