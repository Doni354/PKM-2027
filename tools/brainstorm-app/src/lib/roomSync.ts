import {
  get,
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
  buildMindmapFromFreeText,
  buildMindmapFromOption,
  buildStarterCards,
  buildStarterFreeNotes,
  buildStarterIdeas,
  EMPTY_CANVAS,
  STARTER_OPTIONS,
} from '../data/pkmStarterData';
import { synthesizeRootFromBedah } from './ideaSynthesis';
import type {
  BoardCard,
  ColumnId,
  CursorPosition,
  FreeNoteKind,
  FreeStickyNote,
  IdeaDecision,
  IdeaRecord,
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

function normalizeIdeaRecord(raw: Partial<IdeaRecord> & { id: string }): IdeaRecord {
  return {
    id: raw.id,
    name: raw.name || 'Ide Tanpa Nama',
    color: raw.color || '#6366F1',
    createdBy: raw.createdBy || 'Tim',
    decision: raw.decision || 'kandidat',
    isStarter: raw.isStarter,
    starterOptionId: raw.starterOptionId,
    sourceNoteIds: raw.sourceNoteIds ?? {},
    votes: raw.votes ?? {},
    mindmap: {
      nodes: raw.mindmap?.nodes ?? {},
      edges: raw.mindmap?.edges ?? {},
    },
    canvas: {
      ...EMPTY_CANVAS,
      ...(raw.canvas ?? {}),
      fieldMeta: raw.canvas?.fieldMeta ?? {},
    },
    createdAt: raw.createdAt ?? Date.now(),
    updatedAt: raw.updatedAt ?? Date.now(),
  };
}

/**
 * Seeds a new room AND seamlessly upgrades legacy rooms (like an already-active pkm-ki-2027)
 * into the connected multi-idea model (`rooms/{roomId}/ideas`) without losing existing cards!
 */
export async function ensureRoomSeeded(roomId: string): Promise<void> {
  if (!db) return;

  const freeSeededRef = ref(db, `rooms/${roomId}/meta/freeSeeded`);
  const freeResult = await runTransaction(freeSeededRef, (current) => {
    if (current === true) return;
    return true;
  });

  if (freeResult.committed) {
    await update(ref(db, `rooms/${roomId}`), {
      'meta/createdAt': Date.now(),
      'meta/freeSeeded': true,
      freeNotes: buildStarterFreeNotes(),
    });
  }

  const ideasSeededRef = ref(db, `rooms/${roomId}/meta/ideasSeededV2`);
  const ideasResult = await runTransaction(ideasSeededRef, (current) => {
    if (current === true) return;
    return true;
  });

  if (ideasResult.committed) {
    const [existingCardsSnap, existingCanvasSnap, existingMindmapSnap] =
      await Promise.all([
        get(ref(db, `rooms/${roomId}/cards`)),
        get(ref(db, `rooms/${roomId}/canvas`)),
        get(ref(db, `rooms/${roomId}/mindmap`)),
      ]);

    const existingCards =
      (existingCardsSnap.val() as Record<string, BoardCard> | null) ?? null;
    const existingCanvas =
      (existingCanvasSnap.val() as Partial<InnovationCanvasData> | null) ?? null;
    const existingMindmap =
      (existingMindmapSnap.val() as {
        nodes?: Record<string, MindmapNodeRecord>;
        edges?: Record<string, MindmapEdgeRecord>;
      } | null) ?? null;

    const ideas = buildStarterIdeas();
    const updates: Record<string, unknown> = {
      [`rooms/${roomId}/meta/seeded`]: true,
      [`rooms/${roomId}/meta/ideasSeededV2`]: true,
    };

    if (!existingCards || Object.keys(existingCards).length === 0) {
      // Brand new room: seed starter cards already linked via ideaId
      updates[`rooms/${roomId}/cards`] = buildStarterCards();
    } else {
      // Existing room migration: backfill ideaId on every existing card & create IdeaRecords for custom groups
      const starterByLabel = new Map<string, StarterOption>();
      STARTER_OPTIONS.forEach((o) => starterByLabel.set(o.shortLabel, o));

      const customGroups = new Map<string, BoardCard[]>();

      Object.values(existingCards).forEach((card) => {
        if (card.ideaId) return;
        const matchedStarter =
          (card.starterOptionId &&
            STARTER_OPTIONS.find((o) => o.id === card.starterOptionId)) ||
          starterByLabel.get(card.ideaGroup);

        if (matchedStarter) {
          updates[`rooms/${roomId}/cards/${card.id}/ideaId`] = matchedStarter.id;
        } else {
          const groupName = card.ideaGroup?.trim() || 'Ide Tim';
          const list = customGroups.get(groupName) ?? [];
          list.push(card);
          customGroups.set(groupName, list);
        }
      });

      const now = Date.now();
      let idx = 0;
      customGroups.forEach((groupCards, groupName) => {
        idx += 1;
        const ideaId = `idea-migrated-${sanitizeKey(groupName)}-${idx}`;
        const firstProblem =
          groupCards.find((c) => c.columnId === 'problem') ?? groupCards[0];
        const synth = synthesizeRootFromBedah(
          { id: ideaId, name: groupName },
          groupCards.map((c) => ({ ...c, ideaId }))
        );
        ideas[ideaId] = {
          id: ideaId,
          name: groupName,
          color: pickUserColor(groupName),
          createdBy: firstProblem?.author || 'Tim',
          decision: 'kandidat',
          sourceNoteIds: {},
          votes: {},
          mindmap: buildMindmapFromFreeText(
            synth.rootTitle,
            synth.rootDetail,
            firstProblem?.author || 'Tim'
          ),
          canvas: {
            ...EMPTY_CANVAS,
            judulUsulan: firstProblem?.title || groupName,
            problemUrgensi: synth.povStatement,
            fieldMeta: {},
          },
          createdAt: firstProblem?.createdAt ?? now,
          updatedAt: now,
        };
        groupCards.forEach((c) => {
          updates[`rooms/${roomId}/cards/${c.id}/ideaId`] = ideaId;
        });
      });

      // Preserve any edits made in legacy single canvas/mindmap on matching idea (default opsi-3)
      if (existingCanvas?.judulUsulan?.trim()) {
        const matched = Object.values(ideas).find(
          (idRec) =>
            idRec.canvas.judulUsulan.toLowerCase() ===
            existingCanvas.judulUsulan?.toLowerCase()
        );
        const targetIdea = matched ?? ideas['opsi-3'];
        if (targetIdea) {
          targetIdea.canvas = {
            ...targetIdea.canvas,
            ...existingCanvas,
            fieldMeta: existingCanvas.fieldMeta ?? {},
          };
        }
      }

      if (existingMindmap?.nodes && Object.keys(existingMindmap.nodes).length > 0) {
        const rootNode = Object.values(existingMindmap.nodes).find(
          (n) => n.kind === 'root'
        );
        if (rootNode?.sourceCardId) {
          const matchedStarter = STARTER_OPTIONS.find((o) =>
            rootNode.sourceCardId?.includes(o.id)
          );
          if (matchedStarter && ideas[matchedStarter.id]) {
            ideas[matchedStarter.id].mindmap = {
              nodes: existingMindmap.nodes,
              edges: existingMindmap.edges ?? {},
            };
          }
        }
      }
    }

    updates[`rooms/${roomId}/ideas`] = ideas;
    await update(ref(db), updates);
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
      const raw = snap.val() as Record<string, Partial<OnlineUser> | null> | null;
      if (!raw) {
        onUsersChange([]);
        return;
      }
      const list: OnlineUser[] = Object.entries(raw)
        .filter(
          (entry): entry is [string, Partial<OnlineUser>] =>
            Boolean(entry[1] && typeof entry[1].name === 'string' && entry[1].name.trim())
        )
        .map(([key, u]) => ({
          sessionId: u.sessionId || key,
          name: (u.name || 'Tim').trim(),
          color: u.color || '#6366F1',
          activeTab: (u.activeTab as TabId) || 'free',
          joinedAt: typeof u.joinedAt === 'number' ? u.joinedAt : 0,
        }))
        .toSorted((a, b) => a.joinedAt - b.joinedAt);
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
  activeTab: TabId,
  userMeta?: { name: string; color: string }
): Promise<void> {
  if (!db) return;
  const presenceRef = ref(db, `rooms/${roomId}/presence/${sessionId}`);
  if (userMeta?.name) {
    // Always include core identity fields so switching tabs / refreshing NEVER writes a partial orphan node!
    await update(presenceRef, {
      sessionId,
      name: userMeta.name,
      color: userMeta.color,
      activeTab,
    });
  } else {
    await update(presenceRef, { activeTab });
  }
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
    const raw = snap.val() as Record<string, Partial<CursorPosition> | null> | null;
    if (!raw) {
      onChange([]);
      return;
    }
    const others = Object.values(raw).filter(
      (c): c is CursorPosition =>
        Boolean(
          c &&
            c.sessionId &&
            c.sessionId !== mySessionId &&
            typeof c.name === 'string' &&
            typeof c.x === 'number' &&
            typeof c.y === 'number'
        )
    );
    onChange(others);
  });
}

export function broadcastCursor(roomId: string, payload: CursorPosition): void {
  if (!db) return;
  set(ref(db, `rooms/${roomId}/cursors/${payload.sessionId}`), payload).catch(() => {});
}

// ==========================================
// Ephemeral Live Drag Position Channel (~45 bytes/tick)
// ==========================================

export function broadcastLiveDrag(
  roomId: string,
  channel: string,
  payload: LiveDragPosition
): void {
  if (!db) return;
  const dragRef = ref(db, `rooms/${roomId}/liveDrag/${channel}/${payload.id}`);
  set(dragRef, payload).catch(() => {});
}

export function clearLiveDrag(
  roomId: string,
  channel: string,
  nodeId: string
): void {
  if (!db) return;
  remove(ref(db, `rooms/${roomId}/liveDrag/${channel}/${nodeId}`)).catch(() => {});
}

export function subscribeLiveDrags(
  roomId: string,
  channel: string,
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
// Tab 1: Free Brainstorming Sticky Notes & Visual Images
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
    id?: string;
    kind: FreeNoteKind;
    text: string;
    color: StickyColor;
    author: string;
    authorColor: string;
    tag?: string;
    imageUrl?: string;
    imageWidth?: number;
    imageHeight?: number;
    cardWidth?: number;
    x: number;
    y: number;
  }
): Promise<FreeStickyNote> {
  const id = payload.id || makeId('free');
  const now = Date.now();
  const note: FreeStickyNote = {
    id,
    kind: payload.kind,
    text: payload.text,
    color: payload.color,
    author: payload.author,
    authorColor: payload.authorColor,
    tag: payload.tag ?? '',
    ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
    ...(typeof payload.imageWidth === 'number' ? { imageWidth: payload.imageWidth } : {}),
    ...(typeof payload.imageHeight === 'number' ? { imageHeight: payload.imageHeight } : {}),
    ...(typeof payload.cardWidth === 'number' ? { cardWidth: Math.round(payload.cardWidth) } : {}),
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
  patch: Partial<
    Pick<
      FreeStickyNote,
      'text' | 'color' | 'tag' | 'x' | 'y' | 'cardWidth' | 'promotedToBoard' | 'promotedIdeaId'
    >
  >
): Promise<void> {
  if (!db) return;
  await update(ref(db, `rooms/${roomId}/freeNotes/${noteId}`), {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function batchMutateFreeNotes(
  roomId: string,
  ops: {
    upserts?: FreeStickyNote[];
    deletes?: string[];
  }
): Promise<void> {
  if (!db) return;
  const upserts = ops.upserts ?? [];
  const deletes = ops.deletes ?? [];
  if (upserts.length === 0 && deletes.length === 0) return;

  const now = Date.now();
  const updates: Record<string, FreeStickyNote | null> = {};
  upserts.forEach((note) => {
    updates[`rooms/${roomId}/freeNotes/${note.id}`] = {
      ...note,
      x: Math.round(note.x),
      y: Math.round(note.y),
      updatedAt: now,
    };
  });
  deletes.forEach((id) => {
    updates[`rooms/${roomId}/freeNotes/${id}`] = null;
  });
  await update(ref(db), updates);
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
// First-Class Multi-Idea Entities (Unites Tabs 2, 3, 4 & 5!)
// ==========================================

export function subscribeIdeas(
  roomId: string,
  onChange: (ideas: Record<string, IdeaRecord>) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) return () => {};
  const ideasRef = ref(db, `rooms/${roomId}/ideas`);
  return onValue(
    ideasRef,
    (snap) => {
      const raw = snap.val() as Record<string, Partial<IdeaRecord> & { id: string }> | null;
      if (!raw) {
        onChange({});
        return;
      }
      const normalized: Record<string, IdeaRecord> = {};
      Object.entries(raw).forEach(([key, val]) => {
        if (val) {
          normalized[key] = normalizeIdeaRecord({ ...val, id: val.id || key });
        }
      });
      onChange(normalized);
    },
    (err) => onError?.(err)
  );
}

export async function createIdea(
  roomId: string,
  payload: {
    name: string;
    createdBy: string;
    sourceNote?: FreeStickyNote;
    initialColumnId?: ColumnId;
    initialDetail?: string;
  }
): Promise<IdeaRecord> {
  const id = makeId('idea');
  const now = Date.now();
  const cleanName = payload.name.trim() || 'Ide Baru';
  const detailText =
    payload.initialDetail?.trim() ||
    payload.sourceNote?.text.split('\n').slice(1).join('\n').trim() ||
    payload.sourceNote?.text.trim() ||
    '';

  const idea: IdeaRecord = {
    id,
    name: cleanName,
    color: pickUserColor(cleanName),
    createdBy: payload.createdBy,
    decision: 'kandidat',
    sourceNoteIds: payload.sourceNote ? { [payload.sourceNote.id]: true } : {},
    votes: {},
    mindmap: buildMindmapFromFreeText(
      cleanName,
      detailText || 'Lengkapi 4 pilar di Tab 2 (Bedah) lalu sinkronkan ke Root Mindmap.',
      payload.createdBy,
      payload.sourceNote?.id
    ),
    canvas: {
      ...EMPTY_CANVAS,
      judulUsulan: cleanName,
      problemUrgensi: detailText,
      fieldMeta: {},
    },
    createdAt: now,
    updatedAt: now,
  };

  if (db) {
    const updates: Record<string, unknown> = {
      [`rooms/${roomId}/ideas/${id}`]: idea,
    };

    if (payload.sourceNote) {
      const cardId = makeId('card');
      const card: BoardCard = {
        id: cardId,
        ideaId: id,
        columnId: payload.initialColumnId ?? 'problem',
        order: now,
        title: cleanName,
        content: detailText,
        author: payload.sourceNote.author || payload.createdBy,
        ideaGroup: cleanName,
        pkmTheme: '',
        votes: {},
        comments: {},
        createdAt: now,
        updatedAt: now,
      };
      updates[`rooms/${roomId}/cards/${cardId}`] = card;
      updates[`rooms/${roomId}/freeNotes/${payload.sourceNote.id}/promotedToBoard`] = true;
      updates[`rooms/${roomId}/freeNotes/${payload.sourceNote.id}/promotedIdeaId`] = id;
      updates[`rooms/${roomId}/freeNotes/${payload.sourceNote.id}/tag`] = cleanName;
      updates[`rooms/${roomId}/freeNotes/${payload.sourceNote.id}/updatedAt`] = now;
    }

    await update(ref(db), updates);
  }

  return idea;
}

export async function attachStickyToIdea(
  roomId: string,
  note: FreeStickyNote,
  idea: IdeaRecord,
  columnId: ColumnId,
  authorFallback: string
): Promise<void> {
  if (!db) return;
  const now = Date.now();
  const lines = note.text.split('\n').map((l) => l.trim()).filter(Boolean);
  const title = (lines[0] || 'Temuan dari Ruang Ide').slice(0, 120);
  const content = lines.slice(1).join('\n') || note.text;
  const cardId = makeId('card');

  const card: BoardCard = {
    id: cardId,
    ideaId: idea.id,
    columnId,
    order: now,
    title,
    content,
    author: note.author || authorFallback,
    ideaGroup: idea.name,
    pkmTheme: idea.canvas?.temaPkm || '',
    votes: {},
    comments: {},
    createdAt: now,
    updatedAt: now,
  };

  await update(ref(db), {
    [`rooms/${roomId}/cards/${cardId}`]: card,
    [`rooms/${roomId}/ideas/${idea.id}/sourceNoteIds/${note.id}`]: true,
    [`rooms/${roomId}/ideas/${idea.id}/updatedAt`]: now,
    [`rooms/${roomId}/freeNotes/${note.id}/promotedToBoard`]: true,
    [`rooms/${roomId}/freeNotes/${note.id}/promotedIdeaId`]: idea.id,
    [`rooms/${roomId}/freeNotes/${note.id}/tag`]: idea.name,
    [`rooms/${roomId}/freeNotes/${note.id}/updatedAt`]: now,
  });
}

export async function renameIdea(
  roomId: string,
  ideaId: string,
  nextName: string,
  allCards: BoardCard[]
): Promise<void> {
  if (!db || !nextName.trim()) return;
  const clean = nextName.trim();
  const now = Date.now();
  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/ideas/${ideaId}/name`]: clean,
    [`rooms/${roomId}/ideas/${ideaId}/updatedAt`]: now,
  };
  allCards.forEach((c) => {
    if (c.ideaId === ideaId) {
      updates[`rooms/${roomId}/cards/${c.id}/ideaGroup`] = clean;
    }
  });
  await update(ref(db), updates);
}

export async function deleteIdea(
  roomId: string,
  ideaId: string,
  allCards: BoardCard[]
): Promise<void> {
  if (!db) return;
  const updates: Record<string, null> = {
    [`rooms/${roomId}/ideas/${ideaId}`]: null,
  };
  allCards.forEach((c) => {
    if (c.ideaId === ideaId) {
      updates[`rooms/${roomId}/cards/${c.id}`] = null;
    }
  });
  await update(ref(db), updates);
}

export async function setIdeaDecision(
  roomId: string,
  ideaId: string,
  decision: IdeaDecision
): Promise<void> {
  if (!db) return;
  await update(ref(db, `rooms/${roomId}/ideas/${ideaId}`), {
    decision,
    updatedAt: Date.now(),
  });
}

export async function toggleIdeaVote(
  roomId: string,
  ideaId: string,
  voterName: string,
  currentlyVoted: boolean
): Promise<void> {
  if (!db) return;
  const voterKey = sanitizeKey(voterName);
  const voteRef = ref(db, `rooms/${roomId}/ideas/${ideaId}/votes/${voterKey}`);
  if (currentlyVoted) {
    await remove(voteRef);
  } else {
    await set(voteRef, true);
  }
}

export async function upsertStarterOptionAsIdea(
  roomId: string,
  option: StarterOption,
  author: string
): Promise<IdeaRecord> {
  const now = Date.now();
  const idea: IdeaRecord = {
    id: option.id,
    name: option.shortLabel,
    color: pickUserColor(option.shortLabel),
    createdBy: author,
    decision: 'kandidat',
    isStarter: true,
    starterOptionId: option.id,
    sourceNoteIds: { [`free-starter-${option.id}`]: true },
    votes: {},
    mindmap: buildMindmapFromOption(option, author),
    canvas: {
      ...option.canvasPreset,
      fieldMeta: {},
    },
    createdAt: now,
    updatedAt: now,
  };

  if (db) {
    const starterCards = buildStarterCards();
    const updates: Record<string, unknown> = {
      [`rooms/${roomId}/ideas/${option.id}`]: idea,
    };
    Object.entries(starterCards).forEach(([cardId, card]) => {
      if (card.ideaId === option.id) {
        updates[`rooms/${roomId}/cards/${cardId}`] = card;
      }
    });
    await update(ref(db), updates);
  }

  return idea;
}

export async function restoreAllStarterIdeas(roomId: string): Promise<void> {
  if (!db) return;
  const starterIdeas = buildStarterIdeas();
  const starterCards = buildStarterCards();
  const updates: Record<string, unknown> = {};
  Object.entries(starterIdeas).forEach(([id, idea]) => {
    updates[`rooms/${roomId}/ideas/${id}`] = idea;
  });
  Object.entries(starterCards).forEach(([id, card]) => {
    updates[`rooms/${roomId}/cards/${id}`] = card;
  });
  await update(ref(db), updates);
}

// ==========================================
// Tab 2: Trello-Style Kanban Board (Linked to IdeaRecord via ideaId!)
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
    ideaId: string;
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
    ideaId: payload.ideaId,
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
    Pick<
      BoardCard,
      'title' | 'content' | 'columnId' | 'order' | 'ideaId' | 'ideaGroup' | 'pkmTheme'
    >
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

// ==========================================
// Tab 3: Per-Idea Interactive Mindmap Operations
// ==========================================

export async function saveIdeaMindmapNode(
  roomId: string,
  ideaId: string,
  node: MindmapNodeRecord
): Promise<void> {
  if (!db) return;
  await set(ref(db, `rooms/${roomId}/ideas/${ideaId}/mindmap/nodes/${node.id}`), {
    ...node,
    updatedAt: Date.now(),
  });
}

export async function updateIdeaMindmapNodeFields(
  roomId: string,
  ideaId: string,
  nodeId: string,
  patch: Partial<MindmapNodeRecord>
): Promise<void> {
  if (!db) return;
  await update(ref(db, `rooms/${roomId}/ideas/${ideaId}/mindmap/nodes/${nodeId}`), {
    ...patch,
    updatedAt: Date.now(),
  });
}

export async function batchUpdateIdeaMindmapPositions(
  roomId: string,
  ideaId: string,
  positions: Array<{ id: string; x: number; y: number }>
): Promise<void> {
  if (!db || positions.length === 0) return;
  const now = Date.now();
  const updates: Record<string, number> = {};
  positions.forEach((p) => {
    updates[`rooms/${roomId}/ideas/${ideaId}/mindmap/nodes/${p.id}/x`] = Math.round(p.x);
    updates[`rooms/${roomId}/ideas/${ideaId}/mindmap/nodes/${p.id}/y`] = Math.round(p.y);
    updates[`rooms/${roomId}/ideas/${ideaId}/mindmap/nodes/${p.id}/updatedAt`] = now;
  });
  await update(ref(db), updates);
}

export async function deleteIdeaMindmapNode(
  roomId: string,
  ideaId: string,
  nodeId: string,
  edges: Record<string, MindmapEdgeRecord>
): Promise<void> {
  if (!db) return;
  const updates: Record<string, null> = {
    [`rooms/${roomId}/ideas/${ideaId}/mindmap/nodes/${nodeId}`]: null,
  };
  Object.values(edges).forEach((edge) => {
    if (edge.source === nodeId || edge.target === nodeId) {
      updates[`rooms/${roomId}/ideas/${ideaId}/mindmap/edges/${edge.id}`] = null;
    }
  });
  await update(ref(db), updates);
}

export async function saveIdeaMindmapEdge(
  roomId: string,
  ideaId: string,
  edge: MindmapEdgeRecord
): Promise<void> {
  if (!db) return;
  await set(ref(db, `rooms/${roomId}/ideas/${ideaId}/mindmap/edges/${edge.id}`), edge);
}

export async function deleteIdeaMindmapEdge(
  roomId: string,
  ideaId: string,
  edgeId: string
): Promise<void> {
  if (!db) return;
  await remove(ref(db, `rooms/${roomId}/ideas/${ideaId}/mindmap/edges/${edgeId}`));
}

/**
 * Explicitly synchronizes an Idea's Mindmap Root Node from its 4 Bedah Pillars!
 */
export async function syncIdeaMindmapRootFromBedah(
  roomId: string,
  idea: IdeaRecord,
  allCards: BoardCard[],
  author: string
): Promise<void> {
  if (!db) return;
  const synth = synthesizeRootFromBedah(idea, allCards);
  const existingNodes = idea.mindmap?.nodes ?? {};
  const existingRoot = Object.values(existingNodes).find((n) => n.kind === 'root');

  if (existingRoot) {
    await update(
      ref(db, `rooms/${roomId}/ideas/${idea.id}/mindmap/nodes/${existingRoot.id}`),
      {
        title: synth.rootTitle,
        detail: synth.rootDetail,
        updatedAt: Date.now(),
      }
    );
  } else {
    const fresh = buildMindmapFromFreeText(synth.rootTitle, synth.rootDetail, author);
    await set(ref(db, `rooms/${roomId}/ideas/${idea.id}/mindmap`), fresh);
  }
}

// ==========================================
// Tab 4: Per-Idea Blueprint / Ide Matang Operations
// ==========================================

export async function updateIdeaCanvasField(
  roomId: string,
  ideaId: string,
  field: Exclude<keyof InnovationCanvasData, 'fieldMeta'>,
  value: string,
  editorName: string
): Promise<void> {
  if (!db) return;
  const now = Date.now();
  await update(ref(db, `rooms/${roomId}/ideas/${ideaId}/canvas`), {
    [field]: value,
    [`fieldMeta/${field}`]: {
      updatedBy: editorName,
      updatedAt: now,
    },
  });
}

export async function batchUpdateIdeaCanvasFields(
  roomId: string,
  ideaId: string,
  patch: Partial<Omit<InnovationCanvasData, 'fieldMeta'>>,
  editorName: string
): Promise<void> {
  if (!db) return;
  const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;

  const now = Date.now();
  const updates: Record<string, unknown> = {
    [`rooms/${roomId}/ideas/${ideaId}/updatedAt`]: now,
  };
  entries.forEach(([field, val]) => {
    updates[`rooms/${roomId}/ideas/${ideaId}/canvas/${field}`] = val;
    updates[`rooms/${roomId}/ideas/${ideaId}/canvas/fieldMeta/${field}`] = {
      updatedBy: editorName,
      updatedAt: now,
    };
  });
  await update(ref(db), updates);
}
