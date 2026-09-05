'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';

export type FlashVariant = 'success' | 'error';

interface FlashItem {
  id: number;
  variant: FlashVariant;
  message: string;
}

interface FlashApi {
  show: (variant: FlashVariant, message: string) => void;
}

const FlashContext = createContext<FlashApi | null>(null);

const AUTO_DISMISS_MS = 5000;

export function useFlash(): FlashApi {
  const ctx = useContext(FlashContext);
  if (!ctx) throw new Error('useFlash must be used within a <FlashProvider>');
  return ctx;
}

export function FlashProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<FlashItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const show = useCallback(
    (variant: FlashVariant, message: string) => {
      const id = ++idRef.current;
      setItems((prev) => [...prev, { id, variant, message }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  return (
    <FlashContext.Provider value={{ show }}>
      {children}
      <FlashRegion items={items} onDismiss={dismiss} />
    </FlashContext.Provider>
  );
}

function FlashRegion({ items, onDismiss }: { items: FlashItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-72 flex-col gap-2" aria-live="polite">
      {items.map((item) => (
        <FlashToast key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function FlashToast({ item, onDismiss }: { item: FlashItem; onDismiss: (id: number) => void }) {
  const variantClass =
    item.variant === 'success'
      ? 'border-emerald-500/60 text-emerald-700 dark:text-emerald-300'
      : 'border-shu-500/60 text-shu-600 dark:text-shu-300';

  return (
    <div
      role="status"
      className={`pointer-events-auto flex animate-flash-in items-start justify-between gap-3 rounded-xl border bg-washi-50/95 p-3 text-sm shadow-card backdrop-blur dark:bg-ink-900/95 ${variantClass}`}
    >
      <span className="leading-snug">{item.message}</span>
      <button
        type="button"
        className="-m-1 shrink-0 rounded-md p-1 opacity-50 transition-opacity hover:opacity-100"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}