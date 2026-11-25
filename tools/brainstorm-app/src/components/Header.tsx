import { useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  Eye,
  GitBranch,
  KanbanSquare,
  LayoutTemplate,
  Moon,
  Sparkles,
  StickyNote,
  Sun,
} from 'lucide-react';
import type { OnlineUser, TabId } from '../types';

interface HeaderProps {
  roomId: string;
  userName: string;
  activeTab: TabId;
  ideaCount: number;
  onSelectTab: (tab: TabId) => void;
  onlineUsers: OnlineUser[];
  isConnected: boolean;
  onToggleTheme: () => void;
  onOpenJoinModal: () => void;
  onOpenInspirasi: () => void;
  onExportMarkdown: () => void;
}

const TABS: Array<{ id: TabId; step: string; label: string; icon: typeof StickyNote }> = [
  { id: 'free', step: '1', label: 'Ruang Ide', icon: StickyNote },
  { id: 'board', step: '2', label: 'Bedah', icon: KanbanSquare },
  { id: 'mindmap', step: '3', label: 'Mindmap', icon: GitBranch },
  { id: 'canvas', step: '4', label: 'Ide Matang', icon: LayoutTemplate },
  { id: 'preview', step: '5', label: 'Hasil', icon: Eye },
];

const TAB_NAMES: Record<TabId, string> = {
  free: 'Ruang Ide',
  board: 'Bedah',
  mindmap: 'Mindmap',
  canvas: 'Ide Matang',
  preview: 'Hasil',
};

export function Header({
  roomId,
  userName,
  activeTab,
  ideaCount,
  onSelectTab,
  onlineUsers,
  isConnected,
  onToggleTheme,
  onOpenJoinModal,
  onOpenInspirasi,
  onExportMarkdown,
}: HeaderProps) {
  const [copiedInvite, setCopiedInvite] = useState(false);
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    free: null,
    board: null,
    mindmap: null,
    canvas: null,
    preview: null,
  });

  const handleCopyInvite = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomId);
      await navigator.clipboard.writeText(url.toString());
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const order: TabId[] = ['free', 'board', 'mindmap', 'canvas', 'preview'];
    const idx = order.indexOf(activeTab);
    let nextIdx = idx;

    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % order.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + order.length) % order.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = order.length - 1;
    else return;

    e.preventDefault();
    const nextTab = order[nextIdx];
    onSelectTab(nextTab);
    tabRefs.current[nextTab]?.focus();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-glass)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1720px] flex-wrap items-center justify-between gap-2 px-3 sm:px-5">
        {/* Left: Minimal Brand + Room pill */}
        <div className="flex items-center gap-2.5 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--btn-solid-bg)] text-xs font-extrabold tracking-tight text-[var(--btn-solid-fg)] shadow-2xs">
              IS
            </span>
            <span className="font-display hidden text-sm font-bold tracking-tight text-[var(--text-primary)] sm:inline">
              Idea Studio
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyInvite}
            title="Salin link room untuk dibagikan ke tim"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-subtle)] px-2.5 py-1 text-xs text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
              title={isConnected ? 'Live Sync aktif' : 'Menghubungkan...'}
            />
            <span className="font-mono-code font-medium">{roomId}</span>
            {copiedInvite ? (
              <Check className="h-3 w-3 text-emerald-500" />
            ) : (
              <Copy className="h-3 w-3 text-[var(--text-muted)]" />
            )}
          </button>
        </div>

        {/* Center: Clean 5-Step Connected Pipeline Tabs */}
        <div
          role="tablist"
          aria-label="Tahapan Perumusan Ide"
          onKeyDown={handleTabKeyDown}
          {...({ focusgroup: 'tablist nomemory' } as Record<string, string>)}
          className="pkm-tablist order-3 w-full items-center gap-0.5 border-t border-[var(--border)] md:order-2 md:w-auto md:border-t-0"
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                {...(isSelected ? ({ focusgroupstart: '' } as Record<string, string>) : {})}
                onClick={() => {
                  onSelectTab(tab.id);
                  tabRefs.current[tab.id]?.scrollIntoView({
                    block: 'nearest',
                    inline: 'nearest',
                  });
                }}
                className="pkm-tab inline-flex items-center gap-1.5 px-3 py-3 text-[13px] font-medium transition focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--accent)]"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  {tab.step}. {tab.label}
                </span>
                {tab.id === 'preview' && ideaCount > 0 && (
                  <span className="font-mono-code rounded-full bg-[var(--bg-subtle)] px-1.5 py-0.2 text-[10px] font-bold text-[var(--text-secondary)]">
                    {ideaCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Presence Avatars + Theme Toggle + Inspirasi + Export */}
        <div className="order-2 flex items-center gap-2 py-2 md:order-3">
          <button
            type="button"
            onClick={onOpenJoinModal}
            title={`Online (${onlineUsers.length}): ${onlineUsers
              .map((u) => `${u.name || 'Tim'} (${TAB_NAMES[u.activeTab] ?? u.activeTab ?? 'Ruang Ide'})`)
              .join(', ')} — Klik untuk ganti nama/room`}
            className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] py-1 pl-1.5 pr-2.5 text-xs text-[var(--text-primary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
          >
            <div className="flex -space-x-1.5">
              {onlineUsers.slice(0, 5).map((u, idx) => (
                <span
                  key={u.sessionId || `user-${idx}`}
                  style={{ backgroundColor: u.color || '#6366F1' }}
                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-[var(--bg-surface)]"
                >
                  {(u.name || '?').slice(0, 2).toUpperCase()}
                </span>
              ))}
              {onlineUsers.length > 5 && (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--btn-solid-bg)] text-[10px] font-bold text-[var(--btn-solid-fg)] ring-2 ring-[var(--bg-surface)]">
                  +{onlineUsers.length - 5}
                </span>
              )}
            </div>
            <span className="hidden max-w-[76px] truncate font-medium sm:inline">
              {userName || 'Masuk'}
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            title="Ganti tampilan gelap / terang"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <span className="theme-icon-to-dark items-center justify-center">
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="visually-hidden">Ubah ke mode gelap</span>
            </span>
            <span className="theme-icon-to-light items-center justify-center">
              <Sun className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
              <span className="visually-hidden">Ubah ke mode terang</span>
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenInspirasi}
            title="Lihat alur 5 tahap & 3 opsi pemantik awal"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Inspirasi</span>
          </button>

          <button
            type="button"
            onClick={onExportMarkdown}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--btn-solid-bg)] px-3.5 py-1.5 text-xs font-semibold text-[var(--btn-solid-fg)] transition hover:bg-[var(--btn-solid-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export .md</span>
          </button>
        </div>
      </div>
    </header>
  );
}
