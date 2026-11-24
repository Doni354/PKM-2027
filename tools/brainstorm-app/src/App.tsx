import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DEFAULT_ROOM_ID, EMPTY_CANVAS } from './data/pkmStarterData';
import { isFirebaseConfigured } from './lib/firebase';
import { useColorScheme } from './lib/theme';
import {
  addBoardCard,
  addCardComment,
  addFreeNoteComment,
  applyCanvasPreset,
  batchUpdateFreeNotePositions,
  batchUpdateMindmapPositions,
  broadcastCursor,
  createFreeNote,
  deleteBoardCard,
  deleteFreeNote,
  deleteFreeNoteComment,
  deleteMindmapEdge,
  deleteMindmapNode,
  ensureRoomSeeded,
  joinRoomPresence,
  loadOptionToMindmap,
  makeId,
  moveBoardCard,
  pickUserColor,
  sanitizeRoomId,
  saveMindmapEdge,
  saveMindmapNode,
  seedStarterCardsAgain,
  setMindmapRootFromCard,
  setMindmapRootFromFreeNote,
  subscribeBoardCards,
  subscribeCanvas,
  subscribeConnectionStatus,
  subscribeFreeNotesIncremental,
  subscribeMindmapIncremental,
  toggleCardVote,
  toggleFreeNoteVote,
  updateBoardCard,
  updateCanvasField,
  updateFreeNote,
  updateMindmapNodeFields,
  updatePresenceTab,
} from './lib/roomSync';
import { downloadMarkdownFile, generateBrainstormMarkdown } from './lib/exportMarkdown';
import type {
  BoardCard,
  FreeStickyNote,
  InnovationCanvasData,
  MindmapEdgeRecord,
  MindmapNodeRecord,
  OnlineUser,
  StarterOption,
  TabId,
} from './types';
import { Header } from './components/Header';
import { JoinRoomModal } from './components/JoinRoomModal';
import { InspirasiModal } from './components/InspirasiModal';
import { FreeCanvasTab } from './components/FreeCanvasTab';
import { ProblemBoardTab } from './components/ProblemBoardTab';
import { MindmapTab } from './components/MindmapTab';
import { InnovationCanvasTab } from './components/InnovationCanvasTab';

const STORAGE_NAME_KEY = 'pkm_ki_2027_user_name';
const STORAGE_ROOM_KEY = 'pkm_ki_2027_room_id';

function getInitialRoomFromUrlOrStorage(): string {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('room');
  if (fromUrl) return sanitizeRoomId(fromUrl);
  const fromStorage = localStorage.getItem(STORAGE_ROOM_KEY);
  return fromStorage ? sanitizeRoomId(fromStorage) : DEFAULT_ROOM_ID;
}

export default function App() {
  const { toggleScheme } = useColorScheme();

  const [userName, setUserName] = useState<string>(
    () => localStorage.getItem(STORAGE_NAME_KEY) ?? ''
  );
  const [roomId, setRoomId] = useState<string>(getInitialRoomFromUrlOrStorage);
  const [joinModalOpen, setJoinModalOpen] = useState<boolean>(
    () => !localStorage.getItem(STORAGE_NAME_KEY)
  );
  const [inspirasiOpen, setInspirasiOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('free');
  const [showCursors, setShowCursors] = useState(true);

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [freeNotes, setFreeNotes] = useState<Record<string, FreeStickyNote>>({});
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [mindmapNodes, setMindmapNodes] = useState<Record<string, MindmapNodeRecord>>({});
  const [mindmapEdges, setMindmapEdges] = useState<Record<string, MindmapEdgeRecord>>({});
  const [canvas, setCanvas] = useState<InnovationCanvasData>({
    ...EMPTY_CANVAS,
    fieldMeta: {},
  });
  const [dbError, setDbError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sessionIdRef = useRef<string>(makeId('sess'));
  const lastCursorSentRef = useRef<{ time: number; x: number; y: number }>({
    time: 0,
    x: 0,
    y: 0,
  });

  const userColor = pickUserColor(userName || 'Tim');

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const unsub = subscribeConnectionStatus(setIsConnected);
    return () => unsub();
  }, []);

  // Join room, seed once if empty, and subscribe using incremental listeners
  // Note: Live cursors subscribe inside LiveCursorsLayer so 20Hz cursor motion NEVER re-renders App!
  useEffect(() => {
    if (!userName || !roomId || !isFirebaseConfigured) return;

    setDbError(null);
    setFreeNotes({});
    setMindmapNodes({});
    setMindmapEdges({});

    const handleErr = (err: Error) => {
      setDbError(err.message || 'Gagal menyambung ke Firebase Realtime Database.');
    };

    ensureRoomSeeded(roomId).catch(handleErr);

    const leavePresence = joinRoomPresence(
      roomId,
      sessionIdRef.current,
      {
        name: userName,
        color: pickUserColor(userName),
        activeTab,
      },
      setOnlineUsers,
      handleErr
    );

    const unsubFreeNotes = subscribeFreeNotesIncremental(roomId, {
      onUpsert: (note) => {
        setFreeNotes((prev) => ({ ...prev, [note.id]: note }));
      },
      onRemove: (noteId) => {
        setFreeNotes((prev) => {
          if (!(noteId in prev)) return prev;
          const next = { ...prev };
          delete next[noteId];
          return next;
        });
      },
      onError: handleErr,
    });

    const unsubCards = subscribeBoardCards(roomId, setCards, handleErr);

    const unsubMindmap = subscribeMindmapIncremental(roomId, {
      onNodeUpsert: (node) => {
        setMindmapNodes((prev) => ({ ...prev, [node.id]: node }));
      },
      onNodeRemove: (nodeId) => {
        setMindmapNodes((prev) => {
          if (!(nodeId in prev)) return prev;
          const next = { ...prev };
          delete next[nodeId];
          return next;
        });
      },
      onEdgesChange: setMindmapEdges,
      onError: handleErr,
    });

    const unsubCanvas = subscribeCanvas(roomId, setCanvas, handleErr);

    return () => {
      leavePresence();
      unsubFreeNotes();
      unsubCards();
      unsubMindmap();
      unsubCanvas();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, roomId]);

  useEffect(() => {
    if (!userName || !roomId || !isFirebaseConfigured) return;
    updatePresenceTab(roomId, sessionIdRef.current, activeTab).catch(() => {});
  }, [activeTab, userName, roomId]);

  const sendCursorThrottled = useCallback(
    (space: 'flow' | 'page', x: number, y: number) => {
      if (!userName || !roomId || !isFirebaseConfigured) return;
      const now = Date.now();
      const prev = lastCursorSentRef.current;
      const elapsed = now - prev.time;
      const minDelta = space === 'flow' ? 4 : 0.004;
      if (elapsed < 45) return;
      if (Math.abs(x - prev.x) < minDelta && Math.abs(y - prev.y) < minDelta) return;

      lastCursorSentRef.current = { time: now, x, y };
      broadcastCursor(roomId, {
        sessionId: sessionIdRef.current,
        name: userName,
        color: userColor,
        tab: activeTab,
        space,
        x: space === 'flow' ? Math.round(x) : Number(x.toFixed(4)),
        y: space === 'flow' ? Math.round(y) : Number(y.toFixed(4)),
        updatedAt: now,
      });
    },
    [userName, roomId, userColor, activeTab]
  );

  const handleJoin = (name: string, nextRoom: string) => {
    localStorage.setItem(STORAGE_NAME_KEY, name);
    localStorage.setItem(STORAGE_ROOM_KEY, nextRoom);
    const url = new URL(window.location.href);
    url.searchParams.set('room', nextRoom);
    window.history.replaceState({}, '', url.toString());

    setUserName(name);
    setRoomId(nextRoom);
    setJoinModalOpen(false);
    showToast(`Masuk room ${nextRoom} sebagai ${name}`);
  };

  // Promote Free Sticky Note -> Tab 2 (Bedah)
  const handlePromoteFreeNoteToBoard = async (note: FreeStickyNote) => {
    const lines = note.text.split('\n').map((l) => l.trim()).filter(Boolean);
    const title = (lines[0] || 'Ide dari Ruang Ide').slice(0, 120);
    const content = lines.slice(1).join('\n') || note.text;
    const groupName = note.tag || `Ide · ${note.author}`;

    await addBoardCard(roomId, {
      columnId: 'problem',
      title,
      content,
      author: note.author || userName || 'Tim',
      ideaGroup: groupName,
    });
    await updateFreeNote(roomId, note.id, { promotedToBoard: true });
    setActiveTab('board');
    showToast('Ide dibawa ke Tab 2 (Bedah)!');
  };

  const handlePromoteFreeNoteToMindmap = async (note: FreeStickyNote) => {
    await setMindmapRootFromFreeNote(roomId, note, userName || 'Tim');
    setActiveTab('mindmap');
    showToast('Ide dijadikan Root Mindmap!');
  };

  const handleSetRootFromCard = async (card: BoardCard) => {
    await setMindmapRootFromCard(roomId, card, userName || 'Tim');
    setActiveTab('mindmap');
    showToast(`"${card.title}" dijadikan Root Mindmap`);
  };

  const handleDropOptionToFreeCanvas = async (opt: StarterOption) => {
    await createFreeNote(roomId, {
      kind: 'sticky',
      text: opt.stickyText,
      color: opt.stickyColor,
      author: userName || 'Inspirasi',
      authorColor: userColor,
      tag: opt.shortLabel,
      x: 100 + Math.random() * 240,
      y: 120 + Math.random() * 140,
    });
    setActiveTab('free');
    showToast(`${opt.shortLabel} ditempel ke Ruang Ide`);
  };

  const handleLoadOptionToMindmap = async (option: StarterOption) => {
    await loadOptionToMindmap(roomId, option, userName || 'Tim');
    setActiveTab('mindmap');
    showToast(`Mindmap ${option.shortLabel} dimuat`);
  };

  const handleLoadOptionToCanvas = async (option: StarterOption) => {
    await applyCanvasPreset(roomId, option.canvasPreset, userName || 'Tim');
    setActiveTab('canvas');
    showToast(`Blueprint ${option.shortLabel} dimuat ke Ide Matang`);
  };

  const handleSyncMindmapToCanvas = async () => {
    const allNodes = Object.values(mindmapNodes);
    const root = allNodes.find((n) => n.kind === 'root');
    const sols = allNodes.filter((n) => n.kind === 'solution');
    const realitas = allNodes.filter((n) => n.kind === 'indicator' && n.tag === 'Realitas');
    const teknis = allNodes.filter((n) => n.kind === 'indicator' && n.tag === 'Teknis');
    const teori = allNodes.filter((n) => n.kind === 'indicator' && n.tag === 'Teori');

    const formatList = (list: MindmapNodeRecord[]) =>
      list
        .map((n) => `- ${n.title}${n.tag ? ` [${n.tag}]` : ''}: ${n.detail}`)
        .join('\n');

    if (root) {
      await updateCanvasField(
        roomId,
        'problemUrgensi',
        `${root.title}\n${root.detail}`,
        userName || 'Tim'
      );
    }
    if (sols.length) {
      await updateCanvasField(roomId, 'solusiNilaiInovasi', formatList(sols), userName || 'Tim');
    }
    if (realitas.length) {
      await updateCanvasField(roomId, 'indikatorRealitas', formatList(realitas), userName || 'Tim');
    }
    if (teknis.length) {
      await updateCanvasField(roomId, 'parameterTeknis', formatList(teknis), userName || 'Tim');
    }
    if (teori.length) {
      await updateCanvasField(roomId, 'landasanTeori', formatList(teori), userName || 'Tim');
    }
    setActiveTab('canvas');
    showToast('Peta Mindmap dikirim ke Tab 4 (Ide Matang)');
  };

  const handleExportMarkdown = () => {
    const md = generateBrainstormMarkdown({
      roomId,
      exportedBy: userName || 'Tim',
      onlineUsers,
      freeNotes,
      cards,
      mindmapNodes,
      mindmapEdges,
      canvas,
    });
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `brainstorming-${roomId}-${dateStamp}.md`;
    downloadMarkdownFile(filename, md);
    showToast(`File ${filename} berhasil diunduh!`);
  };

  return (
    <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <Header
        roomId={roomId}
        userName={userName}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onlineUsers={onlineUsers}
        isConnected={isConnected}
        onToggleTheme={toggleScheme}
        onOpenJoinModal={() => setJoinModalOpen(true)}
        onOpenInspirasi={() => setInspirasiOpen(true)}
        onExportMarkdown={handleExportMarkdown}
      />

      {(!isFirebaseConfigured || dbError) && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-[var(--text-primary)]">
          <div className="mx-auto flex max-w-[1680px] items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <span>
              {!isFirebaseConfigured
                ? 'Konfigurasi Firebase .env belum lengkap. Periksa VITE_FIREBASE_* lalu restart dev server.'
                : `Kendala Firebase RTDB: ${dbError}`}
            </span>
          </div>
        </div>
      )}

      <main>
        {/* Tab 1: Free Brainstorming Canvas (FigJam-style 60fps real-time streaming) */}
        <div role="tabpanel" aria-labelledby="tab-free" hidden={activeTab !== 'free'}>
          {activeTab === 'free' && (
            <FreeCanvasTab
              roomId={roomId}
              sessionId={sessionIdRef.current}
              notesMap={freeNotes}
              userName={userName || 'Anonim'}
              showCursors={showCursors}
              onToggleShowCursors={() => setShowCursors((v) => !v)}
              onFlowPointerMove={(x, y) => sendCursorThrottled('flow', x, y)}
              onCreateNote={(payload) =>
                createFreeNote(roomId, {
                  ...payload,
                  author: userName || 'Anonim',
                  authorColor: userColor,
                })
              }
              onUpdateNote={(noteId, patch) => updateFreeNote(roomId, noteId, patch)}
              onBatchPositions={(positions) => batchUpdateFreeNotePositions(roomId, positions)}
              onDeleteNote={(noteId) => deleteFreeNote(roomId, noteId)}
              onToggleVote={(noteId, currentlyVoted) =>
                toggleFreeNoteVote(roomId, noteId, userName || 'Anonim', currentlyVoted)
              }
              onAddComment={(noteId, text) =>
                addFreeNoteComment(roomId, noteId, userName || 'Anonim', userColor, text)
              }
              onDeleteComment={(noteId, commentId) =>
                deleteFreeNoteComment(roomId, noteId, commentId)
              }
              onPromoteToBoard={handlePromoteFreeNoteToBoard}
              onPromoteToMindmap={handlePromoteFreeNoteToMindmap}
            />
          )}
        </div>

        {/* Tab 2: Trello-Style Drag & Drop Kanban Board */}
        <div role="tabpanel" aria-labelledby="tab-board" hidden={activeTab !== 'board'}>
          {activeTab === 'board' && (
            <ProblemBoardTab
              roomId={roomId}
              sessionId={sessionIdRef.current}
              cards={cards}
              userName={userName || 'Anonim'}
              showCursors={showCursors}
              onPagePointerMove={(xPct, yPct) => sendCursorThrottled('page', xPct, yPct)}
              onAddCard={async (payload) => {
                await addBoardCard(roomId, { ...payload, author: userName || 'Anonim' });
                showToast('Kartu ditambahkan');
              }}
              onUpdateCard={(cardId, patch) => updateBoardCard(roomId, cardId, patch)}
              onMoveCard={(cardId, targetColumnId, newOrder) =>
                moveBoardCard(roomId, cardId, targetColumnId, newOrder)
              }
              onDeleteCard={async (cardId) => {
                await deleteBoardCard(roomId, cardId);
                showToast('Kartu dihapus');
              }}
              onToggleVote={(cardId, currentlyVoted) =>
                toggleCardVote(roomId, cardId, userName || 'Anonim', currentlyVoted)
              }
              onAddComment={(cardId, text) =>
                addCardComment(roomId, cardId, userName || 'Anonim', userColor, text)
              }
              onSetRootMindmap={handleSetRootFromCard}
            />
          )}
        </div>

        {/* Tab 3: Interactive Mindmap (Real-Height Tree Layout + 60fps Live Drag) */}
        <div role="tabpanel" aria-labelledby="tab-mindmap" hidden={activeTab !== 'mindmap'}>
          {activeTab === 'mindmap' && (
            <MindmapTab
              roomId={roomId}
              sessionId={sessionIdRef.current}
              nodesMap={mindmapNodes}
              edgesMap={mindmapEdges}
              userName={userName || 'Anonim'}
              showCursors={showCursors}
              onToggleShowCursors={() => setShowCursors((v) => !v)}
              onFlowPointerMove={(x, y) => sendCursorThrottled('flow', x, y)}
              onSaveNode={(node) => saveMindmapNode(roomId, node)}
              onUpdateNodeFields={(nodeId, patch) =>
                updateMindmapNodeFields(roomId, nodeId, patch)
              }
              onBatchPositions={(positions) => batchUpdateMindmapPositions(roomId, positions)}
              onDeleteNode={(nodeId) => deleteMindmapNode(roomId, nodeId, mindmapEdges)}
              onSaveEdge={(edge) => saveMindmapEdge(roomId, edge)}
              onDeleteEdge={(edgeId) => deleteMindmapEdge(roomId, edgeId)}
              onSyncMindmapToCanvas={handleSyncMindmapToCanvas}
            />
          )}
        </div>

        {/* Tab 4: Universal Ide Matang & Keberlanjutan Canvas */}
        <div role="tabpanel" aria-labelledby="tab-canvas" hidden={activeTab !== 'canvas'}>
          {activeTab === 'canvas' && (
            <InnovationCanvasTab
              roomId={roomId}
              sessionId={sessionIdRef.current}
              canvas={canvas}
              showCursors={showCursors}
              onPagePointerMove={(xPct, yPct) => sendCursorThrottled('page', xPct, yPct)}
              onUpdateField={(field, value) =>
                updateCanvasField(roomId, field, value, userName || 'Anonim')
              }
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <JoinRoomModal
        open={joinModalOpen}
        initialName={userName}
        initialRoomId={roomId}
        canDismiss={Boolean(userName)}
        onClose={() => setJoinModalOpen(false)}
        onJoin={handleJoin}
      />

      <InspirasiModal
        open={inspirasiOpen}
        onClose={() => setInspirasiOpen(false)}
        onDropToFreeCanvas={handleDropOptionToFreeCanvas}
        onLoadToMindmap={handleLoadOptionToMindmap}
        onLoadToCanvas={handleLoadOptionToCanvas}
        onRestoreStarterCards={async () => {
          await seedStarterCardsAgain(roomId);
          setActiveTab('board');
          showToast('Starter cards dipulihkan di Tab 2 (Bedah)');
        }}
      />

      {/* Minimal Live Status Toast */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 right-5 z-50"
      >
        {toast && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-[var(--btn-solid-bg)] px-4 py-2 text-xs font-medium text-[var(--btn-solid-fg)] shadow-[var(--shadow-float)]">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>{toast}</span>
          </div>
        )}
      </div>
    </div>
  );
}
