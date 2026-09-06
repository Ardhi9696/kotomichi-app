'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Thin "virtual loading" bar pinned to the very top of the viewport. It starts
 * as soon as the user clicks an internal link (or navigates back/forward),
 * animates while the next route is being fetched + streamed by the server, then
 * completes once the new page commits. The bar is purely cosmetic — the real
 * heavy lifting (prefetch + `loading.tsx` fallbacks) happens in Next.js.
 */

const MIN_VISIBLE_MS = 400; // avoid a flashing bar on instant navigations
const MAX_LOADING_MS = 8_000; // safety net: never leave the bar spinning
const CURVE_MS = 700; // how fast progress ramps toward the "stuck" ceiling

function isInternalLinkClick(event: MouseEvent): boolean {
  if (event.defaultPrevented) return false;
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const target = event.target;
  if (!(target instanceof Element)) return false;
  const anchor = target.closest<HTMLAnchorElement>('a[href]');
  if (!anchor) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;
  const href = anchor.getAttribute('href') ?? '';
  if (!href || href.startsWith('#') || href.startsWith('//')) return false;
  if (!href.startsWith('/')) return false;
  return true;
}

export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<'idle' | 'loading' | 'done'>('idle');
  const [value, setValue] = useState(0);

  const location = `${pathname}${searchParams ? `?${searchParams.toString()}` : ''}`;

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const startedAtRef = useRef(0);
  const startHrefRef = useRef<string | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  }, []);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) window.clearTimeout(t);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  const complete = useCallback(() => {
    if (phaseRef.current === 'idle') return;
    clearTimers();
    setValue(100);
    setPhase('done');
    schedule(() => {
      setPhase('idle');
      setValue(0);
    }, 350);
  }, [clearTimers, schedule]);

  const begin = useCallback(
    (stayMs: number | null, href: string | null) => {
      if (phaseRef.current === 'loading') return;
      clearTimers();
      startedAtRef.current = Date.now();
      startHrefRef.current = href;
      setValue(0);
      setPhase('loading');
      if (stayMs !== null) schedule(complete, stayMs);
      else schedule(complete, MAX_LOADING_MS);
    },
    [complete, clearTimers, schedule],
  );

  // Start on internal link clicks (capture phase, before the router handles
  // them) and on browser back/forward.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isInternalLinkClick(event)) begin(null, window.location.pathname + window.location.search);
    };
    // On back/forward the location has already changed by the time popstate
    // fires, so there is no commit to wait for — just show a short pulse.
    const onPopState = () => begin(1200, null);
    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, [begin]);

  // Ramp progress while the phase is 'loading' (runs outside render, so it
  // can safely read Date.now()).
  useEffect(() => {
    if (phase !== 'loading') return;
    let raf = 0;
    const frame = () => {
      const elapsed = Date.now() - startedAtRef.current;
      const eased = 8 + 80 * (1 - Math.exp(-elapsed / CURVE_MS));
      setValue(Math.min(88, eased));
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Complete once the committed location differs from the one we started from.
  useEffect(() => {
    if (phaseRef.current !== 'loading') return;
    if (startHrefRef.current === null || location === startHrefRef.current) return;
    const elapsed = Date.now() - startedAtRef.current;
    if (elapsed < MIN_VISIBLE_MS) {
      schedule(complete, MIN_VISIBLE_MS - elapsed);
    } else {
      complete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  if (phase === 'idle') return null;

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-label="Loading next page"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60]"
    >
      <div
        className={`h-0.5 bg-gradient-to-r from-shu-500 via-shu-400 to-kintsugi-500 shadow-[0_0_8px_rgba(143,58,54,0.5)] transition-[width] duration-150 ease-out ${
          phase === 'done' ? 'opacity-0 transition-[width,opacity] duration-300' : 'opacity-100'
        }`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}