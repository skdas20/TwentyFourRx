"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AudioLines, Keyboard, Mic, MicOff, Minus, PhoneOff, RotateCcw, Send, X } from "lucide-react";
import { ria, RiaState } from "./riaController";

const IDLE_STATE: RiaState = {
  status: "idle",
  muted: false,
  activity: "",
  userText: "",
  riaText: "",
  error: "",
  micLevel: 0,
  outLevel: 0,
};

const STATUS_TEXT: Record<RiaState["status"], string> = {
  idle: "Your 24Rx guide",
  resumable: "Paused",
  connecting: "Connecting…",
  listening: "Listening…",
  speaking: "Speaking…",
  error: "Something went wrong",
};

function useRia(): RiaState {
  return useSyncExternalStore(
    ria ? ria.subscribe : () => () => {},
    ria ? ria.getState : () => IDLE_STATE,
    () => IDLE_STATE,
  );
}

/** Five bars that follow the mic (listening) or Ria's voice (speaking). */
function Visualizer({ level, active }: { level: number; active: boolean }) {
  const shape = [0.55, 0.85, 1, 0.85, 0.55];
  const amp = active ? Math.min(1, level * 6) : 0;
  return (
    <div className="flex h-6 items-center gap-[3px]" aria-hidden>
      {shape.map((s, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-blue-600 to-sky-400 transition-[height] duration-100 ease-out"
          style={{ height: `${Math.max(4, 4 + amp * s * 20)}px` }}
        />
      ))}
    </div>
  );
}

export default function RiaWidget() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const s = useRia();
  const [open, setOpen] = useState(true);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState("");
  const [hinted, setHinted] = useState(true);
  // Render only after mount: the controller exists only in the browser.
  const [mounted, setMounted] = useState(false);
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    setMounted(true);
    ria?.init({
      navigate: (path) => routerRef.current.push(path),
      getPath: () => window.location.pathname,
    });
    try {
      setHinted(localStorage.getItem("ria.hinted") === "1");
    } catch {}
    const onStorage = (e: StorageEvent) => e.key === "accessToken" && ria?.syncAuth();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    ria?.onRouteChange(pathname);
  }, [pathname]);

  if (!mounted || !ria || pathname.startsWith("/dashboard/admin")) return null;

  const active = s.status === "connecting" || s.status === "listening" || s.status === "speaking";
  const showPanel = (active || s.status === "error") && open;

  const begin = (resume = false) => {
    setOpen(true);
    if (!hinted) {
      setHinted(true);
      try {
        localStorage.setItem("ria.hinted", "1");
      } catch {}
    }
    void ria.start(resume);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    ria.sendText(draft);
    setDraft("");
  };

  const level = s.status === "speaking" ? s.outLevel : s.muted ? 0 : s.micLevel;
  const statusLine = s.activity || (s.status === "listening" && s.muted ? "Mic muted — type or unmute" : STATUS_TEXT[s.status]);

  return (
    <div
      className="fixed bottom-4 right-4 z-[9600] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6"
      data-ria-root
      data-assist-ignore
    >
      {showPanel && (
        <section
          role="dialog"
          aria-label="Ria voice assistant"
          className="w-[calc(100vw-2rem)] max-w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-2xl shadow-blue-900/15 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
        >
          <header className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <div className="relative h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-blue-100 to-blue-300 dark:from-blue-900 dark:to-blue-700">
              <img src="/ria/ria-avatar-96.webp" alt="" className="h-full w-full rounded-full object-cover" draggable={false} />
              {active && (
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-900" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-space text-sm font-semibold text-slate-900 dark:text-white">Ria</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
                {statusLine}
              </p>
            </div>
            <Visualizer level={level} active={s.status === "listening" || s.status === "speaking"} />
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Minimise Ria"
              title="Minimise (Ria keeps listening)"
            >
              <Minus className="h-4 w-4" />
            </button>
          </header>

          <div className="max-h-48 space-y-2 overflow-y-auto px-4 py-3 text-sm">
            {s.status === "error" ? (
              <p className="text-red-600 dark:text-red-400">{s.error}</p>
            ) : (
              <>
                {s.userText && (
                  <p className="text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-400 dark:text-slate-500">You · </span>
                    {s.userText}
                  </p>
                )}
                <p className="leading-relaxed text-slate-800 dark:text-slate-100">
                  {s.riaText ||
                    (s.status === "connecting" ? "Getting ready…" : "Ask me anything about 24Rx — selling, buying, KYC, deliveries…")}
                </p>
              </>
            )}
          </div>

          {typing && active && (
            <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type to Ria…"
                className="min-w-0 flex-1 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-white"
                aria-label="Message to Ria"
              />
              <button type="submit" className="rounded-lg bg-blue-600 p-2 text-white hover:bg-blue-700" aria-label="Send">
                <Send className="h-4 w-4" />
              </button>
            </form>
          )}

          <footer className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 dark:border-slate-800">
            {s.status === "error" ? (
              <>
                <button
                  onClick={() => begin(false)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <RotateCcw className="h-4 w-4" /> Try again
                </button>
                <button
                  onClick={() => ria.stop()}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => ria.toggleMute()}
                    className={`rounded-lg p-2 ${
                      s.muted
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                    aria-label={s.muted ? "Unmute microphone" : "Mute microphone"}
                    title={s.muted ? "Unmute" : "Mute"}
                  >
                    {s.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setTyping((t) => !t)}
                    className={`rounded-lg p-2 ${
                      typing
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
                        : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    }`}
                    aria-label="Type instead"
                    title="Type instead"
                  >
                    <Keyboard className="h-4 w-4" />
                  </button>
                </div>
                <button
                  onClick={() => ria.stop()}
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                >
                  <PhoneOff className="h-4 w-4" /> End
                </button>
              </>
            )}
          </footer>
        </section>
      )}

      {s.status === "resumable" && (
        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white py-1 pl-4 pr-1 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <span className="text-slate-700 dark:text-slate-200">Continue with Ria?</span>
          <button
            onClick={() => begin(true)}
            className="rounded-full bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700"
          >
            Resume
          </button>
          <button
            onClick={() => ria.dismissResume()}
            className="rounded-full p-1.5 text-slate-400 hover:text-slate-600"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        {s.status === "idle" && !hinted && (
          <span className="hidden rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg sm:block dark:bg-slate-100 dark:text-slate-900">
            Need help? Ask Ria
          </span>
        )}
        <button
          onClick={() => (active ? setOpen((o) => !o) : begin(s.status === "resumable"))}
          className="group relative h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-800 p-[3px] shadow-xl shadow-blue-700/30 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300"
          aria-label={active ? (open ? "Hide Ria" : "Show Ria") : "Talk to Ria, your 24Rx voice guide"}
          title={active ? "Ria is on" : "Talk to Ria"}
        >
          {active && (
            <span
              className={`absolute inset-0 rounded-full bg-blue-500/40 ${s.status === "speaking" ? "animate-ping" : "animate-pulse"} motion-reduce:animate-none`}
            />
          )}
          <span className="relative block h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-sky-100 to-blue-200">
            <img src="/ria/ria-avatar-192.webp" alt="" className="h-full w-full object-cover" draggable={false} />
          </span>
          {active && (
            <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-white bg-blue-600 text-white dark:border-slate-900">
              <AudioLines className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="sr-only">Ria</span>
        </button>
      </div>
    </div>
  );
}
