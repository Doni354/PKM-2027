import { GitBranch, Layers, StickyNote } from 'lucide-react';
import { STARTER_OPTIONS } from '../data/pkmStarterData';
import type { StarterOption } from '../types';
import { ModalDialog } from './ModalDialog';

interface InspirasiModalProps {
  open: boolean;
  onClose: () => void;
  onDropToFreeCanvas: (opt: StarterOption) => Promise<void>;
  onLoadToMindmap: (opt: StarterOption) => Promise<void>;
  onLoadToCanvas: (opt: StarterOption) => Promise<void>;
  onRestoreStarterCards: () => Promise<void>;
}

export function InspirasiModal({
  open,
  onClose,
  onDropToFreeCanvas,
  onLoadToMindmap,
  onLoadToCanvas,
  onRestoreStarterCards,
}: InspirasiModalProps) {
  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title="Inspirasi Awal & Alur Pematangan Ide"
      subtitle="Referensi pemantik dari 01-evaluasi-draft-lama.md. Bebas dipakai, dimodifikasi, atau dilewati."
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Clean 4-step workflow overview */}
        <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-3.5 text-xs sm:grid-cols-4">
          <div>
            <p className="font-bold text-[var(--text-primary)]">1. Ruang Ide</p>
            <p className="mt-0.5 text-[var(--text-secondary)]">
              Tulis ide liar bebas tanpa batas bidang/tema & diskusi via komentar.
            </p>
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">2. Bedah</p>
            <p className="mt-0.5 text-[var(--text-secondary)]">
              Urai & drag-drop kartu ke 4 kolom: masalah, urgensi, user, dan kebutuhan inti.
            </p>
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">3. Mindmap</p>
            <p className="mt-0.5 text-[var(--text-secondary)]">
              Petakan opsi solusi (tech/bisnis/sosial) dan indikator keterukuran.
            </p>
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">4. Ide Matang</p>
            <p className="mt-0.5 text-[var(--text-secondary)]">
              Sesuaikan ke track PKM apa saja, GEMASTIK, hackathon, atau startup + keberlanjutan.
            </p>
          </div>
        </div>

        {/* 3 Starter Options */}
        <div className="space-y-3">
          {STARTER_OPTIONS.map((opt) => (
            <article
              key={opt.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 transition hover:border-[var(--border-strong)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {opt.badge}
                </span>
                <span className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                  {opt.verdict}
                </span>
              </div>
              <h2 className="mt-1 text-sm font-bold text-[var(--text-primary)]">{opt.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                {opt.summaryProblem}
              </p>
              <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                <strong className="text-[var(--text-secondary)]">Solusi:</strong>{' '}
                {opt.summarySolution}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={async () => {
                    await onDropToFreeCanvas(opt);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--btn-solid-bg)] px-3 py-1 text-xs font-semibold text-[var(--btn-solid-fg)] transition hover:bg-[var(--btn-solid-hover)]"
                >
                  <StickyNote className="h-3.5 w-3.5" />
                  <span>Tempel ke Ruang Ide</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onLoadToMindmap(opt);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  <span>Buka Mindmap</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onLoadToCanvas(opt);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Muat ke Ide Matang</span>
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-xs">
          <span className="text-[var(--text-muted)]">
            Ingin memulihkan kartu starter 3 opsi di Tab 2 (Bedah)?
          </span>
          <button
            type="button"
            onClick={async () => {
              await onRestoreStarterCards();
              onClose();
            }}
            className="rounded-full border border-[var(--border)] px-3 py-1 font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            Pulihkan Starter Board
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
