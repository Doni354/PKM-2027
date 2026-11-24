import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeProps,
  type OnNodeDrag,
} from '@xyflow/react';
import {
  ArrowRight,
  GitBranch,
  LayoutGrid,
  MessageSquare,
  MousePointer2,
  Plus,
  Send,
  StickyNote,
  ThumbsUp,
  Trash2,
  Type,
  X,
} from 'lucide-react';
import { STICKY_COLORS } from '../data/pkmStarterData';
import {
  broadcastLiveDrag,
  clearLiveDrag,
  sanitizeKey,
  subscribeLiveDrags,
} from '../lib/roomSync';
import type {
  FreeNoteKind,
  FreeStickyNote,
  StickyColor,
} from '../types';
import { CanvasToolbar } from './CanvasToolbar';
import { FlowCursorsOverlay } from './LiveCursorsLayer';

interface FreeNoteActions {
  onUpdateText: (noteId: string, text: string) => void;
  onUpdateColor: (noteId: string, color: StickyColor) => void;
  onToggleVote: (noteId: string, currentlyVoted: boolean) => void;
  onOpenComments: (noteId: string) => void;
  onPromoteToBoard: (note: FreeStickyNote) => void;
  onDelete: (noteId: string) => void;
}

interface FreeNoteFlowData extends Record<string, unknown> {
  note: FreeStickyNote;
  voterKey: string;
  isCommentActive: boolean;
  actionsRef: React.MutableRefObject<FreeNoteActions>;
}

type FreeFlowNode = Node<FreeNoteFlowData, 'freeNote'>;

const COLOR_KEYS: StickyColor[] = [
  'butter',
  'mint',
  'sky',
  'rose',
  'lavender',
  'paper',
];

const FreeStickyNodeComponent = memo(function FreeStickyNodeComponent({
  data,
  selected,
}: NodeProps<FreeFlowNode>) {
  const { note, voterKey, isCommentActive, actionsRef } = data;

  const [draft, setDraft] = useState(note.text);
  const focusedRef = useRef(false);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(note.text);
    }
  }, [note.text]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTextChange = (next: string) => {
    setDraft(next);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      actionsRef.current.onUpdateText(note.id, next);
    }, 280);
  };

  const handleBlur = () => {
    focusedRef.current = false;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (draft !== note.text) {
      actionsRef.current.onUpdateText(note.id, draft);
    }
  };

  const palette = STICKY_COLORS[note.color] ?? STICKY_COLORS.butter;
  const voteCount = note.votes
    ? Object.values(note.votes).filter(Boolean).length
    : 0;
  const hasVoted = Boolean(note.votes?.[voterKey]);
  const commentCount = note.comments ? Object.keys(note.comments).length : 0;
  const isLabel = note.kind === 'label';

  return (
    <div
      style={{
        backgroundColor: isLabel ? 'var(--bg-surface)' : palette.bgVar,
        borderColor:
          selected || isCommentActive
            ? 'var(--accent)'
            : isLabel
            ? 'var(--border-strong)'
            : palette.borderVar,
        boxShadow:
          selected || isCommentActive ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
        color: 'var(--sticky-ink)',
      }}
      className={`group flex flex-col rounded-2xl border transition-shadow ${
        isLabel ? 'w-[340px] border-dashed' : 'w-[272px]'
      } ${selected || isCommentActive ? 'ring-2 ring-[var(--accent)]/35' : ''}`}
    >
      {/* Top Drag Strip */}
      <div className="flex items-center justify-between gap-2 px-3.5 pt-2.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: note.authorColor || 'var(--accent)' }}
          />
          <span
            className="truncate text-[11px] font-medium"
            style={{ color: 'var(--sticky-muted)' }}
          >
            {note.author}
          </span>
          {note.promotedToBoard && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent)',
              }}
            >
              Dibedah
            </span>
          )}
        </div>

        {/* Color Swatches & Delete */}
        <div
          className={`nodrag flex items-center gap-1 transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {!isLabel && (
            <div className="flex items-center gap-1 pr-1">
              {COLOR_KEYS.map((ck) => (
                <button
                  key={ck}
                  type="button"
                  onClick={() => actionsRef.current.onUpdateColor(note.id, ck)}
                  title={`Warna ${STICKY_COLORS[ck].name}`}
                  aria-label={`Ubah warna ke ${STICKY_COLORS[ck].name}`}
                  style={{ backgroundColor: STICKY_COLORS[ck].swatch }}
                  className={`h-3 w-3 rounded-full border border-black/20 transition ${
                    note.color === ck ? 'scale-110 ring-1 ring-[var(--text-primary)]' : ''
                  }`}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => actionsRef.current.onDelete(note.id)}
            aria-label="Hapus catatan"
            style={{ color: 'var(--sticky-muted)' }}
            className="rounded-md p-1 transition hover:bg-black/10 hover:text-rose-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Inline Editable Text */}
      <div className="nodrag px-3.5 py-2">
        <textarea
          value={draft}
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={handleBlur}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={
            isLabel
              ? 'Tulis judul cluster / catatan diskusi...'
              : 'Tulis ide apa saja di sini...'
          }
          aria-label="Isi catatan ide"
          style={{ color: 'var(--sticky-ink)' }}
          className="sticky-textarea w-full bg-transparent text-[13px] font-medium leading-relaxed outline-none placeholder:opacity-45"
        />
      </div>

      {/* Footer */}
      <div
        className="nodrag flex items-center justify-between gap-1 border-t px-3 py-2"
        style={{ borderColor: 'rgb(128 128 128 / 0.14)' }}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => actionsRef.current.onToggleVote(note.id, hasVoted)}
            aria-pressed={hasVoted}
            style={
              hasVoted
                ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }
                : { backgroundColor: 'rgb(128 128 128 / 0.12)', color: 'var(--sticky-ink)' }
            }
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition"
          >
            <ThumbsUp className="h-3 w-3" />
            <span>{voteCount}</span>
          </button>

          <button
            type="button"
            onClick={() => actionsRef.current.onOpenComments(note.id)}
            aria-label={`Buka komentar (${commentCount})`}
            style={{
              backgroundColor:
                isCommentActive || commentCount > 0
                  ? 'var(--bg-surface)'
                  : 'rgb(128 128 128 / 0.12)',
              color: 'var(--sticky-ink)',
            }}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition"
          >
            <MessageSquare className="h-3 w-3" />
            <span>{commentCount > 0 ? commentCount : 'Notes'}</span>
          </button>
        </div>

        {!isLabel && (
          <button
            type="button"
            onClick={() => actionsRef.current.onPromoteToBoard(note)}
            title="Bawa ide ini ke Tab 2 (Bedah Kanban)"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border)',
            }}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            <span>Bedah</span>
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
});

const freeNodeTypes = {
  freeNote: FreeStickyNodeComponent,
};

interface FreeCanvasInnerProps {
  roomId: string;
  sessionId: string;
  notesMap: Record<string, FreeStickyNote>;
  userName: string;
  showCursors: boolean;
  onToggleShowCursors: () => void;
  onFlowPointerMove: (x: number, y: number) => void;
  onCreateNote: (payload: {
    kind: FreeNoteKind;
    text: string;
    color: StickyColor;
    x: number;
    y: number;
  }) => Promise<FreeStickyNote>;
  onUpdateNote: (
    noteId: string,
    patch: Partial<Pick<FreeStickyNote, 'text' | 'color' | 'x' | 'y'>>
  ) => Promise<void>;
  onBatchPositions: (positions: Array<{ id: string; x: number; y: number }>) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onToggleVote: (noteId: string, currentlyVoted: boolean) => Promise<void>;
  onAddComment: (noteId: string, text: string) => Promise<void>;
  onDeleteComment: (noteId: string, commentId: string) => Promise<void>;
  onPromoteToBoard: (note: FreeStickyNote) => Promise<void>;
  onPromoteToMindmap: (note: FreeStickyNote) => Promise<void>;
}

function estimateStickyHeight(note: FreeStickyNote): number {
  const charsPerLine = note.kind === 'label' ? 42 : 30;
  const lines = note.text
    .split('\n')
    .reduce((acc, l) => acc + Math.max(1, Math.ceil(l.length / charsPerLine)), 0);
  return Math.max(165, 110 + lines * 21);
}

function FreeCanvasInner({
  roomId,
  sessionId,
  notesMap,
  userName,
  showCursors,
  onToggleShowCursors,
  onFlowPointerMove,
  onCreateNote,
  onUpdateNote,
  onBatchPositions,
  onDeleteNote,
  onToggleVote,
  onAddComment,
  onDeleteComment,
  onPromoteToBoard,
  onPromoteToMindmap,
}: FreeCanvasInnerProps) {
  const { screenToFlowPosition, fitView, getNodes } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<FreeFlowNode>([]);
  const [activeColor, setActiveColor] = useState<StickyColor>('butter');
  const [activeCommentNoteId, setActiveCommentNoteId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');

  // Optimistic local drag locks & streaming throttle refs (FigJam-grade!)
  const draggingIdsRef = useRef<Set<string>>(new Set());
  const localDropLockRef = useRef<Map<string, number>>(new Map());
  const lastDragBroadcastRef = useRef<number>(0);

  const voterKey = sanitizeKey(userName);

  const actionsRef = useRef<FreeNoteActions>({
    onUpdateText: () => {},
    onUpdateColor: () => {},
    onToggleVote: () => {},
    onOpenComments: () => {},
    onPromoteToBoard: () => {},
    onDelete: () => {},
  });

  actionsRef.current = {
    onUpdateText: (noteId, text) => {
      onUpdateNote(noteId, { text }).catch(() => {});
    },
    onUpdateColor: (noteId, color) => {
      onUpdateNote(noteId, { color }).catch(() => {});
    },
    onToggleVote: (noteId, currentlyVoted) => {
      onToggleVote(noteId, currentlyVoted).catch(() => {});
    },
    onOpenComments: (noteId) => {
      setActiveCommentNoteId((prev) => (prev === noteId ? null : noteId));
    },
    onPromoteToBoard: (note) => {
      onPromoteToBoard(note).catch(() => {});
    },
    onDelete: (noteId) => {
      setActiveCommentNoteId((prev) => (prev === noteId ? null : prev));
      onDeleteNote(noteId).catch(() => {});
    },
  };

  // Subscribe to ultra-lightweight (~45B) remote live drag coordinates!
  useEffect(() => {
    if (!roomId) return;
    return subscribeLiveDrags(roomId, 'free', sessionId, (pos) => {
      if (draggingIdsRef.current.has(pos.id)) return;
      const dropLock = localDropLockRef.current.get(pos.id);
      if (dropLock && Date.now() - dropLock < 450) return;

      setRfNodes((prev) => {
        let changed = false;
        const next = prev.map((n) => {
          if (n.id !== pos.id) return n;
          if (n.position.x === pos.x && n.position.y === pos.y) return n;
          changed = true;
          return { ...n, position: { x: pos.x, y: pos.y } };
        });
        return changed ? next : prev;
      });
    });
  }, [roomId, sessionId, setRfNodes]);

  // Smart diff-merge persistent notesMap -> React Flow nodes (never overwrites active drags!)
  useEffect(() => {
    const now = Date.now();
    setRfNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return Object.values(notesMap).map((note) => {
        const existing = prevById.get(note.id);
        const isLockedLocal =
          draggingIdsRef.current.has(note.id) ||
          (localDropLockRef.current.get(note.id) ?? 0) > now - 450;

        const targetPos =
          isLockedLocal && existing
            ? existing.position
            : { x: note.x ?? 80, y: note.y ?? 100 };

        const isCommentActive = activeCommentNoteId === note.id;

        if (
          existing &&
          existing.data.note === note &&
          existing.data.voterKey === voterKey &&
          existing.data.isCommentActive === isCommentActive &&
          existing.position.x === targetPos.x &&
          existing.position.y === targetPos.y
        ) {
          return existing;
        }

        return {
          ...(existing ?? {}),
          id: note.id,
          type: 'freeNote',
          position: targetPos,
          data: {
            note,
            voterKey,
            isCommentActive,
            actionsRef,
          },
        };
      });
    });
  }, [notesMap, voterKey, activeCommentNoteId, setRfNodes]);

  const handleNodeDragStart: OnNodeDrag<FreeFlowNode> = useCallback((_e, node) => {
    draggingIdsRef.current.add(node.id);
  }, []);

  const handleNodeDrag: OnNodeDrag<FreeFlowNode> = useCallback(
    (_e, node) => {
      const now = Date.now();
      if (now - lastDragBroadcastRef.current < 40) return;
      lastDragBroadcastRef.current = now;
      broadcastLiveDrag(roomId, 'free', {
        id: node.id,
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
        by: sessionId,
        t: now,
      });
    },
    [roomId, sessionId]
  );

  const handleNodeDragStop: OnNodeDrag<FreeFlowNode> = useCallback(
    (_e, node) => {
      const x = Math.round(node.position.x);
      const y = Math.round(node.position.y);
      draggingIdsRef.current.delete(node.id);
      localDropLockRef.current.set(node.id, Date.now());
      onUpdateNote(node.id, { x, y }).catch(() => {});
      clearLiveDrag(roomId, 'free', node.id);
    },
    [roomId, onUpdateNote]
  );

  // Real-height Masonry Auto-Arrange (ZERO overlaps!)
  const handleArrangeMasonry = async () => {
    const renderedNodes = getNodes();
    const measuredHeight = new Map<string, number>();
    renderedNodes.forEach((n) => {
      if (n.measured?.height) measuredHeight.set(n.id, n.measured.height);
    });

    const all = Object.values(notesMap).sort((a, b) => a.createdAt - b.createdAt);
    const labels = all.filter((n) => n.kind === 'label');
    const stickies = all.filter((n) => n.kind !== 'label');

    const positions: Array<{ id: string; x: number; y: number }> = [];
    let topRowMaxH = 0;

    labels.forEach((lbl, idx) => {
      const h = measuredHeight.get(lbl.id) ?? estimateStickyHeight(lbl);
      positions.push({ id: lbl.id, x: 48 + idx * 372, y: 36 });
      topRowMaxH = Math.max(topRowMaxH, h);
    });

    const startY = labels.length > 0 ? 36 + topRowMaxH + 36 : 40;
    const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(stickies.length))));
    const colY = Array.from({ length: cols }, () => startY);
    const COL_PITCH_X = 304;
    const GAP_Y = 28;

    stickies.forEach((note) => {
      // Place in shortest column (Masonry packing -> tight & zero overlap)
      let bestCol = 0;
      for (let i = 1; i < cols; i += 1) {
        if (colY[i] < colY[bestCol]) bestCol = i;
      }
      const h = measuredHeight.get(note.id) ?? estimateStickyHeight(note);
      positions.push({
        id: note.id,
        x: 48 + bestCol * COL_PITCH_X,
        y: Math.round(colY[bestCol]),
      });
      colY[bestCol] += h + GAP_Y;
    });

    await onBatchPositions(positions);
    setTimeout(() => fitView({ padding: 0.18, duration: 300 }), 100);
  };

  const handleAddCenterNote = async (kind: FreeNoteKind) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    const centerScreen = rect
      ? {
          x: rect.left + rect.width / 2 + (Math.random() - 0.5) * 100,
          y: rect.top + rect.height / 2 + (Math.random() - 0.5) * 70,
        }
      : { x: 400, y: 300 };
    const flowPos = screenToFlowPosition(centerScreen);
    await onCreateNote({
      kind,
      text: '',
      color: kind === 'label' ? 'paper' : activeColor,
      x: flowPos.x - 136,
      y: flowPos.y - 70,
    });
  };

  const handlePaneDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('react-flow__pane')) return;
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    onCreateNote({
      kind: 'sticky',
      text: '',
      color: activeColor,
      x: flowPos.x - 136,
      y: flowPos.y - 60,
    }).catch(() => {});
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onFlowPointerMove(pos.x, pos.y);
    },
    [screenToFlowPosition, onFlowPointerMove]
  );

  const activeNote = activeCommentNoteId ? notesMap[activeCommentNoteId] : null;
  const activeComments = useMemo(() => {
    if (!activeNote?.comments) return [];
    return Object.values(activeNote.comments).sort((a, b) => a.createdAt - b.createdAt);
  }, [activeNote]);

  const handleSubmitComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeNote || !commentInput.trim()) return;
    const text = commentInput.trim();
    setCommentInput('');
    await onAddComment(activeNote.id, text);
  };

  return (
    <div
      ref={wrapperRef}
      id="free-brainstorm-canvas"
      onPointerMove={handlePointerMove}
      onDoubleClick={handlePaneDoubleClick}
      style={{ backgroundColor: 'var(--bg-canvas)' }}
      className="relative h-[calc(100dvh-57px)] min-h-[560px] w-full overflow-hidden"
    >
      <ReactFlow
        nodes={rfNodes}
        edges={[]}
        nodeTypes={freeNodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        zoomOnDoubleClick={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.35}
        maxZoom={1.7}
      >
        <Background color="var(--dot-grid)" gap={24} size={1.3} />
        <Controls showInteractive={false} position="bottom-left" />
        <FlowCursorsOverlay
          roomId={roomId}
          mySessionId={sessionId}
          tab="free"
          visible={showCursors}
        />
      </ReactFlow>

      {/* Quiet Floating Top-Left Tip */}
      <div
        style={{
          backgroundColor: 'var(--bg-glass)',
          borderColor: 'var(--border)',
          color: 'var(--text-muted)',
        }}
        className="pointer-events-none absolute left-4 top-3 hidden items-center rounded-full border px-3 py-1 text-[11px] backdrop-blur sm:inline-flex"
      >
        Klik ganda kanvas untuk sticky note baru • Drag real-time • Bebas eksplorasi ide
      </div>

      {/* Floating Bottom FigJam Toolbar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center px-3">
        <div className="pointer-events-auto">
          <CanvasToolbar
            ariaLabel="Alat Kanvas Ruang Ide"
            ariaControls="free-brainstorm-canvas"
          >
            <div role="group" aria-label="Tambah elemen" className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleAddCenterNote('sticky')}
                style={{
                  backgroundColor: 'var(--btn-solid-bg)',
                  color: 'var(--btn-solid-fg)',
                }}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Sticky Note</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddCenterNote('label')}
                title="Tambah catatan / judul cluster"
                className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium"
              >
                <Type className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Catatan</span>
              </button>
            </div>

            <span role="separator" aria-orientation="vertical" />

            <div
              role="group"
              aria-label="Pilih warna sticky note"
              className="flex items-center gap-1.5 px-1"
            >
              {COLOR_KEYS.map((ck) => (
                <button
                  key={ck}
                  type="button"
                  data-swatch="true"
                  aria-pressed={activeColor === ck}
                  aria-label={`Warna ${STICKY_COLORS[ck].name}`}
                  title={`Warna ${STICKY_COLORS[ck].name}`}
                  onClick={() => setActiveColor(ck)}
                  className="flex items-center justify-center rounded-full p-1"
                >
                  <span
                    className="h-4 w-4 rounded-full border border-black/15"
                    style={{ backgroundColor: STICKY_COLORS[ck].swatch }}
                  />
                </button>
              ))}
            </div>

            <span role="separator" aria-orientation="vertical" />

            <div role="group" aria-label="Tampilan kanvas" className="flex items-center gap-1">
              <button
                type="button"
                aria-pressed={showCursors}
                aria-label="Tampilkan atau sembunyikan kursor tim"
                title="Kursor live tim"
                onClick={onToggleShowCursors}
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium"
              >
                <MousePointer2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden md:inline">Kursor</span>
              </button>

              <button
                type="button"
                onClick={handleArrangeMasonry}
                aria-label="Rapikan sticky notes tanpa tumpang tindih"
                title="Rapikan susunan (anti-overlap)"
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium"
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden md:inline">Rapikan</span>
              </button>
            </div>
          </CanvasToolbar>
        </div>
      </div>

      {/* Lightweight Slide-In Discussion Panel */}
      {activeNote && (
        <aside
          aria-label="Diskusi dan catatan untuk sticky note terpilih"
          style={{
            backgroundColor: 'var(--bg-glass)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-float)',
          }}
          className="absolute bottom-4 right-4 top-4 z-30 flex w-[calc(100%-2rem)] max-w-sm flex-col rounded-2xl border backdrop-blur-xl"
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <div>
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Notes & Diskusi
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Oleh {activeNote.author} · {activeComments.length} catatan
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveCommentNoteId(null)}
              aria-label="Tutup panel diskusi"
              style={{ color: 'var(--text-secondary)' }}
              className="rounded-lg p-1.5 transition hover:bg-[var(--bg-subtle)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            className="border-b px-4 py-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <div
              style={{
                backgroundColor: STICKY_COLORS[activeNote.color]?.bgVar ?? 'var(--bg-subtle)',
                borderColor: STICKY_COLORS[activeNote.color]?.borderVar ?? 'var(--border)',
                color: 'var(--sticky-ink)',
              }}
              className="rounded-xl border p-3 text-xs leading-relaxed"
            >
              {activeNote.text || <span className="italic opacity-60">(Catatan kosong)</span>}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onPromoteToBoard(activeNote)}
                style={{
                  backgroundColor: 'var(--btn-solid-bg)',
                  color: 'var(--btn-solid-fg)',
                }}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition hover:opacity-90"
              >
                <span>Bawa ke Tab 2 (Bedah)</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onPromoteToMindmap(activeNote)}
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium transition hover:bg-[var(--bg-subtle)]"
              >
                <GitBranch className="h-3 w-3" />
                <span>Ke Mindmap</span>
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3">
            {activeComments.length === 0 ? (
              <p className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                Belum ada catatan diskusi. Tulis masukan, kritik, atau pengembangan ide di bawah!
              </p>
            ) : (
              activeComments.map((cmt) => (
                <div
                  key={cmt.id}
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border)',
                  }}
                  className="group/cmt rounded-xl border px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: cmt.color }}
                      />
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {cmt.author}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        {new Date(cmt.createdAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteComment(activeNote.id, cmt.id)}
                      aria-label="Hapus komentar"
                      style={{ color: 'var(--text-muted)' }}
                      className="rounded p-0.5 opacity-0 transition hover:text-rose-500 group-hover/cmt:opacity-100"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <p
                    className="mt-1 whitespace-pre-line text-xs leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {cmt.text}
                  </p>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleSubmitComment}
            className="flex items-center gap-2 border-t p-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Tulis notes / tanggapan..."
              aria-label="Tulis tanggapan untuk ide ini"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
              className="flex-1 rounded-full border px-3.5 py-2 text-xs outline-none transition focus:border-[var(--accent)]"
            />
            <button
              type="submit"
              disabled={!commentInput.trim()}
              aria-label="Kirim komentar"
              style={{
                backgroundColor: 'var(--btn-solid-bg)',
                color: 'var(--btn-solid-fg)',
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full transition hover:opacity-90 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </aside>
      )}
    </div>
  );
}

export function FreeCanvasTab(props: FreeCanvasInnerProps) {
  return (
    <ReactFlowProvider>
      <FreeCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
