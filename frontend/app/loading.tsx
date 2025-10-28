"use client"

// app/loading.tsx (or any route-level Loading component)
export default function Loading() {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center
                 bg-[var(--bg-light)] text-[var(--ink-strong)]
                 dark:bg-[var(--bg-dark)] dark:text-white"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-7">
        {/* --- Animated brand mark --- */}
        <div className="relative h-28 w-28">
          {/* base ring */}
          <div className="absolute inset-0 rounded-full border-2
                          border-[color:var(--surface-light)]
                          dark:border-white/10" />
          {/* spinning arc */}
          <div
            className="absolute inset-0 rounded-full animate-spin-slow"
            style={{
              background:
                "conic-gradient(var(--gold) 0 90deg, transparent 90deg 360deg)",
              WebkitMask:
                "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
              mask:
                "radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))",
            }}
          />
          {/* orbiting glow dot */}
          <span
            className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-[56px]
                       rounded-full bg-[var(--gold)] shadow-[0_0_12px_var(--gold)]
                       animate-orbit"
          />
          {/* wordmark */}
          <div className="absolute inset-0 grid place-items-center">
            <div className="select-none text-center leading-none">
              <span className="text-3xl font-semibold tracking-tight text-[var(--gold)] animate-shine">
                24
              </span>
              <span className="text-3xl font-semibold tracking-tight text-[var(--ink-strong)] dark:text-white">
                Rx
              </span>
            </div>
          </div>
        </div>

        {/* loading copy */}
        <div className="flex flex-col items-center gap-1">
          <p className="font-medium">
            Loading
            <span className="ml-1 inline-block w-5 align-baseline animate-ellipsis">
              &nbsp;
            </span>
          </p>
          <p className="text-sm text-[var(--ink-muted)] dark:text-white/70">
            Preparing your dashboard…
          </p>
        </div>

        {/* indeterminate progress */}
        <div className="relative h-1.5 w-64 overflow-hidden rounded-full
                        bg-[var(--surface-light)] dark:bg-[var(--surface-dark)]">
          <div
            className="absolute inset-y-0 left-[-40%] w-[40%] rounded-full
                       bg-[var(--gold)]/90 animate-marquee"
          />
        </div>
      </div>

      {/* local keyframes (scoped) */}
      <style jsx>{`
        @keyframes spin-slow {
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 1.8s linear infinite;
        }

        @keyframes orbit {
          from {
            transform: rotate(0deg) translateY(0) rotate(0deg);
          }
          to {
            transform: rotate(360deg) translateY(0) rotate(-360deg);
          }
        }
        .animate-orbit {
          transform-origin: 50% 84px; /* center of ring */
          animation: orbit 1.8s linear infinite;
        }

        @keyframes marquee {
          from {
            transform: translateX(0%);
          }
          to {
            transform: translateX(180%);
          }
        }
        .animate-marquee {
          animation: marquee 1.1s ease-in-out infinite;
        }

        @keyframes ellipsis {
          0% {
            box-shadow: 0 0 currentColor, 6px 0 transparent, 12px 0 transparent;
          }
          33% {
            box-shadow: 0 0 currentColor, 6px 0 currentColor, 12px 0 transparent;
          }
          66% {
            box-shadow: 0 0 currentColor, 6px 0 currentColor, 12px 0 currentColor;
          }
          100% {
            box-shadow: 0 0 currentColor, 6px 0 transparent, 12px 0 transparent;
          }
        }
        .animate-ellipsis {
          height: 1em;
          color: currentColor;
          background: currentColor;
          border-radius: 999px;
          width: 4px;
          box-shadow: 0 0 currentColor, 6px 0 transparent, 12px 0 transparent;
          animation: ellipsis 1.2s steps(1, end) infinite;
        }

        @keyframes shine {
          0% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.25);
          }
          100% {
            filter: brightness(1);
          }
        }
        .animate-shine {
          animation: shine 1.6s ease-in-out infinite;
        }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .animate-spin-slow,
          .animate-orbit,
          .animate-marquee,
          .animate-ellipsis,
          .animate-shine {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
