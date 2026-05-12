"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type EIP6963Provider,
  getSelectedProviderRdns,
  listProviders,
  refreshProviders,
  setSelectedProviderRdns,
  subscribeProviders,
} from "@/lib/walletProviders";
import { requestAccountsOn } from "@/lib/hunchPool";

export function WalletPicker({
  open,
  onClose,
  onPicked,
}: {
  open: boolean;
  onClose: () => void;
  onPicked: (address: string, providerName: string) => void;
}) {
  const [providers, setProviders] = useState<EIP6963Provider[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setProviders(listProviders());
    setSelected(getSelectedProviderRdns());
    const unsub = subscribeProviders(() => setProviders(listProviders()));
    refreshProviders();
    const id = window.setTimeout(refreshProviders, 200);
    return () => {
      unsub();
      window.clearTimeout(id);
    };
  }, [open]);

  if (!open) return null;

  async function pick(p: EIP6963Provider) {
    setBusy(p.rdns);
    try {
      setSelectedProviderRdns(p.rdns);
      const account = await requestAccountsOn(p.provider);
      if (!account) {
        toast.error("No account returned from wallet");
        return;
      }
      onPicked(account, p.name);
      toast.success(`${p.name} connected`, {
        description: `${account.slice(0, 6)}…${account.slice(-4)}`,
      });
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  // Legacy fallback: if no EIP-6963 providers announced but window.ethereum
  // exists, show a generic option.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hasLegacy =
    typeof window !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    !!(window as any).ethereum &&
    providers.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border border-white/10 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Choose a wallet</h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white text-xl"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {providers.length === 0 && !hasLegacy && (
          <div className="text-sm text-white/60 py-6 text-center">
            No injected wallets detected. Install MetaMask, Rabby, or another
            browser wallet and reload.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {providers.map((p) => (
            <button
              key={p.rdns}
              onClick={() => pick(p)}
              disabled={busy !== null}
              className={`flex items-center gap-3 p-3 rounded-2xl border transition disabled:opacity-50 ${
                selected === p.rdns
                  ? "border-brand-500 bg-brand-500/10"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.icon}
                alt={p.name}
                className="w-9 h-9 rounded-lg bg-white/5"
              />
              <span className="flex-1 text-left">
                <span className="font-semibold">{p.name}</span>
                <span className="block text-[11px] text-white/40 truncate">
                  {p.rdns}
                </span>
              </span>
              {selected === p.rdns && (
                <span className="text-brand-400 text-xs">current</span>
              )}
              {busy === p.rdns && (
                <span className="text-white/60 text-xs">…</span>
              )}
            </button>
          ))}

          {hasLegacy && (
            <button
              onClick={() =>
                pick({
                  uuid: "legacy",
                  name: "Browser wallet",
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  provider: (window as any).ethereum,
                  rdns: "legacy",
                  icon: "",
                })
              }
              disabled={busy !== null}
              className="flex items-center gap-3 p-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
            >
              <span className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                🦊
              </span>
              <span className="flex-1 text-left">
                <span className="font-semibold">Browser wallet</span>
                <span className="block text-[11px] text-white/40">
                  legacy window.ethereum
                </span>
              </span>
            </button>
          )}
        </div>

        <p className="text-[11px] text-white/40 text-center">
          Don't see your wallet? Some wallets need their browser extension
          enabled before they announce.
        </p>
      </div>
    </div>
  );
}
