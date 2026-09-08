'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

import { bulkCreateVocabularyAction } from '@/app/actions/admin';
import { DialogShell } from '@/components/dialog-shell';
import { useFlash } from '@/components/flash-provider';
import { buildBulkRow, buildTemplateCsv, isValidRow, type BulkRowResult } from '@/lib/bulk-import';
import type { Deck } from '@/lib/domain';

export function VocabularyBulkModal({
  open,
  onClose,
  decks,
}: {
  open: boolean;
  onClose: () => void;
  decks: Deck[];
}) {
  const router = useRouter();
  const { show } = useFlash();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkRowResult[]>([]);
  const [fileName, setFileName] = useState('');
  const [deckIds, setDeckIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  if (!open || typeof document === 'undefined') return null;

  const validCount = rows.filter(isValidRow).length;
  const invalidCount = rows.length - validCount;

  const parseFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const first = wb.SheetNames[0];
    if (!first) return;
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[first], { defval: '' });
    setRows(raw.map((r, i) => buildBulkRow(r, i + 1)));
    setFileName(file.name);
  };

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vocab-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleDeck = (id: number) => {
    const next = new Set(deckIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDeckIds(next);
  };

  const submit = async () => {
    const validRows = rows.filter(isValidRow);
    if (validRows.length === 0) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.set(
        'payload',
        JSON.stringify({
          rows: validRows.map((r) => r.input),
          deckIds: [...deckIds],
        }),
      );
      const result = await bulkCreateVocabularyAction(fd);
      if (result.created > 0) {
        show(
          'success',
          `${result.created} kata berhasil ditambahkan${result.skipped ? `, ${result.skipped} dilewati.` : '.'}`,
        );
      } else if (result.errors.length > 0) {
        show('error', result.errors[0]);
      }
      if (result.skipped > 0) {
        show('error', `${result.skipped} baris dilewati karena tidak valid.`);
      }
      setRows([]);
      setFileName('');
      setDeckIds(new Set());
      onClose();
      router.refresh();
    } catch (err) {
      show('error', err instanceof Error ? err.message : 'Gagal mengimpor vocabulary.');
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <DialogShell open={open} onClose={onClose} title="Import vocabulary (CSV/Excel)">
      <div className="space-y-4">
        <p className="text-xs text-ink-500 dark:text-ink-400">
          Unggah file CSV atau Excel (satu baris = satu kata). Baris tanpa <span className="font-semibold text-shu-500">hiragana</span>{' '}
          yang valid akan dilewati.
        </p>

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void parseFile(f);
            }}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            Pilih file
          </button>
          <button type="button" className="btn-ghost text-xs" onClick={downloadTemplate}>
            Unduh template
          </button>
          {fileName && (
            <span className="truncate text-xs text-ink-500 dark:text-ink-400">{fileName}</span>
          )}
        </div>

        {rows.length > 0 && (
          <>
            <div className="text-xs text-ink-600 dark:text-ink-200">
              <span className="font-semibold text-emerald-600 dark:text-emerald-300">{validCount} valid</span>
              {invalidCount > 0 && (
                <span className="ml-3 font-semibold text-shu-500">{invalidCount} tidak valid</span>
              )}
            </div>

            <div className="max-h-64 overflow-auto rounded-xl border border-ink-200 dark:border-ink-800">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-washi-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
                  <tr>
                    <th className="px-2 py-1 text-left">#</th>
                    <th className="px-2 py-1 text-left">Kata</th>
                    <th className="px-2 py-1 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.line}
                      className={
                        isValidRow(r)
                          ? 'border-t border-ink-100 dark:border-ink-800'
                          : 'border-t border-ink-100 bg-shu-500/5 dark:border-ink-800'
                      }
                    >
                      <td className="px-2 py-1">{r.line}</td>
                      <td className="px-2 py-1">
                        {r.input?.kanji || r.input?.hiragana || '—'}
                      </td>
                      <td className="px-2 py-1">
                        {isValidRow(r) ? (
                          <span className="text-emerald-600 dark:text-emerald-300">OK</span>
                        ) : (
                          <span className="text-shu-600 dark:text-shu-300">{r.errors.join('; ')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {decks.length > 0 && (
              <div className="rounded-xl border border-ink-200 p-3 dark:border-ink-800">
                <h3 className="mb-2 text-sm font-semibold text-ink-700 dark:text-ink-200">
                  Tambahkan semua kata ke deck (opsional)
                </h3>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {decks.map((d) => (
                    <label key={d.id} className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
                      <input
                        type="checkbox"
                        checked={deckIds.has(d.id)}
                        onChange={() => toggleDeck(d.id)}
                        className="accent-shu-500"
                      />
                      {d.title}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
                Batal
              </button>
              <button
                type="button"
                className="btn-primary inline-flex items-center gap-2"
                disabled={busy || validCount === 0}
                onClick={() => void submit()}
              >
                {busy && (
                  <span
                    className="h-4 w-4 animate-spin rounded-full border-2 border-washi-50/40 border-t-washi-50"
                    aria-hidden="true"
                  />
                )}
                Import {validCount} kata
              </button>
            </div>
          </>
        )}
      </div>
    </DialogShell>,
    document.body,
  );
}
