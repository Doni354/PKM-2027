import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type OnNodeDrag,
} from '@xyflow/react';
import {
  ArrowRight,
  Edit3,
  LayoutGrid,
  MousePointer2,
  Plus,
  Trash2,
} from 'lucide-react';
import { SOLUTION_DOMAIN_TAGS } from '../data/pkmStarterData';
import {
  broadcastLiveDrag,
  clearLiveDrag,
  makeId,
  subscribeLiveDrags,
} from '../lib/roomSync';
import type {
  IndicatorPillar,
  MindmapEdgeRecord,
  MindmapNodeKind,
  MindmapNodeRecord,
  SolutionDomainTag,
} from '../types';
import { CanvasToolbar } from './CanvasToolbar';
import { FlowCursorsOverlay } from './LiveCursorsLayer';
import { ModalDialog } from './ModalDialog';

interface MindmapNodeActions {
  onEdit: (record: MindmapNodeRecord) => void;
  onDelete: (nodeId: string) => void;
  onQuickAddChild: (
    parent: MindmapNodeRecord,
    childKind: 'solution' | 'indicator',
    presetTag?: SolutionDomainTag | IndicatorPillar
  ) => void;
  onQuickChangeTag: (
    nodeId: string,
    tag: SolutionDomainTag | IndicatorPillar
  ) => void;
}

interface MindmapNodeFlowData extends Record<string, unknown> {
  record: MindmapNodeRecord;
  actionsRef: React.MutableRefObject<MindmapNodeActions>;
}

type PkmFlowNode = Node<MindmapNodeFlowData, 'pkmNode'>;

const INDICATOR_PILLARS: IndicatorPillar[] = ['Realitas', 'Teknis', 'Teori'];

function getNodeAccentHex(record: MindmapNodeRecord): string {
  if (record.kind === 'root') return '#6366f1';
  if (record.kind === 'solution') return '#3b82f6';
  if (record.tag === 'Teknis') return '#0ea5e9';
  if (record.tag === 'Teori') return '#a855f7';
  return '#10b981';
}

const PkmMindmapNode = memo(function PkmMindmapNode({
  data,
  selected,
}: NodeProps<PkmFlowNode>) {
  const { record, actionsRef } = data;
  const isRoot = record.kind === 'root';
  const isSolution = record.kind === 'solution';
  const isIndicator = record.kind === 'indicator';
  const accentHex = getNodeAccentHex(record);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: selected ? accentHex : 'var(--border)',
        borderTopColor: accentHex,
        boxShadow: selected ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
      }}
      className={`group w-[300px] rounded-2xl border border-t-[3px] p-4 transition-shadow ${
        selected ? 'ring-2 ring-[var(--accent)]/25' : ''
      }`}
    >
      {!isRoot && (
        <Handle type="target" position={Position.Left} />
      )}

      {/* Sleek Single-Pill Header */}
      <div className="flex items-center justify-between gap-2">
        <span
          style={{
            backgroundColor: `${accentHex}1A`,
            color: accentHex,
          }}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: accentHex }}
          />
          {isRoot
            ? 'Akar Masalah'
            : isSolution
            ? `Solusi · ${record.tag ?? 'Software'}`
            : `Indikator · ${record.tag ?? 'Realitas'}`}
        </span>

        <div className="nodrag flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={() => actionsRef.current.onEdit(record)}
            aria-label={`Edit ${record.title}`}
            style={{ color: 'var(--text-muted)' }}
            className="rounded-md p-1 transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          {!isRoot && (
            <button
              type="button"
              onClick={() => actionsRef.current.onDelete(record.id)}
              aria-label={`Hapus ${record.title}`}
              style={{ color: 'var(--text-muted)' }}
              className="rounded-md p-1 transition hover:bg-rose-500/10 hover:text-rose-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Crisp Title & Description */}
      <h3
        className="mt-2.5 text-[14px] font-bold leading-snug"
        style={{ color: 'var(--text-primary)' }}
      >
        {record.title}
      </h3>
      {record.detail && (
        <p
          className="mt-1.5 whitespace-pre-line text-xs leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {record.detail}
        </p>
      )}

      {/* Tag Switcher: ONLY visible when node is selected to keep canvas ultra-clean! */}
      {selected && (isSolution || isIndicator) && (
        <div
          className="nodrag mt-3 flex flex-wrap gap-1 border-t pt-2.5"
          style={{ borderColor: 'var(--border)' }}
        >
          {(isSolution ? SOLUTION_DOMAIN_TAGS : INDICATOR_PILLARS).map((tag) => {
            const active = record.tag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => actionsRef.current.onQuickChangeTag(record.id, tag)}
                style={
                  active
                    ? { backgroundColor: accentHex, color: '#ffffff' }
                    : {
                        backgroundColor: 'var(--bg-subtle)',
                        color: 'var(--text-secondary)',
                      }
                }
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold transition"
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {/* Minimal Footer */}
      {(isRoot || isSolution) && (
        <div
          className="nodrag mt-3 flex flex-wrap items-center justify-between gap-1.5 border-t pt-2.5"
          style={{ borderColor: 'var(--border)' }}
        >
          <span
            className="max-w-[90px] truncate text-[10px]"
            style={{ color: 'var(--text-muted)' }}
          >
            {record.author}
          </span>

          {isRoot && (
            <button
              type="button"
              onClick={() =>
                actionsRef.current.onQuickAddChild(record, 'solution', 'Software')
              }
              style={{
                backgroundColor: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
              }}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition hover:bg-[var(--accent)] hover:text-white"
            >
              <Plus className="h-3 w-3" />
              <span>Solusi</span>
            </button>
          )}

          {isSolution && (
            <div className="flex flex-wrap gap-1">
              {INDICATOR_PILLARS.map((pillar) => (
                <button
                  key={pillar}
                  type="button"
                  onClick={() =>
                    actionsRef.current.onQuickAddChild(record, 'indicator', pillar)
                  }
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                  className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold transition hover:bg-[var(--accent)] hover:text-white"
                >
                  <Plus className="h-2.5 w-2.5" />
                  <span>{pillar}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
});

const nodeTypes = {
  pkmNode: PkmMindmapNode,
};

function estimateMindmapHeight(rec: MindmapNodeRecord): number {
  const titleLines = Math.max(1, Math.ceil(rec.title.length / 30));
  const detailLines = rec.detail
    ? Math.max(1, Math.ceil(rec.detail.length / 38))
    : 0;
  const footerHeight = rec.kind === 'indicator' ? 18 : 42;
  return 74 + titleLines * 20 + detailLines * 18 + footerHeight;
}

interface MindmapCanvasInnerProps {
  roomId: string;
  sessionId: string;
  nodesMap: Record<string, MindmapNodeRecord>;
  edgesMap: Record<string, MindmapEdgeRecord>;
  userName: string;
  showCursors: boolean;
  onToggleShowCursors: () => void;
  onFlowPointerMove: (x: number, y: number) => void;
  onSaveNode: (node: MindmapNodeRecord) => Promise<void>;
  onUpdateNodeFields: (
    nodeId: string,
    patch: Partial<MindmapNodeRecord>
  ) => Promise<void>;
  onBatchPositions: (positions: Array<{ id: string; x: number; y: number }>) => Promise<void>;
  onDeleteNode: (nodeId: string) => Promise<void>;
  onSaveEdge: (edge: MindmapEdgeRecord) => Promise<void>;
  onDeleteEdge: (edgeId: string) => Promise<void>;
  onSyncMindmapToCanvas: () => Promise<void>;
}

function MindmapCanvasInner({
  roomId,
  sessionId,
  nodesMap,
  edgesMap,
  userName,
  showCursors,
  onToggleShowCursors,
  onFlowPointerMove,
  onSaveNode,
  onUpdateNodeFields,
  onBatchPositions,
  onDeleteNode,
  onSaveEdge,
  onDeleteEdge,
  onSyncMindmapToCanvas,
}: MindmapCanvasInnerProps) {
  const { fitView, screenToFlowPosition, getNodes } = useReactFlow();
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<PkmFlowNode>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const [editingNode, setEditingNode] = useState<MindmapNodeRecord | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDetail, setEditDetail] = useState('');
  const [editKind, setEditKind] = useState<MindmapNodeKind>('solution');
  const [editTag, setEditTag] = useState<SolutionDomainTag | IndicatorPillar>('Software');

  // Optimistic local drag lock & 40ms streaming refs
  const draggingIdsRef = useRef<Set<string>>(new Set());
  const localDropLockRef = useRef<Map<string, number>>(new Map());
  const lastDragBroadcastRef = useRef<number>(0);

  const handleOpenEdit = useCallback((record: MindmapNodeRecord) => {
    setEditingNode(record);
    setEditTitle(record.title);
    setEditDetail(record.detail);
    setEditKind(record.kind);
    setEditTag(
      record.tag ?? (record.kind === 'indicator' ? 'Realitas' : 'Software')
    );
  }, []);

  const actionsRef = useRef<MindmapNodeActions>({
    onEdit: () => {},
    onDelete: () => {},
    onQuickAddChild: () => {},
    onQuickChangeTag: () => {},
  });

  actionsRef.current = {
    onEdit: handleOpenEdit,
    onDelete: (nodeId) => {
      onDeleteNode(nodeId).catch(() => {});
    },
    onQuickChangeTag: (nodeId, tag) => {
      onUpdateNodeFields(nodeId, { tag }).catch(() => {});
    },
    onQuickAddChild: async (parent, childKind, presetTag) => {
      const siblingIds = Object.values(edgesMap)
        .filter((e) => e.source === parent.id)
        .map((e) => e.target)
        .filter((id) => Boolean(nodesMap[id]));

      // Place cleanly below the lowest existing sibling (no overlap!)
      const renderedById = new Map(getNodes().map((n) => [n.id, n]));
      let nextY = parent.y;
      if (siblingIds.length > 0) {
        let maxBottom = -Infinity;
        siblingIds.forEach((sid) => {
          const rec = nodesMap[sid];
          const h =
            renderedById.get(sid)?.measured?.height ?? estimateMindmapHeight(rec);
          maxBottom = Math.max(maxBottom, (rec.y ?? 0) + h);
        });
        nextY = maxBottom + 44;
      }

      const newId = makeId(childKind === 'solution' ? 'sol' : 'ind');
      const newNode: MindmapNodeRecord = {
        id: newId,
        kind: childKind,
        title:
          childKind === 'solution'
            ? `Opsi Solusi ${siblingIds.length + 1}`
            : `Indikator ${presetTag ?? 'Realitas'}`,
        detail:
          childKind === 'solution'
            ? 'Klik edit untuk menjelaskan konsep solusi.'
            : 'Tuliskan parameter ukur atau referensi pendukung.',
        tag: presetTag ?? (childKind === 'solution' ? 'Software' : 'Realitas'),
        author: userName,
        x: parent.x + 440,
        y: Math.round(nextY),
        updatedAt: Date.now(),
      };
      const newEdge: MindmapEdgeRecord = {
        id: `edge-${parent.id}-${newId}`,
        source: parent.id,
        target: newId,
        label: childKind === 'solution' ? 'Solusi' : String(presetTag ?? 'Ukur'),
      };
      await onSaveNode(newNode);
      await onSaveEdge(newEdge);
      handleOpenEdit(newNode);
    },
  };

  // Subscribe to ~45B remote live drag coordinates!
  useEffect(() => {
    if (!roomId) return;
    return subscribeLiveDrags(roomId, 'mindmap', sessionId, (pos) => {
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

  // Smart diff-merge persistent nodesMap -> React Flow
  useEffect(() => {
    const now = Date.now();
    setRfNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]));
      return Object.values(nodesMap).map((rec) => {
        const existing = prevById.get(rec.id);
        const isLockedLocal =
          draggingIdsRef.current.has(rec.id) ||
          (localDropLockRef.current.get(rec.id) ?? 0) > now - 450;

        const targetPos =
          isLockedLocal && existing
            ? existing.position
            : { x: rec.x ?? 40, y: rec.y ?? 120 };

        if (
          existing &&
          existing.data.record === rec &&
          existing.position.x === targetPos.x &&
          existing.position.y === targetPos.y
        ) {
          return existing;
        }

        return {
          ...(existing ?? {}),
          id: rec.id,
          type: 'pkmNode',
          position: targetPos,
          data: { record: rec, actionsRef },
        };
      });
    });
  }, [nodesMap, setRfNodes]);

  // Curved Bezier edges with clean adaptive stroke
  useEffect(() => {
    const mappedEdges: Edge[] = Object.values(edgesMap)
      .filter((e) => nodesMap[e.source] && nodesMap[e.target])
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        type: 'default',
        style: { stroke: 'var(--edge-stroke)', strokeWidth: 1.8 },
        labelStyle: { fontSize: 10, fontWeight: 600 },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 6,
        markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
      }));
    setRfEdges(mappedEdges);
  }, [edgesMap, nodesMap, setRfEdges]);

  const handleNodeDragStart: OnNodeDrag<PkmFlowNode> = useCallback((_e, node) => {
    draggingIdsRef.current.add(node.id);
  }, []);

  const handleNodeDrag: OnNodeDrag<PkmFlowNode> = useCallback(
    (_e, node) => {
      const now = Date.now();
      if (now - lastDragBroadcastRef.current < 40) return;
      lastDragBroadcastRef.current = now;
      broadcastLiveDrag(roomId, 'mindmap', {
        id: node.id,
        x: Math.round(node.position.x),
        y: Math.round(node.position.y),
        by: sessionId,
        t: now,
      });
    },
    [roomId, sessionId]
  );

  const handleNodeDragStop: OnNodeDrag<PkmFlowNode> = useCallback(
    (_e, node) => {
      const x = Math.round(node.position.x);
      const y = Math.round(node.position.y);
      draggingIdsRef.current.delete(node.id);
      localDropLockRef.current.set(node.id, Date.now());
      onUpdateNodeFields(node.id, { x, y }).catch(() => {});
      clearLiveDrag(roomId, 'mindmap', node.id);
    },
    [roomId, onUpdateNodeFields]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      const targetNode = nodesMap[connection.target];
      const edgeId = `edge-${connection.source}-${connection.target}`;
      const label =
        targetNode?.kind === 'solution' ? 'Solusi' : targetNode?.tag ?? '';
      onSaveEdge({
        id: edgeId,
        source: connection.source,
        target: connection.target,
        label,
      }).catch(() => {});
    },
    [nodesMap, onSaveEdge]
  );

  const handleEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      deleted.forEach((e) => {
        onDeleteEdge(e.id).catch(() => {});
      });
    },
    [onDeleteEdge]
  );

  /**
   * True hierarchical real-height tree layout:
   * Measures actual rendered node heights from React Flow, allocates exact subtree vertical space
   * with 44px gaps and 140px horizontal breathing room -> GUARANTEED ZERO OVERLAP!
   */
  const handleAutoLayout = async () => {
    const rendered = getNodes();
    const dims = new Map<string, { w: number; h: number }>();
    rendered.forEach((n) => {
      const rec = nodesMap[n.id];
      dims.set(n.id, {
        w: n.measured?.width ?? 300,
        h: n.measured?.height ?? (rec ? estimateMindmapHeight(rec) : 200),
      });
    });

    const getH = (id: string) =>
      dims.get(id)?.h ??
      (nodesMap[id] ? estimateMindmapHeight(nodesMap[id]) : 200);
    const getW = (id: string) => dims.get(id)?.w ?? 300;

    const childrenMap = new Map<string, string[]>();
    const hasParent = new Set<string>();
    Object.values(edgesMap).forEach((e) => {
      if (!nodesMap[e.source] || !nodesMap[e.target]) return;
      const arr = childrenMap.get(e.source) ?? [];
      if (!arr.includes(e.target)) arr.push(e.target);
      childrenMap.set(e.source, arr);
      hasParent.add(e.target);
    });

    const GAP_X = 140;
    const GAP_Y = 44;

    const visited = new Set<string>();
    const subtreeH = new Map<string, number>();

    const measureSubtree = (id: string): number => {
      if (visited.has(id)) return getH(id);
      visited.add(id);
      const kids = (childrenMap.get(id) ?? []).filter((cid) => !visited.has(cid));
      if (kids.length === 0) {
        const h = getH(id);
        subtreeH.set(id, h);
        return h;
      }
      const kidsTotal =
        kids.reduce((sum, cid) => sum + measureSubtree(cid), 0) +
        GAP_Y * (kids.length - 1);
      const h = Math.max(getH(id), kidsTotal);
      subtreeH.set(id, h);
      return h;
    };

    const positions: Array<{ id: string; x: number; y: number }> = [];
    const placed = new Set<string>();

    const placeSubtree = (id: string, x: number, topY: number) => {
      if (placed.has(id)) return;
      placed.add(id);
      const myH = getH(id);
      const myW = getW(id);
      const totalH = subtreeH.get(id) ?? myH;
      const myY = topY + (totalH - myH) / 2;
      positions.push({ id, x: Math.round(x), y: Math.round(myY) });

      const kids = (childrenMap.get(id) ?? []).filter((cid) => !placed.has(cid));
      if (kids.length === 0) return;

      const kidsTotal =
        kids.reduce((sum, cid) => sum + (subtreeH.get(cid) ?? getH(cid)), 0) +
        GAP_Y * (kids.length - 1);
      let cursorY = topY + (totalH - kidsTotal) / 2;

      kids.forEach((cid) => {
        const childSpan = subtreeH.get(cid) ?? getH(cid);
        placeSubtree(cid, x + myW + GAP_X, cursorY);
        cursorY += childSpan + GAP_Y;
      });
    };

    // Start from roots first, then any unattached nodes
    const allIds = Object.keys(nodesMap);
    const rootCandidates = allIds.filter(
      (id) => nodesMap[id].kind === 'root' || !hasParent.has(id)
    );
    rootCandidates.sort((a, b) => {
      if (nodesMap[a].kind === 'root' && nodesMap[b].kind !== 'root') return -1;
      if (nodesMap[b].kind === 'root' && nodesMap[a].kind !== 'root') return 1;
      return (nodesMap[a].y ?? 0) - (nodesMap[b].y ?? 0);
    });

    let globalY = 40;
    rootCandidates.forEach((rid) => {
      if (placed.has(rid)) return;
      const span = measureSubtree(rid);
      placeSubtree(rid, 40, globalY);
      globalY += span + GAP_Y * 1.6;
    });

    // Catch any cyclic/orphan nodes just in case
    allIds.forEach((id) => {
      if (placed.has(id)) return;
      const h = getH(id);
      positions.push({ id, x: 40, y: Math.round(globalY) });
      globalY += h + GAP_Y;
    });

    await onBatchPositions(positions);
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
  };

  const handleAddStandaloneNode = async (kind: 'solution' | 'indicator') => {
    const rootNode = Object.values(nodesMap).find((n) => n.kind === 'root');
    if (kind === 'solution' && rootNode) {
      await actionsRef.current.onQuickAddChild(rootNode, 'solution', 'Software');
      return;
    }
    const solNode = Object.values(nodesMap).find((n) => n.kind === 'solution');
    if (kind === 'indicator' && solNode) {
      await actionsRef.current.onQuickAddChild(solNode, 'indicator', 'Realitas');
      return;
    }

    const newId = makeId(kind);
    const newNode: MindmapNodeRecord = {
      id: newId,
      kind,
      title: kind === 'solution' ? 'Opsi Solusi Baru' : 'Indikator Baru',
      detail: 'Klik edit untuk melengkapi detail.',
      tag: kind === 'solution' ? 'Software' : 'Realitas',
      author: userName,
      x: kind === 'solution' ? 460 : 910,
      y: 100 + Object.keys(nodesMap).length * 60,
      updatedAt: Date.now(),
    };
    await onSaveNode(newNode);
    handleOpenEdit(newNode);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingNode || !editTitle.trim()) return;
    await onUpdateNodeFields(editingNode.id, {
      title: editTitle.trim(),
      detail: editDetail.trim(),
      kind: editingNode.kind === 'root' ? 'root' : editKind,
      tag: editingNode.kind === 'root' ? undefined : editTag,
    });
    setEditingNode(null);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      onFlowPointerMove(pos.x, pos.y);
    },
    [screenToFlowPosition, onFlowPointerMove]
  );

  return (
    <div
      id="mindmap-canvas-region"
      onPointerMove={handlePointerMove}
      style={{ backgroundColor: 'var(--bg-canvas)' }}
      className="relative h-[calc(100dvh-57px)] min-h-[560px] w-full overflow-hidden"
    >
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDrag={handleNodeDrag}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onEdgesDelete={handleEdgesDelete}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.35}
        maxZoom={1.6}
        deleteKeyCode={['Backspace', 'Delete']}
      >
        <Background color="var(--dot-grid)" gap={24} size={1.3} />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap
          nodeColor={(n) => {
            const rec = (n.data as MindmapNodeFlowData | undefined)?.record;
            return rec ? getNodeAccentHex(rec) : '#64748b';
          }}
          maskColor="rgb(128 128 128 / 0.14)"
        />
        <FlowCursorsOverlay
          roomId={roomId}
          mySessionId={sessionId}
          tab="mindmap"
          visible={showCursors}
        />
      </ReactFlow>

      {/* Quiet Floating Tip */}
      <div
        style={{
          backgroundColor: 'var(--bg-glass)',
          borderColor: 'var(--border)',
          color: 'var(--text-muted)',
        }}
        className="pointer-events-none absolute left-4 top-3 hidden items-center rounded-full border px-3 py-1 text-[11px] backdrop-blur sm:inline-flex"
      >
        Klik node untuk ganti tag domain/pilar • Tarik titik kanan ke kiri node lain untuk menghubungkan
      </div>

      {/* Floating Bottom Toolbar */}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center px-3">
        <div className="pointer-events-auto">
          <CanvasToolbar
            ariaLabel="Alat Kanvas Mindmap"
            ariaControls="mindmap-canvas-region"
          >
            <div role="group" aria-label="Tambah node" className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleAddStandaloneNode('solution')}
                style={{
                  backgroundColor: 'var(--btn-solid-bg)',
                  color: 'var(--btn-solid-fg)',
                }}
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Solusi</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddStandaloneNode('indicator')}
                className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Indikator</span>
              </button>
            </div>

            <span role="separator" aria-orientation="vertical" />

            <div role="group" aria-label="Pengaturan kanvas" className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleAutoLayout}
                title="Rapikan pohon mindmap (auto-ukur tinggi, anti-overlap)"
                className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-medium"
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Rapikan</span>
              </button>

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
            </div>

            <span role="separator" aria-orientation="vertical" />

            <button
              type="button"
              onClick={onSyncMindmapToCanvas}
              style={{ color: 'var(--accent)' }}
              className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold"
            >
              <span>Matangkan</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </CanvasToolbar>
        </div>
      </div>

      {/* Edit Node Modal */}
      <ModalDialog
        open={Boolean(editingNode)}
        onClose={() => setEditingNode(null)}
        title="Edit Node Mindmap"
        maxWidthClass="max-w-md"
      >
        {editingNode && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editingNode.kind !== 'root' && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="node-kind-select"
                    className="block text-xs font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Jenis Node
                  </label>
                  <select
                    id="node-kind-select"
                    value={editKind}
                    onChange={(e) => {
                      const nextKind = e.target.value as 'solution' | 'indicator';
                      setEditKind(nextKind);
                      setEditTag(nextKind === 'solution' ? 'Software' : 'Realitas');
                    }}
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  >
                    <option value="solution">Opsi Solusi</option>
                    <option value="indicator">Indikator Keterukuran</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="node-tag-select"
                    className="block text-xs font-semibold"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {editKind === 'solution' ? 'Domain Solusi' : 'Aspek Keterukuran'}
                  </label>
                  <select
                    id="node-tag-select"
                    value={editTag}
                    onChange={(e) =>
                      setEditTag(e.target.value as SolutionDomainTag | IndicatorPillar)
                    }
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
                  >
                    {(editKind === 'solution'
                      ? SOLUTION_DOMAIN_TAGS
                      : INDICATOR_PILLARS
                    ).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="node-title-input"
                className="block text-xs font-semibold"
                style={{ color: 'var(--text-secondary)' }}
              >
                Judul Node
              </label>
              <input
                id="node-title-input"
                type="text"
                required
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
                className="pkm-field-input mt-1 w-full rounded-xl border px-3.5 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label
                htmlFor="node-detail-input"
                className="block text-xs font-semibold"
                style={{ color: 'var(--text-secondary)' }}
              >
                Uraian / Metrik
              </label>
              <textarea
                id="node-detail-input"
                rows={3}
                value={editDetail}
                onChange={(e) => setEditDetail(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-primary)',
                }}
                className="pkm-textarea mt-1 w-full rounded-xl border px-3.5 py-2 text-sm outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingNode(null)}
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
                className="rounded-full border px-4 py-1.5 text-xs font-medium hover:bg-[var(--bg-subtle)]"
              >
                Batal
              </button>
              <button
                type="submit"
                style={{
                  backgroundColor: 'var(--btn-solid-bg)',
                  color: 'var(--btn-solid-fg)',
                }}
                className="rounded-full px-5 py-1.5 text-xs font-semibold hover:opacity-90"
              >
                Simpan
              </button>
            </div>
          </form>
        )}
      </ModalDialog>
    </div>
  );
}

export function MindmapTab(props: MindmapCanvasInnerProps) {
  return (
    <ReactFlowProvider>
      <MindmapCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
