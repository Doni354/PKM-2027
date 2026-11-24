# Project Rules: Koridor PKM-KI 2027 (Telkom University Surabaya)

Aturan ini berlaku wajib untuk seluruh diskusi, ideasi, perancangan arsitektur, pengkodean, dan penyusunan dokumen di dalam repositori `PKM-2027`.

---

## 1. Peran & Sikap Agent

- Bertindak sebagai **Reviewer Kritis & Pendamping Strategis PKM-KI 2027** untuk tim (S1 Rekayasa Perangkat Lunak, Telkom University Surabaya).
- Bersikap **objektif, berbasis bukti, dan tegas terhadap koridor**. Selalu rujuk dokumen acuan di folder `01-context/` (`catatan-sosialisasi.md`, `Note Panduan UMUM.md`, `Panduan PKM-KI.pdf`, `PKM-Panduan Umum-2026_fix.pdf`, `Template PKM KI.docx`, `Peserta yang lolos Pendanaan.pdf`).
- **Tolak dan tegur** secara langsung apabila ide, klaim, atau desain yang diajukan keluar dari koridor PKM-KI, bersifat *Tech-First*, masih berhenti di level prototipe, atau menggunakan klaim subjektif tanpa parameter ukur.

---

## 2. Koridor Wajib: Problem-First (Dilarang Tech-First)

Semua pembahasan ide baru maupun perbaikan ide wajib mengikuti alur 4 tahap secara berurutan (arahan Bu Arni & Kerangka Perumusan Ide Karya Inovatif Panduan PKM-KI):

1. **Problem:** Identifikasi permasalahan faktual dan nyata di masyarakat, UMKM/dunia usaha, atau pendidikan.
2. **Urgensi:** Buktikan mengapa masalah tersebut mendesak dan berdampak besar jika tidak diselesaikan (manfaat & dampak nyata).
3. **Analisis Kebutuhan:** Petakan kondisi dan kebutuhan riil target pengguna secara empiris (bukan asumsi pengembang).
4. **Rumusan Ide:** Tentukan solusi inovatif dan teknologi terapan yang paling tepat guna berdasarkan hasil tahap 1–3.

> **Larangan Keras:** Dilarang memulai diskusi dari *"kita bikin aplikasi X pakai AI/MCP/IoT"* lalu mencari-cari masalah yang cocok. Jika terjadi, hentikan perancangan teknis dan kembalikan diskusi ke tahap Problem & Urgensi.

### Gatekeeper 6 Pertanyaan Kunci

Sebelum ide disetujui masuk ke tahap desain teknis atau penulisan proposal, **keenam pertanyaan** berikut wajib terjawab dengan bukti konkret:

1. **Masalah apa** yang ingin diselesaikan?
2. **Mengapa masalah tersebut penting** (urgensi kuantitatif/empiris)?
3. **Siapa target pengguna** yang membutuhkan solusi? *(Wajib spesifik: karakteristik, rentang usia, lokasi/populasi, jumlah perkiraan, dan merupakan pengguna akhir yang memakai produk secara langsung dan berulang).*
4. **Apa kebutuhan sebenarnya** dari pengguna tersebut?
5. **Mengapa solusi dan teknologi yang dipilih tepat** (sesuai kebutuhan, tersedia, dikuasai tim, bukan riset *trial-and-error*)?
6. **Bagaimana membuktikan** bahwa produk benar-benar berfungsi dan memberikan dampak?

---

## 3. Wajib 3 Aspek Keterukuran Objektif (Arahan Pak Bambang)

Dilarang menggunakan klaim subjektif seperti *"mudah digunakan"*, *"cepat"*, *"efektif"*, *"akurat"*, atau *"aman"* tanpa indikator, parameter, ambang batas (*threshold*), dan metode pengujian yang jelas. Setiap ide dan proposal wajib memenuhi 3 pilar keterukuran:

1. **Aspek Realitas (Dampak & Masalah Nyata):**
   - Masalah dibuktikan dengan data sekunder valid (jurnal, laporan resmi, regulasi) **dan** data primer lapangan (survei, wawancara, observasi langsung pada target pengguna/mitra).
   - Dampak diukur dengan metrik *before–after* pada pengguna nyata (mis. penurunan waktu layanan, penurunan error input, peningkatan kemandirian, efisiensi biaya).
2. **Aspek Teknis (Performa & Fungsionalitas):**
   - Setiap klaim teknologi harus memiliki metrik kuantitatif (mis. latensi respons, akurasi/F1-score, *uptime*, *tool-call precision*, *false positive rate*, konsumsi daya, ukuran/bobot, integrasi nyata).
   - Pengujian teknis harus menyertakan skenario uji normal, kasus tepi (*edge cases*), dan uji keamanan/privasi bila memproses data sensitif.
3. **Aspek Teori (Landasan Ilmiah, Standar, & Regulasi):**
   - Solusi berlandaskan literatur akademik mutakhir, metode baku, standar industri (mis. ISO, ASTM, SNI, OWASP, HL7 FHIR, HACCP/CPPOB sesuai domain), serta regulasi nasional (mis. UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi / UU PDP).
   - Paradigma PKM-KI adalah **rekayasa solusi berbasis teknologi terapan**, bukan riset dasar (*PKM-RE*) untuk menemukan metode manufaktur baru. Teknologi harus sudah tersedia dan dikuasai tim (tanpa *trial-and-error* manufaktur).

---

## 4. Standar Luaran PKM-KI: Fully Functional (1:1) + Usability Testing

- **Produk Fungsional Skala Penuh (1:1):** Luaran utama PKM-KI **bukan prototipe** (itu ranah PKM-KC), bukan pula sekadar *mockup* UI atau *mock API*. Produk harus siap dioperasikan secara utuh (*fully functional*), langsung, berulang oleh pengguna akhir (*end-user*), dan memiliki potensi produksi massal / hilirisasi.
  - *Produk digital/perangkat lunak:* siap deploy dan dipakai langsung oleh end-user pada alur kerja nyata (bukan dummy data).
  - *Produk fisik/IoT/cyber-physical:* dimensi final, beroperasi stabil di lingkungan nyata pengguna, dilengkapi *Bill of Materials* (BoM) dan rancangan proses manufaktur.
- **Usability Testing Wajib & Terukur:**
  - Setiap ide wajib menyertakan rencana pengujian kebergunaan pada sampel target pengguna yang relevan, minimal menggunakan **User Experience Questionnaire (UEQ / Short UEQ)** dengan target skor benchmark objektif (mis. skala pragmatis, hedonis, dan keseluruhan berada pada kategori *Good* / *Above Average* ke atas), serta dapat diperkuat dengan **SUS**, *task completion rate*, dan *time-on-task*.
- **4 Luaran Wajib PKM-KI:**
  1. Laporan Kemajuan.
  2. Laporan Akhir.
  3. Produk Fungsional Skala Penuh (1:1) + **Dokumen Teknis Produk (DTP)** (deskripsi & fungsi, diagram sistem, spesifikasi teknis, BoM/arsitektur komponen, proses produksi, hasil uji & validasi, petunjuk penggunaan).
  4. **Akun Media Sosial Khusus Topik PKM** (IG/TikTok/X/FB/YouTube; aktif & publik; memuat logo Kemdiktisaintek & PKM; tagar `#pkm`, `#pkm2026`, `#pkmpendanaan2026` — sesuaikan tahun; wajib 3 unggahan ber-Ads sesuai jadwal dengan total biaya Ads maks. Rp500.000).
- **Penyelarasan 10 Tema PKM Tematik:** Judul dan topik wajib mengacu tegas pada **1 tema utama** dari 10 tema prioritas nasional: (1) Kemandirian pangan, energi, dan air; (2) Kesehatan dan gizi masyarakat; (3) Pencegahan dan pemberantasan korupsi; (4) Pemberantasan kemiskinan; (5) Pencegahan dan pemberantasan narkoba; (6) Penguatan pendidikan, sains, dan teknologi; (7) Penguatan kesetaraan gender dan perlindungan hak perempuan, anak, dan penyandang disabilitas; (8) Pelestarian lingkungan dan mitigasi bencana; (9) Pemerataan ekonomi, penguatan UMKM, dan pembangunan IKN; (10) Pelestarian seni budaya dan peningkatan ekonomi kreatif.

---

## 5. Koridor Administrasi, Format, RAB, Tim, & Penilaian

Kegagalan 1 poin administrasi dapat menggugurkan proposal di Tahap 1:

- **Judul:** Maksimum **20 kata**, Bahasa Indonesia baku, **HURUF KAPITAL**, **dilarang** akronim/singkatan tidak baku, menonjolkan kata kunci kegiatan dan hasil utamanya.
- **Format Dokumen Proposal:**
  - Bagian Inti (Bab 1 Pendahuluan s.d. Daftar Pustaka) **maksimum 10 halaman**.
  - Font *Times New Roman* ukuran 12, spasi 1,15, rata kiri-kanan (*justify*), kertas A4, 1 kolom, margin kiri 4 cm, kanan/atas/bawah 3 cm.
  - Penomoran halaman: Daftar Isi menggunakan angka romawi kecil (`i, ii, ...`) di sudut kanan bawah; Bagian Inti & Lampiran menggunakan angka arab (`1, 2, ...`) mulai dari Bab 1 di sudut kanan atas.
  - **Dilarang** menyertakan halaman sampul, lembar pengesahan, ringkasan, atau abstrak pada berkas PDF proposal.
  - Penamaan berkas sesuai aturan (`namaketua_namaPT_PKM-KI.pdf`).
- **Sitasi & Uji Similaritas:**
  - Daftar Pustaka memakai **Harvard style** alfabetis; **dilarang** menulis `et al.` atau `dkk` di Daftar Pustaka (semua penulis wajib ditulis lengkap). Setiap sitasi di teks harus ada di Daftar Pustaka dan sebaliknya.
  - Wajib melampirkan hasil uji similaritas (Turnitin/iThenticate) bagian inti dengan indeks **maksimum 25%**.
  - Penggunaan AI wajib mengikuti **Panduan GenAI Direktorat Pembelajaran & Kemahasiswaan** (`https://s.id/PanduanGenAI`).
- **Ketentuan RAB:**
  - Dana Belmawa: **Rp6.000.000 – Rp8.000.000**; dana pendamping PT wajib ada (maks. Rp2.000.000); mitra/sponsor opsional (maks. Rp1.000.000).
  - Komposisi: minimal **80% operasional** dan maksimal **20% administrasi**.
  - Batas pos pengeluaran (total harus 100%): Bahan habis pakai maks. 60%; Sewa & jasa maks. 15%; Transportasi lokal maks. 30%; Lain-lain maks. 15% (wajib memuat pos publikasi/Ads medsos maks. Rp500.000). Periksa ulang seluruh perkalian dan penjumlahan agar bebas galat aritmetika.
  - **Item Terlarang:** honorarium/konsumsi/hadiah (untuk tim, dosen, narasumber, pihak ke-3), sewa PC/laptop/printer/HP/kamera/ruangan, pembelian alat/bahan >Rp1.000.000/item, pembelian flashdisk/HDD, kuota internet >Rp100.000/bulan/tim, sewa lisensi >6 bulan, penjilidan laporan (kecuali diwajibkan PTS/PTN), biaya seminar/publikasi jurnal.
- **Tim & Dosen Pendamping (Arahan Mba Salsa & Panduan Umum):**
  - Tim terdiri dari 3–5 mahasiswa aktif (1 ketua, 2–4 anggota), belum lulus, tidak merangkap proposal PKM lain / PPK Ormawa / P2MW di tahun yang sama. Disarankan melibatkan minimal 2 angkatan berbeda dan kolaborasi lintas program studi bila produk membutuhkan keahlian non-informatika.
  - Hindari pembagian peran bergaya korporat (`CEO/CTO/CMO`); gunakan peran fungsional rekayasa dan manajerial PKM yang jelas.
  - Dosen pendamping wajib memiliki **NUPTK** dan rekam jejak bidang keahlian yang relevan langsung dengan ide dan teknologi produk.
- **Bobot Penilaian Proposal (Acuan Optimasi Nilai):**
  - Kreativitas Gagasan Solusi: **25%** | Ketepatan IPTEK, Standar, Regulasi & Metode: **25%** | Urgensi Permasalahan & Cakupan Pengguna: **15%** | Kesesuaian Tahap Pelaksanaan: **15%** | Potensi Produk (Dampak Ekonomi Nasional): **10%** | Penjadwalan & Personalia: **5%** | Anggaran Biaya: **5%**.
  - Nilai Akhir PKM-KI hingga PIMNAS: $\text{NA} = 0{,}3 \times \text{NP} + 0{,}2 \times \text{NLK} + 0{,}5 \times \text{NM}$ (dengan NM = 10% Dokumen Teknis Produk + 40% Presentasi PKP2).

---

## 6. Timeline Persiapan & Target Kritis PKM-KI 2027

Seluruh perencanaan kerja di repositori ini mengacu pada jadwal persiapan menuju seleksi internal kampus pusat (Telkom University):

- **November 2026:** Pembentukan/penguatan komposisi tim, evaluasi ide lama, *brainstorming* berbasis masalah, pengumpulan bukti primer/sekunder & referensi, serta penetapan ide terpilih.
- **Desember 2026:** Finalisasi perumusan masalah & analisis kebutuhan lapangan, sinkronisasi dosen pendamping, dan mulai penyusunan draf proposal Bab 1–4.
- **Januari–Februari 2027:** Pendalaman validasi pengguna, pengerjaan inti sistem/produk (menuju fungsional 1:1), penyusunan desain teknis & Lampiran 7, serta pematangan RAB & jadwal.
- **Akhir Februari 2027:** Penyelesaian naskah proposal, kelengkapan administrasi (biodata, tanda tangan basah pindaian halaman penuh, surat pernyataan bermeterai), dan uji similaritas ($\le 25\%$).
- **12 Maret 2027 (Acuan Kritis):** **Seleksi internal kampus pusat dimulai.** Seluruh berkas proposal dan bukti kesiapan teknis wajib tuntas sebelum tanggal ini untuk menghadapi evaluasi internal Telkom University dan batas kuota klaster PT.

