'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-ink-950/60" onClick={onCancel} />
      <div className="relative w-full max-w-sm animate-modal-in overflow-hidden rounded-2xl p-[2px] shadow-card">
        <div aria-hidden="true" className="absolute -inset-1/2 animate-shimmer shimmer-border-bg" />
        <div className="relative rounded-[15px] bg-washi-50 p-6 dark:bg-ink-900">
          <h2 className="font-serif text-lg font-bold text-ink-900 dark:text-washi-50">{title}</h2>
          {description && (
            <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">{description}</p>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`btn ${
                danger ? 'bg-shu-500 text-washi-50 hover:bg-shu-400' : 'btn-primary'
              }`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}