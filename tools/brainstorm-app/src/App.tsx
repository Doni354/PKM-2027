import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { DEFAULT_ROOM_ID } from './data/pkmStarterData';
import { isFirebaseConfigured } from './lib/firebase';
import { synthesizeCanvasFromStages } from './lib/ideaSynthesis';
import { useColorScheme } from './lib/theme';
import {
  addBoardCard,
  addCardComment,
  addFreeNoteComment,
  attachStickyToIdea,
  batchMutateFreeNotes,
  batchUpdateFreeNotePositions,
  batchUpdateIdeaCanvasFields,
  batchUpdateIdeaMindmapPositions,
  broadcastCursor,
  createFreeNote,
  createIdea,
  deleteBoardCard,
  deleteFreeNote,
  deleteFreeNoteComment,
  deleteIdea,
  deleteIdeaMindmapEdge,
  deleteIdeaMindmapNode,
  ensureRoomSeeded,
  joinRoomPresence,
  makeId,
  moveBoardCard,
  pickUserColor,
  renameIdea,
  restoreAllStarterIdeas,
  sanitizeRoomId,
  saveIdeaMindmapEdge,
  saveIdeaMindmapNode,
  setIdeaDecision,
  subscribeBoardCards,
  subscribeConnectionStatus,
  subscribeFreeNotesIncremental,
  subscribeIdeas,
  syncIdeaMindmapRootFromBedah,
  toggleCardVote,
  toggleFreeNoteVote,
  toggleIdeaVote,
  updateBoardCard,
  updateFreeNote,
  updateIdeaCanvasField,
  updateIdeaMindmapNodeFields,
  updatePresenceTab,
  upsertStarterOptionAsIdea,
} from './lib/roomSync';
import {
  downloadMarkdownFile,
  generateBrainstormMarkdown,
  generateSingleIdeaMarkdown,
} from './lib/exportMarkdown';
import type {
  BoardCard,
  ColumnId,
  FreeStickyNote,
  IdeaRecord,
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
import { PreviewResultsTab } from './components/PreviewResultsTab';

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

  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [freeNotes, setFreeNotes] = useState<Record<string, FreeStickyNote>>({});
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [ideasMap, setIdeasMap] = useState<Record<string, IdeaRecord>>({});
  const [activeIdeaId, setActiveIdeaId] = useState<string>('');
  const [dbError, setDbError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sessionIdRef = useRef<string>(makeId('sess'));
  const lastCursorSentRef = useRef<{ time: number; x: number; y: number }>({
    time: 0,
    x: 0,
    y: 0,
  });

  const userColor = pickUserColor(userName || 'Tim');

  const ideaList = useMemo(
    () => Object.values(ideasMap).toSorted((a, b) => a.createdAt - b.createdAt),
    [ideasMap]
  );

  // Keep activeIdeaId valid whenever ideas load or an idea is deleted
  useEffect(() => {
    if (ideaList.length === 0) {
      if (activeIdeaId) setActiveIdeaId('');
      return;
    }
    if (!activeIdeaId || !ideasMap[activeIdeaId]) {
      setActiveIdeaId(ideaList[0].id);
    }
  }, [ideaList, ideasMap, activeIdeaId]);

  const activeIdea = (activeIdeaId && ideasMap[activeIdeaId]) || ideaList[0] || null;

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

  // Join room, seed/migrate once, and subscribe to real-time streams
  useEffect(() => {
    if (!userName || !roomId || !isFirebaseConfigured) return;

    setDbError(null);
    setFreeNotes({});
    setIdeasMap({});
    setCards([]);

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
    const unsubIdeas = subscribeIdeas(roomId, setIdeasMap, handleErr);

    return () => {
      leavePresence();
      unsubFreeNotes();
      unsubCards();
      unsubIdeas();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userName, roomId]);

  useEffect(() => {
    if (!userName || !roomId || !isFirebaseConfigured) return;
    updatePresenceTab(roomId, sessionIdRef.current, activeTab, {
      name: userName,
      color: userColor,
    }).catch(() => {});
  }, [activeTab, userName, userColor, roomId]);

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

  // Multi-Idea Handlers
  const handleCreateNewIdea = async (name: string) => {
    const created = await createIdea(roomId, {
      name,
      createdBy: userName || 'Tim',
    });
    setActiveIdeaId(created.id);
    showToast(`Ide baru "${created.name}" dibuat!`);
  };

  const handleCreateIdeaFromSticky = async (
    note: FreeStickyNote,
    ideaName: string,
    columnId: ColumnId
  ) => {
    const created = await createIdea(roomId, {
      name: ideaName,
      createdBy: userName || 'Tim',
      sourceNote: note,
      initialColumnId: columnId,
    });
    setActiveIdeaId(created.id);
    setActiveTab('board');
    showToast(`Ide "${created.name}" dibuat dari Ruang Ide!`);
  };

  const handleAttachStickyToIdea = async (
    note: FreeStickyNote,
    targetIdeaId: string,
    columnId: ColumnId
  ) => {
    const target = ideasMap[targetIdeaId];
    if (!target) return;
    await attachStickyToIdea(roomId, note, target, columnId, userName || 'Tim');
    setActiveIdeaId(target.id);
    setActiveTab('board');
    showToast(`Ditambahkan ke bedahan "${target.name}"!`);
  };

  const handleRenameIdea = async (ideaId: string, nextName: string) => {
    await renameIdea(roomId, ideaId, nextName, cards);
    showToast(`Nama ide diubah menjadi "${nextName}"`);
  };

  const handleDeleteIdea = async (ideaId: string) => {
    const target = ideasMap[ideaId];
    await deleteIdea(roomId, ideaId, cards);
    showToast(`Ide "${target?.name ?? ''}" dihapus`);
  };

  // Stage 2 (Bedah 4 Pilar) -> Stage 3 (Mindmap Root)
  const handleSyncBedahToMindmap = async (idea: IdeaRecord, navigate = false) => {
    await syncIdeaMindmapRootFromBedah(roomId, idea, cards, userName || 'Tim');
    setActiveIdeaId(idea.id);
    if (navigate) setActiveTab('mindmap');
    showToast(`Root Mindmap "${idea.name}" disinkronkan dari 4 Pilar Bedah!`);
  };

  // Stage 2 + Stage 3 (Bedah + Mindmap) -> Stage 4 (Blueprint Ide Matang)
  const handleSyncStagesToCanvas = async (idea: IdeaRecord, navigate = false) => {
    const { derivedFields } = synthesizeCanvasFromStages(idea, cards);
    const patch = {
      ...derivedFields,
      ...(idea.canvas.maturityStage === 'bibit'
        ? { maturityStage: 'dibedah' as const }
        : {}),
    };
    await batchUpdateIdeaCanvasFields(roomId, idea.id, patch, userName || 'Tim');
    setActiveIdeaId(idea.id);
    if (navigate) setActiveTab('canvas');
    showToast(`Blueprint "${idea.name}" diperbarui dari Bedah & Mindmap!`);
  };

  // Inspirasi Starter Helpers
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

  const handleOpenOptionInStage = async (
    opt: StarterOption,
    stage: 'mindmap' | 'canvas'
  ) => {
    if (!ideasMap[opt.id]) {
      await upsertStarterOptionAsIdea(roomId, opt, userName || 'Tim');
    }
    setActiveIdeaId(opt.id);
    setActiveTab(stage);
    showToast(`Membuka "${opt.shortLabel}"`);
  };

  const handleExportAllMarkdown = () => {
    const md = generateBrainstormMarkdown({
      roomId,
      exportedBy: userName || 'Tim',
      onlineUsers,
      freeNotes,
      cards,
      ideas: ideasMap,
    });
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `portfolio-ide-${roomId}-${dateStamp}.md`;
    downloadMarkdownFile(filename, md);
    showToast(`File ${filename} berhasil diunduh!`);
  };

  const handleExportSingleIdea = (idea: IdeaRecord) => {
    const md = generateSingleIdeaMarkdown({
      roomId,
      exportedBy: userName || 'Tim',
      idea,
      cards,
      freeNotes,
    });
    const slug = sanitizeRoomId(idea.name).slice(0, 40);
    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `ide-${slug}-${dateStamp}.md`;
    downloadMarkdownFile(filename, md);
    showToast(`One-pager "${idea.name}" berhasil diunduh!`);
  };

  return (
    <div className="min-h-dvh bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <Header
        roomId={roomId}
        userName={userName}
        activeTab={activeTab}
        ideaCount={ideaList.length}
        onSelectTab={setActiveTab}
        onlineUsers={onlineUsers}
        isConnected={isConnected}
        onToggleTheme={toggleScheme}
        onOpenJoinModal={() => setJoinModalOpen(true)}
        onOpenInspirasi={() => setInspirasiOpen(true)}
        onExportMarkdown={handleExportAllMarkdown}
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
        {/* Tab 1: Free Brainstorming Canvas (FigJam-style QoL + Visual Reference Images) */}
        <div role="tabpanel" aria-labelledby="tab-free" hidden={activeTab !== 'free'}>
          {activeTab === 'free' && (
            <FreeCanvasTab
              roomId={roomId}
              sessionId={sessionIdRef.current}
              notesMap={freeNotes}
              ideas={ideaList}
              userName={userName || 'Anonim'}
              userColor={userColor}
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
              onBatchMutate={(ops) => batchMutateFreeNotes(roomId, ops)}
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
              onCreateIdeaFromSticky={handleCreateIdeaFromSticky}
              onAttachStickyToIdea={handleAttachStickyToIdea}
              onJumpToIdeaInBoard={(ideaId) => {
                setActiveIdeaId(ideaId);
                setActiveTab('board');
              }}
              onNotify={showToast}
            />
          )}
        </div>

        {/* Tab 2: Per-Idea 4-Pillar Trello Kanban & Problem Synthesis */}
        <div role="tabpanel" aria-labelledby="tab-board" hidden={activeTab !== 'board'}>
          {activeTab === 'board' && (
            <ProblemBoardTab
              roomId={roomId}
              sessionId={sessionIdRef.current}
              ideas={ideaList}
              activeIdea={activeIdea}
              freeNotes={freeNotes}
              cards={cards}
              userName={userName || 'Anonim'}
              onSelectIdea={setActiveIdeaId}
              onCreateIdea={handleCreateNewIdea}
              onRenameIdea={handleRenameIdea}
              onDeleteIdea={handleDeleteIdea}
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
              onSyncBedahToMindmapAndGo={(idea) => handleSyncBedahToMindmap(idea, true)}
            />
          )}
        </div>

        {/* Tab 3: Per-Idea Interactive Mindmap (Root synced from 4 Pillars -> Solutions -> 3 Indicators) */}
        <div role="tabpanel" aria-labelledby="tab-mindmap" hidden={activeTab !== 'mindmap'}>
          {activeTab === 'mindmap' && (
            <MindmapTab
              roomId={roomId}
              sessionId={sessionIdRef.current}
              ideas={ideaList}
              activeIdea={activeIdea}
              cards={cards}
              freeNotes={freeNotes}
              userName={userName || 'Anonim'}
              onSelectIdea={setActiveIdeaId}
              onCreateIdea={handleCreateNewIdea}
              onRenameIdea={handleRenameIdea}
              onDeleteIdea={handleDeleteIdea}
              onFlowPointerMove={(x, y) => sendCursorThrottled('flow', x, y)}
              onSaveNode={(ideaId, node) => saveIdeaMindmapNode(roomId, ideaId, node)}
              onUpdateNodeFields={(ideaId, nodeId, patch) =>
                updateIdeaMindmapNodeFields(roomId, ideaId, nodeId, patch)
              }
              onBatchPositions={(ideaId, positions) =>
                batchUpdateIdeaMindmapPositions(roomId, ideaId, positions)
              }
              onDeleteNode={(ideaId, nodeId) =>
                deleteIdeaMindmapNode(
                  roomId,
                  ideaId,
                  nodeId,
                  ideasMap[ideaId]?.mindmap?.edges ?? {}
                )
              }
              onSaveEdge={(ideaId, edge) => saveIdeaMindmapEdge(roomId, ideaId, edge)}
              onDeleteEdge={(ideaId, edgeId) =>
                deleteIdeaMindmapEdge(roomId, ideaId, edgeId)
              }
              onSyncRootFromBedah={(idea) => handleSyncBedahToMindmap(idea, false)}
              onSyncMindmapToCanvasAndGo={(idea) => handleSyncStagesToCanvas(idea, true)}
            />
          )}
        </div>

        {/* Tab 4: Per-Idea Mature Blueprint & Sustainability Canvas */}
        <div role="tabpanel" aria-labelledby="tab-canvas" hidden={activeTab !== 'canvas'}>
          {activeTab === 'canvas' && (
            <InnovationCanvasTab
              roomId={roomId}
              sessionId={sessionIdRef.current}
              ideas={ideaList}
              activeIdea={activeIdea}
              cards={cards}
              freeNotes={freeNotes}
              onSelectIdea={setActiveIdeaId}
              onCreateIdea={handleCreateNewIdea}
              onRenameIdea={handleRenameIdea}
              onDeleteIdea={handleDeleteIdea}
              onPagePointerMove={(xPct, yPct) => sendCursorThrottled('page', xPct, yPct)}
              onUpdateField={(ideaId, field, value) =>
                updateIdeaCanvasField(roomId, ideaId, field, value, userName || 'Anonim')
              }
              onSyncAllFromStages={(idea) => handleSyncStagesToCanvas(idea, false)}
              onGoToPreview={() => setActiveTab('preview')}
            />
          )}
        </div>

        {/* Tab 5: Multi-Idea Portfolio, Comparison Table & Executive One-Pager Preview */}
        <div role="tabpanel" aria-labelledby="tab-preview" hidden={activeTab !== 'preview'}>
          {activeTab === 'preview' && (
            <PreviewResultsTab
              roomId={roomId}
              sessionId={sessionIdRef.current}
              ideas={ideaList}
              cards={cards}
              freeNotes={freeNotes}
              userName={userName || 'Anonim'}
              onPagePointerMove={(xPct, yPct) => sendCursorThrottled('page', xPct, yPct)}
              onCreateIdea={handleCreateNewIdea}
              onToggleIdeaVote={(ideaId, currentlyVoted) =>
                toggleIdeaVote(roomId, ideaId, userName || 'Anonim', currentlyVoted)
              }
              onChangeDecision={(ideaId, decision) =>
                setIdeaDecision(roomId, ideaId, decision)
              }
              onJumpToStage={(ideaId, tab) => {
                setActiveIdeaId(ideaId);
                setActiveTab(tab);
              }}
              onExportSingleIdea={handleExportSingleIdea}
              onExportAllMarkdown={handleExportAllMarkdown}
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
        onOpenOptionInStage={handleOpenOptionInStage}
        onRestoreStarterIdeas={async () => {
          await restoreAllStarterIdeas(roomId);
          setActiveTab('preview');
          showToast('3 Ide Pemantik lengkap dipulihkan!');
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
