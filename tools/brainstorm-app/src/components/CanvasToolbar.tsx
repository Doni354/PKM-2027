import { useEffect, useRef, type ReactNode } from 'react';

interface CanvasToolbarProps {
  ariaLabel: string;
  ariaControls?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Accessible horizontal toolbar following modern-web-guidance (focusgroup="toolbar wrap"
 * with roving tabindex fallback installed only when native focusgroup is unsupported).
 */
export function CanvasToolbar({
  ariaLabel,
  ariaControls,
  children,
  className = '',
}: CanvasToolbarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    if ('focusGroup' in HTMLElement.prototype) return;

    const getItems = () =>
      Array.from(
        bar.querySelectorAll<HTMLButtonElement>('button:not([hidden])')
      );

    const syncInitial = () => {
      const items = getItems();
      items.forEach((btn, idx) => {
        btn.tabIndex = idx === 0 ? 0 : -1;
      });
    };
    syncInitial();

    const onFocusIn = (e: FocusEvent) => {
      const items = getItems();
      const target = e.target as HTMLButtonElement | null;
      if (target && items.includes(target)) {
        items.forEach((b) => {
          b.tabIndex = b === target ? 0 : -1;
        });
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const items = getItems();
      if (items.length === 0) return;
      const current = document.activeElement as HTMLButtonElement | null;
      const idx = current ? items.indexOf(current) : -1;
      if (idx === -1) return;

      const rtl = getComputedStyle(bar).direction === 'rtl';
      let nextIdx = -1;

      if (e.key === 'ArrowRight') {
        nextIdx = (idx + (rtl ? -1 : 1) + items.length) % items.length;
      } else if (e.key === 'ArrowLeft') {
        nextIdx = (idx + (rtl ? 1 : -1) + items.length) % items.length;
      } else if (e.key === 'Home') {
        nextIdx = 0;
      } else if (e.key === 'End') {
        nextIdx = items.length - 1;
      }

      if (nextIdx !== -1) {
        e.preventDefault();
        items[nextIdx].focus();
      }
    };

    bar.addEventListener('focusin', onFocusIn);
    bar.addEventListener('keydown', onKeyDown);
    return () => {
      bar.removeEventListener('focusin', onFocusIn);
      bar.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label={ariaLabel}
      aria-controls={ariaControls}
      {...({ focusgroup: 'toolbar wrap' } as Record<string, string>)}
      className={`studio-toolbar inline-flex items-center gap-1.5 rounded-2xl border px-2.5 py-1.5 backdrop-blur-md ${className}`}
    >
      {children}
    </div>
  );
}
