import { useMemo, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  Copy,
  Download,
  Eye,
  GitBranch,
  KanbanSquare,
  LayoutGrid,
  LayoutTemplate,
  Plus,
  StickyNote,
  Table as TableIcon,
  ThumbsUp,
  Trophy,
} from 'lucide-react';
import { BOARD_COLUMNS, MATURITY_STAGES } from '../data/pkmStarterData';
import {
  computeIdeaMetrics,
  IDEA_DECISION_META,
} from '../lib/ideaSynthesis';
import { sanitizeKey } from '../lib/roomSync';
import type {
  BoardCard,
  FreeStickyNote,
  IdeaDecision,
  IdeaRecord,
  TabId,
} from '../types';
import { ModalDialog } from './ModalDialog';
import { PageCursorsOverlay } from './LiveCursorsLayer';

interface PreviewResultsTabProps {
  roomId: string;
  sessionId: string;
  ideas: IdeaRecord[];
  cards: BoardCard[];
  freeNotes: Record<string, FreeStickyNote>;
  userName: string;
  onPagePointerMove: (xPct: number, yPct: number) => void;
  onCreateIdea: (name: string) => Promise<void>;
  onToggleIdeaVote: (ideaId: string, currentlyVoted: boolean) => Promise<void>;
  onChangeDecision: (ideaId: string, decision: IdeaDecision) => Promise<void>;
  onJumpToStage: (ideaId: string, tab: TabId) => void;
  onExportSingleIdea: (idea: IdeaRecord) => void;
  onExportAllMarkdown: () => void;
}

const DECISIONS: IdeaDecision[] = ['prioritas', 'kandidat', 'cadangan', 'arsip'];

export function PreviewResultsTab({
  roomId,
  sessionId,
  ideas,
  cards,
  freeNotes,
  userName,
  onPagePointerMove,
  onCreateIdea,
  onToggleIdeaVote,
  onChangeDecision,
  onJumpToStage,
  onExportSingleIdea,
  onExportAllMarkdown,
}: PreviewResultsTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [filterDecision, setFilterDecision] = useState<'ALL' | IdeaDecision>('ALL');
  const [sortBy, setSortBy] = useState<'rank' | 'completeness' | 'votes'>('rank');
  const [previewIdeaId, setPreviewIdeaId] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const voterKey = sanitizeKey(userName);

  const enrichedIdeas = useMemo(() => {
    return ideas.map((idea) => ({
      idea,
      metrics: computeIdeaMetrics(idea, cards, freeNotes),
    }));
  }, [ideas, cards, freeNotes]);

  const filteredIdeas = useMemo(() => {
    const decisionOrder: Record<IdeaDecision, number> = {
      prioritas: 0,
      kandidat: 1,
      cadangan: 2,
      arsip: 3,
    };

    return enrichedIdeas
      .filter((item) =>
        filterDecision === 'ALL' ? true : item.idea.decision === filterDecision
      )
      .toSorted((a, b) => {
        if (sortBy === 'completeness') {
          return b.metrics.completenessPct - a.metrics.completenessPct;
        }
        if (sortBy === 'votes') {
          return b.metrics.portfolioVotes - a.metrics.portfolioVotes;
        }
        const dDiff =
          (decisionOrder[a.idea.decision] ?? 1) -
          (decisionOrder[b.idea.decision] ?? 1);
        if (dDiff !== 0) return dDiff;
        const vDiff = b.metrics.portfolioVotes - a.metrics.portfolioVotes;
        if (vDiff !== 0) return vDiff;
        return b.metrics.completenessPct - a.metrics.completenessPct;
      });
  }, [enrichedIdeas, filterDecision, sortBy]);

  const summaryStats = useMemo(() => {
    const totalIdeas = enrichedIdeas.length;
    const priorityCount = enrichedIdeas.filter(
      (i) => i.idea.decision === 'prioritas'
    ).length;
    const avgCompleteness =
      totalIdeas > 0
        ? Math.round(
            enrichedIdeas.reduce((acc, i) => acc + i.metrics.completenessPct, 0) /
              totalIdeas
          )
        : 0;
    const rawStickies = Object.values(freeNotes).filter(
      (n) => n.kind === 'sticky'
    ).length;
    return { totalIdeas, priorityCount, avgCompleteness, rawStickies };
  }, [enrichedIdeas, freeNotes]);

  const previewItem = useMemo(
    () =>
      previewIdeaId
        ? enrichedIdeas.find((i) => i.idea.id === previewIdeaId) ?? null
        : null,
    [enrichedIdeas, previewIdeaId]
  );

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    onPagePointerMove(
      (e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height
    );
  };

  const handleCopyPitchSummary = async (item: (typeof enrichedIdeas)[number]) => {
    const { idea, metrics } = item;
    const text = [
      `IDE: ${metrics.displayTitle}`,
      `Track: ${idea.canvas.targetTrack || 'Bebas'} | Status: ${IDEA_DECISION_META[idea.decision].label} | Kelengkapan: ${metrics.completenessPct}%`,
      '',
      `AKAR MASALAH (4 PILAR BEDAH):`,
      metrics.bedah.povStatement,
      '',
      `SOLUSI & INOVASI:`,
      idea.canvas.solusiNilaiInovasi ||
        metrics.correlation.solutionNodes.map((n) => `- ${n.title}: ${n.detail}`).join('\n') ||
        '-',
      '',
      `KETERUKURAN:`,
      `• Realitas: ${idea.canvas.indikatorRealitas || '-'}`,
      `• Teknis: ${idea.canvas.parameterTeknis || '-'}`,
      `• Teori: ${idea.canvas.landasanTeori || '-'}`,
      '',
      `REALISASI & KEBERLANJUTAN:`,
      idea.canvas.rencanaRealisasi || '-',
      idea.canvas.keberlanjutanIde ? `Keberlanjutan: ${idea.canvas.keberlanjutanIde}` : '',
    ]
      .filter((line) => line !== '')
      .join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 1800);
    } catch {
      // ignore clipboard denial
    }
  };

  const cycleSort = () => {
    setSortBy((s) =>
      s === 'rank' ? 'completeness' : s === 'completeness' ? 'votes' : 'rank'
    );
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      className="relative mx-auto min-h-[calc(100dvh-57px)] max-w-[1600px] space-y-6 px-4 py-6 sm:px-6"
    >
      <PageCursorsOverlay
        roomId={roomId}
        mySessionId={sessionId}
        tab="preview"
        visible
      />

      {/* Top Executive Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
            <Trophy className="h-3.5 w-3.5" />
            Tahap 5 · Portfolio & Preview Hasil Brainstorming
          </p>
          <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-2xl">
            Bandingkan Semua Ide & Tentukan Pilihan Terbaik Tim
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Setiap ide menampilkan jejak utuh dari Ruang Ide → 4 Pilar Bedah → Mindmap Solusi & Keterukuran → Blueprint Ide Matang.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onCreateIdea(`Ide Tim ${ideas.length + 1}`)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tambah Ide Baru</span>
          </button>

          <button
            type="button"
            onClick={onExportAllMarkdown}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--btn-solid-bg)] px-4 py-2 text-xs font-semibold text-[var(--btn-solid-fg)] transition hover:bg-[var(--btn-solid-hover)]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Semua (.md)</span>
          </button>
        </div>
      </section>

      {/* Compact KPI Row */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Total Ide Dirumuskan',
            value: `${summaryStats.totalIdeas}`,
            sub: 'Bisa lanjut paralel ke PKM / lomba lain',
          },
          {
            label: 'Prioritas Utama',
            value: `${summaryStats.priorityCount}`,
            sub: 'Ditandai siap dieksekusi lebih dulu',
          },
          {
            label: 'Rata-rata Kelengkapan',
            value: `${summaryStats.avgCompleteness}%`,
            sub: 'Gabungan Bedah + Mindmap + Blueprint',
          },
          {
            label: 'Bibit di Ruang Ide',
            value: `${summaryStats.rawStickies}`,
            sub: 'Sticky note bebas hasil eksplorasi tim',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-card)]"
          >
            <p className="text-[11px] font-medium text-[var(--text-muted)]">
              {stat.label}
            </p>
            <p className="font-display mt-1 text-2xl font-extrabold text-[var(--text-primary)]">
              {stat.value}
            </p>
            <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
              {stat.sub}
            </p>
          </div>
        ))}
      </section>

      {/* Filter, Sort & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilterDecision('ALL')}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filterDecision === 'ALL'
                ? 'bg-[var(--btn-solid-bg)] text-[var(--btn-solid-fg)]'
                : 'border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
            }`}
          >
            Semua ({enrichedIdeas.length})
          </button>
          {DECISIONS.map((dec) => {
            const count = enrichedIdeas.filter((i) => i.idea.decision === dec).length;
            const meta = IDEA_DECISION_META[dec];
            return (
              <button
                key={dec}
                type="button"
                onClick={() => setFilterDecision(dec)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  filterDecision === dec
                    ? 'bg-[var(--btn-solid-bg)] text-[var(--btn-solid-fg)]'
                    : 'border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                }`}
              >
                {meta.shortLabel} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={cycleSort}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>
              {sortBy === 'rank'
                ? 'Prioritas & Vote'
                : sortBy === 'completeness'
                ? 'Paling Matang'
                : 'Top Vote'}
            </span>
          </button>

          <div className="inline-flex rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              aria-pressed={viewMode === 'cards'}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                viewMode === 'cards'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Kartu</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                viewMode === 'table'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" />
              <span>Bandingkan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredIdeas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-surface)] p-12 text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Belum ada ide pada kategori ini.
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Bawa sticky note dari Tab 1 (Ruang Ide) ke Tab 2 (Bedah) atau klik "+ Tambah Ide Baru".
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* Portfolio Card Grid */
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredIdeas.map(({ idea, metrics }) => {
            const decMeta = IDEA_DECISION_META[idea.decision];
            const stageMeta =
              MATURITY_STAGES.find((s) => s.id === idea.canvas.maturityStage) ??
              MATURITY_STAGES[0];
            const hasVoted = Boolean(idea.votes?.[voterKey]);
            const topSolution = metrics.correlation.solutionNodes[0];

            return (
              <article
                key={idea.id}
                className="flex flex-col justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)] transition hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card-hover)]"
              >
                <div>
                  {/* Top Meta Row: Decision Select + Track */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: idea.color }}
                      />
                      <span className="rounded-full bg-[var(--bg-subtle)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                        {idea.canvas.targetTrack || 'Track Bebas'}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {stageMeta.step} {stageMeta.label}
                      </span>
                    </div>

                    <select
                      aria-label={`Keputusan untuk ${idea.name}`}
                      value={idea.decision}
                      onChange={(e) =>
                        onChangeDecision(idea.id, e.target.value as IdeaDecision)
                      }
                      style={{
                        backgroundColor: decMeta.bgSoft,
                        color: decMeta.accent,
                      }}
                      className="cursor-pointer rounded-full border-none px-2.5 py-0.5 text-[11px] font-bold outline-none"
                    >
                      {DECISIONS.map((d) => (
                        <option key={d} value={d}>
                          {IDEA_DECISION_META[d].shortLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Idea Title & Name */}
                  <h3 className="mt-3 text-base font-bold leading-snug text-[var(--text-primary)]">
                    {metrics.displayTitle}
                  </h3>
                  {idea.canvas.judulUsulan.trim() &&
                    idea.canvas.judulUsulan.trim() !== idea.name && (
                      <p className="mt-0.5 text-[11px] font-medium text-[var(--text-muted)]">
                        Kelompok: {idea.name}
                      </p>
                    )}

                  {/* Synthesized PoV + Top Solution Preview */}
                  <p className="mt-2.5 line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                    {metrics.bedah.povStatement}
                  </p>

                  {topSolution && (
                    <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                        Solusi Utama · {topSolution.tag ?? 'Konsep'}
                      </span>
                      <p className="mt-0.5 line-clamp-2 font-medium text-[var(--text-primary)]">
                        {topSolution.title}
                      </p>
                    </div>
                  )}

                  {/* 4-Stage Connected Trace Bar */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-[var(--text-muted)]">
                        Kematangan Pipeline
                      </span>
                      <span className="font-mono-code font-bold text-[var(--text-primary)]">
                        {metrics.completenessPct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${metrics.completenessPct}%`,
                          backgroundColor: decMeta.accent,
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] text-[var(--text-secondary)]">
                      <span className="rounded-md bg-[var(--bg-subtle)] px-2 py-0.5">
                        Bibit: {metrics.sourceNotes.length}
                      </span>
                      <span className="rounded-md bg-[var(--bg-subtle)] px-2 py-0.5">
                        Bedah: {metrics.bedah.filledPillars}/4 pilar
                      </span>
                      <span className="rounded-md bg-[var(--bg-subtle)] px-2 py-0.5">
                        Mindmap: {metrics.correlation.solutionNodes.length} solusi
                      </span>
                      <span className="rounded-md bg-[var(--bg-subtle)] px-2 py-0.5">
                        Blueprint: {metrics.canvasFilledFields}/{metrics.canvasTotalFields}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleIdeaVote(idea.id, hasVoted)}
                      aria-pressed={hasVoted}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        hasVoted
                          ? 'bg-[var(--btn-solid-bg)] text-[var(--btn-solid-fg)]'
                          : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      <span>{metrics.portfolioVotes}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onJumpToStage(idea.id, 'board')}
                      title="Edit di Tab 2 (Bedah)"
                      className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                    >
                      <KanbanSquare className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onJumpToStage(idea.id, 'mindmap')}
                      title="Edit di Tab 3 (Mindmap)"
                      className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                    >
                      <GitBranch className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onJumpToStage(idea.id, 'canvas')}
                      title="Edit di Tab 4 (Ide Matang)"
                      className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                    >
                      <LayoutTemplate className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewIdeaId(idea.id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[var(--btn-solid-bg)] px-3.5 py-1.5 text-xs font-semibold text-[var(--btn-solid-fg)] transition hover:bg-[var(--btn-solid-hover)]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Preview Lengkap</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Accessible Responsive Comparison Table (modern-web-guidance: responsive-table) */
        <div
          tabIndex={0}
          role="region"
          aria-labelledby="portfolio-comparison-caption"
          className="portfolio-table-wrapper"
        >
          <table className="portfolio-table">
            <caption
              id="portfolio-comparison-caption"
              className="visually-hidden"
            >
              Tabel perbandingan semua ide hasil brainstorming
            </caption>
            <thead>
              <tr>
                <th scope="col">Ide & Judul</th>
                <th scope="col">Track & Tahap</th>
                <th scope="col">Bedah 4 Pilar</th>
                <th scope="col">Mindmap</th>
                <th scope="col">Kelengkapan</th>
                <th scope="col">Vote</th>
                <th scope="col">Keputusan</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredIdeas.map(({ idea, metrics }) => {
                const decMeta = IDEA_DECISION_META[idea.decision];
                const stageMeta =
                  MATURITY_STAGES.find((s) => s.id === idea.canvas.maturityStage) ??
                  MATURITY_STAGES[0];
                const hasVoted = Boolean(idea.votes?.[voterKey]);
                const indCount =
                  metrics.correlation.realitasNodes.length +
                  metrics.correlation.teknisNodes.length +
                  metrics.correlation.teoriNodes.length;

                return (
                  <tr key={idea.id}>
                    <th scope="row">
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: idea.color }}
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-[var(--text-primary)]">
                            {idea.name}
                          </p>
                          {idea.canvas.judulUsulan.trim() &&
                            idea.canvas.judulUsulan.trim() !== idea.name && (
                              <p className="line-clamp-1 text-[11px] font-normal text-[var(--text-muted)]">
                                {idea.canvas.judulUsulan}
                              </p>
                            )}
                        </div>
                      </div>
                    </th>
                    <td>
                      <div className="text-xs">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {idea.canvas.targetTrack || 'Bebas'}
                        </span>
                        <span className="block text-[11px] text-[var(--text-muted)]">
                          {stageMeta.label}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono-code text-xs font-semibold text-[var(--text-primary)]">
                        {metrics.bedah.filledPillars}/4 pilar
                      </span>
                    </td>
                    <td>
                      <span className="text-xs">
                        {metrics.correlation.solutionNodes.length} solusi · {indCount} ukur
                      </span>
                    </td>
                    <td>
                      <span className="font-mono-code font-bold text-[var(--text-primary)]">
                        {metrics.completenessPct}%
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => onToggleIdeaVote(idea.id, hasVoted)}
                        aria-pressed={hasVoted}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                          hasVoted
                            ? 'bg-[var(--btn-solid-bg)] text-[var(--btn-solid-fg)]'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                        }`}
                      >
                        <ThumbsUp className="h-3 w-3" />
                        <span>{metrics.portfolioVotes}</span>
                      </button>
                    </td>
                    <td>
                      <select
                        aria-label={`Ubah keputusan ${idea.name}`}
                        value={idea.decision}
                        onChange={(e) =>
                          onChangeDecision(idea.id, e.target.value as IdeaDecision)
                        }
                        style={{
                          backgroundColor: decMeta.bgSoft,
                          color: decMeta.accent,
                        }}
                        className="cursor-pointer rounded-full border-none px-2.5 py-1 text-xs font-bold outline-none"
                      >
                        {DECISIONS.map((d) => (
                          <option key={d} value={d}>
                            {IDEA_DECISION_META[d].shortLabel}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setPreviewIdeaId(idea.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Preview</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Full End-to-End One-Pager Executive Preview Modal */}
      <ModalDialog
        open={Boolean(previewItem)}
        onClose={() => setPreviewIdeaId(null)}
        title={previewItem?.metrics.displayTitle ?? 'Preview Ide'}
        subtitle={
          previewItem
            ? `${previewItem.idea.name} · ${
                previewItem.idea.canvas.targetTrack || 'Track Bebas'
              } · Kelengkapan ${previewItem.metrics.completenessPct}%`
            : undefined
        }
        maxWidthClass="max-w-4xl"
      >
        {previewItem && (
          <div className="space-y-5">
            {/* Action Bar inside One-Pager Preview */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  style={{
                    backgroundColor: IDEA_DECISION_META[previewItem.idea.decision].bgSoft,
                    color: IDEA_DECISION_META[previewItem.idea.decision].accent,
                  }}
                  className="rounded-full px-2.5 py-0.5 font-bold"
                >
                  {IDEA_DECISION_META[previewItem.idea.decision].label}
                </span>
                {previewItem.idea.canvas.temaPkm && (
                  <span className="text-[var(--text-secondary)]">
                    Tema: <strong className="text-[var(--text-primary)]">{previewItem.idea.canvas.temaPkm}</strong>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyPitchSummary(previewItem)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1 text-xs font-medium text-[var(--text-primary)] transition hover:border-[var(--border-strong)]"
                >
                  {copiedSummary ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copiedSummary ? 'Tersalin!' : 'Salin Ringkasan'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onExportSingleIdea(previewItem.idea)}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--btn-solid-bg)] px-3 py-1 text-xs font-semibold text-[var(--btn-solid-fg)] transition hover:bg-[var(--btn-solid-hover)]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export .md Ide Ini</span>
                </button>
              </div>
            </div>

            {/* Trace 1: Bibit Ruang Ide */}
            {previewItem.metrics.sourceNotes.length > 0 && (
              <section className="space-y-2">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <StickyNote className="h-3.5 w-3.5 text-amber-500" />
                  1. Bibit Awal dari Ruang Ide
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {previewItem.metrics.sourceNotes.map((sn) => (
                    <div
                      key={sn.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-xs text-[var(--text-secondary)]"
                    >
                      <p className="whitespace-pre-line text-[var(--text-primary)]">
                        {sn.text}
                      </p>
                      <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                        — {sn.author}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Trace 2: Sintesis 4 Pilar Bedah */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <KanbanSquare className="h-3.5 w-3.5 text-emerald-500" />
                  2. Sintesis 4 Pilar Bedah ({previewItem.metrics.bedah.filledPillars}/4)
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewIdeaId(null);
                    onJumpToStage(previewItem.idea.id, 'board');
                  }}
                  className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                >
                  Edit Bedah →
                </button>
              </div>
              <div className="rounded-xl border border-[var(--accent)]/35 bg-[var(--accent-soft)] p-3 text-xs font-medium leading-relaxed text-[var(--text-primary)]">
                {previewItem.metrics.bedah.povStatement}
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {BOARD_COLUMNS.map((col) => {
                  const colCards = previewItem.metrics.bedah.byCol[col.id];
                  return (
                    <div
                      key={col.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-xs"
                    >
                      <p className="font-bold text-[var(--text-primary)]">
                        {col.stepNumber}. {col.title}
                      </p>
                      {colCards.length === 0 ? (
                        <p className="mt-1 italic text-[var(--text-muted)]">Belum diisi</p>
                      ) : (
                        <ul className="mt-1.5 space-y-1 text-[var(--text-secondary)]">
                          {colCards.map((c) => (
                            <li key={c.id}>
                              <strong className="text-[var(--text-primary)]">{c.title}</strong>
                              {c.content ? ` — ${c.content}` : ''}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Trace 3: Solusi & 3 Aspek Keterukuran dari Mindmap */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <GitBranch className="h-3.5 w-3.5 text-indigo-500" />
                  3. Solusi & 3 Aspek Keterukuran (Mindmap)
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewIdeaId(null);
                    onJumpToStage(previewItem.idea.id, 'mindmap');
                  }}
                  className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                >
                  Edit Mindmap →
                </button>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-xs">
                  <p className="font-bold text-[var(--text-primary)]">Opsi Solusi</p>
                  {previewItem.metrics.correlation.solutionNodes.length === 0 ? (
                    <p className="mt-1 italic text-[var(--text-muted)]">Belum ada node solusi</p>
                  ) : (
                    <ul className="mt-1.5 space-y-1.5 text-[var(--text-secondary)]">
                      {previewItem.metrics.correlation.solutionNodes.map((n) => (
                        <li key={n.id}>
                          <span className="rounded bg-[var(--bg-surface)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent)]">
                            {n.tag ?? 'Solusi'}
                          </span>{' '}
                          <strong className="text-[var(--text-primary)]">{n.title}</strong>
                          {n.detail ? ` — ${n.detail}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-xs">
                  <p className="font-bold text-[var(--text-primary)]">Indikator Keterukuran</p>
                  <ul className="mt-1.5 space-y-1 text-[var(--text-secondary)]">
                    <li>
                      <strong className="text-emerald-500">Realitas:</strong>{' '}
                      {previewItem.metrics.correlation.realitasNodes
                        .map((n) => `${n.title}${n.detail ? ` (${n.detail})` : ''}`)
                        .join('; ') || '-'}
                    </li>
                    <li>
                      <strong className="text-sky-500">Teknis:</strong>{' '}
                      {previewItem.metrics.correlation.teknisNodes
                        .map((n) => `${n.title}${n.detail ? ` (${n.detail})` : ''}`)
                        .join('; ') || '-'}
                    </li>
                    <li>
                      <strong className="text-purple-500">Teori:</strong>{' '}
                      {previewItem.metrics.correlation.teoriNodes
                        .map((n) => `${n.title}${n.detail ? ` (${n.detail})` : ''}`)
                        .join('; ') || '-'}
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Trace 4: Blueprint Ide Matang */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <LayoutTemplate className="h-3.5 w-3.5 text-teal-500" />
                  4. Blueprint Realisasi, Uji Pengguna & Keberlanjutan
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setPreviewIdeaId(null);
                    onJumpToStage(previewItem.idea.id, 'canvas');
                  }}
                  className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                >
                  Edit Ide Matang →
                </button>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {[
                  {
                    label: 'Rencana Realisasi (1:1)',
                    val: previewItem.idea.canvas.rencanaRealisasi,
                  },
                  {
                    label: 'Usability Testing / Validasi',
                    val: previewItem.idea.canvas.usabilityTesting,
                  },
                  {
                    label: 'Keberlanjutan & Lomba Lain',
                    val: previewItem.idea.canvas.keberlanjutanIde,
                  },
                  {
                    label: 'Mentor / Dospem & Peran Tim',
                    val: previewItem.idea.canvas.kesesuaianDospem,
                  },
                ].map((block) => (
                  <div
                    key={block.label}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-xs"
                  >
                    <p className="font-bold text-[var(--text-primary)]">{block.label}</p>
                    <p className="mt-1 whitespace-pre-line leading-relaxed text-[var(--text-secondary)]">
                      {block.val?.trim() || 'Belum diisi.'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}

