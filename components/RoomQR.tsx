"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

export function RoomQR({ code }: { code: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    setUrl(`${window.location.origin}/room/${code}`);
  }, [code]);

  if (!url) return null;

  return (
    <div className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white border border-white/10">
      <QRCodeSVG value={url} size={220} bgColor="#ffffff" fgColor="#0b0b12" level="M" />
      <div className="text-center">
        <div className="font-mono font-bold text-zinc-900 text-3xl tracking-[0.4em]">
          {code}
        </div>
        <button
          onClick={() => {
            navigator.clipboard.writeText(url);
          }}
          className="mt-2 text-xs text-zinc-500 hover:text-zinc-900"
        >
          {url}
        </button>
      </div>
    </div>
  );
}
