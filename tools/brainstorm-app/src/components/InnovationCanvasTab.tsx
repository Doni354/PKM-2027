import { useEffect, useRef, useState } from 'react';
import { Check, Compass, Sprout } from 'lucide-react';
import {
  MATURITY_STAGES,
  PKM_THEMES,
  TARGET_TRACKS,
} from '../data/pkmStarterData';
import type { IdeaMaturityStage, InnovationCanvasData } from '../types';
import { PageCursorsOverlay } from './LiveCursorsLayer';

type CanvasTextKey = Exclude<keyof InnovationCanvasData, 'fieldMeta'>;

interface InnovationCanvasTabProps {
  roomId: string;
  sessionId: string;
  canvas: InnovationCanvasData;
  showCursors: boolean;
  onPagePointerMove: (xPct: number, yPct: number) => void;
  onUpdateField: (field: CanvasTextKey, value: string) => Promise<void>;
}

interface SyncedFieldProps {
  id: string;
  label: string;
  hint: string;
  value: string;
  placeholder: string;
  meta?: { updatedBy: string; updatedAt: number };
  onCommit: (nextValue: string) => void;
}

function SyncedTextarea({
  id,
  label,
  hint,
  value,
  placeholder,
  meta,
  onCommit,
}: SyncedFieldProps) {
  const [draft, setDraft] = useState(value);
  const focusedRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(value);
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (next: string) => {
    setDraft(next);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      onCommit(next);
    }, 350);
  };

  const handleBlur = () => {
    focusedRef.current = false;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (draft !== value) {
      onCommit(draft);
    }
  };

  const timeLabel = meta?.updatedAt
    ? new Date(meta.updatedAt).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold text-[var(--text-primary)]">
          {label}
        </label>
        {meta?.updatedBy && timeLabel && (
          <span className="text-[10px] text-[var(--text-muted)]">
            {meta.updatedBy} · {timeLabel}
          </span>
        )}
      </div>
      <p id={`${id}-hint`} className="mt-0.5 text-[11px] text-[var(--text-muted)]">
        {hint}
      </p>
      <textarea
        id={id}
        value={draft}
        onFocus={() => {
          focusedRef.current = true;
        }}
        onBlur={handleBlur}
        onChange={(e) => handleChange(e.target.value)}
        aria-describedby={`${id}-hint`}
        placeholder={placeholder}
        className="pkm-textarea mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
      />
    </div>
  );
}

export function InnovationCanvasTab({
  roomId,
  sessionId,
  canvas,
  showCursors,
  onPagePointerMove,
  onUpdateField,
}: InnovationCanvasTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [titleDraft, setTitleDraft] = useState(canvas.judulUsulan);
  const [themeDraft, setThemeDraft] = useState(canvas.temaPkm);
  const [trackDraft, setTrackDraft] = useState(canvas.targetTrack || 'PKM-KI');

  const titleFocusedRef = useRef(false);
  const themeFocusedRef = useRef(false);
  const titleTimerRef = useRef<number | null>(null);
  const themeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!titleFocusedRef.current) setTitleDraft(canvas.judulUsulan);
  }, [canvas.judulUsulan]);

  useEffect(() => {
    if (!themeFocusedRef.current) setThemeDraft(canvas.temaPkm);
  }, [canvas.temaPkm]);

  useEffect(() => {
    setTrackDraft(canvas.targetTrack || 'PKM-KI');
  }, [canvas.targetTrack]);

  const handlePointerMove = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    onPagePointerMove(
      (e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height
    );
  };

  const wordCount = titleDraft.trim() ? titleDraft.trim().split(/\s+/).length : 0;
  const activeTrackInfo = TARGET_TRACKS.find((t) => t.id === trackDraft);
  const isPkmTrack = trackDraft.toUpperCase().startsWith('PKM');
  const currentStageIndex = MATURITY_STAGES.findIndex(
    (s) => s.id === (canvas.maturityStage || 'bibit')
  );

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      className="relative mx-auto min-h-[calc(100dvh-57px)] max-w-5xl space-y-6 px-4 py-7 sm:px-6"
    >
      <PageCursorsOverlay
        roomId={roomId}
        mySessionId={sessionId}
        tab="canvas"
        visible={showCursors}
      />

      {/* Minimalist Header + Maturity Stepper */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)]">
              <Sprout className="h-3.5 w-3.5" />
              Blueprint Pematangan & Keberlanjutan Ide
            </p>
            <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Matangkan Ide untuk PKM, Lomba Lain, atau Inovasi Mandiri
            </h2>
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            Semua perubahan tersimpan otomatis secara real-time
          </span>
        </div>

        {/* Clickable Idea Maturity Pipeline */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {MATURITY_STAGES.map((stage, idx) => {
            const isCurrent = (canvas.maturityStage || 'bibit') === stage.id;
            const isPassed = idx < currentStageIndex;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onUpdateField('maturityStage', stage.id as IdeaMaturityStage)}
                className={`rounded-2xl border p-3.5 text-left transition ${
                  isCurrent
                    ? 'border-[var(--btn-solid-bg)] bg-[var(--btn-solid-bg)] text-[var(--btn-solid-fg)] shadow-[var(--shadow-card)]'
                    : isPassed
                    ? 'border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                    : 'border-[var(--border)] bg-[var(--bg-surface)]/75 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="font-mono-code opacity-75">{stage.step}</span>
                  {isPassed && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                </div>
                <p className="mt-1 text-xs font-bold">{stage.label}</p>
                <p
                  className={`mt-0.5 text-[11px] leading-snug ${
                    isCurrent ? 'opacity-80' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {stage.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Section 1: Identity, Target Track & Freeform Theme */}
      <section className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="canvas-track-select"
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)]"
            >
              <Compass className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>Arah / Target Lomba & Inovasi</span>
            </label>
            <select
              id="canvas-track-select"
              value={
                TARGET_TRACKS.some((t) => t.id === trackDraft) ? trackDraft : 'CUSTOM'
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'CUSTOM') {
                  setTrackDraft('');
                  onUpdateField('targetTrack', '');
                } else {
                  setTrackDraft(v);
                  onUpdateField('targetTrack', v);
                }
              }}
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
            >
              {TARGET_TRACKS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
              <option value="CUSTOM">Lainnya (Ketik sendiri)...</option>
            </select>
            {!TARGET_TRACKS.some((t) => t.id === trackDraft) && (
              <input
                type="text"
                value={trackDraft}
                onChange={(e) => {
                  setTrackDraft(e.target.value);
                  onUpdateField('targetTrack', e.target.value);
                }}
                placeholder="Contoh: COMPFEST, Lomba IoT Nasional, Proyek Mandiri..."
                className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
              />
            )}
            {activeTrackInfo && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--text-muted)]">
                {activeTrackInfo.shortHint}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="canvas-tema-input"
              className="block text-xs font-semibold text-[var(--text-primary)]"
            >
              Tema / Domain Fokus (Bebas Disesuaikan)
            </label>
            <input
              id="canvas-tema-input"
              type="text"
              list="canvas-theme-suggestions"
              value={themeDraft}
              onFocus={() => {
                themeFocusedRef.current = true;
              }}
              onBlur={() => {
                themeFocusedRef.current = false;
                if (themeTimerRef.current) window.clearTimeout(themeTimerRef.current);
                if (themeDraft !== canvas.temaPkm) {
                  onUpdateField('temaPkm', themeDraft);
                }
              }}
              onChange={(e) => {
                const v = e.target.value;
                setThemeDraft(v);
                if (themeTimerRef.current) window.clearTimeout(themeTimerRef.current);
                themeTimerRef.current = window.setTimeout(() => {
                  onUpdateField('temaPkm', v);
                }, 350);
              }}
              placeholder="Ketik tema bebas (EdTech, FinTech, Lingkungan) atau pilih tema PKM..."
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
            />
            <datalist id="canvas-theme-suggestions">
              {PKM_THEMES.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
              Bisa mengikuti 10 tema PKM Tematik atau tema lomba/inovasi lain.
            </p>
          </div>
        </div>

        {/* Title */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label
              htmlFor="canvas-judul-input"
              className="text-xs font-semibold text-[var(--text-primary)]"
            >
              Nama / Judul Ide
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`font-mono-code text-[11px] font-medium ${
                  isPkmTrack && wordCount > 20
                    ? 'font-bold text-rose-500'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {wordCount} kata{isPkmTrack ? ' (batas PKM: 20)' : ''}
              </span>
              {isPkmTrack && (
                <button
                  type="button"
                  onClick={() => {
                    const upper = titleDraft.toUpperCase();
                    setTitleDraft(upper);
                    onUpdateField('judulUsulan', upper);
                  }}
                  className="rounded-full border border-[var(--border)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
                >
                  KAPITALKAN
                </button>
              )}
            </div>
          </div>
          <input
            id="canvas-judul-input"
            type="text"
            value={titleDraft}
            onFocus={() => {
              titleFocusedRef.current = true;
            }}
            onBlur={() => {
              titleFocusedRef.current = false;
              if (titleTimerRef.current) window.clearTimeout(titleTimerRef.current);
              if (titleDraft !== canvas.judulUsulan) {
                onUpdateField('judulUsulan', titleDraft);
              }
            }}
            onChange={(e) => {
              const v = e.target.value;
              setTitleDraft(v);
              if (titleTimerRef.current) window.clearTimeout(titleTimerRef.current);
              titleTimerRef.current = window.setTimeout(() => {
                onUpdateField('judulUsulan', v);
              }, 350);
            }}
            placeholder="Tulis nama proyek atau judul usulan yang paling menggambarkan nilai inovasinya..."
            className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] px-3.5 py-2.5 text-base font-semibold text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:bg-[var(--bg-surface)]"
          />
        </div>
      </section>

      {/* Section 2: Problem, User & Solution */}
      <section className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
          <SyncedTextarea
            id="canvas-problem"
            label="1. Akar Masalah & Urgensi"
            hint="Apa masalah/peluang nyata yang ditemukan, data pendukungnya, dan kenapa penting diselesaikan?"
            value={canvas.problemUrgensi}
            meta={canvas.fieldMeta?.problemUrgensi}
            placeholder="Jelaskan konteks nyata di lapangan dan urgensi penyelesaiannya..."
            onCommit={(val) => onUpdateField('problemUrgensi', val)}
          />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
          <SyncedTextarea
            id="canvas-user"
            label="2. Target Pengguna & Nilai Manfaat"
            hint="Siapa pengguna langsungnya (usia, karakter, lokasi, jumlah) dan perubahan apa yang mereka rasakan?"
            value={canvas.targetUserSpesifik}
            meta={canvas.fieldMeta?.targetUserSpesifik}
            placeholder="Gambarkan persona pengguna utama dan manfaat konkret yang mereka terima..."
            onCommit={(val) => onUpdateField('targetUserSpesifik', val)}
          />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)] md:col-span-2">
          <SyncedTextarea
            id="canvas-solusi"
            label="3. Konsep Solusi & Keunggulan Unik"
            hint="Bagaimana cara kerja solusi ini (Software / Hardware / IoT / Bisnis / Sosial) dan apa bedanya dibanding solusi yang sudah ada?"
            value={canvas.solusiNilaiInovasi}
            meta={canvas.fieldMeta?.solusiNilaiInovasi}
            placeholder="Uraikan arsitektur atau mekanisme kerja produk/layanan beserta nilai kebaruannya..."
            onCommit={(val) => onUpdateField('solusiNilaiInovasi', val)}
          />
        </div>
      </section>

      {/* Section 3: 3 Pillars of Measurability */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            4. Keterukuran & Validasi Objektif
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Ubah klaim subjektif menjadi indikator yang bisa dibuktikan (berlaku untuk PKM maupun lomba lainnya).
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <SyncedTextarea
            id="canvas-realitas"
            label="Realitas (Dampak Before–After)"
            hint="Bukti lapangan & target dampak nyata bagi pengguna/pasar."
            value={canvas.indikatorRealitas}
            meta={canvas.fieldMeta?.indikatorRealitas}
            placeholder="Contoh: Waktu proses turun 50%, error berkurang, retensi naik..."
            onCommit={(val) => onUpdateField('indikatorRealitas', val)}
          />

          <SyncedTextarea
            id="canvas-teknis"
            label="Teknis / Kelayakan"
            hint="Metrik performa (akurasi, latensi, daya, biaya produksi, edge cases)."
            value={canvas.parameterTeknis}
            meta={canvas.fieldMeta?.parameterTeknis}
            placeholder="Contoh: Akurasi ≥90%, latensi <2 detik, biaya unit terjangkau..."
            onCommit={(val) => onUpdateField('parameterTeknis', val)}
          />

          <SyncedTextarea
            id="canvas-teori"
            label="Teori, Standar & Referensi"
            hint="Landasan ilmiah, metode baku, standar industri, atau regulasi."
            value={canvas.landasanTeori}
            meta={canvas.fieldMeta?.landasanTeori}
            placeholder="Contoh: Metode ilmiah, SNI/ISO, OWASP, UU PDP, HACCP..."
            onCommit={(val) => onUpdateField('landasanTeori', val)}
          />
        </div>
      </section>

      {/* Section 4: Realization, Usability & Sustainability */}
      <section className="grid gap-5 md:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
          <SyncedTextarea
            id="canvas-realisasi"
            label="5. Rencana Realisasi (MVP → Produk Jadi 1:1)"
            hint="Wujud akhir produk, tahapan pembuatan, estimasi biaya/sumber daya, dan kesiapan demo."
            value={canvas.rencanaRealisasi}
            meta={canvas.fieldMeta?.rencanaRealisasi}
            placeholder="Jelaskan roadmap pengerjaan agar benar-benar bisa dipakai pengguna nyata..."
            onCommit={(val) => onUpdateField('rencanaRealisasi', val)}
          />

          <SyncedTextarea
            id="canvas-ueq"
            label="Rencana Uji Pengguna (Usability Testing / Validasi)"
            hint="Cara menguji penerimaan pengguna (mis. UEQ, SUS, pilot test, wawancara mitra) beserta target skornya."
            value={canvas.usabilityTesting}
            meta={canvas.fieldMeta?.usabilityTesting}
            placeholder="Contoh: Uji UEQ pada 15–20 responden target dengan skor kategori Good..."
            onCommit={(val) => onUpdateField('usabilityTesting', val)}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-5 shadow-[var(--shadow-card)]">
          <SyncedTextarea
            id="canvas-keberlanjutan"
            label="6. Keberlanjutan Ide & Potensi Lomba / Hilirisasi"
            hint="Ke mana ide ini bisa berkembang selanjutnya? (Skema PKM lain, GEMASTIK, inkubasi startup, model bisnis, HKI/paten, atau kemitraan)."
            value={canvas.keberlanjutanIde}
            meta={canvas.fieldMeta?.keberlanjutanIde}
            placeholder="Contoh: Tahap 1 masuk PKM-KI/GEMASTIK, tahap 2 daftar HKI & pilot bersama mitra, tahap 3 jadi SaaS/produk komersial..."
            onCommit={(val) => onUpdateField('keberlanjutanIde', val)}
          />

          <SyncedTextarea
            id="canvas-dospem"
            label="Mentor / Dosen Pendamping & Peran Tim"
            hint="Relevansi kepakaran dosen/mentor dan pembagian tanggung jawab teknis tiap anggota tim."
            value={canvas.kesesuaianDospem}
            meta={canvas.fieldMeta?.kesesuaianDospem}
            placeholder="Catat kecocokan bidang pembimbing serta siapa mengerjakan riset, desain, teknis, dan validasi..."
            onCommit={(val) => onUpdateField('kesesuaianDospem', val)}
          />
        </div>
      </section>
    </div>
  );
}
