/**
 * Browser-side UI tools for the "Ria" voice assistant.
 *
 * The widget forwards each Gemini Live function call to `runUiTool` and sends the
 * returned object back to the model as the function response. Elements are
 * addressed by `data-assist-id` (stable id) + `data-assist-label` (description),
 * with fallbacks to plain `id` and `name` attributes.
 *
 * The spotlight overlay is plain DOM (no React) so it survives route changes.
 * Nothing here touches the DOM at module top level (SSR-safe).
 */

export type UiToolName = 'read_page' | 'navigate' | 'highlight' | 'clear_highlight' | 'scroll_to' | 'fill_field';

export const UI_TOOL_NAMES: ReadonlySet<string> = new Set<UiToolName>([
  'read_page',
  'navigate',
  'highlight',
  'clear_highlight',
  'scroll_to',
  'fill_field',
]);

export interface UiToolDeps {
  /** Client-side navigation (Next router.push). */
  navigate: (path: string) => void;
  /** Current pathname. */
  getPath: () => string;
}

export interface PageSnapshot {
  path: string;
  title: string;
  headings: string[];
  targets: { id: string; label: string; visible: boolean }[];
  fields: { id: string; label: string; type: string; value: string; required: boolean; options?: string[] }[];
  alerts: string[];
}

type FormEl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const OVERLAY_ATTR = 'data-ria-overlay';
/** Elements inside a container marked with this attribute (e.g. the Ria widget itself) are ignored. */
const IGNORE_SELECTOR = `[data-assist-ignore], [${OVERLAY_ATTR}]`;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function clean(text: string | null | undefined, max: number): string {
  const t = (text ?? '').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}

function textOf(el: Element): string {
  const h = el as HTMLElement;
  // innerText respects CSS (skips hidden children); fall back to textContent.
  return (typeof h.innerText === 'string' ? h.innerText : el.textContent) ?? '';
}

function isIgnored(el: Element): boolean {
  return !!el.closest(IGNORE_SELECTOR);
}

function isVisible(el: Element): boolean {
  const anyEl = el as Element & { checkVisibility?: (o?: Record<string, boolean>) => boolean };
  if (typeof anyEl.checkVisibility === 'function') {
    if (!anyEl.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true })) return false;
  } else {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
  }
  return el.getClientRects().length > 0;
}

function attrEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/["\\]/g, '\\$&');
}

function isFormEl(el: Element | null): el is FormEl {
  return (
    el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement
  );
}

/** Pick the visible match among several candidates (e.g. desktop + mobile nav), else the first. */
function pickBest(list: NodeListOf<Element> | Element[]): HTMLElement | null {
  const arr = Array.from(list).filter((e) => !isIgnored(e)) as HTMLElement[];
  if (!arr.length) return null;
  return arr.find((e) => isVisible(e)) ?? arr[0];
}

/** Lookup order: [data-assist-id] → #id → [name]. */
function findTarget(target: unknown): HTMLElement | null {
  const t = String(target ?? '').trim();
  if (!t) return null;
  const esc = attrEscape(t);
  const byAssist = pickBest(document.querySelectorAll(`[data-assist-id="${esc}"]`));
  if (byAssist) return byAssist;
  const byId = document.getElementById(t);
  if (byId && !isIgnored(byId)) return byId;
  return pickBest(document.querySelectorAll(`[name="${esc}"]`));
}

/** First usable (non-hidden-type) control inside a wrapper, preferring a visible one. */
function innerControl(wrapper: Element): FormEl | null {
  const list = Array.from(wrapper.querySelectorAll('input, select, textarea')).filter(
    (c) => (c as HTMLInputElement).type !== 'hidden',
  ) as FormEl[];
  if (!list.length) return null;
  return list.find((c) => isVisible(c)) ?? list[0];
}

/**
 * Something visible to spotlight for `el`: the element itself, or — for invisible
 * elements such as visually-hidden file inputs — its visible <label>, else the
 * nearest visible ancestor.
 */
function visibleStandIn(el: HTMLElement): HTMLElement {
  if (isVisible(el)) return el;
  if (isFormEl(el) && el.labels) {
    const lbl = Array.from(el.labels).find((l) => isVisible(l));
    if (lbl) return lbl;
  }
  const wrapLabel = el.closest('label');
  if (wrapLabel && isVisible(wrapLabel)) return wrapLabel;
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    if (isVisible(p)) return p;
  }
  return el;
}

function availableTargetIds(limit = 40): string[] {
  const visible: string[] = [];
  const hidden: string[] = [];
  const seen = new Set<string>();
  document.querySelectorAll('[data-assist-id]').forEach((el) => {
    if (isIgnored(el)) return;
    const id = el.getAttribute('data-assist-id') || '';
    if (!id || seen.has(id)) return;
    seen.add(id);
    (isVisible(el) ? visible : hidden).push(id);
  });
  return [...visible, ...hidden].slice(0, limit);
}

function notFound(): Record<string, unknown> {
  return { ok: false, error: 'Element not found', available: availableTargetIds(40) };
}

function targetLabel(el: Element): string {
  const direct = el.getAttribute('data-assist-label') || el.getAttribute('aria-label');
  if (direct) return clean(direct, 60);
  // Form controls have no useful innerText — use their <label>/placeholder/name.
  if (isFormEl(el)) return fieldLabel(el);
  return clean(textOf(el), 60);
}

function fieldLabel(el: FormEl): string {
  const assist = el.getAttribute('data-assist-label');
  if (assist) return clean(assist, 60);
  let labelText = '';
  if (el.labels && el.labels.length) {
    labelText = textOf(el.labels[0]);
  } else if (el.id) {
    const l = document.querySelector(`label[for="${attrEscape(el.id)}"]`);
    if (l) labelText = textOf(l);
  }
  if (!labelText) {
    const wrap = el.closest('label');
    if (wrap) labelText = textOf(wrap);
  }
  labelText = clean(labelText, 60).replace(/\s*\*\s*$/, '');
  if (labelText) return labelText;
  return clean(
    el.getAttribute('aria-label') ||
      (el as HTMLInputElement).placeholder ||
      el.getAttribute('name') ||
      el.id,
    60,
  );
}

function fieldType(el: FormEl): string {
  if (el instanceof HTMLSelectElement) return 'select';
  if (el instanceof HTMLTextAreaElement) return 'textarea';
  return (el.type || 'text').toLowerCase();
}

function fieldValue(el: FormEl): string {
  if (el instanceof HTMLSelectElement) {
    const opt = el.selectedOptions?.[0] ?? el.options[el.selectedIndex];
    return opt ? clean(opt.text, 120) : '';
  }
  if (el instanceof HTMLTextAreaElement) return clean(el.value, 200);
  const type = (el.type || '').toLowerCase();
  if (type === 'password') return '';
  if (type === 'file') return el.files ? Array.from(el.files).map((f) => f.name).join(', ') : '';
  if (type === 'checkbox' || type === 'radio') return el.checked ? 'checked' : 'unchecked';
  return clean(el.value, 200);
}

/* ------------------------------------------------------------------ */
/* Snapshot                                                            */
/* ------------------------------------------------------------------ */

function currentPath(): string {
  return typeof location !== 'undefined' ? location.pathname : '';
}

function collectHeadings(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const el of Array.from(document.querySelectorAll('h1, h2, h3'))) {
    if (out.length >= 15) break;
    if (isIgnored(el) || !isVisible(el)) continue;
    const t = clean(textOf(el), 80);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function collectTitle(): string {
  const docTitle = clean(document.title, 100);
  const h1El = Array.from(document.querySelectorAll('main h1, h1')).find((e) => !isIgnored(e) && isVisible(e));
  const h1 = h1El ? clean(textOf(h1El), 80) : '';
  if (h1 && h1 !== docTitle) return docTitle ? `${docTitle} — ${h1}` : h1;
  return docTitle;
}

function collectTargets(): PageSnapshot['targets'] {
  const map = new Map<string, { id: string; label: string; visible: boolean }>();
  for (const el of Array.from(document.querySelectorAll('[data-assist-id]'))) {
    if (isIgnored(el)) continue;
    const id = el.getAttribute('data-assist-id') || '';
    if (!id) continue;
    const vis = isVisible(el);
    const existing = map.get(id);
    if (existing) {
      // Prefer the visible instance's label when duplicates exist.
      if (!existing.visible && vis) map.set(id, { id, label: targetLabel(el), visible: true });
      continue;
    }
    if (map.size >= 80) continue;
    map.set(id, { id, label: targetLabel(el), visible: vis });
  }
  return Array.from(map.values());
}

function collectFields(): PageSnapshot['fields'] {
  const out: PageSnapshot['fields'] = [];
  const seen = new Set<string>();

  // Wrappers (e.g. AutocompleteInput) carrying data-assist-id around the real control.
  // Only treat a wrapper as a field when its id starts with "field-" or it wraps exactly one control,
  // so section containers with many inputs aren't mistaken for a single field.
  const wrapped = new Map<Element, { id: string; label: string }>();
  for (const w of Array.from(document.querySelectorAll('[data-assist-id]'))) {
    if (isFormEl(w) || isIgnored(w)) continue;
    const id = w.getAttribute('data-assist-id') || '';
    const controls = w.querySelectorAll('input:not([type="hidden"]), select, textarea');
    if (!id || !controls.length) continue;
    if (!id.startsWith('field-') && controls.length !== 1) continue;
    const ctrl = innerControl(w);
    if (!ctrl || wrapped.has(ctrl)) continue;
    const wl = w.getAttribute('data-assist-label');
    wrapped.set(ctrl, { id, label: wl ? clean(wl, 60) : fieldLabel(ctrl) });
  }

  for (const node of Array.from(document.querySelectorAll('input, select, textarea'))) {
    if (out.length >= 40) break;
    const el = node as FormEl;
    if (isIgnored(el)) continue;
    const wrap = wrapped.get(el);
    const assistId = el.getAttribute('data-assist-id') || wrap?.id;
    if (!assistId && !el.id) continue;
    const type = fieldType(el);
    if (type === 'hidden' || el.disabled || (el as HTMLElement).hidden) continue;
    // File inputs are commonly visually hidden behind a styled drop zone — keep them.
    if (type !== 'file' && !isVisible(el)) continue;
    const id = assistId || el.id;
    if (seen.has(id)) continue;
    seen.add(id);
    const field: PageSnapshot['fields'][number] = {
      id,
      label: el.getAttribute('data-assist-label') ? fieldLabel(el) : wrap?.label ?? fieldLabel(el),
      type,
      value: fieldValue(el),
      required: el.required || el.getAttribute('aria-required') === 'true',
    };
    if (el instanceof HTMLSelectElement) {
      field.options = Array.from(el.options)
        .slice(0, 20)
        .map((o) => clean(o.text, 60));
    }
    out.push(field);
  }
  return out;
}

function nearForm(el: Element): boolean {
  if (el.closest('form')) return true;
  let p: Element | null = el.parentElement;
  for (let i = 0; i < 4 && p; i++, p = p.parentElement) {
    if (p.querySelector('input, select, textarea')) return true;
  }
  return false;
}

function collectAlerts(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (el: Element) => {
    if (out.length >= 5) return;
    if (isIgnored(el) || el.id === '__next-route-announcer__' || !isVisible(el)) return;
    const t = clean(textOf(el), 120);
    if (!t || t.length < 2 || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };
  document.querySelectorAll('[role="alert"], [role="status"]').forEach(push);
  document.querySelectorAll('p[class*="text-red-"], span[class*="text-red-"], div[class*="text-red-"]').forEach((el) => {
    // Skip containers whose red text is really a nested alert already captured, and non-form red text (prices etc.)
    if (el.closest('[role="alert"], [role="status"]')) return;
    if (!nearForm(el)) return;
    push(el);
  });
  return out;
}

export function getPageSnapshot(): PageSnapshot {
  if (typeof document === 'undefined') {
    return { path: '', title: '', headings: [], targets: [], fields: [], alerts: [] };
  }
  return {
    path: currentPath(),
    title: collectTitle(),
    headings: collectHeadings(),
    targets: collectTargets(),
    fields: collectFields(),
    alerts: collectAlerts(),
  };
}

/* ------------------------------------------------------------------ */
/* Spotlight overlay                                                   */
/* ------------------------------------------------------------------ */

const BRAND = '#3B82F6';
const STYLE_ID = 'ria-spotlight-style';
const PAD = 8;
const AUTO_CLEAR_MS = 10_000;

interface Spotlight {
  container: HTMLDivElement;
  stop: () => void;
  timer: ReturnType<typeof setTimeout>;
}

let active: Spotlight | null = null;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
@keyframes ria-spot-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(59,130,246,0.55), 0 0 18px 2px rgba(59,130,246,0.45); }
  70%  { box-shadow: 0 0 0 10px rgba(59,130,246,0), 0 0 24px 4px rgba(59,130,246,0.25); }
  100% { box-shadow: 0 0 0 0 rgba(59,130,246,0), 0 0 18px 2px rgba(59,130,246,0.45); }
}
@keyframes ria-spot-fade { from { opacity: 0; } to { opacity: 1; } }
.ria-spot-root { animation: ria-spot-fade 180ms ease-out; }
.ria-spot-ring { animation: ria-spot-pulse 1.6s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ria-spot-root, .ria-spot-ring { animation: none !important; }
}`;
  document.head.appendChild(style);
}

function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

/**
 * Track an element's bounding rect every animation frame (plus scroll/resize).
 * Calls `onRect` when it changes and `onGone` once the element leaves the DOM.
 */
function trackRect(el: Element, onRect: (r: DOMRect | null) => void, onGone: () => void): () => void {
  let raf = 0;
  let stopped = false;
  let last = '';
  const tick = () => {
    if (stopped) return;
    if (!el.isConnected) {
      stop();
      onGone();
      return;
    }
    const r = el.getBoundingClientRect();
    const zero = r.width === 0 && r.height === 0;
    const key = zero ? 'zero' : `${r.left}|${r.top}|${r.width}|${r.height}|${innerWidth}|${innerHeight}`;
    if (key !== last) {
      last = key;
      onRect(zero ? null : r);
    }
  };
  const loop = () => {
    tick();
    if (!stopped) raf = requestAnimationFrame(loop);
  };
  const onEvt = () => tick();
  window.addEventListener('scroll', onEvt, true);
  window.addEventListener('resize', onEvt);
  raf = requestAnimationFrame(loop);
  tick();
  function stop() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('scroll', onEvt, true);
    window.removeEventListener('resize', onEvt);
  }
  return stop;
}

function baseFixed(div: HTMLElement, z = 9500): void {
  div.setAttribute(OVERLAY_ATTR, '');
  div.setAttribute('aria-hidden', 'true');
  Object.assign(div.style, {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: String(z),
  });
}

function showSpotlight(el: HTMLElement, caption?: string): void {
  clearHighlight();
  ensureStyle();

  const container = document.createElement('div');
  baseFixed(container);
  container.className = 'ria-spot-root';

  const hole = document.createElement('div');
  Object.assign(hole.style, {
    position: 'absolute',
    borderRadius: '12px',
    boxShadow: '0 0 0 9999px rgba(15,23,42,0.45)',
    pointerEvents: 'none',
  });

  const ring = document.createElement('div');
  ring.className = 'ria-spot-ring';
  Object.assign(ring.style, {
    position: 'absolute',
    borderRadius: '12px',
    border: `3px solid ${BRAND}`,
    boxSizing: 'border-box',
    pointerEvents: 'none',
  });

  container.appendChild(hole);
  container.appendChild(ring);

  let bubble: HTMLDivElement | null = null;
  const text = (caption ?? '').trim();
  if (text) {
    const dark = isDark();
    bubble = document.createElement('div');
    Object.assign(bubble.style, {
      position: 'absolute',
      maxWidth: '260px',
      padding: '8px 12px',
      borderRadius: '10px',
      background: dark ? '#0F172A' : '#FFFFFF',
      color: dark ? '#FFFFFF' : '#0F172A',
      border: dark ? '1px solid rgba(148,163,184,0.25)' : '1px solid rgba(15,23,42,0.08)',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25), 0 4px 10px -6px rgba(0,0,0,0.2)',
      fontSize: '13px',
      lineHeight: '1.4',
      fontFamily: 'inherit',
      pointerEvents: 'none',
      boxSizing: 'border-box',
    });
    const tag = document.createElement('div');
    tag.textContent = 'Ria';
    Object.assign(tag.style, {
      color: BRAND,
      fontSize: '11px',
      fontWeight: '700',
      letterSpacing: '0.04em',
      marginBottom: '2px',
    });
    const body = document.createElement('div');
    body.textContent = text.slice(0, 300);
    bubble.appendChild(tag);
    bubble.appendChild(body);
    container.appendChild(bubble);
  }

  document.body.appendChild(container);

  const place = (r: DOMRect | null) => {
    if (!r) {
      container.style.visibility = 'hidden';
      return;
    }
    container.style.visibility = 'visible';
    const left = r.left - PAD;
    const top = r.top - PAD;
    const width = r.width + PAD * 2;
    const height = r.height + PAD * 2;
    for (const box of [hole, ring]) {
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;
    }
    if (bubble) {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const bw = bubble.offsetWidth;
      const bh = bubble.offsetHeight;
      const gap = 10;
      let by = top + height + gap;
      if (by + bh > vh - 8 && top - gap - bh >= 8) by = top - gap - bh;
      by = Math.max(8, Math.min(by, vh - bh - 8));
      let bx = left;
      bx = Math.max(8, Math.min(bx, vw - bw - 8));
      bubble.style.left = `${bx}px`;
      bubble.style.top = `${by}px`;
    }
  };

  const spot: Spotlight = {
    container,
    stop: () => {},
    timer: setTimeout(() => {
      if (active === spot) clearHighlight();
    }, AUTO_CLEAR_MS),
  };
  active = spot;
  spot.stop = trackRect(el, place, () => {
    if (active === spot) clearHighlight();
  });
}

export function clearHighlight(): void {
  if (!active) return;
  const s = active;
  active = null;
  clearTimeout(s.timer);
  s.stop();
  s.container.remove();
}

/** Brief ring (no dimming) around a field after it was filled; independent of the spotlight. */
function flashField(el: HTMLElement, ms = 1500): void {
  ensureStyle();
  const container = document.createElement('div');
  baseFixed(container);
  container.className = 'ria-spot-root';
  const ring = document.createElement('div');
  ring.className = 'ria-spot-ring';
  Object.assign(ring.style, {
    position: 'absolute',
    borderRadius: '10px',
    border: `3px solid ${BRAND}`,
    boxSizing: 'border-box',
    pointerEvents: 'none',
  });
  container.appendChild(ring);
  document.body.appendChild(container);
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    stop();
    container.remove();
  };
  const stop = trackRect(
    el,
    (r) => {
      if (!r) {
        container.style.visibility = 'hidden';
        return;
      }
      container.style.visibility = 'visible';
      ring.style.left = `${r.left - 4}px`;
      ring.style.top = `${r.top - 4}px`;
      ring.style.width = `${r.width + 8}px`;
      ring.style.height = `${r.height + 8}px`;
    },
    finish,
  );
  setTimeout(finish, ms);
}

/* ------------------------------------------------------------------ */
/* Tools                                                               */
/* ------------------------------------------------------------------ */

function normalizePath(p: string): string {
  const noQuery = p.split(/[?#]/)[0] || '/';
  return noQuery.length > 1 ? noQuery.replace(/\/+$/, '') : noQuery;
}

async function toolNavigate(args: Record<string, any>, deps: UiToolDeps): Promise<Record<string, unknown>> {
  const raw = typeof args.path === 'string' ? args.path.trim() : '';
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
    return { ok: false, error: 'Path must be a relative app path starting with "/"' };
  }
  let url: URL;
  try {
    url = new URL(raw, location.origin);
  } catch {
    return { ok: false, error: 'Invalid path' };
  }
  if (url.origin !== location.origin) return { ok: false, error: 'Only same-site paths are allowed' };
  const lower = url.pathname.toLowerCase();
  if (lower.startsWith('/dashboard/admin') || lower.startsWith('/api')) {
    return { ok: false, error: 'That area is not available to the assistant' };
  }

  const fullPath = url.pathname + url.search + url.hash;
  const want = normalizePath(url.pathname);
  const startPath = normalizePath(deps.getPath());

  clearHighlight();
  deps.navigate(fullPath);

  const deadline = Date.now() + 6000;
  let matched = false;
  let lastSeen = startPath;
  let stableSince = Date.now();
  while (Date.now() < deadline) {
    const now = normalizePath(deps.getPath());
    if (now === want) {
      matched = true;
      break;
    }
    if (now !== lastSeen) {
      lastSeen = now;
      stableSince = Date.now();
    } else if (now !== startPath && Date.now() - stableSince > 1500) {
      // Landed somewhere else (e.g. auth redirect) and stayed there — stop waiting.
      break;
    }
    await sleep(100);
  }

  if (!matched) {
    const actual = deps.getPath();
    const res: Record<string, unknown> = { ok: false, error: 'Navigation did not complete', path: actual };
    if (normalizePath(actual).startsWith('/auth/login')) {
      res.hint = 'Redirected to the login page — the user needs to sign in first';
    }
    return res;
  }

  const readyDeadline = Date.now() + 4000;
  while (document.readyState !== 'complete' && Date.now() < readyDeadline) await sleep(100);
  await sleep(600);

  const snap = getPageSnapshot();
  return {
    ok: true,
    path: deps.getPath(),
    page: { title: snap.title, headings: snap.headings, targets: snap.targets },
  };
}

function toolHighlight(args: Record<string, any>): Record<string, unknown> {
  const target = String(args.target ?? '').trim();
  const el = findTarget(target);
  if (!el) return notFound();
  const shown = visibleStandIn(el);
  shown.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const caption = typeof args.caption === 'string' ? args.caption : undefined;
  showSpotlight(shown, caption);
  return { ok: true, target, label: targetLabel(el) };
}

function getScrollContainer(): HTMLElement | Window {
  const doc = document.scrollingElement || document.documentElement;
  if (doc.scrollHeight > window.innerHeight + 4) return window;
  // App-shell layouts sometimes scroll an inner element instead of the window.
  const main = document.querySelector('main');
  for (let p: HTMLElement | null = main; p && p !== document.body; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 4) return p;
  }
  return window;
}

function toolScrollTo(args: Record<string, any>): Record<string, unknown> {
  const target = String(args.target ?? '').trim();
  const dir = target.toLowerCase();
  if (dir === 'up' || dir === 'down' || dir === 'top' || dir === 'bottom') {
    const sc = getScrollContainer();
    if (dir === 'up' || dir === 'down') {
      const delta = Math.round(window.innerHeight * 0.7) * (dir === 'up' ? -1 : 1);
      sc.scrollBy({ top: delta, behavior: 'smooth' });
    } else {
      const max =
        sc === window
          ? (document.scrollingElement || document.documentElement).scrollHeight
          : (sc as HTMLElement).scrollHeight;
      sc.scrollTo({ top: dir === 'top' ? 0 : max, behavior: 'smooth' });
    }
    return { ok: true };
  }
  const el = findTarget(target);
  if (!el) return notFound();
  visibleStandIn(el).scrollIntoView({ behavior: 'smooth', block: 'center' });
  return { ok: true };
}

function normalizeDate(v: string): string | null {
  const s = v.trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  let y: number, mo: number, d: number;
  if (m) {
    y = +m[1];
    mo = +m[2];
    d = +m[3];
  } else {
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (!m) return null;
    d = +m[1];
    mo = +m[2];
    y = +m[3];
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
}

function truthy(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  return /^(true|yes|y|on|1|checked|check|tick|ticked|agree|accept|accepted)$/i.test(String(v ?? '').trim());
}

async function toolFillField(args: Record<string, any>): Promise<Record<string, unknown>> {
  const field = String(args.field ?? '').trim();
  const rawValue = args.value;
  const value = rawValue == null ? '' : String(rawValue);

  let el: Element | null = findTarget(field);
  if (!el) return notFound();
  if (!isFormEl(el)) {
    // A wrapper carrying the data-assist-id — use the first usable control inside it.
    const inner = innerControl(el);
    if (!inner) return { ok: false, error: 'Target is not a form field' };
    el = inner;
  }
  const input = el as FormEl;
  const type = fieldType(input);

  if (type === 'password') return { ok: false, error: 'Passwords must be typed by the user' };
  if (type === 'file') {
    return { ok: false, error: 'Files must be chosen by the user — highlight the upload box instead' };
  }
  if (input.disabled) return { ok: false, error: 'Field is disabled' };
  if (!(input instanceof HTMLSelectElement) && input.readOnly) return { ok: false, error: 'Field is read-only' };

  if (!isVisible(input) || input.getBoundingClientRect().bottom < 0 || input.getBoundingClientRect().top > innerHeight) {
    visibleStandIn(input).scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (input instanceof HTMLSelectElement) {
    const q = value.trim().toLowerCase();
    const opts = Array.from(input.options);
    const match =
      opts.find((o) => o.value.toLowerCase() === q) ||
      opts.find((o) => clean(o.text, 500).toLowerCase() === q) ||
      (q
        ? opts.find((o) => o.value && clean(o.text, 500).toLowerCase().includes(q)) ||
          opts.find((o) => o.value && o.value.toLowerCase().includes(q)) ||
          opts.find((o) => o.value && q.includes(clean(o.text, 500).toLowerCase()) && o.text.trim().length > 1)
        : undefined);
    if (!match) {
      return {
        ok: false,
        error: 'No matching option',
        options: opts.slice(0, 20).map((o) => clean(o.text, 60)),
      };
    }
    setNativeValue(input, match.value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    flashField(visibleStandIn(input));
    await sleep(60);
    const sel = input.options[input.selectedIndex];
    return { ok: true, field, value: input.value, selected: sel ? clean(sel.text, 60) : '' };
  }

  if (input instanceof HTMLInputElement && (type === 'checkbox' || type === 'radio')) {
    let box: HTMLInputElement = input;
    if (type === 'radio' && input.name && value.trim()) {
      // Pick the radio in the group whose value/label matches.
      const q = value.trim().toLowerCase();
      const group = Array.from(
        document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${attrEscape(input.name)}"]`),
      );
      const hit =
        group.find((r) => r.value.toLowerCase() === q) ||
        group.find((r) => fieldLabel(r).toLowerCase() === q) ||
        group.find((r) => fieldLabel(r).toLowerCase().includes(q));
      if (hit) box = hit;
      else if (!truthy(value)) {
        return { ok: false, error: 'No matching option', options: group.map((r) => fieldLabel(r) || r.value) };
      }
      if (!box.checked) box.click();
    } else {
      const want = truthy(rawValue);
      if (box.checked !== want) box.click();
    }
    flashField(visibleStandIn(box));
    await sleep(60);
    return { ok: true, field, value: box.checked ? 'checked' : 'unchecked' };
  }

  let toSet = value;
  if (type === 'date') {
    const d = normalizeDate(value);
    if (!d) return { ok: false, error: 'Date must be YYYY-MM-DD' };
    toSet = d;
  }

  setNativeValue(input as HTMLInputElement | HTMLTextAreaElement, toSet);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  flashField(visibleStandIn(input));
  // Let React re-render so we report the value the controlled input actually kept.
  await sleep(60);
  return { ok: true, field, value: input.value };
}

export async function runUiTool(
  name: string,
  args: Record<string, any>,
  deps: UiToolDeps,
): Promise<Record<string, unknown>> {
  try {
    if (typeof document === 'undefined') return { ok: false, error: 'Not available outside the browser' };
    const a = args ?? {};
    switch (name as UiToolName) {
      case 'read_page':
        return { ok: true, ...getPageSnapshot() };
      case 'navigate':
        return await toolNavigate(a, deps);
      case 'highlight':
        return toolHighlight(a);
      case 'clear_highlight':
        clearHighlight();
        return { ok: true };
      case 'scroll_to':
        return toolScrollTo(a);
      case 'fill_field':
        return await toolFillField(a);
      default:
        return { ok: false, error: 'Unknown tool' };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
