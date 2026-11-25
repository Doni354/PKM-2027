import { GitBranch, Layers, StickyNote } from 'lucide-react';
import { STARTER_OPTIONS } from '../data/pkmStarterData';
import type { StarterOption } from '../types';
import { ModalDialog } from './ModalDialog';

interface InspirasiModalProps {
  open: boolean;
  onClose: () => void;
  onDropToFreeCanvas: (opt: StarterOption) => Promise<void>;
  onOpenOptionInStage: (opt: StarterOption, stage: 'mindmap' | 'canvas') => Promise<void>;
  onRestoreStarterIdeas: () => Promise<void>;
}

export function InspirasiModal({
  open,
  onClose,
  onDropToFreeCanvas,
  onOpenOptionInStage,
  onRestoreStarterIdeas,
}: InspirasiModalProps) {
  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      title="Alur 5 Tahap & Opsi Pemantik Awal"
      subtitle="Referensi pemantik dari 01-evaluasi-draft-lama.md. Setiap ide berjalan mandiri tanpa saling menimpa."
      maxWidthClass="max-w-3xl"
    >
      <div className="space-y-5">
        {/* Clean 5-step Double Diamond workflow overview */}
        <div className="grid gap-2.5 rounded-2xl border border-[var(--border)] bg-[var(--bg-subtle)] p-3.5 text-xs sm:grid-cols-5">
          <div>
            <p className="font-bold text-[var(--text-primary)]">1. Ruang Ide</p>
            <p className="mt-0.5 text-[var(--text-secondary)]">
              Eksplorasi bebas sticky notes & gambar referensi.
            </p>
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">2. Bedah</p>
            <p className="mt-0.5 text-[var(--text-secondary)]">
              Urai 4 pilar per ide → sintetis Akar Masalah.
            </p>
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">3. Mindmap</p>
            <p className="mt-0.5 text-[var(--text-secondary)]">
              Akar Masalah → Solusi → 3 Indikator Ukur per ide.
            </p>
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">4. Ide Matang</p>
            <p className="mt-0.5 text-[var(--text-secondary)]">
              Tarik otomatis ke blueprint & keberlanjutan per ide.
            </p>
          </div>
          <div>
            <p className="font-bold text-[var(--text-primary)]">5. Hasil</p>
            <p className="mt-0.5 text-[var(--text-secondary)]">
              Preview, bandingkan & pilih ide terbaik tim.
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
                    await onOpenOptionInStage(opt, 'mindmap');
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                  <span>Buka Mindmap Ide Ini</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await onOpenOptionInStage(opt, 'canvas');
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Buka Blueprint Ide Ini</span>
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-xs">
          <span className="text-[var(--text-muted)]">
            Ingin memulihkan 3 ide pemantik lengkap (Bedah + Mindmap + Blueprint)?
          </span>
          <button
            type="button"
            onClick={async () => {
              await onRestoreStarterIdeas();
              onClose();
            }}
            className="rounded-full border border-[var(--border)] px-3 py-1 font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            Pulihkan 3 Ide Pemantik
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
