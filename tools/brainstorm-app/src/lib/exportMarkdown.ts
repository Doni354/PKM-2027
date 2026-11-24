import { BOARD_COLUMNS, MATURITY_STAGES } from '../data/pkmStarterData';
import type {
  BoardCard,
  FreeStickyNote,
  InnovationCanvasData,
  MindmapEdgeRecord,
  MindmapNodeRecord,
  OnlineUser,
} from '../types';

function countVotes(votes?: Record<string, boolean>): number {
  return votes ? Object.values(votes).filter(Boolean).length : 0;
}

function escapeMermaidLabel(text: string): string {
  return text.replace(/"/g, "'").replace(/[\r\n]+/g, ' ').trim();
}

export function generateBrainstormMarkdown(params: {
  roomId: string;
  exportedBy: string;
  onlineUsers: OnlineUser[];
  freeNotes: Record<string, FreeStickyNote>;
  cards: BoardCard[];
  mindmapNodes: Record<string, MindmapNodeRecord>;
  mindmapEdges: Record<string, MindmapEdgeRecord>;
  canvas: InnovationCanvasData;
}): string {
  const {
    roomId,
    exportedBy,
    onlineUsers,
    freeNotes,
    cards,
    mindmapNodes,
    mindmapEdges,
    canvas,
  } = params;

  const now = new Date();
  const formattedDate = now.toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const freeList = Object.values(freeNotes)
    .filter((n) => n.kind === 'sticky' && n.text.trim())
    .sort((a, b) => countVotes(b.votes) - countVotes(a.votes) || b.createdAt - a.createdAt);

  const sortedCards = [...cards].sort(
    (a, b) => countVotes(b.votes) - countVotes(a.votes) || b.createdAt - a.createdAt
  );

  const contributors = Array.from(
    new Set([
      ...onlineUsers.map((u) => u.name),
      ...freeList.map((n) => n.author),
      ...cards.filter((c) => !c.isStarter).map((c) => c.author),
      exportedBy,
    ])
  ).filter(Boolean);

  const stageLabel =
    MATURITY_STAGES.find((s) => s.id === canvas.maturityStage)?.label ??
    canvas.maturityStage ??
    'Bibit Ide';

  const lines: string[] = [];

  lines.push(`# Hasil Brainstorming & Pematangan Ide — Room \`${roomId}\``);
  lines.push('');
  lines.push(`- **Tanggal Ekspor:** ${formattedDate}`);
  lines.push(`- **Diekspor oleh:** ${exportedBy}`);
  lines.push(`- **Peserta / Kontributor:** ${contributors.join(', ') || '-'}`);
  lines.push(`- **Arah / Target Track:** ${canvas.targetTrack || 'Belum ditentukan'}`);
  lines.push(`- **Status Kematangan Ide:** ${stageLabel}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Stage 1: Ruang Ide Bebas
  lines.push('## 1. Ruang Ide Bebas (Sticky Notes & Diskusi)');
  lines.push('');
  if (freeList.length === 0) {
    lines.push('_Belum ada sticky note di Ruang Ide._');
  } else {
    freeList.forEach((note, idx) => {
      const votes = countVotes(note.votes);
      const commentList = note.comments
        ? Object.values(note.comments).sort((a, b) => a.createdAt - b.createdAt)
        : [];
      const firstLine = note.text.split('\n')[0];
      const rest = note.text.split('\n').slice(1).join('\n').trim();
      lines.push(
        `${idx + 1}. **[${votes}▲] ${firstLine}** _(${note.author}${note.promotedToBoard ? ' · Sudah Dibedah' : ''})_`
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
    });
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Stage 2: Bedah Masalah & Kebutuhan
  lines.push('## 2. Bedah Masalah, Urgensi, Pengguna & Kebutuhan');
  lines.push('');
  BOARD_COLUMNS.forEach((col) => {
    const colCards = sortedCards.filter((c) => c.columnId === col.id);
    lines.push(`### ${col.stepNumber}. ${col.title} (${colCards.length})`);
    lines.push('');
    if (colCards.length === 0) {
      lines.push('_Belum ada kartu._');
    } else {
      colCards.forEach((c) => {
        const votes = countVotes(c.votes);
        const commentList = c.comments
          ? Object.values(c.comments).sort((a, b) => a.createdAt - b.createdAt)
          : [];
        lines.push(`- **[${votes}▲] ${c.title}** _(${c.ideaGroup} · ${c.author})_`);
        if (c.content) {
          lines.push(`  - ${c.content.replace(/\n/g, '\n  - ')}`);
        }
        commentList.forEach((cmt) => {
          lines.push(`  - _Catatan ${cmt.author}:_ ${cmt.text}`);
        });
      });
    }
    lines.push('');
  });

  lines.push('---');
  lines.push('');

  // Stage 3: Mindmap
  lines.push('## 3. Peta Solusi & Keterukuran (Mindmap)');
  lines.push('');
  const nodeList = Object.values(mindmapNodes);
  const edgeList = Object.values(mindmapEdges);

  if (nodeList.length === 0) {
    lines.push('_Mindmap belum diisi._');
  } else {
    const childrenBySource = new Map<string, MindmapNodeRecord[]>();
    edgeList.forEach((e) => {
      const targetNode = mindmapNodes[e.target];
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
      if (mindmapNodes[e.source] && mindmapNodes[e.target]) {
        const edgeText = e.label ? `|${escapeMermaidLabel(e.label)}|` : '';
        lines.push(`  ${safeId(e.source)} -->${edgeText} ${safeId(e.target)}`);
      }
    });
    lines.push('```');
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // Stage 4: Blueprint Ide Matang & Keberlanjutan
  lines.push('## 4. Blueprint Ide Matang & Keberlanjutan');
  lines.push('');
  const wordCount = canvas.judulUsulan.trim()
    ? canvas.judulUsulan.trim().split(/\s+/).length
    : 0;
  lines.push(`- **Judul / Nama Ide (${wordCount} kata):** ${canvas.judulUsulan || '_Belum diisi_'}`);
  lines.push(`- **Target Lomba / Tujuan:** ${canvas.targetTrack || '_Bebas_'}`);
  lines.push(`- **Tema / Domain:** ${canvas.temaPkm || '_Belum diisi_'}`);
  lines.push(`- **Status Kematangan:** ${stageLabel}`);
  lines.push('');

  const sections: Array<{ title: string; value: string }> = [
    { title: '4.1 Akar Masalah & Urgensi', value: canvas.problemUrgensi },
    { title: '4.2 Target Pengguna & Nilai Manfaat', value: canvas.targetUserSpesifik },
    { title: '4.3 Konsep Solusi & Keunggulan Unik', value: canvas.solusiNilaiInovasi },
    { title: '4.4 Keterukuran — Realitas (Dampak)', value: canvas.indikatorRealitas },
    { title: '4.5 Keterukuran — Teknis / Kelayakan', value: canvas.parameterTeknis },
    { title: '4.6 Keterukuran — Teori, Standar & Referensi', value: canvas.landasanTeori },
    { title: '4.7 Rencana Realisasi (MVP → Produk Jadi)', value: canvas.rencanaRealisasi },
    { title: '4.8 Rencana Uji Pengguna (Usability Testing / Validasi)', value: canvas.usabilityTesting },
    { title: '4.9 Keberlanjutan Ide & Potensi Lomba / Hilirisasi', value: canvas.keberlanjutanIde },
    { title: '4.10 Mentor / Dosen Pendamping & Peran Tim', value: canvas.kesesuaianDospem },
  ];

  sections.forEach((sec) => {
    lines.push(`### ${sec.title}`);
    lines.push('');
    lines.push(sec.value?.trim() ? sec.value.trim() : '_Belum diisi._');
    lines.push('');
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
