import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  Edit3,
  Plus,
  Trash2,
} from 'lucide-react';
import { computeIdeaMetrics } from '../lib/ideaSynthesis';
import type { BoardCard, FreeStickyNote, IdeaRecord } from '../types';
import { ModalDialog } from './ModalDialog';

interface IdeaSwitcherBarProps {
  ideas: IdeaRecord[];
  activeIdeaId: string;
  cards: BoardCard[];
  freeNotes: Record<string, FreeStickyNote>;
  onSelectIdea: (ideaId: string) => void;
  onCreateIdea: (name: string) => Promise<void>;
  onRenameIdea: (ideaId: string, nextName: string) => Promise<void>;
  onDeleteIdea: (ideaId: string) => Promise<void>;
  stageHint: string;
  nextCta?: {
    label: string;
    onClick: () => void;
  };
}

export function IdeaSwitcherBar({
  ideas,
  activeIdeaId,
  cards,
  freeNotes,
  onSelectIdea,
  onCreateIdea,
  onRenameIdea,
  onDeleteIdea,
  stageHint,
  nextCta,
}: IdeaSwitcherBarProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const activeIdea = ideas.find((i) => i.id === activeIdeaId) ?? ideas[0] ?? null;

  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await onCreateIdea(newName.trim());
      setNewName('');
      setCreateOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleRenameSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeIdea || !renameVal.trim()) return;
    setBusy(true);
    try {
      await onRenameIdea(activeIdea.id, renameVal.trim());
      setRenameOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="border-b border-[var(--border)] bg-[var(--bg-surface)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1680px] flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 sm:px-6">
          {/* Left: Switchable Idea Pills + Add New Idea */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Ide Aktif:
            </span>

            {ideas.map((idea) => {
              const isSelected = idea.id === activeIdea?.id;
              const metrics = computeIdeaMetrics(idea, cards, freeNotes);
              return (
                <button
                  key={idea.id}
                  type="button"
                  onClick={() => onSelectIdea(idea.id)}
                  className={`inline-flex max-w-[220px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                    isSelected
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] shadow-2xs'
                      : 'border-[var(--border)] bg-[var(--bg-subtle)]/70 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: idea.color }}
                  />
                  <span className="truncate font-semibold">{idea.name}</span>
                  <span className="font-mono-code shrink-0 text-[10px] text-[var(--text-muted)]">
                    {metrics.completenessPct}%
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setNewName('');
                setCreateOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border-strong)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ide Baru</span>
            </button>

            {activeIdea && (
              <div className="ml-1 flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setRenameVal(activeIdea.name);
                    setRenameOpen(true);
                  }}
                  title={`Ganti nama "${activeIdea.name}"`}
                  aria-label={`Ganti nama ide ${activeIdea.name}`}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                {ideas.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setDeleteOpen(true)}
                    title={`Hapus ide "${activeIdea.name}"`}
                    aria-label={`Hapus ide ${activeIdea.name}`}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-rose-500/12 hover:text-rose-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: Stage Hint + Next-Step Flow CTA */}
          <div className="flex items-center gap-3">
            <span className="hidden text-[11px] text-[var(--text-muted)] xl:inline">
              {stageHint}
            </span>
            {nextCta && activeIdea && (
              <button
                type="button"
                onClick={nextCta.onClick}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--btn-solid-bg)] px-3.5 py-1.5 text-xs font-semibold text-[var(--btn-solid-fg)] transition hover:bg-[var(--btn-solid-hover)]"
              >
                <span>{nextCta.label}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Create New Idea Dialog */}
      <ModalDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Buat Ide Baru"
        subtitle="Setiap ide memiliki 4 kolom Bedah, kanvas Mindmap, dan Blueprint Ide Matang sendiri."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="new-idea-name"
              className="block text-xs font-semibold text-[var(--text-primary)]"
            >
              Nama Singkat Ide
            </label>
            <input
              id="new-idea-name"
              type="text"
              required
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contoh: Aplikasi Deteksi Sampah Kampus, Alat Bantu Tunanetra..."
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="rounded-full bg-[var(--btn-solid-bg)] px-5 py-1.5 text-xs font-semibold text-[var(--btn-solid-fg)] hover:bg-[var(--btn-solid-hover)] disabled:opacity-50"
            >
              {busy ? 'Membuat...' : 'Buat Ide'}
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Rename Idea Dialog */}
      <ModalDialog
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Ubah Nama Ide"
        maxWidthClass="max-w-sm"
      >
        <form onSubmit={handleRenameSubmit} className="space-y-4">
          <input
            type="text"
            required
            autoFocus
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            aria-label="Nama baru ide"
            className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRenameOpen(false)}
              className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={busy || !renameVal.trim()}
              className="rounded-full bg-[var(--btn-solid-bg)] px-5 py-1.5 text-xs font-semibold text-[var(--btn-solid-fg)] disabled:opacity-50"
            >
              Simpan
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* Delete Idea Confirm Dialog */}
      <ModalDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Hapus ide ini?"
        maxWidthClass="max-w-sm"
      >
        {activeIdea && (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              Ide <strong className="text-[var(--text-primary)]">{activeIdea.name}</strong> beserta kartu Bedah, Mindmap, dan Blueprint miliknya akan dihapus untuk seluruh tim. Sticky note di Ruang Ide tetap aman.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => setDeleteOpen(false)}
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  setDeleteOpen(false);
                  await onDeleteIdea(activeIdea.id);
                }}
                className="rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Hapus Ide
              </button>
            </div>
          </div>
        )}
      </ModalDialog>
    </>
  );
}

