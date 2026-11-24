import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  dismissible?: boolean;
  maxWidthClass?: string;
  children: ReactNode;
}

export function ModalDialog({
  open,
  onClose,
  title,
  subtitle,
  dismissible = true,
  maxWidthClass = 'max-w-lg',
  children,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const pressedOutsideRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Fallback for browsers without native closedby="any" (e.g. Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !dismissible) return;
    if ('closedBy' in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      pressedOutsideRef.current = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutsideRef.current && isOutside(e)) {
        dialog.close();
      }
      pressedOutsideRef.current = false;
    };

    dialog.addEventListener('pointerdown', onPointerDown);
    dialog.addEventListener('pointerup', onPointerUp);
    return () => {
      dialog.removeEventListener('pointerdown', onPointerDown);
      dialog.removeEventListener('pointerup', onPointerUp);
    };
  }, [dismissible]);

  const handleCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    if (!dismissible) {
      e.preventDefault();
      return;
    }
    onClose();
  };

  const handleClose = () => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.returnValue = '';
    }
    if (dismissible && open) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClose={handleClose}
      {...({ closedby: dismissible ? 'any' : 'none' } as Record<string, string>)}
      className={`w-[calc(100%-2rem)] ${maxWidthClass} rounded-2xl border p-0`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-4">
        <div>
          <h1 id={titleId} className="text-lg font-bold text-[var(--text-primary)]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{subtitle}</p>
          )}
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </dialog>
  );
}
