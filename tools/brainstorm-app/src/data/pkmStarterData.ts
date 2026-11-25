import type {
  BoardCard,
  ColumnId,
  FreeStickyNote,
  IdeaMaturityStage,
  IdeaRecord,
  InnovationCanvasData,
  MindmapEdgeRecord,
  MindmapNodeRecord,
  SolutionDomainTag,
  StarterOption,
  StickyColor,
} from '../types';

export const DEFAULT_ROOM_ID = 'pkm-ki-2027';

export const TARGET_TRACKS: Array<{
  id: string;
  label: string;
  shortHint: string;
}> = [
  {
    id: 'PKM-KI',
    label: 'PKM-KI (Karya Inovatif)',
    shortHint: 'Produk fungsional skala penuh 1:1 (bukan prototipe), 3 aspek keterukuran + UEQ, judul ≤ 20 kata kapital.',
  },
  {
    id: 'PKM-KC',
    label: 'PKM-KC (Karsa Cipta)',
    shortHint: 'Prototipe fungsional berbasis karsa/nalar inovatif dengan kebaruan prinsip atau fungsi.',
  },
  {
    id: 'PKM-K',
    label: 'PKM-K (Kewirausahaan)',
    shortHint: 'Komoditas produk/jasa unik berorientasi profit, validasi pasar, dan analisis kelayakan usaha.',
  },
  {
    id: 'PKM-PM',
    label: 'PKM-PM (Pengabdian Masyarakat)',
    shortHint: 'Solusi iptek/manajemen tepat guna bagi mitra masyarakat non-profit.',
  },
  {
    id: 'PKM-PI',
    label: 'PKM-PI (Penerapan Iptek)',
    shortHint: 'Penerapan teknologi untuk menjawab persoalan prioritas mitra usaha/UMKM komersial.',
  },
  {
    id: 'PKM-RE / RSH',
    label: 'PKM-RE / PKM-RSH (Riset)',
    shortHint: 'Penelitian eksakta atau sosial humaniora untuk mengungkap hubungan sebab-akibat/temuan baru.',
  },
  {
    id: 'PKM-VGK / GFT',
    label: 'PKM-VGK / PKM-GFT (Gagasan)',
    shortHint: 'Gagasan futuristik konstruktif jangka panjang (video/artikel gagasan) untuk isu strategis.',
  },
  {
    id: 'GEMASTIK / LIDM',
    label: 'GEMASTIK / LIDM / Lomba IT',
    shortHint: 'Fokus pada inovasi teknis, desain UX, demo produk, dan dampak terukur bagi pengguna.',
  },
  {
    id: 'Hackathon / Business Case',
    label: 'Hackathon / Lomba Inovasi Umum',
    shortHint: 'Fokus pada kecepatan validasi MVP, value proposition tajam, dan pitch yang meyakinkan.',
  },
  {
    id: 'Startup / Produk Mandiri',
    label: 'Startup / Produk / Inovasi Bebas',
    shortHint: 'Bebas eksplorasi produk nyata, model bisnis berkelanjutan, dan rencana pengembangan jangka panjang.',
  },
];

export const MATURITY_STAGES: Array<{
  id: IdeaMaturityStage;
  step: string;
  label: string;
  desc: string;
}> = [
  { id: 'bibit', step: '01', label: 'Bibit Ide', desc: 'Baru tercetus & dieksplorasi bebas' },
  { id: 'dibedah', step: '02', label: 'Sedang Dibedah', desc: 'Masalah, user & kebutuhan mulai jelas' },
  { id: 'tervalidasi', step: '03', label: 'Tervalidasi', desc: 'Solusi, indikator & track lomba cocok' },
  { id: 'matang', step: '04', label: 'Ide Matang', desc: 'Siap dieksekusi & punya rencana keberlanjutan' },
];

export const PKM_THEMES: string[] = [
  '1. Kemandirian Pangan, Energi, dan Air',
  '2. Kesehatan dan Gizi Masyarakat',
  '3. Pencegahan dan Pemberantasan Korupsi',
  '4. Pemberantasan Kemiskinan',
  '5. Pencegahan dan Pemberantasan Narkoba',
  '6. Penguatan Pendidikan, Sains, dan Teknologi',
  '7. Penguatan Kesetaraan Gender & Perlindungan Hak Perempuan, Anak, dan Penyandang Disabilitas',
  '8. Pelestarian Lingkungan dan Mitigasi Bencana',
  '9. Pemerataan Ekonomi, Penguatan UMKM, dan Pembangunan IKN',
  '10. Pelestarian Seni Budaya dan Peningkatan Ekonomi Kreatif',
];

export const STICKY_COLORS: Record<
  StickyColor,
  { name: string; bgVar: string; borderVar: string; swatch: string }
> = {
  butter: {
    name: 'Kuning',
    bgVar: 'var(--sticky-butter-bg)',
    borderVar: 'var(--sticky-butter-border)',
    swatch: '#FACC15',
  },
  mint: {
    name: 'Mint',
    bgVar: 'var(--sticky-mint-bg)',
    borderVar: 'var(--sticky-mint-border)',
    swatch: '#34D399',
  },
  sky: {
    name: 'Biru',
    bgVar: 'var(--sticky-sky-bg)',
    borderVar: 'var(--sticky-sky-border)',
    swatch: '#38BDF8',
  },
  rose: {
    name: 'Pink',
    bgVar: 'var(--sticky-rose-bg)',
    borderVar: 'var(--sticky-rose-border)',
    swatch: '#FB7185',
  },
  lavender: {
    name: 'Ungu',
    bgVar: 'var(--sticky-lavender-bg)',
    borderVar: 'var(--sticky-lavender-border)',
    swatch: '#A78BFA',
  },
  paper: {
    name: 'Netral',
    bgVar: 'var(--sticky-paper-bg)',
    borderVar: 'var(--sticky-paper-border)',
    swatch: '#9CA3AF',
  },
};

export const SOLUTION_DOMAIN_TAGS: SolutionDomainTag[] = [
  'Software',
  'Hardware',
  'IoT',
  'AI / Data',
  'Bisnis',
  'Sosial',
  'Kreatif',
];

export const BOARD_COLUMNS: Array<{
  id: ColumnId;
  stepNumber: string;
  title: string;
  subtitle: string;
  placeholderTitle: string;
  placeholderContent: string;
  topAccent: string;
}> = [
  {
    id: 'problem',
    stepNumber: '01',
    title: 'Masalah Nyata',
    subtitle: 'Apa kendala atau peluang faktual yang kita lihat?',
    placeholderTitle: 'Contoh: Audit mutu porsi dapur katering masih manual',
    placeholderContent:
      'Ceritakan kejadian nyata di lapangan, siapa yang terdampak, dan apa yang selama ini belum optimal.',
    topAccent: 'border-t-rose-500',
  },
  {
    id: 'urgency',
    stepNumber: '02',
    title: 'Urgensi & Bukti',
    subtitle: 'Kenapa penting dan apa dampaknya jika diselesaikan?',
    placeholderTitle: 'Contoh: Risiko keracunan pangan & pemborosan 20%',
    placeholderContent:
      'Tambahkan data awal, berita, observasi lapangan, atau besarnya dampak sosial/ekonomi/teknis.',
    topAccent: 'border-t-amber-500',
  },
  {
    id: 'targetUser',
    stepNumber: '03',
    title: 'Target Pengguna',
    subtitle: 'Siapa yang memakai? (usia, jumlah, lokasi, kebiasaan)',
    placeholderTitle: 'Contoh: Kepala dapur & staf UMKM katering Surabaya',
    placeholderContent:
      'Sebutkan profil pengguna langsung, rentang usia, lokasi/komunitas, dan perkiraan jumlahnya.',
    topAccent: 'border-t-teal-500',
  },
  {
    id: 'needs',
    stepNumber: '04',
    title: 'Kebutuhan Inti',
    subtitle: 'Apa yang benar-benar mereka butuhkan agar solusi terpakai?',
    placeholderTitle: 'Contoh: Verifikasi cepat <10 detik & bisa offline',
    placeholderContent:
      'Batasan biaya, waktu, perangkat, literasi, atau alur kerja yang wajib dipenuhi solusi.',
    topAccent: 'border-t-indigo-500',
  },
];

export const STARTER_OPTIONS: StarterOption[] = [
  {
    id: 'opsi-1',
    badge: 'Opsi 1 · Upgrade Ide Lama',
    shortLabel: 'Upgrade MCP + Privasi',
    verdict: 'Layak Bersyarat (Wajib Mitra Aplikasi Nyata)',
    title:
      'Jembatan Akses Layanan Lokal Inklusif Berbasis Ekstraksi Kode Sumber ke MCP dengan Proteksi Data Pribadi',
    temaPkm:
      '7. Penguatan Kesetaraan Gender & Perlindungan Hak Perempuan, Anak, dan Penyandang Disabilitas',
    benchmarkNote:
      'Re-framing dari draft INFRIA: tinggalkan mock API SATUSEHAT, fokus ke aplikasi web/mobile klinik atau instansi lokal nyata + PII masking UU PDP.',
    dospemFit: 'RPL, Analisis Kebutuhan, Kualitas & Pengujian Perangkat Lunak',
    summaryProblem:
      'Formulir layanan digital klinik/instansi lokal rumit bagi lansia (memicu proxy use), sementara tim IT lokal tak punya SDM untuk membangun antarmuka percakapan aman dari nol.',
    summarySolution:
      'AST-to-MCP generator lintas platform + middleware PII masking lokal (UU PDP) + widget suara/teks berkonfirmasi aman.',
    stickyColor: 'butter',
    stickyText:
      'Ide Pemantik 1 (Upgrade INFRIA):\nGimana kalau jembatan MCP dari source file + proteksi PII (UU PDP) ini dipasang ke aplikasi web/mobile klinik atau layanan kampus nyata biar ramah lansia & developer lokal gampang integrasi?',
    cards: {
      problem: {
        title: 'Antarmuka layanan klinik/instansi lokal rumit & picu proxy use',
        content:
          'Layanan digital lokal menuntut navigasi bertingkat sehingga pengguna lanjut usia terpaksa menyerahkan HP/NIK ke orang lain. Tim IT lokal kesulitan membangun asisten percakapan aman dari nol.',
      },
      urgency: {
        title: 'Risiko kebocoran data pribadi (UU PDP) & biaya rebuild mahal',
        content:
          'Proxy use membuka celah kebocoran NIK/rekam medis. SUS aplikasi kesehatan masih below average (60,9) dan kemandirian 42%.',
      },
      targetUser: {
        title: 'Pasien/warga 55–75 thn & developer layanan lokal Surabaya',
        content:
          '20–30 pengguna akhir literasi digital rendah di klinik/layanan mitra + 10 developer pengelola aplikasi lokal.',
      },
      needs: {
        title: 'Interaksi suara/teks berkonfirmasi + integrasi aman tanpa ubah backend',
        content:
          'Pengguna butuh interaksi sederhana + konfirmasi visual besar; developer butuh ekstraksi otomatis tanpa kirim NIK mentah ke LLM publik.',
      },
    },
    mindmap: {
      rootTitle: 'Layanan digital lokal rumit bagi lansia & mahal dimigrasi developer',
      rootDetail: 'Upgrade ide lama dengan mitra aplikasi nyata & proteksi data lokal.',
      solutions: [
        {
          title: 'AST-to-MCP Bridge + PII Masking + Widget Suara/Teks',
          detail:
            'Ekstraksi route/source file otomatis jadi MCP Server dengan masking NIK lokal (UU PDP) dan konfirmasi Human-in-the-Loop.',
          tag: 'Software',
          indicators: [
            {
              pillar: 'Realitas',
              title: 'Kemandirian End-User & Efisiensi Dev',
              detail: 'Task completion mandiri ≥85% pada 20 responden; setup integrasi dev ≤15 menit.',
            },
            {
              pillar: 'Teknis',
              title: 'Akurasi AST-MCP & PII Redaction',
              detail: 'Schema accuracy ≥95%, PII redaction 100%, tool-call precision ≥92%, latensi <3 dtk.',
            },
            {
              pillar: 'Teori',
              title: 'UU PDP, OWASP LLM Top 10 & WCAG 2.1',
              detail: 'Mengacu UU No. 27/2022, OWASP LLM/API, WCAG 2.1 AA, dan spesifikasi terbuka MCP.',
            },
          ],
        },
      ],
    },
    canvasPreset: {
      judulUsulan:
        'SISTEM JEMBATAN INTEGRASI ASISTEN PERCAKAPAN INKLUSIF BERBASIS ANALISIS KODE SUMBER OTOMATIS DENGAN PROTEKSI DATA PRIBADI',
      targetTrack: 'PKM-KI',
      maturityStage: 'dibedah',
      temaPkm:
        '7. Penguatan Kesetaraan Gender & Perlindungan Hak Perempuan, Anak, dan Penyandang Disabilitas',
      problemUrgensi:
        'Layanan digital klinik pratama/instansi daerah memiliki formulir kompleks yang memicu proxy use (penyerahan HP & NIK ke pihak lain) pada lansia, sementara tim IT lokal tidak memiliki biaya/SDM membangun asisten percakapan aman dari nol.',
      targetUserSpesifik:
        '20–30 pengguna lanjut usia/literasi digital rendah (55–75 tahun) di layanan klinik/instansi mitra Surabaya + 10 pengembang sistem lokal.',
      solusiNilaiInovasi:
        'Jembatan lintas platform: AST Source-File Analyzer → MCP Server tervalidasi + Local PII Redaction Middleware (UU PDP) + widget suara/teks kontras tinggi dengan Human-in-the-Loop confirmation.',
      indikatorRealitas:
        'Uji langsung di 1–2 aplikasi operasional nyata mitra: task completion mandiri ≥85%, waktu daftar turun ≥40%, integrasi developer ≤15 menit.',
      parameterTeknis:
        'Ekstraksi skema AST-to-MCP ≥95%, PII masking 100%, tool-call precision ≥92%, latensi <3 detik.',
      landasanTeori:
        'AST Static Analysis, Model Context Protocol (MCP), UU No. 27/2022 (UU PDP), OWASP LLM Top 10, WCAG 2.1 AA.',
      rencanaRealisasi:
        'CLI + Web Console + MCP Gateway + Widget Aksesibel terpasang langsung pada aplikasi nyata milik mitra (bukan mock API).',
      usabilityTesting:
        'Short UEQ + SUS pada 20 end-user (target Good/Above Average) + Developer Experience benchmark pada 10 developer.',
      keberlanjutanIde:
        'Bisa dikembangkan menjadi open-source toolkit + layanan SaaS B2B untuk klinik/UMKM/pemda, dan sangat kompetitif untuk dibawa ke GEMASTIK (Divisi Pengembangan Perangkat Lunak) atau program inkubasi startup kampus.',
      kesesuaianDospem:
        'Arni Muarifah Amri, S.T., M.T. (S1 RPL) — sesuai bidang RPL, Analisis Kebutuhan, Kualitas & Pengujian Perangkat Lunak.',
    },
  },
  {
    id: 'opsi-2',
    badge: 'Opsi 2 · Pure Software & AI',
    shortLabel: 'Dapur Gizi & Keamanan Pangan',
    verdict: 'Kuat untuk PKM-KI / GEMASTIK / Startup',
    title:
      'Sistem Audit Keamanan Pangan (HACCP/CPPOB) & Verifikasi Porsi Gizi Berbasis Visi Komputer untuk Dapur Massal / UMKM',
    temaPkm: '2. Kesehatan dan Gizi Masyarakat',
    benchmarkNote:
      'Mengikuti pola pure software end-to-end seperti SMARTTRACER (Polban) di PIMNAS 2026: langsung dipakai harian oleh pengelola dapur/UMKM.',
    dospemFit: 'Tinggi (Riset Bu Arni 2025: Transformasi Digital UMKM Pangan/ERP + SPK)',
    summaryProblem:
      'Dapur katering massal, UMKM pangan, dan dapur gizi (SPPG) masih mencatat kontrol higienitas, waktu tunggu makanan, dan kesesuaian porsi gizi secara manual sehingga rawan keracunan & food waste.',
    summarySolution:
      'Aplikasi web & mobile offline-first dengan Computer Vision pemindai foto nampan/ompreng, alarm holding time CPPOB/HACCP, dan SPK stok bahan.',
    stickyColor: 'mint',
    stickyText:
      'Ide Pemantik 2 (Dapur Gizi & UMKM Pangan):\nBanyak kasus keracunan & salah porsi di katering massal / dapur MBG karena pencatatan manual. Gimana kalau bikin aplikasi QC dapur pakai foto kamera HP untuk cek kelengkapan porsi + alarm keamanan pangan otomatis?',
    cards: {
      problem: {
        title: 'Audit mutu gizi & keamanan pangan dapur katering/SPPG masih manual',
        content:
          'Pencatatan higienitas CPPOB/HACCP, batas waktu aman masak-kirim (holding time), dan verifikasi kelengkapan porsi masih di kertas terpisah.',
      },
      urgency: {
        title: 'Risiko keracunan pangan massal, deviasi AKG, & food waste 15–25%',
        content:
          'Kesalahan kontrol suhu/waktu simpan memicu KLB keracunan pangan, sementara salah takar stok menggerus margin UMKM katering.',
      },
      targetUser: {
        title: 'Kepala dapur, staf QC & ahli gizi UMKM katering Surabaya–Sidoarjo',
        content:
          '15–25 staf aktif (usia 22–50 thn) di 2–3 dapur katering skala menengah / UMKM pangan atau unit SPPG.',
      },
      needs: {
        title: 'Cek porsi cepat via foto (<10 dtk), offline-first, & rekap 1 klik',
        content:
          'Saat jam sibuk subuh, staf tidak bisa mengetik form panjang; butuh pindai cepat lewat HP, alarm waktu aman, dan laporan audit instan.',
      },
    },
    mindmap: {
      rootTitle: 'Audit keamanan pangan & verifikasi porsi gizi dapur massal rawan galat',
      rootDetail: 'Isu aktual 2026–2027, 100% sesuai kekuatan RPL & bisa diuji harian di Surabaya.',
      solutions: [
        {
          title: 'Aplikasi Dapur Offline-First + Computer Vision Cek Porsi & HACCP',
          detail:
            'Scan foto nampan terkalibrasi wadah standar untuk cek komponen gizi, alarm holding time, dan SPK bahan baku FEFO.',
          tag: 'AI / Data',
          indicators: [
            {
              pillar: 'Realitas',
              title: 'Waktu Rekap Turun & Kepatuhan QC Naik',
              detail: 'Rekap harian turun dari 45 mnt ke <5 mnt; penurunan deviasi porsi & food waste dalam 3 minggu.',
            },
            {
              pillar: 'Teknis',
              title: 'Akurasi CV (mAP) & Latensi HP Standar',
              detail: 'mAP ≥88%, inferensi <2 detik di HP standar, offline-first sync 100%, uptime ≥99%.',
            },
            {
              pillar: 'Teori',
              title: 'AKG Permenkes 28/2019, HACCP & SPK',
              detail: 'Mengacu Permenkes AKG, CPPOB BPOM / SNI CAC/RCP 1:2011, Computer Vision & SPK SAW/TOPSIS.',
            },
          ],
        },
      ],
    },
    canvasPreset: {
      judulUsulan:
        'SISTEM AUDIT KEAMANAN PANGAN DAN VERIFIKASI PORSI GIZI BERBASIS VISI KOMPUTER UNTUK DAPUR PRODUKSI PANGAN MASSAL',
      targetTrack: 'PKM-KI',
      maturityStage: 'dibedah',
      temaPkm: '2. Kesehatan dan Gizi Masyarakat',
      problemUrgensi:
        'Dapur katering massal, UMKM pangan, dan dapur SPPG masih mencatat kontrol higienitas (CPPOB/HACCP), holding time, dan verifikasi porsi secara manual sehingga rentan keracunan pangan, deviasi AKG, dan food waste.',
      targetUserSpesifik:
        '15–25 staf dapur, QC, dan ahli gizi (usia 22–50 tahun) pada 2–3 mitra dapur katering massal/UMKM pangan di Surabaya–Sidoarjo.',
      solusiNilaiInovasi:
        'Aplikasi mobile & dasbor web offline-first: (1) Computer Vision pemindai foto ompreng berkalibrasi wadah standar; (2) Audit titik kritis CPPOB/HACCP + alarm otomatis holding time; (3) SPK stok bahan berbasis FEFO.',
      indikatorRealitas:
        'Uji 2–4 minggu di dapur mitra: waktu rekap turun dari ~45 mnt ke <5 mnt, kepatuhan pencatatan QC ≥95%, penurunan deviasi porsi & sisa bahan.',
      parameterTeknis:
        'mAP/F1 deteksi komponen & kelas porsi ≥88%, latensi inferensi <2 detik di HP menengah, sinkronisasi offline 100%, uptime ≥99%.',
      landasanTeori:
        'Permenkes RI No. 28/2019 (AKG), CPPOB BPOM & SNI CAC/RCP 1:2011 (HACCP), Computer Vision ringan (YOLO), SPK (SAW/TOPSIS).',
      rencanaRealisasi:
        'Aplikasi web & mobile operasional 1:1 siap pakai harian oleh dapur mitra nyata tanpa dummy data + Dokumen Teknis Produk.',
      usabilityTesting:
        'UEQ + Time-on-Task pada minimal 15 staf dapur/ahli gizi saat operasional nyata (target Good/Excellent di Efficiency & Perspicuity).',
      keberlanjutanIde:
        'Berpotensi kuat menjadi SaaS vertikal untuk katering/UMKM pangan & ekosistem SPPG (model langganan bulanan), serta sangat cocok dibawa ke PKM-KI/PKM-PI, GEMASTIK, maupun P2MW/startup food-tech.',
      kesesuaianDospem:
        'Arni Muarifah Amri, S.T., M.T. (S1 RPL) — sejalan dengan riset 2025 Transformasi Digital UMKM Pengolahan Ikan/ERP & mata kuliah SPK.',
    },
  },
  {
    id: 'opsi-3',
    badge: 'Opsi 3 · Cyber-Physical Edge-AI',
    shortLabel: 'Alat Literasi Non-Gawai Disleksia',
    verdict: 'Match Terkuat PIMNAS & Dospem',
    title:
      'Perangkat Pendamping & Asesmen Latihan Membaca Non-Gawai Berbasis Edge-AI Luring bagi Siswa SD dengan Disleksia',
    temaPkm:
      '7. Penguatan Kesetaraan Gender & Perlindungan Hak Perempuan, Anak, dan Penyandang Disabilitas',
    benchmarkNote:
      'Selaras dengan 95% finalis PIMNAS PKM-KI 2026 (fisik + AI seperti LINGO UGM) dan cocok 100% dengan hibah Komdigi 2022 Bu Arni (Asesmen Disleksia).',
    dospemFit: 'Sangat Tinggi (Hibah Komdigi 2022 Disleksia + Deep Learning Suara 2025)',
    summaryProblem:
      'Siswa kelas 1–3 SD dengan kesulitan membaca/disleksia minim pendampingan personal di sekolah/rumah, sementara latihan lewat HP memicu distraksi gim & kelelahan layar.',
    summarySolution:
      'Perangkat meja/genggam non-gawai Edge-AI luring (kamera OCR buku cetak + evaluasi fonemik suara + speaker pemandu) terhubung ke dasbor progres guru & orang tua.',
    stickyColor: 'sky',
    stickyText:
      'Ide Pemantik 3 (Alat Baca Non-Gawai Disleksia):\nAnak SD yang kesulitan membaca/disleksia sering susah fokus kalau belajar di HP. Gimana kalau bikin alat kecil tanpa layar HP yang ditaruh di atas buku cetak, mendengarkan suara anak membaca secara offline, lalu ngasih koreksi suara & laporan huruf salah ke guru/ortu?',
    cards: {
      problem: {
        title: 'Siswa SD kesulitan membaca/disleksia minim pendamping & terganggu layar HP',
        content:
          'Siswa kelas 1–3 SD sering tertukar huruf/suku kata saat membaca buku cetak. Guru & orang tua terbatas waktunya, sedangkan aplikasi HP memicu distraksi gim.',
      },
      urgency: {
        title: '5–10% siswa SD alami hambatan baca & rasio Guru Pembimbing Khusus minim',
        content:
          'Keterlambatan literasi di kelas awal berdampak panjang ke seluruh mata pelajaran dan kepercayaan diri anak.',
      },
      targetUser: {
        title: 'Siswa SD kelas 1–3 (6–9 thn) berkendala baca + guru inklusi & orang tua',
        content:
          '15–20 siswa SD inklusi/komunitas belajar Surabaya + 15 guru kelas/GPK dan orang tua pemantau progres.',
      },
      needs: {
        title: 'Alat fisik ramah anak non-gawai, kerja offline, & peta kesalahan huruf otomatis',
        content:
          'Anak butuh pendamping suara hangat langsung di atas buku cetak tanpa Wi-Fi; guru butuh laporan WCPM & pola salah huruf (b/d, p/q).',
      },
    },
    mindmap: {
      rootTitle: 'Siswa SD kesulitan membaca/disleksia minim pendampingan tanpa distraksi gawai',
      rootDetail: 'Produk cyber-physical nyata 1:1, selaras riset disleksia & suara Bu Arni.',
      solutions: [
        {
          title: 'Perangkat Edge-AI Pembaca Buku Cetak + Evaluasi Fonemik Offline',
          detail:
            'SBC portabel + kamera makro OCR + mikrofon + speaker pemandu suara + casing 3D-print ramah anak.',
          tag: 'Hardware',
          indicators: [
            {
              pillar: 'Realitas',
              title: 'Kenaikan WCPM & Penurunan Salah Huruf',
              detail: 'Kecepatan baca benar (WCPM) naik ≥20% dalam 3–4 minggu uji coba pada 15 siswa SD.',
            },
            {
              pillar: 'Teknis',
              title: 'OCR ≥95%, WER ≤12%, Latensi <1,5 dtk',
              detail: 'Bekerja luring dengan constrained phonetic alignment, baterai ≥4 jam, BoM tiap item ≤Rp1 jt.',
            },
            {
              pillar: 'Teori',
              title: 'Orton-Gillingham & Hamming Distance',
              detail: 'Metode multisensori Orton-Gillingham & algoritma Hamming/Text Similarity (riset Bu Arni 2022).',
            },
          ],
        },
        {
          title: 'Dasbor Web Monitoring Progres Guru & Orang Tua',
          detail: 'Grafik WCPM, peta huruf sering tertukar, dan rekomendasi bahan bacaan adaptif.',
          tag: 'Software',
          indicators: [
            {
              pillar: 'Realitas',
              title: 'Evaluasi Guru Otomatis & Terukur',
              detail: 'Laporan kesalahan fonemik per siswa tersedia otomatis tanpa pencatatan manual.',
            },
          ],
        },
      ],
    },
    canvasPreset: {
      judulUsulan:
        'PERANGKAT PENDAMPING DAN ASESMEN LATIHAN MEMBACA ADAPTIF NON-GAWAI BERBASIS KECERDASAN BUATAN TEPI BAGI ANAK DISLEKSIA',
      targetTrack: 'PKM-KI',
      maturityStage: 'dibedah',
      temaPkm:
        '7. Penguatan Kesetaraan Gender & Perlindungan Hak Perempuan, Anak, dan Penyandang Disabilitas',
      problemUrgensi:
        '5–10% siswa SD mengalami kesulitan membaca/indikasi disleksia dengan rasio Guru Pembimbing Khusus sangat terbatas. Aplikasi HP memicu distraksi layar, sementara buku cetak tanpa pendamping tidak memberi umpan balik fonemik.',
      targetUserSpesifik:
        '15–20 siswa SD kelas 1–3 (6–9 tahun) di SD inklusi/komunitas belajar Surabaya + 15 guru kelas/GPK dan orang tua.',
      solusiNilaiInovasi:
        'Perangkat portabel non-gawai Edge-AI luring (kamera makro OCR buku cetak + mikrofon + speaker umpan balik fonemik + casing 3D-print) dengan algoritma constrained phonetic alignment & dasbor web guru/orang tua.',
      indikatorRealitas:
        'Uji pre–post 3–4 minggu: peningkatan Words Correct Per Minute (WCPM) ≥20%, penurunan kesalahan substitusi/omisi suku kata, dan efisiensi rekap asesmen guru.',
      parameterTeknis:
        'OCR buku anak ≥95%, WER terpandu ≤12% (derau kelas 45–60 dB), latensi suara offline <1,5 detik, baterai ≥4 jam, BoM tiap komponen ≤Rp1 juta.',
      landasanTeori:
        'Multisensory Structured Language (Orton-Gillingham), kesadaran fonologis, Hamming Distance & Text Similarity (hibah Komdigi 2022 Bu Arni), Edge OCR/ASR.',
      rencanaRealisasi:
        'Unit fisik skala penuh 1:1 bercasing 3D-print aman untuk anak, bekerja mandiri tanpa internet + dasbor web terdeploy & DTP lengkap.',
      usabilityTesting:
        'UEQ pada 15 guru/orang tua (target Good/Excellent) + observasi kebergunaan ramah anak (Smileyometer & task completion) pada 10–15 siswa.',
      keberlanjutanIde:
        'Dapat diproduksi massal bermitra dengan yayasan/sekolah inklusi, didaftarkan paten sederhana/hak cipta, dan potensial juga untuk PKM-KC/KI, LIDM, maupun lomba EdTech/Social Innovation nasional.',
      kesesuaianDospem:
        'Arni Muarifah Amri, S.T., M.T. (S1 RPL) — kecocokan sempurna (hibah Komdigi 2022 Asesmen Disleksia + Deep Learning Suara 2025). Disarankan ajak 1 anggota lintas prodi (Elektro/Tekkom/Desain Produk).',
    },
  },
];

export const EMPTY_CANVAS: Omit<InnovationCanvasData, 'fieldMeta'> = {
  judulUsulan: '',
  targetTrack: 'PKM-KI',
  maturityStage: 'bibit',
  temaPkm: '',
  problemUrgensi: '',
  targetUserSpesifik: '',
  solusiNilaiInovasi: '',
  indikatorRealitas: '',
  parameterTeknis: '',
  landasanTeori: '',
  rencanaRealisasi: '',
  usabilityTesting: '',
  keberlanjutanIde: '',
  kesesuaianDospem: '',
};

export function buildStarterFreeNotes(): Record<string, FreeStickyNote> {
  const now = Date.now();
  const map: Record<string, FreeStickyNote> = {
    'free-welcome': {
      id: 'free-welcome',
      kind: 'label',
      text: 'Ruang Ide Bebas — Tulis ide liar apa aja di sini! Klik ganda kanvas atau tekan "+ Sticky Note". Bebas bidang (PKM apa saja, GEMASTIK, Hackathon, Startup). Klik ikon komentar untuk diskusi bareng.',
      color: 'paper',
      author: 'Panduan Singkat',
      authorColor: '#111827',
      tag: 'Mulai di sini',
      x: 60,
      y: 40,
      votes: {},
      comments: {},
      createdAt: now - 5000,
      updatedAt: now,
    },
  };

  STARTER_OPTIONS.forEach((opt, idx) => {
    const id = `free-starter-${opt.id}`;
    map[id] = {
      id,
      kind: 'sticky',
      text: opt.stickyText,
      color: opt.stickyColor,
      author: 'Inspirasi Awal',
      authorColor: '#4F46E5',
      tag: opt.shortLabel,
      promotedToBoard: true,
      promotedIdeaId: opt.id,
      x: 60 + idx * 305,
      y: 190,
      votes: {},
      comments: {},
      createdAt: now - (4 - idx) * 1000,
      updatedAt: now,
    };
  });

  return map;
}

export function buildStarterCards(): Record<string, BoardCard> {
  const now = Date.now();
  const map: Record<string, BoardCard> = {};
  const columns: ColumnId[] = ['problem', 'urgency', 'targetUser', 'needs'];

  STARTER_OPTIONS.forEach((opt, optIndex) => {
    columns.forEach((col, colIndex) => {
      const id = `starter-${opt.id}-${col}`;
      const entry = opt.cards[col];
      map[id] = {
        id,
        ideaId: opt.id,
        columnId: col,
        order: now - (30 - optIndex * 4 - colIndex) * 1000,
        title: entry.title,
        content: entry.content,
        author: 'Inspirasi Awal',
        ideaGroup: opt.shortLabel,
        pkmTheme: opt.temaPkm,
        isStarter: true,
        starterOptionId: opt.id,
        votes: {},
        comments: {},
        createdAt: now - (30 - optIndex * 4 - colIndex) * 1000,
        updatedAt: now,
      };
    });
  });

  return map;
}

const STARTER_IDEA_COLORS = ['#F59E0B', '#10B981', '#0EA5E9'];

export function buildStarterIdeas(): Record<string, IdeaRecord> {
  const now = Date.now();
  const map: Record<string, IdeaRecord> = {};

  STARTER_OPTIONS.forEach((opt, idx) => {
    map[opt.id] = {
      id: opt.id,
      name: opt.shortLabel,
      color: STARTER_IDEA_COLORS[idx % STARTER_IDEA_COLORS.length],
      createdBy: 'Inspirasi Awal',
      decision: idx === 2 ? 'prioritas' : 'kandidat',
      isStarter: true,
      starterOptionId: opt.id,
      sourceNoteIds: {
        [`free-starter-${opt.id}`]: true,
      },
      votes: {},
      mindmap: buildMindmapFromOption(opt, 'Inspirasi Awal'),
      canvas: {
        ...opt.canvasPreset,
        fieldMeta: {},
      },
      createdAt: now - (3 - idx) * 1000,
      updatedAt: now,
    };
  });

  return map;
}

export function buildMindmapFromOption(
  option: StarterOption,
  author: string
): {
  nodes: Record<string, MindmapNodeRecord>;
  edges: Record<string, MindmapEdgeRecord>;
} {
  const now = Date.now();
  const nodes: Record<string, MindmapNodeRecord> = {};
  const edges: Record<string, MindmapEdgeRecord> = {};

  const IND_PITCH_Y = 235;
  const SOL_X = 460;
  const IND_X = 910;
  let cursorY = 40;
  const solCenters: number[] = [];

  option.mindmap.solutions.forEach((sol, sIdx) => {
    const solId = `node-sol-${sIdx + 1}`;
    const startY = cursorY;
    const indCount = Math.max(1, sol.indicators.length);
    const blockHeight = (indCount - 1) * IND_PITCH_Y;
    const solY = startY + blockHeight / 2;
    solCenters.push(solY);

    nodes[solId] = {
      id: solId,
      kind: 'solution',
      title: sol.title,
      detail: sol.detail,
      tag: sol.tag,
      author,
      x: SOL_X,
      y: Math.round(solY),
      updatedAt: now,
    };

    sol.indicators.forEach((ind, iIdx) => {
      const indId = `node-ind-${sIdx + 1}-${iIdx + 1}`;
      nodes[indId] = {
        id: indId,
        kind: 'indicator',
        title: ind.title,
        detail: ind.detail,
        tag: ind.pillar,
        author,
        x: IND_X,
        y: Math.round(startY + iIdx * IND_PITCH_Y),
        updatedAt: now,
      };
      edges[`edge-${solId}-${indId}`] = {
        id: `edge-${solId}-${indId}`,
        source: solId,
        target: indId,
        label: ind.pillar,
      };
    });

    cursorY = startY + indCount * IND_PITCH_Y + 48;
  });

  const rootId = 'node-root';
  const rootY =
    solCenters.length > 0
      ? (solCenters[0] + solCenters[solCenters.length - 1]) / 2
      : 180;

  nodes[rootId] = {
    id: rootId,
    kind: 'root',
    title: option.mindmap.rootTitle,
    detail: option.mindmap.rootDetail,
    author,
    sourceCardId: `starter-${option.id}-problem`,
    x: 40,
    y: Math.round(rootY),
    updatedAt: now,
  };

  option.mindmap.solutions.forEach((_sol, sIdx) => {
    const solId = `node-sol-${sIdx + 1}`;
    edges[`edge-${rootId}-${solId}`] = {
      id: `edge-${rootId}-${solId}`,
      source: rootId,
      target: solId,
      label: 'Solusi',
    };
  });

  return { nodes, edges };
}

export function buildMindmapFromCard(
  card: BoardCard,
  author: string
): {
  nodes: Record<string, MindmapNodeRecord>;
  edges: Record<string, MindmapEdgeRecord>;
} {
  if (card.starterOptionId) {
    const matched = STARTER_OPTIONS.find((o) => o.id === card.starterOptionId);
    if (matched) {
      const built = buildMindmapFromOption(matched, author);
      built.nodes['node-root'] = {
        ...built.nodes['node-root'],
        title: card.title,
        detail: card.content,
        sourceCardId: card.id,
      };
      return built;
    }
  }

  return buildMindmapFromFreeText(card.title, card.content, author, card.id);
}

export function buildMindmapFromFreeText(
  title: string,
  detail: string,
  author: string,
  sourceId?: string
): {
  nodes: Record<string, MindmapNodeRecord>;
  edges: Record<string, MindmapEdgeRecord>;
} {
  const now = Date.now();
  const rootId = 'node-root';
  const solId = 'node-sol-1';
  const indRealId = 'node-ind-realitas';
  const indTekId = 'node-ind-teknis';
  const indTeoId = 'node-ind-teori';

  const nodes: Record<string, MindmapNodeRecord> = {
    [rootId]: {
      id: rootId,
      kind: 'root',
      title,
      detail,
      author,
      sourceCardId: sourceId,
      x: 40,
      y: 265,
      updatedAt: now,
    },
    [solId]: {
      id: solId,
      kind: 'solution',
      title: 'Opsi Solusi 1',
      detail: 'Klik edit untuk menguraikan solusi & pilih label domainnya.',
      tag: 'Software',
      author,
      x: 460,
      y: 265,
      updatedAt: now,
    },
    [indRealId]: {
      id: indRealId,
      kind: 'indicator',
      title: 'Indikator Dampak (Realitas)',
      detail: 'Dampak nyata before–after bagi pengguna/pasar.',
      tag: 'Realitas',
      author,
      x: 910,
      y: 40,
      updatedAt: now,
    },
    [indTekId]: {
      id: indTekId,
      kind: 'indicator',
      title: 'Parameter Teknis / Kelayakan',
      detail: 'Metrik performa, akurasi, kecepatan, atau kelayakan produksi.',
      tag: 'Teknis',
      author,
      x: 910,
      y: 265,
      updatedAt: now,
    },
    [indTeoId]: {
      id: indTeoId,
      kind: 'indicator',
      title: 'Landasan Teori / Referensi',
      detail: 'Metode ilmiah, standar industri, regulasi, atau studi pembanding.',
      tag: 'Teori',
      author,
      x: 910,
      y: 490,
      updatedAt: now,
    },
  };

  const edges: Record<string, MindmapEdgeRecord> = {
    [`edge-${rootId}-${solId}`]: {
      id: `edge-${rootId}-${solId}`,
      source: rootId,
      target: solId,
      label: 'Solusi',
    },
    [`edge-${solId}-${indRealId}`]: {
      id: `edge-${solId}-${indRealId}`,
      source: solId,
      target: indRealId,
      label: 'Realitas',
    },
    [`edge-${solId}-${indTekId}`]: {
      id: `edge-${solId}-${indTekId}`,
      source: solId,
      target: indTekId,
      label: 'Teknis',
    },
    [`edge-${solId}-${indTeoId}`]: {
      id: `edge-${solId}-${indTeoId}`,
      source: solId,
      target: indTeoId,
      label: 'Teori',
    },
  };

  return { nodes, edges };
}
