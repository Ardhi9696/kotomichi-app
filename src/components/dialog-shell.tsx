'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function DialogShell({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-ink-950/60" onClick={onClose} />
      <div className="relative max-h-[90dvh] w-full max-w-md animate-modal-in overflow-hidden rounded-2xl p-[2px] shadow-card">
        <div aria-hidden="true" className="absolute -inset-1/2 animate-shimmer shimmer-border-bg" />
        <div className="relative rounded-[15px] bg-washi-50 dark:bg-ink-900">
          <div className="flex items-center justify-between border-b border-ink-200 px-5 py-4 dark:border-ink-800">
            <h2 className="font-serif text-lg font-bold text-ink-900 dark:text-washi-50">{title}</h2>
            <button type="button" className="btn-ghost" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}