import { memo, useEffect, useState } from 'react';
import { useViewport } from '@xyflow/react';
import { subscribeCursors } from '../lib/roomSync';
import type { CursorPosition, TabId } from '../types';

const STALE_CURSOR_MS = 12000;

const CursorBadge = memo(function CursorBadge({
  name,
  color,
  x,
  y,
}: {
  name: string;
  color: string;
  x: number;
  y: number;
}) {
  return (
    <div
      className="live-cursor pointer-events-none absolute left-0 top-0 z-40 will-change-transform"
      style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}
      aria-hidden="true"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="drop-shadow-sm">
        <path
          d="M2 1.5L15.5 7.8L9.6 9.9L7.4 15.8L2 1.5Z"
          fill={color}
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      <span
        style={{ backgroundColor: color }}
        className="ml-3.5 -mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm"
      >
        {name}
      </span>
    </div>
  );
});

function useIsolatedCursors(roomId: string, mySessionId: string, enabled: boolean) {
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled || !roomId) {
      setCursors([]);
      return;
    }
    const unsub = subscribeCursors(roomId, mySessionId, setCursors);
    const timer = window.setInterval(() => setNow(Date.now()), 3000);
    return () => {
      unsub();
      window.clearInterval(timer);
    };
  }, [roomId, mySessionId, enabled]);

  return { cursors, now };
}

/**
 * Self-contained Flow cursor layer: subscribes directly to RTDB so 20Hz cursor
 * updates NEVER trigger re-renders of App, ReactFlow, or sticky/mindmap nodes!
 */
export const FlowCursorsOverlay = memo(function FlowCursorsOverlay({
  roomId,
  mySessionId,
  tab,
  visible,
}: {
  roomId: string;
  mySessionId: string;
  tab: TabId;
  visible: boolean;
}) {
  const { x: vx, y: vy, zoom } = useViewport();
  const { cursors, now } = useIsolatedCursors(roomId, mySessionId, visible);

  if (!visible) return null;

  const active = cursors.filter(
    (c) => c.tab === tab && c.space === 'flow' && now - c.updatedAt < STALE_CURSOR_MS
  );
  if (active.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {active.map((c) => (
        <CursorBadge
          key={c.sessionId}
          name={c.name}
          color={c.color}
          x={c.x * zoom + vx}
          y={c.y * zoom + vy}
        />
      ))}
    </div>
  );
});

/**
 * Self-contained Page cursor layer for Kanban & Blueprint tabs.
 */
export const PageCursorsOverlay = memo(function PageCursorsOverlay({
  roomId,
  mySessionId,
  tab,
  visible,
}: {
  roomId: string;
  mySessionId: string;
  tab: TabId;
  visible: boolean;
}) {
  const { cursors, now } = useIsolatedCursors(roomId, mySessionId, visible);

  if (!visible) return null;

  const active = cursors.filter(
    (c) => c.tab === tab && c.space === 'page' && now - c.updatedAt < STALE_CURSOR_MS
  );
  if (active.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {active.map((c) => (
        <div
          key={c.sessionId}
          className="live-cursor pointer-events-none absolute z-40"
          style={{
            left: `${Math.min(98, Math.max(1, c.x * 100))}%`,
            top: `${Math.min(98, Math.max(1, c.y * 100))}%`,
          }}
          aria-hidden="true"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="drop-shadow-sm">
            <path
              d="M2 1.5L15.5 7.8L9.6 9.9L7.4 15.8L2 1.5Z"
              fill={c.color}
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
          <span
            style={{ backgroundColor: c.color }}
            className="ml-3.5 -mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm"
          >
            {c.name}
          </span>
        </div>
      ))}
    </div>
  );
});
