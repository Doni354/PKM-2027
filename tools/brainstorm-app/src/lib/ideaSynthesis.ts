import type {
  BoardCard,
  ColumnId,
  FreeStickyNote,
  IdeaDecision,
  IdeaRecord,
  InnovationCanvasData,
  MindmapNodeRecord,
} from '../types';

export const IDEA_DECISION_META: Record<
  IdeaDecision,
  { label: string; shortLabel: string; accent: string; bgSoft: string }
> = {
  prioritas: {
    label: 'Prioritas Utama',
    shortLabel: 'Prioritas',
    accent: '#10b981',
    bgSoft: 'rgb(16 185 129 / 0.14)',
  },
  kandidat: {
    label: 'Kandidat Aktif',
    shortLabel: 'Kandidat',
    accent: '#6366f1',
    bgSoft: 'rgb(99 102 241 / 0.14)',
  },
  cadangan: {
    label: 'Cadangan / Lomba Lain',
    shortLabel: 'Cadangan',
    accent: '#f59e0b',
    bgSoft: 'rgb(245 158 11 / 0.14)',
  },
  arsip: {
    label: 'Arsip',
    shortLabel: 'Arsip',
    accent: '#64748b',
    bgSoft: 'rgb(100 116 139 / 0.14)',
  },
};

export function countVotes(votes?: Record<string, boolean>): number {
  return votes ? Object.values(votes).filter(Boolean).length : 0;
}

export function getCardsForIdea(
  cards: BoardCard[],
  idea: Pick<IdeaRecord, 'id' | 'name'>
): BoardCard[] {
  return cards.filter(
    (c) => c.ideaId === idea.id || (!c.ideaId && c.ideaGroup === idea.name)
  );
}

export function groupIdeaCardsByColumn(
  cards: BoardCard[],
  idea: Pick<IdeaRecord, 'id' | 'name'>
): Record<ColumnId, BoardCard[]> {
  const byCol: Record<ColumnId, BoardCard[]> = {
    problem: [],
    urgency: [],
    targetUser: [],
    needs: [],
  };
  getCardsForIdea(cards, idea).forEach((card) => {
    if (byCol[card.columnId]) byCol[card.columnId].push(card);
  });
  (Object.keys(byCol) as ColumnId[]).forEach((colId) => {
    byCol[colId].sort(
      (a, b) => (a.order ?? a.createdAt) - (b.order ?? b.createdAt)
    );
  });
  return byCol;
}

export interface BedahSynthesis {
  byCol: Record<ColumnId, BoardCard[]>;
  filledPillars: number;
  hasProblem: boolean;
  hasUrgency: boolean;
  hasTargetUser: boolean;
  hasNeeds: boolean;
  povStatement: string;
  rootTitle: string;
  rootDetail: string;
}

/**
 * Synthesizes all 4 Bedah columns (Problem, Urgency, Target User, Needs)
 * into a Double Diamond Point-of-View statement and Mindmap Root Node!
 */
export function synthesizeRootFromBedah(
  idea: Pick<IdeaRecord, 'id' | 'name'>,
  cards: BoardCard[]
): BedahSynthesis {
  const byCol = groupIdeaCardsByColumn(cards, idea);
  const hasProblem = byCol.problem.length > 0;
  const hasUrgency = byCol.urgency.length > 0;
  const hasTargetUser = byCol.targetUser.length > 0;
  const hasNeeds = byCol.needs.length > 0;
  const filledPillars = [hasProblem, hasUrgency, hasTargetUser, hasNeeds].filter(
    Boolean
  ).length;

  const pTop = byCol.problem[0];
  const uTop = byCol.urgency[0];
  const tTop = byCol.targetUser[0];
  const nTop = byCol.needs[0];

  const userPhrase = tTop?.title || 'Target pengguna';
  const problemPhrase = pTop?.title || idea.name;
  const urgencyPhrase = uTop?.title;
  const needPhrase = nTop?.title;

  let povStatement = '';
  if (filledPillars === 0) {
    povStatement =
      'Tambahkan minimal 1 kartu pada 4 kolom di bawah agar sintesis Akar Masalah terbentuk otomatis.';
  } else {
    const parts: string[] = [`${userPhrase} menghadapi masalah: ${problemPhrase}`];
    if (urgencyPhrase) parts.push(`yang mendesak karena ${urgencyPhrase}`);
    if (needPhrase) parts.push(`sehingga membutuhkan ${needPhrase}`);
    povStatement = `${parts.join(', ')}.`;
  }

  const rootTitle = pTop?.title || idea.name;
  const detailLines: string[] = [];
  if (pTop?.content) detailLines.push(`Masalah: ${pTop.content}`);
  if (uTop) detailLines.push(`Urgensi: ${uTop.title}${uTop.content ? ` — ${uTop.content}` : ''}`);
  if (tTop) detailLines.push(`Target User: ${tTop.title}${tTop.content ? ` — ${tTop.content}` : ''}`);
  if (nTop) detailLines.push(`Kebutuhan Inti: ${nTop.title}${nTop.content ? ` — ${nTop.content}` : ''}`);

  return {
    byCol,
    filledPillars,
    hasProblem,
    hasUrgency,
    hasTargetUser,
    hasNeeds,
    povStatement,
    rootTitle,
    rootDetail:
      detailLines.join('\n') ||
      'Lengkapi 4 pilar di Tab 2 (Bedah) lalu klik Sinkron 4 Pilar.',
  };
}

function formatCardsList(list: BoardCard[]): string {
  return list
    .map((c) => `- ${c.title}${c.content ? `: ${c.content}` : ''}`)
    .join('\n');
}

function formatMindmapNodes(list: MindmapNodeRecord[]): string {
  return list
    .map(
      (n) =>
        `- ${n.title}${n.tag ? ` [${n.tag}]` : ''}${n.detail ? `: ${n.detail}` : ''}`
    )
    .join('\n');
}

export interface CanvasCorrelationSummary {
  bedahFilledPillars: number;
  solutionNodes: MindmapNodeRecord[];
  realitasNodes: MindmapNodeRecord[];
  teknisNodes: MindmapNodeRecord[];
  teoriNodes: MindmapNodeRecord[];
  derivedFields: Partial<
    Pick<
      InnovationCanvasData,
      | 'problemUrgensi'
      | 'targetUserSpesifik'
      | 'solusiNilaiInovasi'
      | 'indikatorRealitas'
      | 'parameterTeknis'
      | 'landasanTeori'
      | 'temaPkm'
    >
  >;
}

/**
 * Computes direct field-by-field correlation from Tab 2 (Bedah) + Tab 3 (Mindmap)
 * into Tab 4 (Ide Matang / Blueprint) so nothing feels disconnected!
 */
export function synthesizeCanvasFromStages(
  idea: IdeaRecord,
  cards: BoardCard[]
): CanvasCorrelationSummary {
  const bedah = synthesizeRootFromBedah(idea, cards);
  const allNodes = Object.values(idea.mindmap?.nodes ?? {});
  const root = allNodes.find((n) => n.kind === 'root');
  const solutionNodes = allNodes.filter((n) => n.kind === 'solution');
  const realitasNodes = allNodes.filter(
    (n) => n.kind === 'indicator' && n.tag === 'Realitas'
  );
  const teknisNodes = allNodes.filter(
    (n) => n.kind === 'indicator' && n.tag === 'Teknis'
  );
  const teoriNodes = allNodes.filter(
    (n) => n.kind === 'indicator' && n.tag === 'Teori'
  );

  const derivedFields: CanvasCorrelationSummary['derivedFields'] = {};

  // Problem & Urgensi <- Bedah Col 1 + Col 2 (fallback Mindmap Root)
  const problemParts: string[] = [];
  if (bedah.byCol.problem.length > 0) {
    problemParts.push(`Masalah Nyata:\n${formatCardsList(bedah.byCol.problem)}`);
  }
  if (bedah.byCol.urgency.length > 0) {
    problemParts.push(`Urgensi & Bukti:\n${formatCardsList(bedah.byCol.urgency)}`);
  }
  if (problemParts.length > 0) {
    derivedFields.problemUrgensi = problemParts.join('\n\n');
  } else if (root) {
    derivedFields.problemUrgensi = `${root.title}${root.detail ? `\n${root.detail}` : ''}`;
  }

  // Target User <- Bedah Col 3 (+ Kebutuhan summary if relevant)
  if (bedah.byCol.targetUser.length > 0) {
    derivedFields.targetUserSpesifik = formatCardsList(bedah.byCol.targetUser);
  }

  // Solusi & Nilai Inovasi <- Mindmap Solutions + Bedah Col 4 (Kebutuhan Inti)
  const solParts: string[] = [];
  if (solutionNodes.length > 0) {
    solParts.push(`Opsi Solusi Terpilih:\n${formatMindmapNodes(solutionNodes)}`);
  }
  if (bedah.byCol.needs.length > 0) {
    solParts.push(`Menjawab Kebutuhan Inti:\n${formatCardsList(bedah.byCol.needs)}`);
  }
  if (solParts.length > 0) {
    derivedFields.solusiNilaiInovasi = solParts.join('\n\n');
  }

  if (realitasNodes.length > 0) {
    derivedFields.indikatorRealitas = formatMindmapNodes(realitasNodes);
  }
  if (teknisNodes.length > 0) {
    derivedFields.parameterTeknis = formatMindmapNodes(teknisNodes);
  }
  if (teoriNodes.length > 0) {
    derivedFields.landasanTeori = formatMindmapNodes(teoriNodes);
  }

  const firstThemedCard = getCardsForIdea(cards, idea).find((c) => c.pkmTheme?.trim());
  if (firstThemedCard?.pkmTheme) {
    derivedFields.temaPkm = firstThemedCard.pkmTheme;
  }

  return {
    bedahFilledPillars: bedah.filledPillars,
    solutionNodes,
    realitasNodes,
    teknisNodes,
    teoriNodes,
    derivedFields,
  };
}

export interface IdeaPortfolioMetrics {
  sourceNotes: FreeStickyNote[];
  bedah: BedahSynthesis;
  correlation: CanvasCorrelationSummary;
  mindmapNodeCount: number;
  canvasFilledFields: number;
  canvasTotalFields: number;
  completenessPct: number;
  portfolioVotes: number;
  bedahVotes: number;
  displayTitle: string;
}

const BLUEPRINT_KEYS: Array<Exclude<keyof InnovationCanvasData, 'fieldMeta' | 'maturityStage' | 'targetTrack'>> = [
  'judulUsulan',
  'temaPkm',
  'problemUrgensi',
  'targetUserSpesifik',
  'solusiNilaiInovasi',
  'indikatorRealitas',
  'parameterTeknis',
  'landasanTeori',
  'rencanaRealisasi',
  'usabilityTesting',
  'keberlanjutanIde',
  'kesesuaianDospem',
];

export function computeIdeaMetrics(
  idea: IdeaRecord,
  cards: BoardCard[],
  freeNotes: Record<string, FreeStickyNote>
): IdeaPortfolioMetrics {
  const bedah = synthesizeRootFromBedah(idea, cards);
  const correlation = synthesizeCanvasFromStages(idea, cards);

  const sourceNoteIdSet = new Set(
    Object.entries(idea.sourceNoteIds ?? {})
      .filter(([, v]) => Boolean(v))
      .map(([k]) => k)
  );

  const sourceNotes = Object.values(freeNotes).filter(
    (n) =>
      n.kind === 'sticky' &&
      (sourceNoteIdSet.has(n.id) || n.promotedIdeaId === idea.id)
  );

  const mindmapNodeCount = Object.keys(idea.mindmap?.nodes ?? {}).length;
  const canvas = idea.canvas;
  const canvasFilledFields = BLUEPRINT_KEYS.filter((k) =>
    Boolean(canvas?.[k]?.trim())
  ).length;
  const canvasTotalFields = BLUEPRINT_KEYS.length;

  // Weighted completeness: Bedah 25% + Mindmap 25% + Blueprint 50%
  const bedahScore = (bedah.filledPillars / 4) * 25;
  const mindmapChecks = [
    correlation.solutionNodes.length > 0,
    correlation.realitasNodes.length > 0,
    correlation.teknisNodes.length > 0,
    correlation.teoriNodes.length > 0,
  ].filter(Boolean).length;
  const mindmapScore = (mindmapChecks / 4) * 25;
  const blueprintScore = (canvasFilledFields / canvasTotalFields) * 50;
  const completenessPct = Math.round(bedahScore + mindmapScore + blueprintScore);

  const ideaCards = getCardsForIdea(cards, idea);
  const bedahVotes = ideaCards.reduce((sum, c) => sum + countVotes(c.votes), 0);
  const portfolioVotes = countVotes(idea.votes);

  const displayTitle = canvas?.judulUsulan?.trim() || idea.name;

  return {
    sourceNotes,
    bedah,
    correlation,
    mindmapNodeCount,
    canvasFilledFields,
    canvasTotalFields,
    completenessPct,
    portfolioVotes,
    bedahVotes,
    displayTitle,
  };
}

