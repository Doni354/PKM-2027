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
  SelectionMode,
  useNodesState,
  useReactFlow,
  type Node,
  type NodeProps,
  type OnNodeDrag,
} from '@xyflow/react';
import {
  ArrowRight,
  Copy,
  CopyPlus,
  ExternalLink,
  Hand,
  HelpCircle,
  ImagePlus,
  LayoutGrid,
  Loader2,
  Maximize2,
  MessageSquare,
  MousePointer2,
  Plus,
  Redo2,
  Send,
  StickyNote,
  ThumbsUp,
  Trash2,
  Type,
  Undo2,
  X,
} from 'lucide-react';
import { BOARD_COLUMNS, STICKY_COLORS } from '../data/pkmStarterData';
import {
  getOptimizedCloudinaryUrl,
  uploadImageToCloudinary,
} from '../lib/cloudinary';
import {
  broadcastLiveDrag,
  clearLiveDrag,
  makeId,
  sanitizeKey,
  subscribeLiveDrags,
} from '../lib/roomSync';
import type {
  ColumnId,
  FreeNoteKind,
  FreeStickyNote,
  IdeaRecord,
  StickyColor,
} from '../types';
import { CanvasToolbar } from './CanvasToolbar';
import { FlowCursorsOverlay } from './LiveCursorsLayer';
import { ModalDialog } from './ModalDialog';

interface FreeNoteActions {
  onLiveUpdateText: (noteId: string, text: string) => void;
  onCommitText: (noteId: string, prevText: string, nextText: string) => void;
  onUpdateColor: (noteId: string, color: StickyColor) => void;
  onCommitResize: (noteId: string, prevWidth: number, nextWidth: number) => void;
  onToggleVote: (noteId: string, currentlyVoted: boolean) => void;
  onOpenComments: (noteId: string) => void;
  onOpenLightbox: (note: FreeStickyNote) => void;
  onOpenPromoteModal: (note: FreeStickyNote) => void;
  onJumpToIdea: (ideaId: string) => void;
  onDelete: (noteId: string) => void;
}

interface FreeNoteFlowData extends Record<string, unknown> {
  note: FreeStickyNote;
  linkedIdeaName?: string;
  voterKey: string;
  isCommentActive: boolean;
  actionsRef: React.MutableRefObject<FreeNoteActions>;
}

type FreeFlowNode = Node<FreeNoteFlowData, 'freeNote'>;

interface HistoryCommand {
  label: string;
  before: Record<string, FreeStickyNote | null>;
  after: Record<string, FreeStickyNote | null>;
}

const MAX_HISTORY = 40;
const COLOR_KEYS: StickyColor[] = [
  'butter',
  'mint',
  'sky',
  'rose',
  'lavender',
  'paper',
];

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('[contenteditable="true"]'));
}

const FreeStickyNodeComponent = memo(function FreeStickyNodeComponent({
  data,
  selected,
}: NodeProps<FreeFlowNode>) {
  const { note, linkedIdeaName, voterKey, isCommentActive, actionsRef } = data;

  const [draft, setDraft] = useState(note.text);
  const [resizingWidth, setResizingWidth] = useState<number | null>(null);
  const focusedRef = useRef(false);
  const initialTextOnFocusRef = useRef(note.text);
  const debounceRef = useRef<number | null>(null);
  const resizeStateRef = useRef<{
    pointerId: number;
    startX: number;
    startWidth: number;
  } | null>(null);

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
      actionsRef.current.onLiveUpdateText(note.id, next);
    }, 280);
  };

  const handleBlur = () => {
    focusedRef.current = false;
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    const initial = initialTextOnFocusRef.current;
    if (draft !== initial) {
      actionsRef.current.onCommitText(note.id, initial, draft);
    }
  };

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const baseWidth = note.cardWidth ?? 300;
    resizeStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startWidth: baseWidth,
    };
    setResizingWidth(baseWidth);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleResizePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = resizeStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    e.stopPropagation();
    const next = Math.round(
      Math.max(200, Math.min(640, state.startWidth + (e.clientX - state.startX)))
    );
    setResizingWidth(next);
  };

  const handleResizePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const state = resizeStateRef.current;
    if (!state || state.pointerId !== e.pointerId) return;
    e.stopPropagation();
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    const finalWidth = resizingWidth ?? state.startWidth;
    resizeStateRef.current = null;
    setResizingWidth(null);
    if (finalWidth !== state.startWidth) {
      actionsRef.current.onCommitResize(note.id, state.startWidth, finalWidth);
    }
  };

  const palette = STICKY_COLORS[note.color] ?? STICKY_COLORS.butter;
  const voteCount = note.votes
    ? Object.values(note.votes).filter(Boolean).length
    : 0;
  const hasVoted = Boolean(note.votes?.[voterKey]);
  const commentCount = note.comments ? Object.keys(note.comments).length : 0;
  const isLabel = note.kind === 'label';
  const isImage = note.kind === 'image';
  const computedImageWidth = resizingWidth ?? note.cardWidth ?? 300;

  return (
    <div
      style={{
        width: isImage ? `${computedImageWidth}px` : undefined,
        backgroundColor: isImage || isLabel ? 'var(--bg-surface)' : palette.bgVar,
        borderColor:
          selected || isCommentActive
            ? 'var(--accent)'
            : isImage || isLabel
            ? 'var(--border-strong)'
            : palette.borderVar,
        boxShadow:
          selected || isCommentActive ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
        color: isImage ? 'var(--text-primary)' : 'var(--sticky-ink)',
      }}
      className={`group relative flex flex-col rounded-2xl border transition-shadow ${
        isImage ? '' : isLabel ? 'w-[340px] border-dashed' : 'w-[272px]'
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
            style={{ color: isImage ? 'var(--text-muted)' : 'var(--sticky-muted)' }}
          >
            {note.author}
          </span>
          {!isImage && (linkedIdeaName || note.promotedToBoard) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (note.promotedIdeaId) {
                  actionsRef.current.onJumpToIdea(note.promotedIdeaId);
                }
              }}
              title={
                linkedIdeaName
                  ? `Buka ide "${linkedIdeaName}" di Tab 2 (Bedah)`
                  : 'Sudah dibedah'
              }
              className="nodrag max-w-[110px] truncate rounded-full px-1.5 py-0.5 text-[9px] font-bold transition hover:opacity-80"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent)',
              }}
            >
              {linkedIdeaName ? `→ ${linkedIdeaName}` : 'Dibedah'}
            </button>
          )}
        </div>

        {/* Swatches / Fullscreen / Delete */}
        <div
          className={`nodrag flex items-center gap-1 transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {!isLabel && !isImage && (
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
          {isImage && note.imageUrl && (
            <button
              type="button"
              onClick={() => actionsRef.current.onOpenLightbox(note)}
              title="Perbesar gambar"
              aria-label="Perbesar gambar"
              style={{ color: 'var(--text-muted)' }}
              className="rounded-md p-1 transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => actionsRef.current.onDelete(note.id)}
            aria-label="Hapus item"
            style={{ color: isImage ? 'var(--text-muted)' : 'var(--sticky-muted)' }}
            className="rounded-md p-1 transition hover:bg-black/10 hover:text-rose-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Image Body OR Text Body */}
      {isImage && note.imageUrl ? (
        <div className="px-2.5 pb-1.5 pt-2">
          <div
            className="overflow-hidden rounded-xl border"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-subtle)',
            }}
          >
            <img
              src={getOptimizedCloudinaryUrl(note.imageUrl, 1000)}
              alt={note.text.trim() || `Gambar ide dari ${note.author}`}
              width={note.imageWidth ?? 640}
              height={note.imageHeight ?? 420}
              loading="lazy"
              decoding="async"
              draggable={false}
              onDoubleClick={(e) => {
                e.stopPropagation();
                actionsRef.current.onOpenLightbox(note);
              }}
              className="block h-auto max-h-[420px] w-full select-none object-contain"
            />
          </div>
          <div className="nodrag mt-1.5 px-1">
            <input
              type="text"
              value={draft}
              onFocus={() => {
                focusedRef.current = true;
                initialTextOnFocusRef.current = note.text;
              }}
              onBlur={handleBlur}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Tambah keterangan gambar..."
              aria-label="Keterangan gambar"
              style={{ color: 'var(--text-primary)' }}
              className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>
        </div>
      ) : (
        <div className="nodrag px-3.5 py-2">
          <textarea
            value={draft}
            onFocus={() => {
              focusedRef.current = true;
              initialTextOnFocusRef.current = note.text;
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
      )}

      {/* Footer (ONLY for sticky notes & labels — images stay pure visual reference notes!) */}
      {!isImage && (
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
                  : {
                      backgroundColor: 'rgb(128 128 128 / 0.12)',
                      color: 'var(--sticky-ink)',
                    }
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
                    ? 'var(--bg-subtle)'
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
              onClick={() => actionsRef.current.onOpenPromoteModal(note)}
              title="Bawa sticky note ini ke Tahap 2 (Bedah Ide)"
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
      )}

      {/* Corner Resize Handle for Image Cards */}
      {isImage && (
        <div
          role="separator"
          aria-orientation="vertical"
          title="Seret untuk ubah ukuran gambar"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
          className={`nodrag absolute -bottom-1 -right-1 flex h-5 w-5 cursor-ew-resize touch-none items-end justify-end rounded-br-2xl p-1 transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <span
            className="h-2.5 w-2.5 rounded-br-sm border-b-2 border-r-2"
            style={{ borderColor: 'var(--accent)' }}
          />
        </div>
      )}
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
  ideas: IdeaRecord[];
  userName: string;
  userColor: string;
  onFlowPointerMove: (x: number, y: number) => void;
  onCreateNote: (payload: {
    id?: string;
    kind: FreeNoteKind;
    text: string;
    color: StickyColor;
    imageUrl?: string;
    imageWidth?: number;
    imageHeight?: number;
    cardWidth?: number;
    x: number;
    y: number;
  }) => Promise<FreeStickyNote>;
  onUpdateNote: (
    noteId: string,
    patch: Partial<Pick<FreeStickyNote, 'text' | 'color' | 'x' | 'y' | 'cardWidth'>>
  ) => Promise<void>;
  onBatchPositions: (positions: Array<{ id: string; x: number; y: number }>) => Promise<void>;
  onBatchMutate: (ops: { upserts?: FreeStickyNote[]; deletes?: string[] }) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  onToggleVote: (noteId: string, currentlyVoted: boolean) => Promise<void>;
  onAddComment: (noteId: string, text: string) => Promise<void>;
  onDeleteComment: (noteId: string, commentId: string) => Promise<void>;
  onCreateIdeaFromSticky: (
    note: FreeStickyNote,
    ideaName: string,
    columnId: ColumnId
  ) => Promise<void>;
  onAttachStickyToIdea: (
    note: FreeStickyNote,
    ideaId: string,
    columnId: ColumnId
  ) => Promise<void>;
  onJumpToIdeaInBoard: (ideaId: string) => void;
  onNotify: (message: string) => void;
}

function estimateStickyHeight(note: FreeStickyNote): number {
  if (note.kind === 'image') {
    const w = note.cardWidth ?? 300;
    const ratio =
      note.imageWidth && note.imageHeight
        ? note.imageHeight / note.imageWidth
        : 0.72;
    return Math.round(Math.min(420, Math.max(140, (w - 20) * ratio)) + 112);
  }
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
  ideas,
  userName,
  userColor,
  onFlowPointerMove,
  onCreateNote,
  onUpdateNote,
  onBatchPositions,
  onBatchMutate,
  onDeleteNote,
  onToggleVote,
  onAddComment,
  onDeleteComment,
  onCreateIdeaFromSticky,
  onAttachStickyToIdea,
  onJumpToIdeaInBoard,
  onNotify,
}: FreeCanvasInnerProps) {
  const { screenToFlowPosition, fitView, getNodes } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<FreeFlowNode>([]);

  const [toolMode, setToolMode] = useState<'select' | 'hand'>('select');
  const [isSpacePanning, setIsSpacePanning] = useState(false);
  const [activeColor, setActiveColor] = useState<StickyColor>('butter');
  const [activeCommentNoteId, setActiveCommentNoteId] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [lightboxNote, setLightboxNote] = useState<FreeStickyNote | null>(null);
  const [promoteNote, setPromoteNote] = useState<FreeStickyNote | null>(null);
  const [promoteMode, setPromoteMode] = useState<'new' | 'existing'>('new');
  const [promoteNewIdeaName, setPromoteNewIdeaName] = useState('');
  const [promoteTargetIdeaId, setPromoteTargetIdeaId] = useState('');
  const [promoteColumnId, setPromoteColumnId] = useState<ColumnId>('problem');
  const [promoteSubmitting, setPromoteSubmitting] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [isDraggingFileOver, setIsDraggingFileOver] = useState(false);

  // Optimistic local drag locks & streaming throttle refs
  const draggingIdsRef = useRef<Set<string>>(new Set());
  const localDropLockRef = useRef<Map<string, number>>(new Map());
  const dragStartPosRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const lastDragBroadcastRef = useRef<number>(0);
  const lastFlowPointerRef = useRef<{ x: number; y: number } | null>(null);
  const pasteCascadeRef = useRef<number>(0);

  // Undo / Redo History Stack (immutable snapshots via structuredClone)
  const undoStackRef = useRef<HistoryCommand[]>([]);
  const redoStackRef = useRef<HistoryCommand[]>([]);
  const [historyCounts, setHistoryCounts] = useState({ undo: 0, redo: 0 });

  // Internal block copy/paste clipboard
  const clipboardBlockRef = useRef<{
    marker: string;
    notes: FreeStickyNote[];
  } | null>(null);

  const notesMapRef = useRef(notesMap);
  notesMapRef.current = notesMap;

  const rfNodesRef = useRef(rfNodes);
  rfNodesRef.current = rfNodes;

  const voterKey = sanitizeKey(userName);
  const effectiveToolMode = isSpacePanning ? 'hand' : toolMode;

  const ideaNameById = useMemo(() => {
    const m = new Map<string, string>();
    ideas.forEach((i) => m.set(i.id, i.name));
    return m;
  }, [ideas]);

  const selectedIds = useMemo(
    () => rfNodes.filter((n) => n.selected).map((n) => n.id),
    [rfNodes]
  );

  const pushHistory = useCallback((cmd: HistoryCommand) => {
    undoStackRef.current.push(cmd);
    if (undoStackRef.current.length > MAX_HISTORY) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
    setHistoryCounts({
      undo: undoStackRef.current.length,
      redo: 0,
    });
  }, []);

  const applyHistorySnapshot = useCallback(
    async (snapshot: Record<string, FreeStickyNote | null>) => {
      const upserts: FreeStickyNote[] = [];
      const deletes: string[] = [];
      const upsertById = new Map<string, FreeStickyNote>();
      const deleteSet = new Set<string>();
      const now = Date.now();

      Object.entries(snapshot).forEach(([id, note]) => {
        draggingIdsRef.current.delete(id);
        if (note) {
          const cloned = structuredClone(note);
          localDropLockRef.current.set(id, now);
          upserts.push(cloned);
          upsertById.set(id, cloned);
        } else {
          localDropLockRef.current.delete(id);
          deletes.push(id);
          deleteSet.add(id);
        }
      });

      // Immediately apply restored positions/items to React Flow (0ms visual Undo/Redo!)
      setRfNodes((prev) => {
        const next: FreeFlowNode[] = [];
        const seen = new Set<string>();

        prev.forEach((n) => {
          if (deleteSet.has(n.id)) return;
          const restored = upsertById.get(n.id);
          if (restored) {
            seen.add(n.id);
            next.push({
              ...n,
              position: { x: restored.x ?? 80, y: restored.y ?? 100 },
              data: {
                ...n.data,
                note: restored,
              },
            });
          } else {
            next.push(n);
          }
        });

        upsertById.forEach((restored, id) => {
          if (seen.has(id)) return;
          next.push({
            id,
            type: 'freeNote',
            position: { x: restored.x ?? 80, y: restored.y ?? 100 },
            data: {
              note: restored,
              linkedIdeaName: restored.promotedIdeaId
                ? ideaNameById.get(restored.promotedIdeaId)
                : undefined,
              voterKey,
              isCommentActive: activeCommentNoteId === id,
              actionsRef,
            },
          });
        });

        return next;
      });

      if (deletes.length > 0 && activeCommentNoteId && deletes.includes(activeCommentNoteId)) {
        setActiveCommentNoteId(null);
      }
      await onBatchMutate({ upserts, deletes });
    },
    [activeCommentNoteId, ideaNameById, onBatchMutate, setRfNodes, voterKey]
  );

  const handleUndo = useCallback(async () => {
    const cmd = undoStackRef.current.pop();
    if (!cmd) return;
    redoStackRef.current.push(cmd);
    setHistoryCounts({
      undo: undoStackRef.current.length,
      redo: redoStackRef.current.length,
    });
    await applyHistorySnapshot(cmd.before);
    onNotify(`Undo: ${cmd.label}`);
  }, [applyHistorySnapshot, onNotify]);

  const handleRedo = useCallback(async () => {
    const cmd = redoStackRef.current.pop();
    if (!cmd) return;
    undoStackRef.current.push(cmd);
    setHistoryCounts({
      undo: undoStackRef.current.length,
      redo: redoStackRef.current.length,
    });
    await applyHistorySnapshot(cmd.after);
    onNotify(`Redo: ${cmd.label}`);
  }, [applyHistorySnapshot, onNotify]);

  const getPreferredPlacement = useCallback(() => {
    if (lastFlowPointerRef.current) {
      return lastFlowPointerRef.current;
    }
    const rect = wrapperRef.current?.getBoundingClientRect();
    const centerScreen = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: 480, y: 320 };
    return screenToFlowPosition(centerScreen);
  }, [screenToFlowPosition]);

  const selectOnlyIds = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      setTimeout(() => {
        setRfNodes((prev) =>
          prev.map((n) => ({
            ...n,
            selected: idSet.has(n.id),
          }))
        );
      }, 60);
    },
    [setRfNodes]
  );

  const handleCreateTrackedNote = useCallback(
    async (
      payload: {
        kind: FreeNoteKind;
        text: string;
        color: StickyColor;
        imageUrl?: string;
        imageWidth?: number;
        imageHeight?: number;
        cardWidth?: number;
        x: number;
        y: number;
      },
      historyLabel: string
    ) => {
      const created = await onCreateNote(payload);
      pushHistory({
        label: historyLabel,
        before: { [created.id]: null },
        after: { [created.id]: structuredClone(created) },
      });
      return created;
    },
    [onCreateNote, pushHistory]
  );

  // Upload 1 or multiple image blobs/files to Cloudinary and place on canvas
  const handleUploadImageFiles = useCallback(
    async (files: Blob[], anchorFlowPos?: { x: number; y: number }) => {
      const imageFiles = files.filter(
        (f) => !f.type || f.type.startsWith('image/')
      );
      if (imageFiles.length === 0) return;

      const basePos = anchorFlowPos ?? getPreferredPlacement();
      setUploadingCount((c) => c + imageFiles.length);

      const createdNotes: FreeStickyNote[] = [];
      let failedCount = 0;
      let lastErrorMsg = '';

      try {
        for (let i = 0; i < imageFiles.length; i += 1) {
          const file = imageFiles[i];
          try {
            const uploaded = await uploadImageToCloudinary(file, roomId);
            const defaultWidth = Math.round(
              Math.min(380, Math.max(240, uploaded.width))
            );
            const offset = i * 32;
            const created = await onCreateNote({
              kind: 'image',
              text: '',
              color: 'paper',
              imageUrl: uploaded.url,
              imageWidth: uploaded.width,
              imageHeight: uploaded.height,
              cardWidth: defaultWidth,
              x: basePos.x - defaultWidth / 2 + offset,
              y: basePos.y - 120 + offset,
            });
            createdNotes.push(created);
          } catch (err) {
            failedCount += 1;
            lastErrorMsg =
              err instanceof Error ? err.message : 'Gagal mengunggah gambar.';
          }
        }
      } finally {
        setUploadingCount((c) => Math.max(0, c - imageFiles.length));
      }

      if (createdNotes.length > 0) {
        const before: Record<string, FreeStickyNote | null> = {};
        const after: Record<string, FreeStickyNote | null> = {};
        createdNotes.forEach((n) => {
          before[n.id] = null;
          after[n.id] = structuredClone(n);
        });
        pushHistory({
          label:
            createdNotes.length > 1
              ? `Tempel ${createdNotes.length} gambar`
              : 'Tempel gambar',
          before,
          after,
        });
        selectOnlyIds(createdNotes.map((n) => n.id));
        onNotify(
          createdNotes.length > 1
            ? `${createdNotes.length} gambar berhasil ditempel ke Ruang Ide`
            : 'Gambar berhasil ditempel ke Ruang Ide'
        );
      }

      if (failedCount > 0) {
        onNotify(lastErrorMsg || `${failedCount} gambar gagal diunggah.`);
      }
    },
    [getPreferredPlacement, onCreateNote, onNotify, pushHistory, roomId, selectOnlyIds]
  );

  // Copy selected block of notes
  const handleCopySelected = useCallback(
    (silent = false): FreeStickyNote[] => {
      const selected = rfNodesRef.current
        .filter((n) => n.selected)
        .map((n) => notesMapRef.current[n.id])
        .filter((n): n is FreeStickyNote => Boolean(n));

      if (selected.length === 0) return [];

      const cloned = structuredClone(selected);
      const marker = cloned
        .map((n) => (n.kind === 'image' ? n.imageUrl || '[Gambar]' : n.text || '[Sticky]'))
        .join('\n---\n');

      clipboardBlockRef.current = { marker, notes: cloned };
      pasteCascadeRef.current = 0;

      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(marker).catch(() => {});
      }

      if (!silent) {
        onNotify(`Disalin: ${cloned.length} item (Ctrl+V untuk tempel)`);
      }
      return cloned;
    },
    [onNotify]
  );

  // Delete selected block of notes atomically (with Undo!)
  const handleDeleteSelected = useCallback(
    async (customLabel?: string) => {
      const selected = rfNodesRef.current
        .filter((n) => n.selected)
        .map((n) => notesMapRef.current[n.id])
        .filter((n): n is FreeStickyNote => Boolean(n));

      if (selected.length === 0) return;

      const before: Record<string, FreeStickyNote | null> = {};
      const after: Record<string, FreeStickyNote | null> = {};
      const ids: string[] = [];

      selected.forEach((n) => {
        before[n.id] = structuredClone(n);
        after[n.id] = null;
        ids.push(n.id);
      });

      if (activeCommentNoteId && ids.includes(activeCommentNoteId)) {
        setActiveCommentNoteId(null);
      }

      await onBatchMutate({ deletes: ids });
      pushHistory({
        label:
          customLabel ||
          (ids.length > 1 ? `Hapus ${ids.length} item` : 'Hapus item'),
        before,
        after,
      });
      if (!customLabel) {
        onNotify(`Dihapus: ${ids.length} item (Ctrl+Z untuk batal)`);
      }
    },
    [activeCommentNoteId, onBatchMutate, onNotify, pushHistory]
  );

  // Paste internal copied block preserving exact relative layout
  const handlePasteCopiedBlock = useCallback(
    async (sourceNotes: FreeStickyNote[], mode: 'paste' | 'duplicate') => {
      if (sourceNotes.length === 0) return;

      const now = Date.now();
      const minX = Math.min(...sourceNotes.map((n) => n.x));
      const minY = Math.min(...sourceNotes.map((n) => n.y));
      const maxX = Math.max(...sourceNotes.map((n) => n.x + (n.cardWidth ?? 272)));
      const maxY = Math.max(...sourceNotes.map((n) => n.y + estimateStickyHeight(n)));
      const blockCenterX = (minX + maxX) / 2;
      const blockCenterY = (minY + maxY) / 2;

      let deltaX = 32;
      let deltaY = 32;

      if (mode === 'paste') {
        pasteCascadeRef.current += 1;
        const anchor = getPreferredPlacement();
        const cascade = (pasteCascadeRef.current - 1) * 24;
        deltaX = anchor.x - blockCenterX + cascade;
        deltaY = anchor.y - blockCenterY + cascade;
      }

      const upserts: FreeStickyNote[] = [];
      const before: Record<string, FreeStickyNote | null> = {};
      const after: Record<string, FreeStickyNote | null> = {};

      sourceNotes.forEach((src) => {
        const newId = makeId('free');
        const nextNote: FreeStickyNote = {
          ...structuredClone(src),
          id: newId,
          author: userName,
          authorColor: userColor,
          x: Math.round(src.x + deltaX),
          y: Math.round(src.y + deltaY),
          votes: {},
          comments: {},
          promotedToBoard: false,
          createdAt: now,
          updatedAt: now,
        };
        upserts.push(nextNote);
        before[newId] = null;
        after[newId] = structuredClone(nextNote);
      });

      await onBatchMutate({ upserts });
      pushHistory({
        label:
          mode === 'duplicate'
            ? `Duplikat ${upserts.length} item`
            : `Tempel ${upserts.length} item`,
        before,
        after,
      });
      selectOnlyIds(upserts.map((n) => n.id));
      onNotify(
        mode === 'duplicate'
          ? `Diduplikat: ${upserts.length} item`
          : `Ditempel: ${upserts.length} item`
      );
    },
    [
      getPreferredPlacement,
      onBatchMutate,
      onNotify,
      pushHistory,
      selectOnlyIds,
      userColor,
      userName,
    ]
  );

  const handleDuplicateSelected = useCallback(async () => {
    const selected = rfNodesRef.current
      .filter((n) => n.selected)
      .map((n) => notesMapRef.current[n.id])
      .filter((n): n is FreeStickyNote => Boolean(n));
    if (selected.length === 0) return;
    await handlePasteCopiedBlock(selected, 'duplicate');
  }, [handlePasteCopiedBlock]);

  const openPromoteModal = useCallback(
    (note: FreeStickyNote) => {
      const firstLine = note.text.split('\n')[0]?.trim() || '';
      setPromoteNote(note);
      setPromoteMode('new');
      setPromoteNewIdeaName(firstLine.slice(0, 64) || `Ide ${note.author}`);
      setPromoteTargetIdeaId(ideas[0]?.id ?? '');
      setPromoteColumnId('problem');
    },
    [ideas]
  );

  const actionsRef = useRef<FreeNoteActions>({
    onLiveUpdateText: () => {},
    onCommitText: () => {},
    onUpdateColor: () => {},
    onCommitResize: () => {},
    onToggleVote: () => {},
    onOpenComments: () => {},
    onOpenLightbox: () => {},
    onOpenPromoteModal: () => {},
    onJumpToIdea: () => {},
    onDelete: () => {},
  });

  actionsRef.current = {
    onLiveUpdateText: (noteId, text) => {
      onUpdateNote(noteId, { text }).catch(() => {});
    },
    onCommitText: (noteId, prevText, nextText) => {
      const current = notesMapRef.current[noteId];
      onUpdateNote(noteId, { text: nextText }).catch(() => {});
      if (current) {
        pushHistory({
          label: 'Edit teks',
          before: { [noteId]: { ...structuredClone(current), text: prevText } },
          after: { [noteId]: { ...structuredClone(current), text: nextText } },
        });
      }
    },
    onUpdateColor: (noteId, color) => {
      const current = notesMapRef.current[noteId];
      onUpdateNote(noteId, { color }).catch(() => {});
      if (current && current.color !== color) {
        pushHistory({
          label: 'Ubah warna',
          before: { [noteId]: structuredClone(current) },
          after: { [noteId]: { ...structuredClone(current), color } },
        });
      }
    },
    onCommitResize: (noteId, prevWidth, nextWidth) => {
      const current = notesMapRef.current[noteId];
      onUpdateNote(noteId, { cardWidth: nextWidth }).catch(() => {});
      if (current) {
        pushHistory({
          label: 'Ubah ukuran gambar',
          before: { [noteId]: { ...structuredClone(current), cardWidth: prevWidth } },
          after: { [noteId]: { ...structuredClone(current), cardWidth: nextWidth } },
        });
      }
    },
    onToggleVote: (noteId, currentlyVoted) => {
      onToggleVote(noteId, currentlyVoted).catch(() => {});
    },
    onOpenComments: (noteId) => {
      setActiveCommentNoteId((prev) => (prev === noteId ? null : noteId));
    },
    onOpenLightbox: (note) => {
      setLightboxNote(note);
    },
    onOpenPromoteModal: (note) => {
      openPromoteModal(note);
    },
    onJumpToIdea: (ideaId) => {
      onJumpToIdeaInBoard(ideaId);
    },
    onDelete: (noteId) => {
      const existing = notesMapRef.current[noteId];
      setActiveCommentNoteId((prev) => (prev === noteId ? null : prev));
      onDeleteNote(noteId).catch(() => {});
      if (existing) {
        pushHistory({
          label: existing.kind === 'image' ? 'Hapus gambar' : 'Hapus sticky note',
          before: { [noteId]: structuredClone(existing) },
          after: { [noteId]: null },
        });
      }
    },
  };

  // Global FigJam Keyboard Shortcuts (Undo, Redo, Copy, Cut, Duplicate, Select All, Delete, V/H/Space)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (lightboxNote) {
        if (e.key === 'Escape') setLightboxNote(null);
        return;
      }

      const editable = isEditableTarget(e.target);

      // Hold Space for temporary Hand/Pan mode (only outside text fields)
      if (e.code === 'Space' && !editable && !e.repeat) {
        e.preventDefault();
        setIsSpacePanning(true);
        return;
      }

      if (editable) return;

      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo().catch(() => {});
        } else {
          handleUndo().catch(() => {});
        }
        return;
      }

      if (mod && key === 'y') {
        e.preventDefault();
        handleRedo().catch(() => {});
        return;
      }

      if (mod && key === 'a') {
        e.preventDefault();
        setRfNodes((prev) => prev.map((n) => ({ ...n, selected: true })));
        return;
      }

      if (mod && key === 'c') {
        const copied = handleCopySelected();
        if (copied.length > 0) e.preventDefault();
        return;
      }

      if (mod && key === 'x') {
        const copied = handleCopySelected(true);
        if (copied.length > 0) {
          e.preventDefault();
          handleDeleteSelected(`Potong ${copied.length} item`).catch(() => {});
          onNotify(`Dipotong: ${copied.length} item (Ctrl+V untuk tempel)`);
        }
        return;
      }

      if (mod && key === 'd') {
        if (rfNodesRef.current.some((n) => n.selected)) {
          e.preventDefault();
          handleDuplicateSelected().catch(() => {});
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (rfNodesRef.current.some((n) => n.selected)) {
          e.preventDefault();
          handleDeleteSelected().catch(() => {});
        }
        return;
      }

      if (!mod && !e.altKey) {
        if (key === 'v') {
          setToolMode('select');
        } else if (key === 'h') {
          setToolMode('hand');
        } else if (e.key === 'Escape') {
          setShowShortcuts(false);
          setRfNodes((prev) => prev.map((n) => ({ ...n, selected: false })));
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePanning(false);
      }
    };

    const onWindowBlur = () => {
      setIsSpacePanning(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [
    handleCopySelected,
    handleDeleteSelected,
    handleDuplicateSelected,
    handleRedo,
    handleUndo,
    lightboxNote,
    onNotify,
    setRfNodes,
  ]);

  // Global Paste Event Listener (Images -> Cloudinary, Copied Blocks -> Exact Layout, External Text -> Sticky Note!)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (lightboxNote) return;

      const items = Array.from(e.clipboardData?.items ?? []);
      const imageBlobs: Blob[] = [];
      items.forEach((item) => {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) imageBlobs.push(blob);
        }
      });

      // Binary screenshots / copied images always paste onto the canvas cleanly!
      if (imageBlobs.length > 0) {
        e.preventDefault();
        handleUploadImageFiles(imageBlobs).catch(() => {});
        return;
      }

      // If focus is inside a text input / textarea, keep native text paste
      if (isEditableTarget(e.target)) return;

      const pastedText = e.clipboardData?.getData('text/plain') ?? '';
      const internal = clipboardBlockRef.current;

      if (internal && (!pastedText || pastedText === internal.marker)) {
        e.preventDefault();
        handlePasteCopiedBlock(internal.notes, 'paste').catch(() => {});
        return;
      }

      if (pastedText.trim()) {
        e.preventDefault();
        const anchor = getPreferredPlacement();
        handleCreateTrackedNote(
          {
            kind: 'sticky',
            text: pastedText.trim(),
            color: activeColor,
            x: anchor.x - 136,
            y: anchor.y - 60,
          },
          'Tempel teks sebagai sticky'
        )
          .then((created) => {
            selectOnlyIds([created.id]);
            onNotify('Teks ditempel menjadi sticky note baru');
          })
          .catch(() => {});
      }
    };

    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [
    activeColor,
    getPreferredPlacement,
    handleCreateTrackedNote,
    handlePasteCopiedBlock,
    handleUploadImageFiles,
    lightboxNote,
    onNotify,
    selectOnlyIds,
  ]);

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

  // Smart diff-merge persistent notesMap -> React Flow nodes
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
        const linkedIdeaName = note.promotedIdeaId
          ? ideaNameById.get(note.promotedIdeaId)
          : undefined;

        if (
          existing &&
          existing.data.note === note &&
          existing.data.linkedIdeaName === linkedIdeaName &&
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
            linkedIdeaName,
            voterKey,
            isCommentActive,
            actionsRef,
          },
        };
      });
    });
  }, [notesMap, ideaNameById, voterKey, activeCommentNoteId, setRfNodes]);

  // Multi-node aware drag handlers (live streaming + atomic batch save + Undo!)
  const handleNodeDragStart: OnNodeDrag<FreeFlowNode> = useCallback(
    (_e, node, nodes) => {
      const dragged = nodes && nodes.length > 0 ? nodes : [node];
      dragged.forEach((n) => {
        draggingIdsRef.current.add(n.id);
        dragStartPosRef.current.set(n.id, {
          x: Math.round(n.position.x),
          y: Math.round(n.position.y),
        });
      });
    },
    []
  );

  const handleNodeDrag: OnNodeDrag<FreeFlowNode> = useCallback(
    (_e, node, nodes) => {
      const now = Date.now();
      if (now - lastDragBroadcastRef.current < 40) return;
      lastDragBroadcastRef.current = now;
      const dragged = nodes && nodes.length > 0 ? nodes : [node];
      dragged.forEach((n) => {
        broadcastLiveDrag(roomId, 'free', {
          id: n.id,
          x: Math.round(n.position.x),
          y: Math.round(n.position.y),
          by: sessionId,
          t: now,
        });
      });
    },
    [roomId, sessionId]
  );

  const handleNodeDragStop: OnNodeDrag<FreeFlowNode> = useCallback(
    (_e, node, nodes) => {
      const dragged = nodes && nodes.length > 0 ? nodes : [node];
      const now = Date.now();
      const positions: Array<{ id: string; x: number; y: number }> = [];
      const before: Record<string, FreeStickyNote | null> = {};
      const after: Record<string, FreeStickyNote | null> = {};
      let movedAny = false;

      dragged.forEach((n) => {
        const x = Math.round(n.position.x);
        const y = Math.round(n.position.y);
        draggingIdsRef.current.delete(n.id);
        localDropLockRef.current.set(n.id, now);
        clearLiveDrag(roomId, 'free', n.id);

        const startPos = dragStartPosRef.current.get(n.id);
        dragStartPosRef.current.delete(n.id);

        const current = notesMapRef.current[n.id];
        if (!startPos || startPos.x !== x || startPos.y !== y) {
          movedAny = true;
          positions.push({ id: n.id, x, y });
          if (current) {
            before[n.id] = {
              ...structuredClone(current),
              x: startPos?.x ?? current.x,
              y: startPos?.y ?? current.y,
            };
            after[n.id] = {
              ...structuredClone(current),
              x,
              y,
            };
          }
        }
      });

      if (movedAny && positions.length > 0) {
        if (positions.length === 1) {
          onUpdateNote(positions[0].id, {
            x: positions[0].x,
            y: positions[0].y,
          }).catch(() => {});
        } else {
          onBatchPositions(positions).catch(() => {});
        }

        if (Object.keys(before).length > 0) {
          pushHistory({
            label:
              positions.length > 1
                ? `Geser ${positions.length} item`
                : 'Geser item',
            before,
            after,
          });
        }
      }
    },
    [roomId, onUpdateNote, onBatchPositions, pushHistory]
  );

  // Real-height Masonry Auto-Arrange (ZERO overlaps, now Undoable & image-width aware!)
  const handleArrangeMasonry = async () => {
    const renderedNodes = getNodes();
    const measuredHeight = new Map<string, number>();
    renderedNodes.forEach((n) => {
      if (n.measured?.height) measuredHeight.set(n.id, n.measured.height);
    });

    const all = Object.values(notesMap).toSorted((a, b) => a.createdAt - b.createdAt);
    if (all.length === 0) return;

    const labels = all.filter((n) => n.kind === 'label');
    const items = all.filter((n) => n.kind !== 'label');

    const positions: Array<{ id: string; x: number; y: number }> = [];
    const before: Record<string, FreeStickyNote | null> = {};
    const after: Record<string, FreeStickyNote | null> = {};

    let topRowMaxH = 0;
    labels.forEach((lbl, idx) => {
      const h = measuredHeight.get(lbl.id) ?? estimateStickyHeight(lbl);
      const nextX = 48 + idx * 372;
      const nextY = 36;
      positions.push({ id: lbl.id, x: nextX, y: nextY });
      before[lbl.id] = structuredClone(lbl);
      after[lbl.id] = { ...structuredClone(lbl), x: nextX, y: nextY };
      topRowMaxH = Math.max(topRowMaxH, h);
    });

    const startY = labels.length > 0 ? 36 + topRowMaxH + 36 : 40;
    const maxItemWidth = items.reduce(
      (maxW, n) => Math.max(maxW, n.kind === 'image' ? (n.cardWidth ?? 300) : 272),
      272
    );
    const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(items.length))));
    const colY = Array.from({ length: cols }, () => startY);
    const COL_PITCH_X = Math.max(304, maxItemWidth + 32);
    const GAP_Y = 28;

    items.forEach((note) => {
      let bestCol = 0;
      for (let i = 1; i < cols; i += 1) {
        if (colY[i] < colY[bestCol]) bestCol = i;
      }
      const h = measuredHeight.get(note.id) ?? estimateStickyHeight(note);
      const nextX = 48 + bestCol * COL_PITCH_X;
      const nextY = Math.round(colY[bestCol]);
      positions.push({ id: note.id, x: nextX, y: nextY });
      before[note.id] = structuredClone(note);
      after[note.id] = { ...structuredClone(note), x: nextX, y: nextY };
      colY[bestCol] += h + GAP_Y;
    });

    await onBatchPositions(positions);
    pushHistory({ label: 'Rapikan susunan', before, after });
    setTimeout(() => fitView({ padding: 0.18, duration: 300 }), 100);
  };

  const handleAddCenterNote = async (kind: 'sticky' | 'label') => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    const centerScreen = rect
      ? {
          x: rect.left + rect.width / 2 + (Math.random() - 0.5) * 100,
          y: rect.top + rect.height / 2 + (Math.random() - 0.5) * 70,
        }
      : { x: 400, y: 300 };
    const flowPos = screenToFlowPosition(centerScreen);
    const created = await handleCreateTrackedNote(
      {
        kind,
        text: '',
        color: kind === 'label' ? 'paper' : activeColor,
        x: flowPos.x - 136,
        y: flowPos.y - 70,
      },
      kind === 'label' ? 'Tambah catatan' : 'Tambah sticky note'
    );
    selectOnlyIds([created.id]);
  };

  const handlePaneDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('react-flow__pane')) return;
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    handleCreateTrackedNote(
      {
        kind: 'sticky',
        text: '',
        color: activeColor,
        x: flowPos.x - 136,
        y: flowPos.y - 60,
      },
      'Tambah sticky note'
    ).catch(() => {});
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      lastFlowPointerRef.current = pos;
      onFlowPointerMove(pos.x, pos.y);
    },
    [screenToFlowPosition, onFlowPointerMove]
  );

  // Drag-and-drop image files from OS directly onto canvas
  const handleDragOverFiles = (e: React.DragEvent) => {
    if (Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (!isDraggingFileOver) setIsDraggingFileOver(true);
    }
  };

  const handleDragLeaveFiles = (e: React.DragEvent) => {
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as globalThis.Node)) {
      setIsDraggingFileOver(false);
    }
  };

  const handleDropFiles = (e: React.DragEvent) => {
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    e.preventDefault();
    setIsDraggingFileOver(false);
    const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    handleUploadImageFiles(Array.from(e.dataTransfer.files), flowPos).catch(() => {});
  };

  const activeNote = activeCommentNoteId ? notesMap[activeCommentNoteId] : null;
  const activeComments = useMemo(() => {
    if (!activeNote?.comments) return [];
    return Object.values(activeNote.comments).toSorted((a, b) => a.createdAt - b.createdAt);
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
      onDragOver={handleDragOverFiles}
      onDragLeave={handleDragLeaveFiles}
      onDrop={handleDropFiles}
      style={{ backgroundColor: 'var(--bg-canvas)' }}
      className={`relative h-[calc(100dvh-57px)] min-h-[560px] w-full overflow-hidden ${
        effectiveToolMode === 'hand' ? 'canvas-hand-mode' : ''
      }`}
    >
      {/* Hidden multi-image file picker triggered by toolbar "Gambar" button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          e.target.value = '';
          if (files.length > 0) {
            handleUploadImageFiles(files).catch(() => {});
          }
        }}
      />

      <ReactFlow
        nodes={rfNodes}
        edges={[]}
        nodeTypes={freeNodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        selectionOnDrag={effectiveToolMode === 'select'}
        panOnDrag={effectiveToolMode === 'hand' ? true : [1, 2]}
        panOnScroll
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode={['Shift', 'Control', 'Meta']}
        deleteKeyCode={null}
        zoomOnDoubleClick={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.8}
      >
        <Background color="var(--dot-grid)" gap={24} size={1.3} />
        <Controls showInteractive={false} position="bottom-left" />
        <FlowCursorsOverlay
          roomId={roomId}
          mySessionId={sessionId}
          tab="free"
          visible
        />
      </ReactFlow>

      {/* Drag-and-Drop Image Overlay */}
      {isDraggingFileOver && (
        <div
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 12%, var(--bg-canvas))',
            borderColor: 'var(--accent)',
          }}
          className="pointer-events-none absolute inset-4 z-40 flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed backdrop-blur-xs"
        >
          <ImagePlus className="h-9 w-9" style={{ color: 'var(--accent)' }} />
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Lepaskan gambar untuk menempel ke Ruang Ide
          </p>
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            Otomatis tersimpan ke Cloudinary & tampil real-time di layar seluruh tim
          </p>
        </div>
      )}

      {/* Live Cloudinary Upload Progress Pill */}
      {uploadingCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            backgroundColor: 'var(--bg-glass)',
            borderColor: 'var(--accent)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-float)',
          }}
          className="absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold backdrop-blur-md"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: 'var(--accent)' }} />
          <span>Mengunggah {uploadingCount} gambar ke Cloudinary...</span>
        </div>
      )}

      {/* Floating Multi-Selection Action Bar (FigJam-style when 1+ items selected) */}
      {selectedIds.length > 0 && uploadingCount === 0 && (
        <div
          style={{
            backgroundColor: 'var(--bg-glass)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-float)',
          }}
          className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border px-2.5 py-1 text-xs backdrop-blur-md"
        >
          <span
            className="px-2 font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {selectedIds.length} dipilih
          </span>
          <span className="h-3.5 w-px" style={{ backgroundColor: 'var(--border)' }} />
          <button
            type="button"
            onClick={() => handleCopySelected()}
            title="Salin pilihan (Ctrl+C)"
            style={{ color: 'var(--text-secondary)' }}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Salin</span>
          </button>
          <button
            type="button"
            onClick={() => handleDuplicateSelected().catch(() => {})}
            title="Duplikat pilihan (Ctrl+D)"
            style={{ color: 'var(--text-secondary)' }}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <CopyPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Duplikat</span>
          </button>
          <button
            type="button"
            onClick={() => handleDeleteSelected().catch(() => {})}
            title="Hapus pilihan (Del)"
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-rose-500 transition hover:bg-rose-500/12"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Hapus</span>
          </button>
        </div>
      )}

      {/* Quiet Floating Top-Left Tip */}
      <div
        style={{
          backgroundColor: 'var(--bg-glass)',
          borderColor: 'var(--border)',
          color: 'var(--text-muted)',
        }}
        className="pointer-events-none absolute left-4 top-3 hidden items-center rounded-full border px-3 py-1 text-[11px] backdrop-blur lg:inline-flex"
      >
        Seret untuk blok banyak kartu • Tahan Space untuk geser kanvas • Ctrl+V tempel screenshot/gambar
      </div>

      {/* Top-Right Shortcut Help Button & Popover Card */}
      <div className="absolute right-4 top-3 z-20 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setShowShortcuts((v) => !v)}
          aria-expanded={showShortcuts}
          aria-label="Lihat pintasan keyboard"
          title="Pintasan keyboard ala FigJam"
          style={{
            backgroundColor: 'var(--bg-glass)',
            borderColor: showShortcuts ? 'var(--accent)' : 'var(--border)',
            color: showShortcuts ? 'var(--accent)' : 'var(--text-secondary)',
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
        >
          <HelpCircle className="h-4 w-4" />
        </button>

        {showShortcuts && (
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border)',
              boxShadow: 'var(--shadow-float)',
            }}
            className="w-64 rounded-2xl border p-3.5 text-xs"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                Pintasan Ruang Ide
              </span>
              <button
                type="button"
                onClick={() => setShowShortcuts(false)}
                aria-label="Tutup daftar pintasan"
                style={{ color: 'var(--text-muted)' }}
                className="rounded p-0.5 hover:text-[var(--text-primary)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <dl className="space-y-1.5 text-[11px]">
              {[
                ['V / H', 'Mode Pilih (Blok) / Geser'],
                ['Tahan Space', 'Geser kanvas sementara'],
                ['Ctrl + Z / Y', 'Undo / Redo aksi'],
                ['Ctrl + C / X / V', 'Salin / Potong / Tempel blok'],
                ['Ctrl + V (Gambar)', 'Tempel screenshot langsung'],
                ['Ctrl + D', 'Duplikat kartu terpilih'],
                ['Ctrl + A', 'Pilih semua item'],
                ['Del / Backspace', 'Hapus item terpilih'],
              ].map(([keys, desc]) => (
                <div key={keys} className="flex items-center justify-between gap-2">
                  <dt
                    className="font-mono-code rounded px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {keys}
                  </dt>
                  <dd style={{ color: 'var(--text-secondary)' }}>{desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      {/* Floating Bottom FigJam Toolbar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center px-3">
        <div className="pointer-events-auto max-w-full overflow-x-auto">
          <CanvasToolbar
            ariaLabel="Alat Kanvas Ruang Ide"
            ariaControls="free-brainstorm-canvas"
          >
            {/* Select (V) vs Hand (H) Mode */}
            <div role="group" aria-label="Mode navigasi kanvas" className="flex items-center gap-1">
              <button
                type="button"
                aria-pressed={effectiveToolMode === 'select'}
                aria-label="Mode pilih dan blok kartu (V)"
                title="Mode Pilih / Blok banyak kartu (V)"
                onClick={() => setToolMode('select')}
                className="inline-flex items-center justify-center rounded-xl p-1.5"
              >
                <MousePointer2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-pressed={effectiveToolMode === 'hand'}
                aria-label="Mode geser kanvas (H atau tahan Space)"
                title="Mode Geser Kanvas (H atau tahan Space)"
                onClick={() => setToolMode('hand')}
                className="inline-flex items-center justify-center rounded-xl p-1.5"
              >
                <Hand className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>

            <span role="separator" aria-orientation="vertical" />

            {/* Create Sticky, Label, or Image */}
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
                <span>Sticky</span>
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

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Unggah gambar (atau cukup Ctrl+V / drag-drop gambar ke kanvas)"
                className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium"
              >
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Gambar</span>
              </button>
            </div>

            <span role="separator" aria-orientation="vertical" />

            {/* Sticky Color Swatches */}
            <div
              role="group"
              aria-label="Pilih warna sticky note"
              className="flex items-center gap-1 px-0.5"
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

            {/* Undo / Redo / Auto-Arrange */}
            <div role="group" aria-label="Riwayat dan tata letak" className="flex items-center gap-1">
              <button
                type="button"
                disabled={historyCounts.undo === 0}
                onClick={() => handleUndo().catch(() => {})}
                aria-label="Undo (Ctrl+Z)"
                title="Undo (Ctrl+Z)"
                className="inline-flex items-center justify-center rounded-xl p-1.5"
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                disabled={historyCounts.redo === 0}
                onClick={() => handleRedo().catch(() => {})}
                aria-label="Redo (Ctrl+Shift+Z)"
                title="Redo (Ctrl+Shift+Z / Ctrl+Y)"
                className="inline-flex items-center justify-center rounded-xl p-1.5"
              >
                <Redo2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={handleArrangeMasonry}
                aria-label="Rapikan susunan tanpa tumpang tindih"
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
          aria-label="Diskusi dan catatan untuk item terpilih"
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
            {activeNote.kind === 'image' && activeNote.imageUrl ? (
              <div
                className="space-y-2 rounded-xl border p-2.5"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border)',
                }}
              >
                <img
                  src={getOptimizedCloudinaryUrl(activeNote.imageUrl, 640)}
                  alt={activeNote.text || 'Preview gambar'}
                  width={activeNote.imageWidth ?? 640}
                  height={activeNote.imageHeight ?? 420}
                  loading="lazy"
                  decoding="async"
                  className="max-h-40 w-full rounded-lg object-contain"
                />
                {activeNote.text && (
                  <p className="text-xs" style={{ color: 'var(--text-primary)' }}>
                    {activeNote.text}
                  </p>
                )}
              </div>
            ) : (
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
            )}

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => openPromoteModal(activeNote)}
                style={{
                  backgroundColor: 'var(--btn-solid-bg)',
                  color: 'var(--btn-solid-fg)',
                }}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition hover:opacity-90"
              >
                <span>Bawa ke Tahap 2 (Bedah)</span>
                <ArrowRight className="h-3 w-3" />
              </button>
              {activeNote.promotedIdeaId && ideaNameById.has(activeNote.promotedIdeaId) && (
                <button
                  type="button"
                  onClick={() => onJumpToIdeaInBoard(activeNote.promotedIdeaId!)}
                  style={{
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium transition hover:bg-[var(--bg-subtle)]"
                >
                  <span>Buka "{ideaNameById.get(activeNote.promotedIdeaId)}"</span>
                </button>
              )}
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

      {/* Promote Sticky Note -> Create New Idea OR Attach to Existing Idea */}
      <ModalDialog
        open={Boolean(promoteNote)}
        onClose={() => setPromoteNote(null)}
        title="Bawa ke Tahap 2: Bedah Ide"
        subtitle="Jadikan bibit ide baru atau gabungkan sebagai bahan bedahan (Masalah/Urgensi/User/Kebutuhan) pada ide yang sudah ada."
        maxWidthClass="max-w-md"
      >
        {promoteNote && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPromoteSubmitting(true);
              try {
                if (promoteMode === 'new') {
                  if (!promoteNewIdeaName.trim()) return;
                  await onCreateIdeaFromSticky(
                    promoteNote,
                    promoteNewIdeaName.trim(),
                    promoteColumnId
                  );
                } else {
                  const targetId = promoteTargetIdeaId || ideas[0]?.id;
                  if (!targetId) return;
                  await onAttachStickyToIdea(promoteNote, targetId, promoteColumnId);
                }
                setPromoteNote(null);
              } finally {
                setPromoteSubmitting(false);
              }
            }}
            className="space-y-4"
          >
            <div
              className="rounded-xl border p-3 text-xs leading-relaxed"
              style={{
                backgroundColor:
                  STICKY_COLORS[promoteNote.color]?.bgVar ?? 'var(--bg-subtle)',
                borderColor:
                  STICKY_COLORS[promoteNote.color]?.borderVar ?? 'var(--border)',
                color: 'var(--sticky-ink)',
              }}
            >
              {promoteNote.text || '(Sticky kosong)'}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPromoteMode('new')}
                className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                  promoteMode === 'new'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                    : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                Buat Ide Baru
                <span className="mt-0.5 block text-[10px] font-normal opacity-80">
                  Punya Bedah, Mindmap & Blueprint sendiri
                </span>
              </button>
              <button
                type="button"
                disabled={ideas.length === 0}
                onClick={() => setPromoteMode('existing')}
                className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition disabled:opacity-40 ${
                  promoteMode === 'existing'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
                    : 'border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                }`}
              >
                Gabung ke Ide Ada
                <span className="mt-0.5 block text-[10px] font-normal opacity-80">
                  Tambahkan ke salah satu 4 pilar
                </span>
              </button>
            </div>

            {promoteMode === 'new' ? (
              <div>
                <label
                  htmlFor="promote-new-idea-name"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Nama Ide Baru
                </label>
                <input
                  id="promote-new-idea-name"
                  type="text"
                  required
                  autoFocus
                  value={promoteNewIdeaName}
                  onChange={(e) => setPromoteNewIdeaName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
                />
              </div>
            ) : (
              <div>
                <label
                  htmlFor="promote-existing-idea"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Pilih Ide Tujuan
                </label>
                <select
                  id="promote-existing-idea"
                  value={promoteTargetIdeaId || ideas[0]?.id || ''}
                  onChange={(e) => setPromoteTargetIdeaId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                >
                  {ideas.map((idea) => (
                    <option key={idea.id} value={idea.id}>
                      {idea.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label
                htmlFor="promote-pillar-col"
                className="block text-xs font-semibold text-[var(--text-primary)]"
              >
                Masukkan ke Pilar Bedah
              </label>
              <select
                id="promote-pillar-col"
                value={promoteColumnId}
                onChange={(e) => setPromoteColumnId(e.target.value as ColumnId)}
                className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
              >
                {BOARD_COLUMNS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.stepNumber}. {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPromoteNote(null)}
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={promoteSubmitting}
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--btn-solid-bg)] px-5 py-1.5 text-xs font-semibold text-[var(--btn-solid-fg)] hover:bg-[var(--btn-solid-hover)] disabled:opacity-50"
              >
                <span>{promoteSubmitting ? 'Memproses...' : 'Buka di Tab Bedah'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* Full-Resolution Image Lightbox */}
      <ModalDialog
        open={Boolean(lightboxNote?.imageUrl)}
        onClose={() => setLightboxNote(null)}
        title={lightboxNote?.text.trim() || 'Pratinjau Gambar'}
        subtitle={lightboxNote ? `Diunggah oleh ${lightboxNote.author}` : undefined}
        maxWidthClass="max-w-4xl"
      >
        {lightboxNote?.imageUrl && (
          <div className="space-y-4">
            <div
              className="flex items-center justify-center overflow-hidden rounded-xl border p-2"
              style={{
                borderColor: 'var(--border)',
                backgroundColor: 'var(--bg-subtle)',
              }}
            >
              <img
                src={getOptimizedCloudinaryUrl(lightboxNote.imageUrl, 1600)}
                alt={lightboxNote.text.trim() || 'Pratinjau gambar penuh'}
                width={lightboxNote.imageWidth ?? 1200}
                height={lightboxNote.imageHeight ?? 800}
                decoding="async"
                className="max-h-[72dvh] w-auto rounded-lg object-contain"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <a
                href={lightboxNote.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Buka Gambar Asli</span>
              </a>
            </div>
          </div>
        )}
      </ModalDialog>
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
