import { BOARD_COLUMNS, MATURITY_STAGES } from '../data/pkmStarterData';
import {
  computeIdeaMetrics,
  countVotes,
  IDEA_DECISION_META,
} from './ideaSynthesis';
import type {
  BoardCard,
  FreeStickyNote,
  IdeaRecord,
  MindmapEdgeRecord,
  MindmapNodeRecord,
  OnlineUser,
} from '../types';

function escapeMermaidLabel(text: string): string {
  return text.replace(/"/g, "'").replace(/[\r\n]+/g, ' ').trim();
}

function appendMindmapMarkdown(
  lines: string[],
  nodes: Record<string, MindmapNodeRecord>,
  edges: Record<string, MindmapEdgeRecord>
) {
  const nodeList = Object.values(nodes);
  const edgeList = Object.values(edges);

  if (nodeList.length === 0) {
    lines.push('_Mindmap belum diisi._');
    return;
  }

  const childrenBySource = new Map<string, MindmapNodeRecord[]>();
  edgeList.forEach((e) => {
    const targetNode = nodes[e.target];
    if (!targetNode) return;
    const list = childrenBySource.get(e.source) ?? [];
    list.push(targetNode);
    childrenBySource.set(e.source, list);
  });

  const roots = nodeList.filter((n) => n.kind === 'root');
  const visited = new Set<string>();

  const renderTree = (node: MindmapNodeRecord, depth: number) => {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    const indent = '  '.repeat(depth);
    const kindBadge =
      node.kind === 'root'
        ? '[AKAR MASALAH]'
        : node.kind === 'solution'
        ? `[SOLUSI · ${node.tag ?? 'Software'}]`
        : `[KETERUKURAN · ${node.tag ?? 'Realitas'}]`;
    lines.push(`${indent}- **${kindBadge} ${node.title}**`);
    if (node.detail) {
      lines.push(`${indent}  - ${node.detail.replace(/\n/g, ' ')}`);
    }
    (childrenBySource.get(node.id) ?? []).forEach((child) =>
      renderTree(child, depth + 1)
    );
  };

  roots.forEach((r) => renderTree(r, 0));
  nodeList
    .filter((n) => !visited.has(n.id))
    .forEach((orphan) => renderTree(orphan, 0));

  lines.push('');
  lines.push('```mermaid');
  lines.push('flowchart LR');
  const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_]/g, '_');
  nodeList.forEach((n) => {
    const prefix =
      n.kind === 'root'
        ? 'MASALAH: '
        : n.kind === 'solution'
        ? `[${n.tag ?? 'Solusi'}] `
        : `[${n.tag ?? 'Ukur'}] `;
    lines.push(`  ${safeId(n.id)}["${escapeMermaidLabel(prefix + n.title)}"]`);
  });
  edgeList.forEach((e) => {
    if (nodes[e.source] && nodes[e.target]) {
      const edgeText = e.label ? `|${escapeMermaidLabel(e.label)}|` : '';
      lines.push(`  ${safeId(e.source)} -->${edgeText} ${safeId(e.target)}`);
    }
  });
  lines.push('```');
}

function appendIdeaSectionMarkdown(
  lines: string[],
  idea: IdeaRecord,
  cards: BoardCard[],
  freeNotes: Record<string, FreeStickyNote>,
  headingPrefix = '##'
) {
  const metrics = computeIdeaMetrics(idea, cards, freeNotes);
  const canvas = idea.canvas;
  const stageLabel =
    MATURITY_STAGES.find((s) => s.id === canvas.maturityStage)?.label ??
    canvas.maturityStage ??
    'Bibit Ide';
  const decisionLabel = IDEA_DECISION_META[idea.decision]?.label ?? idea.decision;
  const wordCount = canvas.judulUsulan.trim()
    ? canvas.judulUsulan.trim().split(/\s+/).length
    : 0;

  lines.push(`${headingPrefix} ${metrics.displayTitle}`);
  lines.push('');
  lines.push(`- **Kelompok / Nama Ide:** ${idea.name}`);
  lines.push(`- **Keputusan Tim:** ${decisionLabel} · **Vote:** ${metrics.portfolioVotes}▲ · **Kelengkapan:** ${metrics.completenessPct}%`);
  lines.push(`- **Target Track / Lomba:** ${canvas.targetTrack || '_Bebas_'}`);
  lines.push(`- **Tema / Domain:** ${canvas.temaPkm || '_Belum diisi_'}`);
  lines.push(`- **Status Kematangan:** ${stageLabel}`);
  if (canvas.judulUsulan.trim()) {
    lines.push(`- **Judul Final (${wordCount} kata):** ${canvas.judulUsulan}`);
  }
  lines.push('');

  // Trace 1: Source Sticky Notes
  if (metrics.sourceNotes.length > 0) {
    lines.push(`${headingPrefix}# Jejak Bibit Awal (Ruang Ide)`);
    lines.push('');
    metrics.sourceNotes.forEach((n) => {
      lines.push(`- _(${n.author})_ ${n.text.replace(/\n/g, ' ')}`);
    });
    lines.push('');
  }

  // Trace 2: Bedah 4 Pilar
  lines.push(`${headingPrefix}# Bedah 4 Pilar (${metrics.bedah.filledPillars}/4 Terisi)`);
  lines.push('');
  lines.push(`> **Sintesis Akar Masalah (PoV):** ${metrics.bedah.povStatement}`);
  lines.push('');
  BOARD_COLUMNS.forEach((col) => {
    const colCards = metrics.bedah.byCol[col.id];
    lines.push(`- **${col.stepNumber}. ${col.title} (${colCards.length}):**`);
    if (colCards.length === 0) {
      lines.push('  - _Belum diisi._');
    } else {
      colCards.forEach((c) => {
        lines.push(`  - **[${countVotes(c.votes)}▲] ${c.title}**${c.content ? ` — ${c.content.replace(/\n/g, ' ')}` : ''}`);
      });
    }
  });
  lines.push('');

  // Trace 3: Mindmap
  lines.push(`${headingPrefix}# Peta Solusi & 3 Aspek Keterukuran (Mindmap)`);
  lines.push('');
  appendMindmapMarkdown(lines, idea.mindmap?.nodes ?? {}, idea.mindmap?.edges ?? {});
  lines.push('');

  // Trace 4: Blueprint Ide Matang
  lines.push(`${headingPrefix}# Blueprint Ide Matang & Keberlanjutan`);
  lines.push('');
  const sections: Array<{ title: string; value: string }> = [
    { title: '1. Akar Masalah & Urgensi', value: canvas.problemUrgensi },
    { title: '2. Target Pengguna & Nilai Manfaat', value: canvas.targetUserSpesifik },
    { title: '3. Konsep Solusi & Keunggulan Unik', value: canvas.solusiNilaiInovasi },
    { title: '4. Keterukuran — Realitas (Dampak)', value: canvas.indikatorRealitas },
    { title: '5. Keterukuran — Teknis / Kelayakan', value: canvas.parameterTeknis },
    { title: '6. Keterukuran — Teori, Standar & Referensi', value: canvas.landasanTeori },
    { title: '7. Rencana Realisasi (MVP → Produk Jadi)', value: canvas.rencanaRealisasi },
    { title: '8. Rencana Uji Pengguna (Usability Testing / UEQ)', value: canvas.usabilityTesting },
    { title: '9. Keberlanjutan Ide & Potensi Lomba / Hilirisasi', value: canvas.keberlanjutanIde },
    { title: '10. Mentor / Dosen Pendamping & Peran Tim', value: canvas.kesesuaianDospem },
  ];
  sections.forEach((sec) => {
    lines.push(`**${sec.title}**`);
    lines.push('');
    lines.push(sec.value?.trim() ? sec.value.trim() : '_Belum diisi._');
    lines.push('');
  });
}

export function generateSingleIdeaMarkdown(params: {
  roomId: string;
  exportedBy: string;
  idea: IdeaRecord;
  cards: BoardCard[];
  freeNotes: Record<string, FreeStickyNote>;
}): string {
  const formattedDate = new Date().toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
  const lines: string[] = [
    `# One-Pager Ide Terpilih — Room \`${params.roomId}\``,
    '',
    `- **Tanggal Ekspor:** ${formattedDate}`,
    `- **Diekspor oleh:** ${params.exportedBy}`,
    '',
    '---',
    '',
  ];
  appendIdeaSectionMarkdown(
    lines,
    params.idea,
    params.cards,
    params.freeNotes,
    '##'
  );
  return lines.join('\n');
}

export function generateBrainstormMarkdown(params: {
  roomId: string;
  exportedBy: string;
  onlineUsers: OnlineUser[];
  freeNotes: Record<string, FreeStickyNote>;
  cards: BoardCard[];
  ideas: Record<string, IdeaRecord>;
}): string {
  const { roomId, exportedBy, onlineUsers, freeNotes, cards, ideas } = params;

  const formattedDate = new Date().toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const ideaList = Object.values(ideas).toSorted((a, b) => {
    const rank = { prioritas: 0, kandidat: 1, cadangan: 2, arsip: 3 };
    const rDiff = (rank[a.decision] ?? 1) - (rank[b.decision] ?? 1);
    if (rDiff !== 0) return rDiff;
    return countVotes(b.votes) - countVotes(a.votes) || b.updatedAt - a.updatedAt;
  });

  const freeList = Object.values(freeNotes)
    .filter(
      (n) =>
        (n.kind === 'sticky' && n.text.trim()) ||
        (n.kind === 'image' && Boolean(n.imageUrl))
    )
    .toSorted((a, b) => countVotes(b.votes) - countVotes(a.votes) || b.createdAt - a.createdAt);

  const contributors = Array.from(
    new Set([
      ...onlineUsers.map((u) => u.name),
      ...freeList.map((n) => n.author),
      ...cards.filter((c) => !c.isStarter).map((c) => c.author),
      exportedBy,
    ])
  ).filter(Boolean);

  const lines: string[] = [];
  lines.push(`# Portfolio Hasil Brainstorming — Room \`${roomId}\``);
  lines.push('');
  lines.push(`- **Tanggal Ekspor:** ${formattedDate}`);
  lines.push(`- **Diekspor oleh:** ${exportedBy}`);
  lines.push(`- **Peserta / Kontributor:** ${contributors.join(', ') || '-'}`);
  lines.push(`- **Total Ide Terkumpul:** ${ideaList.length} ide`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Summary Portfolio Comparison Table
  lines.push('## Ringkasan Perbandingan Semua Ide');
  lines.push('');
  if (ideaList.length === 0) {
    lines.push('_Belum ada ide yang dibedah._');
  } else {
    lines.push('| # | Nama / Judul Ide | Track | Bedah | Mindmap | Kelengkapan | Vote | Keputusan |');
    lines.push('|---|---|---|---|---|---|---|---|');
    ideaList.forEach((idea, idx) => {
      const m = computeIdeaMetrics(idea, cards, freeNotes);
      const dec = IDEA_DECISION_META[idea.decision]?.shortLabel ?? idea.decision;
      const safeTitle = m.displayTitle.replace(/\|/g, '/');
      lines.push(
        `| ${idx + 1} | **${safeTitle}** | ${idea.canvas.targetTrack || 'Bebas'} | ${m.bedah.filledPillars}/4 pilar | ${m.correlation.solutionNodes.length} solusi | ${m.completenessPct}% | ${m.portfolioVotes}▲ | ${dec} |`
      );
    });
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Stage 1: Ruang Ide Bebas
  lines.push('## 1. Ruang Ide Bebas (Sticky Notes & Referensi Gambar)');
  lines.push('');
  if (freeList.length === 0) {
    lines.push('_Belum ada catatan di Ruang Ide._');
  } else {
    freeList.forEach((note, idx) => {
      const votes = countVotes(note.votes);
      const commentList = note.comments
        ? Object.values(note.comments).toSorted((a, b) => a.createdAt - b.createdAt)
        : [];
      if (note.kind === 'image' && note.imageUrl) {
        const caption = note.text.trim() || 'Gambar Referensi';
        lines.push(`${idx + 1}. **[Referensi Gambar] ${caption}** _(${note.author})_`);
        lines.push(`   ![${caption.replace(/[\[\]]/g, '')}](${note.imageUrl})`);
      } else {
        const firstLine = note.text.split('\n')[0];
        const rest = note.text.split('\n').slice(1).join('\n').trim();
        const linkedIdea = note.promotedIdeaId ? ideas[note.promotedIdeaId]?.name : null;
        lines.push(
          `${idx + 1}. **[${votes}▲] ${firstLine}** _(${note.author}${linkedIdea ? ` · Dibedah di "${linkedIdea}"` : ''})_`
        );
        if (rest) {
          lines.push(`   > ${rest.replace(/\n/g, '\n   > ')}`);
        }
        if (commentList.length > 0) {
          lines.push(`   - **Catatan Diskusi:**`);
          commentList.forEach((cmt) => {
            lines.push(`     - **${cmt.author}:** ${cmt.text}`);
          });
        }
      }
    });
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Detailed End-to-End Trace per Idea
  lines.push('## 2. Detail Lengkap Setiap Ide (Bedah → Mindmap → Ide Matang)');
  lines.push('');
  ideaList.forEach((idea, idx) => {
    if (idx > 0) {
      lines.push('---');
      lines.push('');
    }
    appendIdeaSectionMarkdown(lines, idea, cards, freeNotes, '###');
  });

  return lines.join('\n');
}

export function downloadMarkdownFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
