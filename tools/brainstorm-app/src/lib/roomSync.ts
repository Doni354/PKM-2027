import {
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  update,
  type Unsubscribe,
} from 'firebase/database';
import { db } from './firebase';
import {
  buildMindmapFromCard,
  buildMindmapFromFreeText,
  buildMindmapFromOption,
  buildStarterCards,
  buildStarterFreeNotes,
  EMPTY_CANVAS,
  STARTER_OPTIONS,
} from '../data/pkmStarterData';
import type {
  BoardCard,
  ColumnId,
  CursorPosition,
  FreeNoteKind,
  FreeStickyNote,
  InnovationCanvasData,
  LiveDragPosition,
  MindmapEdgeRecord,
  MindmapNodeRecord,
  NoteComment,
  OnlineUser,
  StarterOption,
  StickyColor,
  TabId,
} from '../types';

export function sanitizeRoomId(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[.#$[\]/\s]+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'pkm-ki-2027';
}

export function sanitizeKey(raw: string): string {
  return (
    raw
      .trim()
      .toLowerCase()
      .replace(/[.#$[\]/\s]+/g, '_')
      .replace(/[^a-z0-9_-]/g, '') || 'anon'
  );
}

const USER_COLORS = [
  '#6366F1',
  '#10B981',
  '#EC4899',
  '#F59E0B',
  '#0EA5E9',
  '#8B5CF6',
  '#14B8A6',
  '#EF4444',
];

export function pickUserColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 100000;
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

export function makeId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export async function ensureRoomSeeded(roomId: string): Promise<void> {
  if (!db) return;

  const seededRef = ref(db, `rooms/${roomId}/meta/seeded`);
  const result = await runTransaction(seededRef, (current) => {
    if (current === true) return;
    return true;
  });

  if (result.committed) {
    const starterCards = buildStarterCards();
    const defaultMindmap = buildMindmapFromOption(STARTER_OPTIONS[2], 'Inspirasi Awal');
    const roomRoot = ref(db, `rooms/${roomId}`);
    await update(roomRoot, {
      'meta/createdAt': Date.now(),
      'meta/seeded': true,
      cards: starterCards,
      mindmap: defaultMindmap,
      canvas: {
        ...EMPTY_CANVAS,
        fieldMeta: {},
      },
    });
  }

  const freeSeededRef = ref(db, `rooms/${roomId}/meta/freeSeeded`);
  const freeResult = await runTransaction(freeSeededRef, (current) => {
    if (current === true) return;
    return true;
  });

  if (freeResult.committed) {
    await update(ref(db, `rooms/${roomId}`), {
      'meta/freeSeeded': true,
      freeNotes: buildStarterFreeNotes(),
    });
  }
}

export function subscribeConnectionStatus(
  onStatus: (connected: boolean) => void
): Unsubscribe {
  if (!db) {
    onStatus(false);
    return () => {};
  }
  const connectedRef = ref(db, '.info/connected');
  return onValue(connectedRef, (snap) => {
    onStatus(Boolean(snap.val()));
  });
}

export function joinRoomPresence(
  roomId: string,
  sessionId: string,
  user: Omit<OnlineUser, 'sessionId' | 'joinedAt'>,
  onUsersChange: (users: OnlineUser[]) => void,
  onError?: (err: Error) => void
): () => void {
  if (!db) {
    onUsersChange([{ ...user, sessionId, joinedAt: Date.now() }]);
    return () => {};
  }

  const myPresenceRef = ref(db, `rooms/${roomId}/presence/${sessionId}`);
  const myCursorRef = ref(db, `rooms/${roomId}/cursors/${sessionId}`);
  const allPresenceRef = ref(db, `rooms/${roomId}/presence`);
  const connectedRef = ref(db, '.info/connected');

  const unsubConn = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      onDisconnect(myPresenceRef).remove().catch(() => {});
      onDisconnect(myCursorRef).remove().catch(() => {});
      set(myPresenceRef, {
        sessionId,
        name: user.name,
        color: user.color,
        activeTab: user.activeTab,
        joinedAt: Date.now(),
      }).catch((e) => onError?.(e));
    }
  });

  const unsubUsers = onValue(
    allPresenceRef,
    (snap) => {
      const raw = snap.val() as Record<string, OnlineUser> | null;
      if (!raw) {
        onUsersChange([]);
        return;
      }
      const list = Object.values(raw).sort((a, b) => a.joinedAt - b.joinedAt);
      onUsersChange(list);
    },
    (err) => onError?.(err)
  );

  return () => {
    unsubConn();
    unsubUsers();
    remove(myPresenceRef).catch(() => {});
    remove(myCursorRef).catch(() => {});
  };
}

export async function updatePresenceTab(
  roomId: string,
  sessionId: string,
  activeTab: TabId
): Promise<void> {
  if (!db) return;
  await set(ref(db, `rooms/${roomId}/presence/${sessionId}/activeTab`), activeTab);
}

// ==========================================
// Live Multiplayer Cursors (Isolated Subscription)
// ==========================================

export function subscribeCursors(
  roomId: string,
  mySessionId: string,
  onChange: (cursors: CursorPosition[]) => void
): Unsubscribe {
  if (!db) return () => {};
  const cursorsRef = ref(db, `rooms/${roomId}/cursors`);
  return onValue(cursorsRef, (snap) => {
    const raw = snap.val() as Record<string, CursorPosition> | null;
    if (!raw) {
      onChange([]);
      return;
    }
    const others = Object.values(raw).filter((c) => c.sessionId !== mySessionId);
    onChange(others);
  });
}

export function broadcastCursor(roomId: string, payload: CursorPosition): void {
  if (!db) return;
  set(ref(db, `rooms/${roomId}/cursors/${payload.sessionId}`), payload).catch(() => {});
}

// ==========================================
// Ephemeral Live Drag Position Channel (~45 bytes/tick, FigJam-like!)
// ==========================================

export function broadcastLiveDrag(
  roomId: string,
  channel: 'free' | 'mindmap',
  payload: LiveDragPosition
): void {
  if (!db) return;
  const dragRef = ref(db, `rooms/${roomId}/liveDrag/${channel}/${payload.id}`);
  set(dragRef, payload).catch(() => {});
}

export function clearLiveDrag(
  roomId: string,
  channel: 'free' | 'mindmap',
  nodeId: string
): void {
  if (!db) return;
  remove(ref(db, `rooms/${roomId}/liveDrag/${channel}/${nodeId}`)).catch(() => {});
}

export function subscribeLiveDrags(
  roomId: string,
  channel: 'free' | 'mindmap',
  mySessionId: string,
  onUpdate: (pos: LiveDragPosition) => void
): Unsubscribe {
  if (!db) return () => {};
  const dragRoot = ref(db, `rooms/${roomId}/liveDrag/${channel}`);

  const handleSnap = (snap: { val: () => unknown }) => {
    const val = snap.val() as LiveDragPosition | null;
    if (!val || val.by === mySessionId) return;
    onUpdate(val);
  };

  const u1 = onChildAdded(dragRoot, handleSnap);
  const u2 = onChildChanged(dragRoot, handleSnap);
  return () => {
    u1();
    u2();
  };
}

// ==========================================
// Tab 1: Free Brainstorming Sticky Notes (Incremental Child Listeners!)
// ==========================================

export function subscribeFreeNotesIncremental(
  roomId: string,
  handlers: {
    onUpsert: (note: FreeStickyNote) => void;
    onRemove: (noteId: string) => void;
    onError?: (err: Error) => void;
  }
): Unsubscribe {
  if (!db) return () => {};
  const notesRef = ref(db, `rooms/${roomId}/freeNotes`);

  const uAdd = onChildAdded(
    notesRef,
    (snap) => {
      const val = snap.val() as FreeStickyNote | null;
      if (val && val.id) handlers.onUpsert(val);
    },
    handlers.onError
  );
  const uChg = onChildChanged(
    notesRef,
    (snap) => {
      const val = snap.val() as FreeStickyNote | null;
      if (val && val.id) handlers.onUpsert(val);
    },
    handlers.onError
  );
  const uRem = onChildRemoved(
    notesRef,
    (snap) => {
      if (snap.key) handlers.onRemove(snap.key);
    },
    handlers.onError
  );

  return () => {
    uAdd();
    uChg();
    uRem();
  };
}

export async function createFreeNote(
  roomId: string,
  payload: {
    kind: FreeNoteKind;
    text: string;
    color: StickyColor;
    author: string;
    authorColor: string;
    tag?: string;
    x: number;
    y: number;
  }
): Promise<FreeStickyNote> {
  const id = makeId('free');
  const now = Date.now();
  const note: FreeStickyNote = {
    id,
    kind: payload.kind,
    text: payload.text,
    color: payload.color,
    author: payload.author,
    authorColor: payload.authorColor,
    tag: payload.tag ?? '',
    x: Math.round(payload.x),
    y: Math.round(payload.y),
    votes: {},
    comments: {},
    createdAt: now,
    updatedAt: now,
  };
  if (db) {
    await set(ref(db, `rooms/${roomId}/freeNotes/${id}`), note);
  }
  return note;
}

export async function updateFreeNote(
  roomId: string,
  noteId: string,
  patch: Partial<Pick<FreeStickyNote, 'text' | 'color' | 'tag' | 'x' | 'y' | 'promotedToBoard'>>
): Promise<void> {
  if (!db) return;
  await update(ref(db, `rooms/${roomId}/freeNotes/${noteId}`), {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function batchUpdateFreeNotePositions(
  roomId: string,
  positions: Array<{ id: string; x: number; y: number }>
): Promise<void> {
  if (!db || positions.length === 0) return;
  const now = Date.now();
  const updates: Record<string, number> = {};
  positions.forEach((p) => {
    updates[`rooms/${roomId}/freeNotes/${p.id}/x`] = Math.round(p.x);
    updates[`rooms/${roomId}/freeNotes/${p.id}/y`] = Math.round(p.y);
    updates[`rooms/${roomId}/freeNotes/${p.id}/updatedAt`] = now;
  });
  await update(ref(db), updates);
}

export async function deleteFreeNote(roomId: string, noteId: string): Promise<void> {
  if (!db) return;
  await remove(ref(db, `rooms/${roomId}/freeNotes/${noteId}`));
}

export async function toggleFreeNoteVote(
  roomId: string,
  noteId: string,
  voterName: string,
  currentlyVoted: boolean
): Promise<void> {
  if (!db) return;
  const voterKey = sanitizeKey(voterName);
  const voteRef = ref(db, `rooms/${roomId}/freeNotes/${noteId}/votes/${voterKey}`);
  if (currentlyVoted) {
    await remove(voteRef);
  } else {
    await set(voteRef, true);
  }
}

export async function addFreeNoteComment(
  roomId: string,
  noteId: string,
  author: string,
  color: string,
  text: string
): Promise<void> {
  if (!db || !text.trim()) return;
  const commentId = makeId('cmt');
  const comment: NoteComment = {
    id: commentId,
    author,
    color,
    text: text.trim(),
    createdAt: Date.now(),
  };
  await set(ref(db, `rooms/${roomId}/freeNotes/${noteId}/comments/${commentId}`), comment);
}

export async function deleteFreeNoteComment(
  roomId: string,
  noteId: string,
  commentId: string
): Promise<void> {
  if (!db) return;
  await remove(ref(db, `rooms/${roomId}/freeNotes/${noteId}/comments/${commentId}`));
}

// ==========================================
// Tab 2: Trello-Style Kanban Board
// ==========================================

export function subscribeBoardCards(
  roomId: string,
  onChange: (cards: BoardCard[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) return () => {};
  const cardsRef = ref(db, `rooms/${roomId}/cards`);
  return onValue(
    cardsRef,
    (snap) => {
      const val = snap.val() as Record<string, BoardCard> | null;
      if (!val) {
        onChange([]);
        return;
      }
      onChange(Object.values(val));
    },
    (err) => onError?.(err)
  );
}

export async function addBoardCard(
  roomId: string,
  payload: {
    columnId: ColumnId;
    title: string;
    content: string;
    author: string;
    ideaGroup: string;
    pkmTheme?: string;
    order?: number;
  }
): Promise<BoardCard> {
  const id = makeId('card');
  const now = Date.now();
  const card: BoardCard = {
    id,
    columnId: payload.columnId,
    order: payload.order ?? now,
    title: payload.title.trim(),
    content: payload.content.trim(),
    author: payload.author,
    ideaGroup: payload.ideaGroup.trim() || 'Ide Baru Tim',
    pkmTheme: payload.pkmTheme || '',
    votes: {},
    comments: {},
    createdAt: now,
    updatedAt: now,
  };
  if (db) {
    await set(ref(db, `rooms/${roomId}/cards/${id}`), card);
  }
  return card;
}

export async function updateBoardCard(
  roomId: string,
  cardId: string,
  patch: Partial<
    Pick<BoardCard, 'title' | 'content' | 'columnId' | 'order' | 'ideaGroup' | 'pkmTheme'>
  >
): Promise<void> {
  if (!db) return;
  await update(ref(db, `rooms/${roomId}/cards/${cardId}`), {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function moveBoardCard(
  roomId: string,
  cardId: string,
  targetColumnId: ColumnId,
  newOrder: number
): Promise<void> {
  if (!db) return;
  await update(ref(db, `rooms/${roomId}/cards/${cardId}`), {
    columnId: targetColumnId,
    order: newOrder,
    updatedAt: Date.now(),
  });
}

export async function deleteBoardCard(roomId: string, cardId: string): Promise<void> {
  if (!db) return;
  await remove(ref(db, `rooms/${roomId}/cards/${cardId}`));
}

export async function toggleCardVote(
  roomId: string,
  cardId: string,
  voterName: string,
  currentlyVoted: boolean
): Promise<void> {
  if (!db) return;
  const voterKey = sanitizeKey(voterName);
  const voteRef = ref(db, `rooms/${roomId}/cards/${cardId}/votes/${voterKey}`);
  if (currentlyVoted) {
    await remove(voteRef);
  } else {
    await set(voteRef, true);
  }
}

export async function addCardComment(
  roomId: string,
  cardId: string,
  author: string,
  color: string,
  text: string
): Promise<void> {
  if (!db || !text.trim()) return;
  const commentId = makeId('cmt');
  const comment: NoteComment = {
    id: commentId,
    author,
    color,
    text: text.trim(),
    createdAt: Date.now(),
  };
  await set(ref(db, `rooms/${roomId}/cards/${cardId}/comments/${commentId}`), comment);
}

export async function seedStarterCardsAgain(roomId: string): Promise<void> {
  if (!db) return;
  const starters = buildStarterCards();
  const updates: Record<string, BoardCard> = {};
  Object.entries(starters).forEach(([id, card]) => {
    updates[`rooms/${roomId}/cards/${id}`] = card;
  });
  await update(ref(db), updates);
}

// ==========================================
// Tab 3: Interactive Mindmap (Incremental Node Listeners!)
// ==========================================

export function subscribeMindmapIncremental(
  roomId: string,
  handlers: {
    onNodeUpsert: (node: MindmapNodeRecord) => void;
    onNodeRemove: (nodeId: string) => void;
    onEdgesChange: (edges: Record<string, MindmapEdgeRecord>) => void;
    onError?: (err: Error) => void;
  }
): Unsubscribe {
  if (!db) return () => {};
  const nodesRef = ref(db, `rooms/${roomId}/mindmap/nodes`);
  const edgesRef = ref(db, `rooms/${roomId}/mindmap/edges`);

  const uAdd = onChildAdded(
    nodesRef,
    (snap) => {
      const val = snap.val() as MindmapNodeRecord | null;
      if (val && val.id) handlers.onNodeUpsert(val);
    },
    handlers.onError
  );
  const uChg = onChildChanged(
    nodesRef,
    (snap) => {
      const val = snap.val() as MindmapNodeRecord | null;
      if (val && val.id) handlers.onNodeUpsert(val);
    },
    handlers.onError
  );
  const uRem = onChildRemoved(
    nodesRef,
    (snap) => {
      if (snap.key) handlers.onNodeRemove(snap.key);
    },
    handlers.onError
  );
  const uEdges = onValue(
    edgesRef,
    (snap) => {
      const val = snap.val() as Record<string, MindmapEdgeRecord> | null;
      handlers.onEdgesChange(val ?? {});
    },
    handlers.onError
  );

  return () => {
    uAdd();
    uChg();
    uRem();
    uEdges();
  };
}

export async function saveMindmapNode(
  roomId: string,
  node: MindmapNodeRecord
): Promise<void> {
  if (!db) return;
  await set(ref(db, `rooms/${roomId}/mindmap/nodes/${node.id}`), {
    ...node,
    updatedAt: Date.now(),
  });
}

export async function updateMindmapNodeFields(
  roomId: string,
  nodeId: string,
  patch: Partial<MindmapNodeRecord>
): Promise<void> {
  if (!db) return;
  await update(ref(db, `rooms/${roomId}/mindmap/nodes/${nodeId}`), {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function batchUpdateMindmapPositions(
  roomId: string,
  positions: Array<{ id: string; x: number; y: number }>
): Promise<void> {
  if (!db || positions.length === 0) return;
  const now = Date.now();
  const updates: Record<string, number> = {};
  positions.forEach((p) => {
    updates[`rooms/${roomId}/mindmap/nodes/${p.id}/x`] = Math.round(p.x);
    updates[`rooms/${roomId}/mindmap/nodes/${p.id}/y`] = Math.round(p.y);
    updates[`rooms/${roomId}/mindmap/nodes/${p.id}/updatedAt`] = now;
  });
  await update(ref(db), updates);
}

export async function deleteMindmapNode(
  roomId: string,
  nodeId: string,
  edges: Record<string, MindmapEdgeRecord>
): Promise<void> {
  if (!db) return;
  const updates: Record<string, null> = {
    [`rooms/${roomId}/mindmap/nodes/${nodeId}`]: null,
  };
  Object.values(edges).forEach((edge) => {
    if (edge.source === nodeId || edge.target === nodeId) {
      updates[`rooms/${roomId}/mindmap/edges/${edge.id}`] = null;
    }
  });
  await update(ref(db), updates);
}

export async function saveMindmapEdge(
  roomId: string,
  edge: MindmapEdgeRecord
): Promise<void> {
  if (!db) return;
  await set(ref(db, `rooms/${roomId}/mindmap/edges/${edge.id}`), edge);
}

export async function deleteMindmapEdge(
  roomId: string,
  edgeId: string
): Promise<void> {
  if (!db) return;
  await remove(ref(db, `rooms/${roomId}/mindmap/edges/${edgeId}`));
}

export async function replaceMindmap(
  roomId: string,
  payload: {
    nodes: Record<string, MindmapNodeRecord>;
    edges: Record<string, MindmapEdgeRecord>;
  }
): Promise<void> {
  if (!db) return;
  await set(ref(db, `rooms/${roomId}/mindmap`), payload);
}

export async function setMindmapRootFromCard(
  roomId: string,
  card: BoardCard,
  author: string
): Promise<void> {
  const payload = buildMindmapFromCard(card, author);
  await replaceMindmap(roomId, payload);
}

export async function setMindmapRootFromFreeNote(
  roomId: string,
  note: FreeStickyNote,
  author: string
): Promise<void> {
  const firstLine = note.text.split('\n')[0]?.trim() || 'Ide Terpilih';
  const rest = note.text.split('\n').slice(1).join('\n').trim();
  const payload = buildMindmapFromFreeText(
    firstLine.slice(0, 120),
    rest || note.text,
    author,
    note.id
  );
  await replaceMindmap(roomId, payload);
}

export async function loadOptionToMindmap(
  roomId: string,
  option: StarterOption,
  author: string
): Promise<void> {
  const payload = buildMindmapFromOption(option, author);
  await replaceMindmap(roomId, payload);
}

// ==========================================
// Tab 4: Universal Innovation & Maturity Canvas
// ==========================================

export function subscribeCanvas(
  roomId: string,
  onChange: (canvas: InnovationCanvasData) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) return () => {};
  const canvasRef = ref(db, `rooms/${roomId}/canvas`);
  return onValue(
    canvasRef,
    (snap) => {
      const val = snap.val() as Partial<InnovationCanvasData> | null;
      onChange({
        ...EMPTY_CANVAS,
        ...(val ?? {}),
        fieldMeta: val?.fieldMeta ?? {},
      });
    },
    (err) => onError?.(err)
  );
}

export async function updateCanvasField(
  roomId: string,
  field: Exclude<keyof InnovationCanvasData, 'fieldMeta'>,
  value: string,
  editorName: string
): Promise<void> {
  if (!db) return;
  const now = Date.now();
  await update(ref(db, `rooms/${roomId}/canvas`), {
    [field]: value,
    [`fieldMeta/${field}`]: {
      updatedBy: editorName,
      updatedAt: now,
    },
  });
}

export async function applyCanvasPreset(
  roomId: string,
  preset: Omit<InnovationCanvasData, 'fieldMeta'>,
  editorName: string
): Promise<void> {
  if (!db) return;
  const now = Date.now();
  const fieldMeta: InnovationCanvasData['fieldMeta'] = {};
  (Object.keys(preset) as Array<keyof typeof preset>).forEach((key) => {
    fieldMeta[key] = { updatedBy: editorName, updatedAt: now };
  });
  await set(ref(db, `rooms/${roomId}/canvas`), {
    ...preset,
    fieldMeta,
  });
}
