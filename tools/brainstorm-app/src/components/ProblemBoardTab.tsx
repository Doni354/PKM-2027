import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  Circle,
  Edit3,
  GitBranch,
  GripVertical,
  Layers,
  MessageSquare,
  Plus,
  Search,
  Send,
  ThumbsUp,
  Trash2,
} from 'lucide-react';
import { BOARD_COLUMNS, PKM_THEMES } from '../data/pkmStarterData';
import { getCardsForIdea, synthesizeRootFromBedah } from '../lib/ideaSynthesis';
import { sanitizeKey } from '../lib/roomSync';
import type { BoardCard, ColumnId, FreeStickyNote, IdeaRecord } from '../types';
import { IdeaSwitcherBar } from './IdeaSwitcherBar';
import { ModalDialog } from './ModalDialog';
import { PageCursorsOverlay } from './LiveCursorsLayer';

interface ProblemBoardTabProps {
  roomId: string;
  sessionId: string;
  ideas: IdeaRecord[];
  activeIdea: IdeaRecord | null;
  freeNotes: Record<string, FreeStickyNote>;
  cards: BoardCard[];
  userName: string;
  onSelectIdea: (ideaId: string) => void;
  onCreateIdea: (name: string) => Promise<void>;
  onRenameIdea: (ideaId: string, nextName: string) => Promise<void>;
  onDeleteIdea: (ideaId: string) => Promise<void>;
  onPagePointerMove: (xPct: number, yPct: number) => void;
  onAddCard: (payload: {
    ideaId: string;
    columnId: ColumnId;
    title: string;
    content: string;
    ideaGroup: string;
    pkmTheme?: string;
  }) => Promise<void>;
  onUpdateCard: (
    cardId: string,
    patch: Partial<
      Pick<BoardCard, 'title' | 'content' | 'columnId' | 'ideaId' | 'ideaGroup' | 'pkmTheme'>
    >
  ) => Promise<void>;
  onMoveCard: (cardId: string, targetColumnId: ColumnId, newOrder: number) => Promise<void>;
  onDeleteCard: (cardId: string) => Promise<void>;
  onToggleVote: (cardId: string, currentlyVoted: boolean) => Promise<void>;
  onAddComment: (cardId: string, text: string) => Promise<void>;
  onSyncBedahToMindmapAndGo: (idea: IdeaRecord) => Promise<void>;
}

type SortMode = 'manual' | 'votes' | 'newest';

interface DragSession {
  card: BoardCard;
  pointerId: number;
  handleEl: HTMLButtonElement;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  width: number;
  activated: boolean;
  targetColId: ColumnId;
  insertIndex: number;
}

const COLUMN_ORDER: ColumnId[] = ['problem', 'urgency', 'targetUser', 'needs'];

function getVoteCount(card: BoardCard): number {
  return card.votes ? Object.values(card.votes).filter(Boolean).length : 0;
}

function getCardOrder(card: BoardCard): number {
  return typeof card.order === 'number' ? card.order : card.createdAt;
}

function computeFractionalOrder(siblings: BoardCard[], insertIndex: number): number {
  const clamped = Math.max(0, Math.min(insertIndex, siblings.length));
  if (siblings.length === 0) return Date.now();
  const prev = clamped > 0 ? siblings[clamped - 1] : null;
  const next = clamped < siblings.length ? siblings[clamped] : null;

  if (!prev && next) return getCardOrder(next) - 1024;
  if (prev && !next) return getCardOrder(prev) + 1024;
  if (prev && next) {
    const a = getCardOrder(prev);
    const b = getCardOrder(next);
    if (Math.abs(b - a) < 0.0001) return a + 0.5;
    return (a + b) / 2;
  }
  return Date.now();
}

export function ProblemBoardTab({
  roomId,
  sessionId,
  ideas,
  activeIdea,
  freeNotes,
  cards,
  userName,
  onSelectIdea,
  onCreateIdea,
  onRenameIdea,
  onDeleteIdea,
  onPagePointerMove,
  onAddCard,
  onUpdateCard,
  onMoveCard,
  onDeleteCard,
  onToggleVote,
  onAddComment,
  onSyncBedahToMindmapAndGo,
}: ProblemBoardTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingCoordsRef = useRef<{ x: number; y: number } | null>(null);

  const [showAllIdeas, setShowAllIdeas] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortMode>('manual');
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  // Optimistic local Kanban drop overlay (0ms perceived latency)
  const [optimisticMoves, setOptimisticMoves] = useState<
    Record<string, { columnId: ColumnId; order: number }>
  >({});

  const [draggingCard, setDraggingCard] = useState<{
    card: BoardCard;
    width: number;
  } | null>(null);
  const [dropSlot, setDropSlot] = useState<{
    colId: ColumnId;
    index: number;
  } | null>(null);

  // Add/Edit Card Modal state
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<BoardCard | null>(null);
  const [formColumn, setFormColumn] = useState<ColumnId>('problem');
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formIdeaId, setFormIdeaId] = useState('');
  const [formTheme, setFormTheme] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [titleTouched, setTitleTouched] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<BoardCard | null>(null);

  const voterKey = sanitizeKey(userName);

  const effectiveCards = useMemo(() => {
    const keys = Object.keys(optimisticMoves);
    if (keys.length === 0) return cards;
    return cards.map((c) => {
      const ov = optimisticMoves[c.id];
      return ov ? { ...c, columnId: ov.columnId, order: ov.order } : c;
    });
  }, [cards, optimisticMoves]);

  useEffect(() => {
    setOptimisticMoves((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      keys.forEach((id) => {
        const srv = cards.find((c) => c.id === id);
        if (
          !srv ||
          (srv.columnId === prev[id].columnId &&
            Math.abs(getCardOrder(srv) - prev[id].order) < 0.01)
        ) {
          delete next[id];
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [cards]);

  const activeSynthesis = useMemo(
    () => (activeIdea ? synthesizeRootFromBedah(activeIdea, effectiveCards) : null),
    [activeIdea, effectiveCards]
  );

  const filteredCards = useMemo(() => {
    const base =
      !showAllIdeas && activeIdea
        ? getCardsForIdea(effectiveCards, activeIdea)
        : effectiveCards;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q) ||
        c.author.toLowerCase().includes(q) ||
        c.ideaGroup.toLowerCase().includes(q)
    );
  }, [effectiveCards, showAllIdeas, activeIdea, searchQuery]);

  const cardsByColumn = useMemo(() => {
    const map: Record<ColumnId, BoardCard[]> = {
      problem: [],
      urgency: [],
      targetUser: [],
      needs: [],
    };
    filteredCards.forEach((c) => {
      if (map[c.columnId]) map[c.columnId].push(c);
    });
    (Object.keys(map) as ColumnId[]).forEach((colId) => {
      map[colId].sort((a, b) => {
        if (sortBy === 'manual') {
          const diff = getCardOrder(a) - getCardOrder(b);
          if (diff !== 0) return diff;
          return a.createdAt - b.createdAt;
        }
        if (sortBy === 'votes') {
          const diff = getVoteCount(b) - getVoteCount(a);
          if (diff !== 0) return diff;
        }
        return b.createdAt - a.createdAt;
      });
    });
    return map;
  }, [filteredCards, sortBy]);

  const cardsByColumnRef = useRef(cardsByColumn);
  cardsByColumnRef.current = cardsByColumn;

  const commitCardMove = useCallback(
    (card: BoardCard, targetColId: ColumnId, insertIndex: number) => {
      const siblings = (cardsByColumnRef.current[targetColId] ?? []).filter(
        (c) => c.id !== card.id
      );
      const newOrder = computeFractionalOrder(siblings, insertIndex);

      if (sortBy !== 'manual') {
        setSortBy('manual');
      }
      setOptimisticMoves((prev) => ({
        ...prev,
        [card.id]: { columnId: targetColId, order: newOrder },
      }));

      const colMeta = BOARD_COLUMNS.find((c) => c.id === targetColId);
      setLiveAnnouncement(
        `Kartu "${card.title}" dipindahkan ke kolom ${colMeta?.title ?? targetColId}, posisi ${
          Math.min(insertIndex, siblings.length) + 1
        }.`
      );

      onMoveCard(card.id, targetColId, newOrder).catch(() => {
        setOptimisticMoves((prev) => {
          const next = { ...prev };
          delete next[card.id];
          return next;
        });
      });
    },
    [onMoveCard, sortBy]
  );

  const cleanupDragSession = useCallback(() => {
    const session = dragRef.current;
    if (session) {
      try {
        if (session.handleEl.hasPointerCapture(session.pointerId)) {
          session.handleEl.releasePointerCapture(session.pointerId);
        }
      } catch {
        // ignore
      }
    }
    dragRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingCoordsRef.current = null;
    document.documentElement.classList.remove('is-kanban-dragging');
    setDraggingCard(null);
    setDropSlot(null);
  }, []);

  const hitTestDropSlot = useCallback(
    (clientX: number, clientY: number, draggedId: string): { colId: ColumnId; index: number } | null => {
      const hitEl = document.elementFromPoint(clientX, clientY);
      const colEl = hitEl?.closest<HTMLElement>('[data-kanban-col]');
      if (!colEl) return null;

      const colId = colEl.dataset.kanbanCol as ColumnId | undefined;
      if (!colId || !COLUMN_ORDER.includes(colId)) return null;

      const listEl = colEl.querySelector<HTMLElement>('[data-kanban-list]');
      if (!listEl) return { colId, index: 0 };

      const cardEls = Array.from(
        listEl.querySelectorAll<HTMLElement>('[data-kanban-card-id]')
      ).filter((el) => el.dataset.kanbanCardId !== draggedId);

      let insertIndex = cardEls.length;
      for (let i = 0; i < cardEls.length; i += 1) {
        const rect = cardEls[i].getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (clientY < midpoint) {
          insertIndex = i;
          break;
        }
      }

      return { colId, index: insertIndex };
    },
    []
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragRef.current?.activated) {
        e.preventDefault();
        const title = dragRef.current.card.title;
        cleanupDragSession();
        setLiveAnnouncement(`Pemindahan kartu "${title}" dibatalkan.`);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.documentElement.classList.remove('is-kanban-dragging');
    };
  }, [cleanupDragSession]);

  const scheduleGhostTransform = useCallback((x: number, y: number) => {
    pendingCoordsRef.current = { x, y };
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const coords = pendingCoordsRef.current;
      const ghost = ghostRef.current;
      if (coords && ghost) {
        ghost.style.transform = `translate3d(${coords.x}px, ${coords.y}px, 0) rotate(1.2deg) scale(1.02)`;
      }
    });
  }, []);

  const handleDragPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    card: BoardCard
  ) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (dragRef.current) return;

    const cardArticle = e.currentTarget.closest<HTMLElement>('[data-kanban-card-id]');
    if (!cardArticle) return;

    const rect = cardArticle.getBoundingClientRect();
    const handleEl = e.currentTarget;
    handleEl.setPointerCapture(e.pointerId);

    const siblings = (cardsByColumn[card.columnId] ?? []).filter((c) => c.id !== card.id);
    const currentIdx = (cardsByColumn[card.columnId] ?? []).findIndex((c) => c.id === card.id);

    dragRef.current = {
      card,
      pointerId: e.pointerId,
      handleEl,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      activated: false,
      targetColId: card.columnId,
      insertIndex: Math.min(Math.max(0, currentIdx), siblings.length),
    };
  };

  const handleDragPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const session = dragRef.current;
    if (!session || session.pointerId !== e.pointerId) return;

    const dx = e.clientX - session.startX;
    const dy = e.clientY - session.startY;

    if (!session.activated) {
      if (Math.hypot(dx, dy) < 4) return;
      session.activated = true;
      document.documentElement.classList.add('is-kanban-dragging');
      setDraggingCard({ card: session.card, width: session.width });
      setDropSlot({ colId: session.targetColId, index: session.insertIndex });
    }

    scheduleGhostTransform(e.clientX - session.offsetX, e.clientY - session.offsetY);

    const nextHit = hitTestDropSlot(e.clientX, e.clientY, session.card.id);
    if (
      nextHit &&
      (nextHit.colId !== session.targetColId || nextHit.index !== session.insertIndex)
    ) {
      session.targetColId = nextHit.colId;
      session.insertIndex = nextHit.index;
      setDropSlot(nextHit);
    }
  };

  const handleDragPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const session = dragRef.current;
    if (!session || session.pointerId !== e.pointerId) return;

    const wasActivated = session.activated;
    const { card, targetColId, insertIndex } = session;
    cleanupDragSession();

    if (wasActivated) {
      commitCardMove(card, targetColId, insertIndex);
    }
  };

  const handleDragPointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    const session = dragRef.current;
    if (!session || session.pointerId !== e.pointerId) return;
    cleanupDragSession();
  };

  useEffect(() => {
    const session = dragRef.current;
    if (draggingCard && session && ghostRef.current) {
      const coords = pendingCoordsRef.current ?? {
        x: session.startX - session.offsetX,
        y: session.startY - session.offsetY,
      };
      ghostRef.current.style.transform = `translate3d(${coords.x}px, ${coords.y}px, 0) rotate(1.2deg) scale(1.02)`;
    }
  }, [draggingCard]);

  const handleHandleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    card: BoardCard
  ) => {
    const colIdx = COLUMN_ORDER.indexOf(card.columnId);
    const colCards = cardsByColumn[card.columnId] ?? [];
    const cardIdx = colCards.findIndex((c) => c.id === card.id);
    if (cardIdx === -1) return;

    if (e.key === 'ArrowUp' && cardIdx > 0) {
      e.preventDefault();
      commitCardMove(card, card.columnId, cardIdx - 1);
    } else if (e.key === 'ArrowDown' && cardIdx < colCards.length - 1) {
      e.preventDefault();
      commitCardMove(card, card.columnId, cardIdx + 1);
    } else if (e.key === 'ArrowLeft' && colIdx > 0) {
      e.preventDefault();
      const targetCol = COLUMN_ORDER[colIdx - 1];
      commitCardMove(card, targetCol, (cardsByColumn[targetCol] ?? []).length);
    } else if (e.key === 'ArrowRight' && colIdx < COLUMN_ORDER.length - 1) {
      e.preventDefault();
      const targetCol = COLUMN_ORDER[colIdx + 1];
      commitCardMove(card, targetCol, (cardsByColumn[targetCol] ?? []).length);
    }
  };

  const openNewCardModal = (columnId: ColumnId) => {
    setEditingCard(null);
    setFormColumn(columnId);
    setFormTitle('');
    setFormContent('');
    setFormIdeaId(activeIdea?.id ?? ideas[0]?.id ?? '');
    setFormTheme(activeIdea?.canvas?.temaPkm ?? '');
    setTitleTouched(false);
    setCardModalOpen(true);
  };

  const openEditCardModal = (card: BoardCard) => {
    setEditingCard(card);
    setFormColumn(card.columnId);
    setFormTitle(card.title);
    setFormContent(card.content);
    setFormIdeaId(card.ideaId ?? activeIdea?.id ?? ideas[0]?.id ?? '');
    setFormTheme(card.pkmTheme ?? '');
    setTitleTouched(false);
    setCardModalOpen(true);
  };

  const handleCardSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTitleTouched(true);
    if (!formTitle.trim()) return;
    const chosenIdea = ideas.find((i) => i.id === formIdeaId) ?? activeIdea ?? ideas[0];
    if (!chosenIdea) return;

    setFormSubmitting(true);
    try {
      if (editingCard) {
        await onUpdateCard(editingCard.id, {
          ideaId: chosenIdea.id,
          ideaGroup: chosenIdea.name,
          columnId: formColumn,
          title: formTitle.trim(),
          content: formContent.trim(),
          pkmTheme: formTheme.trim(),
        });
      } else {
        await onAddCard({
          ideaId: chosenIdea.id,
          ideaGroup: chosenIdea.name,
          columnId: formColumn,
          title: formTitle.trim(),
          content: formContent.trim(),
          pkmTheme: formTheme.trim(),
        });
      }
      setCardModalOpen(false);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    onPagePointerMove(
      (e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height
    );
  };

  const cycleSortMode = () => {
    setSortBy((s) =>
      s === 'manual' ? 'votes' : s === 'votes' ? 'newest' : 'manual'
    );
  };

  const sortLabel =
    sortBy === 'manual'
      ? 'Urutan Trello'
      : sortBy === 'votes'
      ? 'Top Vote'
      : 'Terbaru';

  const currentColMeta = BOARD_COLUMNS.find((c) => c.id === formColumn) ?? BOARD_COLUMNS[0];

  return (
    <div className="min-h-[calc(100dvh-57px)]">
      {/* Shared Multi-Idea Switcher Bar */}
      <IdeaSwitcherBar
        ideas={ideas}
        activeIdeaId={activeIdea?.id ?? ''}
        cards={cards}
        freeNotes={freeNotes}
        onSelectIdea={(id) => {
          setShowAllIdeas(false);
          onSelectIdea(id);
        }}
        onCreateIdea={onCreateIdea}
        onRenameIdea={onRenameIdea}
        onDeleteIdea={onDeleteIdea}
        stageHint="Tahap 2: Bedah 4 pilar → sintetis jadi Akar Masalah"
        nextCta={
          activeIdea
            ? {
                label: 'Lanjut ke Mindmap',
                onClick: () => {
                  onSyncBedahToMindmapAndGo(activeIdea).catch(() => {});
                },
              }
            : undefined
        }
      />

      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        className="relative mx-auto max-w-[1680px] space-y-5 px-4 py-5 sm:px-6"
      >
        <PageCursorsOverlay
          roomId={roomId}
          mySessionId={sessionId}
          tab="board"
          visible
        />

        <div className="visually-hidden" role="status" aria-live="polite">
          {liveAnnouncement}
        </div>

        {/* Live 4-Pillar Synthesis Card (Bridges Tab 2 Bedah -> Tab 3 Mindmap Root!) */}
        {activeIdea && activeSynthesis && !showAllIdeas && (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      color: 'var(--accent)',
                    }}
                  >
                    <GitBranch className="h-3 w-3" />
                    Sintesis Akar Masalah ({activeSynthesis.filledPillars}/4 Pilar)
                  </span>

                  {[
                    { ok: activeSynthesis.hasProblem, label: '01 Masalah' },
                    { ok: activeSynthesis.hasUrgency, label: '02 Urgensi' },
                    { ok: activeSynthesis.hasTargetUser, label: '03 Target User' },
                    { ok: activeSynthesis.hasNeeds, label: '04 Kebutuhan' },
                  ].map((p) => (
                    <span
                      key={p.label}
                      className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                        p.ok ? 'text-emerald-500' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {p.ok ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Circle className="h-3 w-3" />
                      )}
                      <span>{p.label}</span>
                    </span>
                  ))}
                </div>

                <p className="text-xs leading-relaxed text-[var(--text-primary)] sm:text-[13px]">
                  {activeSynthesis.povStatement}
                </p>
              </div>

              <button
                type="button"
                onClick={() => onSyncBedahToMindmapAndGo(activeIdea)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
              >
                <span>Kirim ke Root Mindmap</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>
        )}

        {/* Filter, Search & Sort Row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAllIdeas((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                showAllIdeas
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>
                {showAllIdeas
                  ? `Semua Ide (${effectiveCards.length} kartu)`
                  : `Fokus: ${activeIdea?.name ?? '-'} (${filteredCards.length} kartu)`}
              </span>
            </button>
            <span className="hidden text-[11px] text-[var(--text-muted)] sm:inline">
              Seret ikon <GripVertical className="inline h-3 w-3 align-[-2px]" /> untuk pindah kolom/urutan
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kartu..."
                aria-label="Cari kartu bedah ide"
                className="w-40 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] py-1.5 pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] sm:w-52"
              />
            </div>

            <button
              type="button"
              onClick={cycleSortMode}
              title="Ganti urutan kartu (Trello Manual / Top Vote / Terbaru)"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            >
              <ArrowUpDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              <span>{sortLabel}</span>
            </button>

            <button
              type="button"
              onClick={() => openNewCardModal('problem')}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--btn-solid-bg)] px-3.5 py-1.5 text-xs font-semibold text-[var(--btn-solid-fg)] transition hover:bg-[var(--btn-solid-hover)]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Kartu</span>
            </button>
          </div>
        </div>

        {/* 4 Clean Trello-Style Kanban Columns */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {BOARD_COLUMNS.map((col) => {
            const colCards = cardsByColumn[col.id];
            const isDropCol = draggingCard && dropSlot?.colId === col.id;
            const siblingsWithoutDragged = draggingCard
              ? colCards.filter((c) => c.id !== draggingCard.card.id)
              : colCards;

            return (
              <section
                key={col.id}
                data-kanban-col={col.id}
                aria-label={`Kolom ${col.title}`}
                className={`kanban-column flex min-h-[450px] flex-col rounded-2xl border border-t-2 ${col.topAccent} bg-[var(--bg-subtle)] p-3 transition-colors ${
                  isDropCol
                    ? 'border-[var(--accent)] ring-2 ring-[var(--accent)]/25'
                    : 'border-[var(--border)]'
                }`}
              >
                <div className="mb-3 flex items-start justify-between gap-2 px-1">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono-code text-[11px] font-semibold text-[var(--text-muted)]">
                        {col.stepNumber}
                      </span>
                      <h2 className="text-sm font-bold text-[var(--text-primary)]">{col.title}</h2>
                      <span className="rounded-full bg-[var(--bg-surface)] px-1.5 py-0.2 text-[11px] font-semibold text-[var(--text-muted)]">
                        {colCards.length}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">{col.subtitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openNewCardModal(col.id)}
                    title={`Tambah di ${col.title}`}
                    className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                <div data-kanban-list={col.id} className="flex flex-1 flex-col gap-2.5">
                  {colCards.length === 0 ? (
                    <>
                      {isDropCol && (
                        <div
                          aria-hidden="true"
                          className="h-1.5 rounded-full bg-[var(--drop-marker-color)]"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => openNewCardModal(col.id)}
                        className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)]/45 p-6 text-xs text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                      >
                        <Plus className="mb-1 h-4 w-4" />
                        <span>Tulis {col.title.toLowerCase()}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      {colCards.map((card) => {
                        const isBeingDragged = draggingCard?.card.id === card.id;
                        const siblingIdx = siblingsWithoutDragged.findIndex(
                          (s) => s.id === card.id
                        );
                        const showMarkerBefore =
                          isDropCol &&
                          !isBeingDragged &&
                          siblingIdx !== -1 &&
                          dropSlot?.index === siblingIdx;

                        const votes = getVoteCount(card);
                        const hasVoted = Boolean(card.votes?.[voterKey]);
                        const commentList = card.comments
                          ? Object.values(card.comments).toSorted((a, b) => a.createdAt - b.createdAt)
                          : [];
                        const commentsOpen = Boolean(expandedComments[card.id]);

                        return (
                          <div key={card.id} className="space-y-2.5">
                            {showMarkerBefore && (
                              <div
                                aria-hidden="true"
                                className="h-1.5 rounded-full bg-[var(--drop-marker-color)] shadow-xs"
                              />
                            )}

                            <article
                              data-kanban-card-id={card.id}
                              className={`group rounded-xl border bg-[var(--bg-surface)] p-3.5 transition ${
                                isBeingDragged
                                  ? 'border-dashed border-[var(--accent)] opacity-35'
                                  : 'border-[var(--border)] shadow-[var(--shadow-card)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <button
                                    type="button"
                                    onPointerDown={(e) => handleDragPointerDown(e, card)}
                                    onPointerMove={handleDragPointerMove}
                                    onPointerUp={handleDragPointerUp}
                                    onPointerCancel={handleDragPointerCancel}
                                    onKeyDown={(e) => handleHandleKeyDown(e, card)}
                                    title="Seret kartu (atau fokus + panah ↑↓←→)"
                                    aria-label={`Pindahkan kartu ${card.title}. Seret atau gunakan tombol panah.`}
                                    className="kanban-drag-handle -ml-1 flex h-6 w-5 shrink-0 items-center justify-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--accent)]"
                                  >
                                    <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
                                  </button>
                                  <span className="truncate text-[11px] font-medium text-[var(--text-muted)]">
                                    {card.ideaGroup}
                                  </span>
                                </div>

                                <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() => openEditCardModal(card)}
                                    aria-label={`Edit ${card.title}`}
                                    className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingDelete(card)}
                                    aria-label={`Hapus ${card.title}`}
                                    className="rounded-md p-1 text-[var(--text-muted)] hover:bg-rose-500/15 hover:text-rose-500"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>

                              <h3 className="mt-1 text-[13.5px] font-semibold leading-snug text-[var(--text-primary)]">
                                {card.title}
                              </h3>
                              {card.content && (
                                <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-[var(--text-secondary)]">
                                  {card.content}
                                </p>
                              )}

                              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2.5">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onToggleVote(card.id, hasVoted)}
                                    aria-pressed={hasVoted}
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${
                                      hasVoted
                                        ? 'bg-[var(--btn-solid-bg)] text-[var(--btn-solid-fg)]'
                                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                                  >
                                    <ThumbsUp className="h-3 w-3" />
                                    <span>{votes}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedComments((prev) => ({
                                        ...prev,
                                        [card.id]: !prev[card.id],
                                      }))
                                    }
                                    className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                    <span>{commentList.length || 'Notes'}</span>
                                  </button>
                                </div>

                                <span className="max-w-[100px] truncate text-[11px] text-[var(--text-muted)]">
                                  {card.author}
                                </span>
                              </div>

                              {commentsOpen && (
                                <div className="mt-2.5 space-y-2 border-t border-[var(--border)] pt-2.5">
                                  {commentList.map((cmt) => (
                                    <div
                                      key={cmt.id}
                                      className="rounded-lg bg-[var(--bg-subtle)] px-2.5 py-1.5 text-[11px]"
                                    >
                                      <span
                                        className="font-semibold"
                                        style={{ color: cmt.color }}
                                      >
                                        {cmt.author}:{' '}
                                      </span>
                                      <span className="text-[var(--text-primary)]">
                                        {cmt.text}
                                      </span>
                                    </div>
                                  ))}
                                  <form
                                    onSubmit={async (e) => {
                                      e.preventDefault();
                                      const txt = (commentDrafts[card.id] ?? '').trim();
                                      if (!txt) return;
                                      setCommentDrafts((d) => ({ ...d, [card.id]: '' }));
                                      await onAddComment(card.id, txt);
                                    }}
                                    className="flex items-center gap-1.5"
                                  >
                                    <input
                                      type="text"
                                      value={commentDrafts[card.id] ?? ''}
                                      onChange={(e) =>
                                        setCommentDrafts((d) => ({
                                          ...d,
                                          [card.id]: e.target.value,
                                        }))
                                      }
                                      placeholder="Tambah catatan diskusi..."
                                      className="flex-1 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-1 text-[11px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
                                    />
                                    <button
                                      type="submit"
                                      aria-label="Kirim catatan"
                                      className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--btn-solid-bg)] text-[var(--btn-solid-fg)] hover:bg-[var(--btn-solid-hover)]"
                                    >
                                      <Send className="h-3 w-3" />
                                    </button>
                                  </form>
                                </div>
                              )}
                            </article>
                          </div>
                        );
                      })}

                      {isDropCol && dropSlot && dropSlot.index >= siblingsWithoutDragged.length && (
                        <div
                          aria-hidden="true"
                          className="h-1.5 rounded-full bg-[var(--drop-marker-color)] shadow-xs"
                        />
                      )}
                    </>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* GPU Floating Drag Preview */}
        {draggingCard && (
          <div
            ref={ghostRef}
            aria-hidden="true"
            style={{ width: draggingCard.width }}
            className="pointer-events-none fixed left-0 top-0 z-50 rounded-xl border-2 border-[var(--accent)] bg-[var(--bg-elevated)] p-3.5 shadow-[var(--shadow-float)] will-change-transform"
          >
            <div className="flex items-center gap-1.5">
              <GripVertical className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span className="truncate text-[11px] font-medium text-[var(--text-muted)]">
                {draggingCard.card.ideaGroup}
              </span>
            </div>
            <p className="mt-1 text-[13.5px] font-semibold leading-snug text-[var(--text-primary)]">
              {draggingCard.card.title}
            </p>
            {draggingCard.card.content && (
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                {draggingCard.card.content}
              </p>
            )}
          </div>
        )}

        {/* Add / Edit Card Modal */}
        <ModalDialog
          open={cardModalOpen}
          onClose={() => setCardModalOpen(false)}
          title={editingCard ? 'Edit Kartu' : 'Tambah Kartu Bedah Ide'}
          maxWidthClass="max-w-lg"
        >
          <form onSubmit={handleCardSubmit} noValidate className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="card-idea-select"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Ide Terkait
                </label>
                <select
                  id="card-idea-select"
                  value={formIdeaId}
                  onChange={(e) => setFormIdeaId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                >
                  {ideas.map((idea) => (
                    <option key={idea.id} value={idea.id}>
                      {idea.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="card-column-select"
                  className="block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Pilar Kolom
                </label>
                <select
                  id="card-column-select"
                  value={formColumn}
                  onChange={(e) => setFormColumn(e.target.value as ColumnId)}
                  className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                >
                  {BOARD_COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.stepNumber}. {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="card-title-input"
                className="block text-xs font-semibold text-[var(--text-primary)]"
              >
                Judul Singkat
              </label>
              <span id="card-title-hint" className="mt-0.5 block text-[11px] text-[var(--text-muted)]">
                {currentColMeta.subtitle}
              </span>
              <input
                id="card-title-input"
                type="text"
                required
                autoFocus
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                onBlur={() => setTitleTouched(true)}
                aria-invalid={titleTouched && !formTitle.trim() ? 'true' : 'false'}
                aria-describedby={
                  titleTouched && !formTitle.trim()
                    ? 'card-title-hint card-title-error'
                    : 'card-title-hint'
                }
                placeholder={currentColMeta.placeholderTitle}
                className={`pkm-field-input mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-surface)] ${
                  titleTouched && !formTitle.trim() ? 'user-invalid-fallback' : ''
                }`}
              />
              <div
                id="card-title-error"
                className="pkm-field-error mt-1 items-center gap-1 text-xs font-medium text-rose-500"
              >
                <span>Error: Judul kartu wajib diisi.</span>
              </div>
            </div>

            <div>
              <label
                htmlFor="card-content-input"
                className="block text-xs font-semibold text-[var(--text-primary)]"
              >
                Detail / Penjelasan
              </label>
              <textarea
                id="card-content-input"
                rows={3}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder={currentColMeta.placeholderContent}
                className="pkm-textarea mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
              />
            </div>

            <div>
              <label
                htmlFor="card-theme-input"
                className="block text-xs font-semibold text-[var(--text-primary)]"
              >
                Tema / Kategori (Bebas, Opsional)
              </label>
              <input
                id="card-theme-input"
                type="text"
                list="pkm-theme-datalist"
                value={formTheme}
                onChange={(e) => setFormTheme(e.target.value)}
                placeholder="Ketik tema bebas atau pilih saran tema PKM..."
                className="mt-1 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
              />
              <datalist id="pkm-theme-datalist">
                {PKM_THEMES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCardModalOpen(false)}
                className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className="rounded-full bg-[var(--btn-solid-bg)] px-5 py-1.5 text-xs font-semibold text-[var(--btn-solid-fg)] hover:bg-[var(--btn-solid-hover)] disabled:opacity-50"
              >
                {formSubmitting ? 'Menyimpan...' : editingCard ? 'Simpan' : 'Tambahkan'}
              </button>
            </div>
          </form>
        </ModalDialog>

        {/* Confirm Delete Dialog */}
        <ModalDialog
          open={Boolean(pendingDelete)}
          onClose={() => setPendingDelete(null)}
          title="Hapus kartu ini?"
          maxWidthClass="max-w-sm"
        >
          {pendingDelete && (
            <div className="space-y-4">
              <p className="text-xs text-[var(--text-secondary)]">
                Kartu <strong className="text-[var(--text-primary)]">{pendingDelete.title}</strong> akan dihapus untuk semua anggota di room.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  autoFocus
                  onClick={() => setPendingDelete(null)}
                  className="rounded-full border border-[var(--border)] px-4 py-1.5 text-xs font-medium text-[var(--text-secondary)]"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const id = pendingDelete.id;
                    setPendingDelete(null);
                    await onDeleteCard(id);
                  }}
                  className="rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Hapus
                </button>
              </div>
            </div>
          )}
        </ModalDialog>
      </div>
    </div>
  );
}
