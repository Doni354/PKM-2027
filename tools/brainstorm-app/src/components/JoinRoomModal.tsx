import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { ModalDialog } from './ModalDialog';
import { DEFAULT_ROOM_ID } from '../data/pkmStarterData';
import { sanitizeRoomId } from '../lib/roomSync';

interface JoinRoomModalProps {
  open: boolean;
  initialName: string;
  initialRoomId: string;
  canDismiss: boolean;
  onClose: () => void;
  onJoin: (name: string, roomId: string) => void;
}

const TEAM_PRESETS = ['Aidil', 'Daffa', 'Nathania', 'Tirmidzy', 'Syahril'];

export function JoinRoomModal({
  open,
  initialName,
  initialRoomId,
  canDismiss,
  onClose,
  onJoin,
}: JoinRoomModalProps) {
  const [name, setName] = useState(initialName);
  const [roomId, setRoomId] = useState(initialRoomId || DEFAULT_ROOM_ID);
  const [nameTouched, setNameTouched] = useState(false);

  const trimmedName = name.trim();
  const isNameInvalid = nameTouched && trimmedName.length < 2;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setNameTouched(true);
    if (trimmedName.length < 2) return;
    onJoin(trimmedName, sanitizeRoomId(roomId || DEFAULT_ROOM_ID));
  };

  return (
    <ModalDialog
      open={open}
      onClose={onClose}
      dismissible={canDismiss}
      title="Masuk ke Idea Studio"
      subtitle="Ruang brainstorming bareng tim secara real-time. Tulis ide bebas, bedah bareng, lalu matangkan."
      maxWidthClass="max-w-md"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label
            htmlFor="join-name-input"
            className="block text-sm font-semibold text-[var(--text-primary)]"
          >
            Nama Anda
          </label>
          <span id="join-name-hint" className="mt-0.5 block text-xs text-[var(--text-muted)]">
            Muncul di kursor live, sticky notes, dan komentar diskusi.
          </span>
          <input
            id="join-name-input"
            type="text"
            required
            minLength={2}
            maxLength={32}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameTouched(true)}
            aria-invalid={isNameInvalid ? 'true' : 'false'}
            aria-describedby={
              isNameInvalid ? 'join-name-hint join-name-error' : 'join-name-hint'
            }
            placeholder="Ketik nama panggilan..."
            className={`pkm-field-input mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--bg-surface)] ${
              isNameInvalid ? 'user-invalid-fallback' : ''
            }`}
          />
          <div
            id="join-name-error"
            className="pkm-field-error mt-1.5 items-center gap-1.5 text-xs font-medium text-rose-500"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Error: Masukkan nama minimal 2 karakter.</span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {TEAM_PRESETS.map((member) => {
              const active = name.trim().toLowerCase() === member.toLowerCase();
              return (
                <button
                  key={member}
                  type="button"
                  onClick={() => {
                    setName(member);
                    setNameTouched(false);
                  }}
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition ${
                    active
                      ? 'border-[var(--btn-solid-bg)] bg-[var(--btn-solid-bg)] text-[var(--btn-solid-fg)]'
                      : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {member}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="join-room-input"
            className="block text-sm font-semibold text-[var(--text-primary)]"
          >
            Room ID
          </label>
          <span id="join-room-hint" className="mt-0.5 block text-xs text-[var(--text-muted)]">
            Samakan Room ID agar terhubung ke papan yang sama (default:{' '}
            <code className="font-mono-code text-[var(--text-secondary)]">pkm-ki-2027</code>).
          </span>
          <input
            id="join-room-input"
            type="text"
            required
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            aria-describedby="join-room-hint"
            placeholder="pkm-ki-2027"
            className="font-mono-code mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
          />
        </div>

        <div className="flex items-center justify-end pt-1">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--btn-solid-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--btn-solid-fg)] transition hover:bg-[var(--btn-solid-hover)]"
          >
            <span>Mulai Brainstorming</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </ModalDialog>
  );
}
