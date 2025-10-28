"use client"

import { useEffect, useState } from "react";

export default function Splash() {
  const [visible, setVisible] = useState(false);
  const DURATION = 1800; // ms
  useEffect(() => {
    try {
      const shown = sessionStorage.getItem("24rx_splash_shown");
      if (!shown) {
        setVisible(true);
        const t = setTimeout(() => {
          setVisible(false);
          try {
            sessionStorage.setItem("24rx_splash_shown", "1");
          } catch (e) {}
        }, DURATION);
        return () => clearTimeout(t);
      }
    } catch (e) {
      // sessionStorage might be unavailable; fallback to not showing
      setVisible(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-orbital-white">
      <div className="flex flex-col items-center gap-6">
        <div className="relative h-28 w-28">
          <div className="absolute inset-0 rounded-full border-2 border-cloud-gray" />
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              background:
                "conic-gradient(#D4AF37 0 90deg, transparent 90deg 360deg)",
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
              mask:
                "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
              animationDuration: "1.8s",
            }}
          />

          <span
            className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-[56px]
                       rounded-full bg-gold shadow-[0_0_12px_#D4AF37] animate-pulse"
          />

          <div className="absolute inset-0 grid place-items-center">
            <div className="select-none text-center leading-none">
              <span className="text-3xl font-space font-bold text-gold">24</span>
              <span className="text-3xl font-space font-bold text-deep-navy">Rx</span>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-lg font-space font-semibold text-deep-navy">Loading…</p>
          <p className="text-sm text-slate/60">Preparing your dashboard</p>
        </div>
      </div>
    </div>
  );
}
