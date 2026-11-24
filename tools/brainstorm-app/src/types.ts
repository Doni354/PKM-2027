export type TabId = 'free' | 'board' | 'mindmap' | 'canvas';

export type ColumnId = 'problem' | 'urgency' | 'targetUser' | 'needs';

export type StickyColor = 'butter' | 'mint' | 'sky' | 'rose' | 'lavender' | 'paper';

export type FreeNoteKind = 'sticky' | 'label';

export type SolutionDomainTag =
  | 'Software'
  | 'Hardware'
  | 'IoT'
  | 'AI / Data'
  | 'Bisnis'
  | 'Sosial'
  | 'Kreatif';

export type IndicatorPillar = 'Realitas' | 'Teknis' | 'Teori';

export type MindmapNodeKind = 'root' | 'solution' | 'indicator';

export type IdeaMaturityStage =
  | 'bibit'
  | 'dibedah'
  | 'tervalidasi'
  | 'matang';

export interface NoteComment {
  id: string;
  author: string;
  color: string;
  text: string;
  createdAt: number;
}

export interface FreeStickyNote {
  id: string;
  kind: FreeNoteKind;
  text: string;
  color: StickyColor;
  author: string;
  authorColor: string;
  tag?: string;
  x: number;
  y: number;
  votes?: Record<string, boolean>;
  comments?: Record<string, NoteComment>;
  promotedToBoard?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BoardCard {
  id: string;
  columnId: ColumnId;
  order?: number;
  title: string;
  content: string;
  author: string;
  ideaGroup: string;
  pkmTheme?: string;
  isStarter?: boolean;
  starterOptionId?: string;
  votes?: Record<string, boolean>;
  comments?: Record<string, NoteComment>;
  createdAt: number;
  updatedAt: number;
}

export interface LiveDragPosition {
  id: string;
  x: number;
  y: number;
  by: string;
  t: number;
}

export interface MindmapNodeRecord {
  id: string;
  kind: MindmapNodeKind;
  title: string;
  detail: string;
  tag?: SolutionDomainTag | IndicatorPillar;
  author: string;
  sourceCardId?: string;
  x: number;
  y: number;
  updatedAt: number;
}

export interface MindmapEdgeRecord {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface CanvasFieldMeta {
  updatedBy: string;
  updatedAt: number;
}

export interface InnovationCanvasData {
  judulUsulan: string;
  targetTrack: string;
  maturityStage: IdeaMaturityStage;
  temaPkm: string;
  problemUrgensi: string;
  targetUserSpesifik: string;
  solusiNilaiInovasi: string;
  indikatorRealitas: string;
  parameterTeknis: string;
  landasanTeori: string;
  rencanaRealisasi: string;
  usabilityTesting: string;
  keberlanjutanIde: string;
  kesesuaianDospem: string;
  fieldMeta?: Record<string, CanvasFieldMeta>;
}

export interface OnlineUser {
  sessionId: string;
  name: string;
  color: string;
  activeTab: TabId;
  joinedAt: number;
}

export interface CursorPosition {
  sessionId: string;
  name: string;
  color: string;
  tab: TabId;
  space: 'flow' | 'page';
  x: number;
  y: number;
  updatedAt: number;
}

export interface StarterOption {
  id: 'opsi-1' | 'opsi-2' | 'opsi-3';
  badge: string;
  shortLabel: string;
  verdict: string;
  title: string;
  temaPkm: string;
  benchmarkNote: string;
  dospemFit: string;
  summaryProblem: string;
  summarySolution: string;
  stickyText: string;
  stickyColor: StickyColor;
  cards: {
    problem: { title: string; content: string };
    urgency: { title: string; content: string };
    targetUser: { title: string; content: string };
    needs: { title: string; content: string };
  };
  mindmap: {
    rootTitle: string;
    rootDetail: string;
    solutions: Array<{
      title: string;
      detail: string;
      tag: SolutionDomainTag;
      indicators: Array<{
        pillar: IndicatorPillar;
        title: string;
        detail: string;
      }>;
    }>;
  };
  canvasPreset: Omit<InnovationCanvasData, 'fieldMeta'>;
}
