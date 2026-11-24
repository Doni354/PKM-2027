# Evaluasi Kritis Draft Proposal Lama & Pemantik Brainstorming PKM-KI 2027

**Peran Dokumen:** Audit Reviewer Nasional PKM-KI terhadap draf lama (`INFRIA`) berdasarkan 6 pertanyaan kunci, 3 aspek keterukuran (`01-context/catatan-sosialisasi.md`), Panduan PKM-KI, dan pola 21 tim finalis PKM-KI pada PIMNAS ke-39 Tahun 2026 (`01-context/Peserta yang lolos Pendanaan.pdf`).  
**Tujuan:** Menjadi bahan bedah objektif dan pemantik diskusi tim pada sesi brainstorming hari ini (minimal 1 ide berbasis masalah dari tiap anggota).

---

## 1. Ringkasan Eksekutif Audit (Verdict Awal)

- **Identitas Draf Lama:** *INFRIA: Pengembangan Infrastruktur AI untuk Meningkatkan Akses Layanan Kesehatan Digital melalui Conversational Interface* ([draft-proposal-lama PKM-KI.docx](file:///d:/Project/PKM-2027/01-context/draft-proposal-lama%20PKM-KI.docx)).
- **Tim & Pendamping Tercatat:** 5 mahasiswa S1 Rekayasa Perangkat Lunak angkatan 2025 (Aidil Fitrah Romadhoni sebagai ketua, Daffa Rendra Anggara Putra Basuki, Nathania Okna Pariyanto, Tirmidzy Arthesis Sulaeman, Syahril Farhan Shah) dengan dosen pendamping Arni Muarifah Amri, S.T., M.T.
- **Vonis Reviewer (Jika Diajukan Apa Adanya):**
  1. **Risiko Tinggi Gugur Tahap 1 (Administrasi):** Judul mengandung akronim tidak baku (`INFRIA`) dan istilah bahasa Inggris (`Conversational Interface`) serta tidak kapital; terdapat kesalahan penjumlahan pada Tabel 4.1 RAB (Belmawa Rp8.000.000 + Perguruan Tinggi Rp500.000 tertulis total Rp8.000.000, seharusnya Rp8.500.000); Lampiran 4 masih berisi item template kosong (*cangkul/sabit/gunting, pakaian tari*); penomoran lampiran belum sinkron dengan panduan 2026; dan uji similaritas serta tanda tangan basah belum lengkap.
  2. **Lemah di Tahap 2 (Substansi PKM-KI):** Draf ini mengalami *mismatch* skema yang serius. Narasi Bab 1 mengangkat masalah lansia pada Mobile JKN/SATUSEHAT, tetapi luaran teknisnya justru berupa **Flutter SDK & Web Console untuk developer** yang baru diuji pada **purwarupa aplikasi faskes dan mock API HL7 FHIR**. Dalam kacamata PKM-KI, hal ini terbaca sebagai **prototipe infrastruktur B2D** (lebih dekat ke PKM-KC), bukan produk fungsional 1:1 yang langsung bisa dipakai *end-user*.

### Estimasi Posisi Draf Lama pada Rubrik Penilaian PKM-KI (Lampiran 7)

| Kriteria Penilaian Proposal | Bobot | Diagnosis Draf Lama | Risiko Nilai |
| :--- | :---: | :--- | :---: |
| Kreativitas Gagasan Solusi | 25% | Konsep RAG + Dynamic Function Calling cukup menarik, tetapi terjebak *split personality* (narasi pasien lansia vs produk SDK developer) dan tidak ada mekanisme konfirmasi aman (*Human-in-the-Loop*). | Sedang–Rendah |
| Ketepatan IPTEK, Standar, Regulasi & Metode | 25% | Mengklaim patuh UU PDP & SATUSEHAT, tetapi arsitekturnya mengirim data ke LLM eksternal & Firebase tanpa mekanisme *PII redaction* atau residensi data lokal. Sumber pustaka hanya 7 buah dan ada pelanggaran format sitasi. | Rendah |
| Urgensi Permasalahan & Cakupan Pengguna | 15% | Hanya memakai data sekunder (SUS 60,9; adopsi 48%; kemandirian 42%), tanpa data primer faskes/lansia/developer. Target pengguna ganda dan tidak spesifik. | Rendah |
| Kesesuaian Tahap Pelaksanaan | 15% | Secara eksplisit menyebut "purwarupa aplikasi referensi", "mock API", dan "pembuatan/uji coba prototipe". Bertentangan langsung dengan syarat 1:1 non-prototipe PKM-KI. | Kritis (Sangat Rendah) |
| Potensi Produk (Dampak Ekonomi Nasional) | 10% | Jalur hilirisasi ke aplikasi kesehatan nasional tidak realistis (Kemenkes/BPJS tidak akan menanam SDK mahasiswa pihak ketiga ke aplikasi inti mereka). | Rendah |
| Penjadwalan Kegiatan & Personalia | 5% | Jadwal 7 poin memakai istilah "prototipe"; seluruh tim dari 1 prodi & 1 angkatan; pembagian tugas memakai titel startup (`CEO/CTO/CMO/CIO/CFO`). | Sedang–Rendah |
| Penyusunan Anggaran Biaya | 5% | Salah penjumlahan pada Tabel 4.1 dan Lampiran 4 belum diisi (masih template bawaan). | Kritis (Gugur Admin / Nilai Buruk) |

---

## 2. Bedah Kelemahan Draf Lama Menggunakan 6 Pertanyaan Kunci & Kriteria Sosialisasi

### Pertanyaan 1: Masalah apa yang ingin diselesaikan? *(Problem-First vs Tech-First)*
- **Temuan Draf Lama:** Bab 1.1 memaparkan masalah kesenjangan literasi digital lansia pada ekosistem SATUSEHAT/Mobile JKN dan fenomena *proxy use* (menyerahkan gawai ke petugas/keluarga). Namun pada Bab 1.3 dan Bab 3, masalah bergeser menjadi mahalnya biaya & rumitnya waktu rekayasa bagi pengembang untuk membangun *conversational interface* dari nol.
- **Kritik Reviewer:** Draf ini mengidap gejala **Tech-First yang dibungkus narasi Problem-First**. Tim ingin membangun *AI Engine + Flutter SDK*, lalu mencari domain dengan urgensi tinggi (kesehatan/lansia) sebagai pembenaran. Akibatnya, ada **lompatan logika (*logical leap*)**:
  - Mayoritas faskes tingkat pertama (puskesmas, klinik) dan sistem rumah sakit (SIMRS) beroperasi di **Web/Desktop atau aplikasi tertutup**, bukan aplikasi mobile berbasis Flutter milik faskes yang terbuka untuk disisipi SDK eksternal.
  - Aplikasi nasional seperti Mobile JKN dan SATUSEHAT Mobile adalah sistem tertutup milik pemerintah yang tidak akan mengintegrasikan SDK pihak ketiga dari tim PKM mahasiswa dalam siklus 3–4 bulan.

### Pertanyaan 2: Mengapa masalah tersebut penting? *(Aspek Realitas & Framing Tema)*
- **Temuan Draf Lama:** Urgensi hanya ditopang 3 angka dari 2 jurnal (SUS Mobile JKN 60,9; adopsi 48%; kemandirian 42%) dan klaim pencemaran privasi *proxy use*. Tidak ada survei lapangan, wawancara faskes, wawancara pasien lansia, maupun wawancara tim IT rumah sakit/klinik.
- **Kritik Reviewer:**
  - **Nol Data Primer (Aspek Realitas lemah):** Reviewer selalu mempertanyakan apakah masalah ini benar-benar ditemukan di lapangan oleh tim (misalnya di Puskesmas/Klinik Surabaya) atau hanya dikutip dari literatur.
  - **Framing Tema Ganda & Kabur:** Di Bab 1.1, draf mengklaim mendukung **Kesehatan dan Gizi Masyarakat** (Tema 2) sekaligus **Penguatan Pendidikan, Sains, dan Teknologi** (Tema 6), lalu di Bab 3.1 mengklaim *domain-agnostic* untuk **perbankan dan e-commerce**. Pada PKM Tematik, judul dan isi wajib mengunci **1 tema utama** secara tajam.

### Pertanyaan 3: Siapa target pengguna yang membutuhkan solusi?
- **Temuan Draf Lama:** Di Bab 1.4 disebutkan 3 penerima manfaat (Kelompok Rentan, Pengembang Perangkat Lunak Faskes, dan Pemerintah), sedangkan di Bab 3 tidak pernah didefinisikan secara spesifik siapa pengguna yang diuji.
- **Kritik Reviewer:** Melanggar ketentuan `catatan-sosialisasi.md` dan `Panduan PKM-KI.pdf` halaman 3:
  - Target pengguna **wajib spesifik** (karakteristik, rentang usia, kondisi literasi, lokasi, serta estimasi jumlah pengguna).
  - Untuk *end-user* lansia, tidak disebutkan rentang usia (mis. 60–75 tahun), kondisi gawai/akses internet, atau lokasi uji (mis. pasien poli rawat jalan di Klinik/Puskesmas X Surabaya).
  - Untuk *developer*, tidak jelas apakah menyasar *indie developer*, IT RSUD, atau vendor SIMRS, dan tidak ada data berapa developer yang benar-benar bersedia memakai INFRIA.

### Pertanyaan 4: Apa kebutuhan sebenarnya dari pengguna?
- **Temuan Draf Lama:** Bab 1.1 mengklaim *"Solusi konvensional berupa penyederhanaan antarmuka visual terbukti tidak memadai"* (bahkan tanpa sitasi!), lalu langsung menyimpulkan bahwa pengguna butuh antarmuka percakapan berbasis teks/suara.
- **Kritik Reviewer:**
  - **Belum tentu lansia lebih nyaman mengetik chat:** Bagi pengguna lanjut usia dengan gangguan penglihatan, tremor, atau keterbatasan mengetik pada layar ponsel kecil, mengetik *prompt* bahasa natural justru bisa lebih sulit daripada menekan 2–3 tombol besar (*simplified UI*). Kata "suara" hanya muncul satu kali di Bab 2.4 tanpa desain teknis STT (*Speech-to-Text*), penanganan kebisingan ruang tunggu klinik, maupun bahasa daerah/aksen lansia.
  - **Tidak ada analisis risiko eksekusi otonom:** Menjalankan aksi administratif kesehatan secara otomatis dari instruksi bahasa natural tanpa mekanisme konfirmasi eksplisit pengguna (*Human-in-the-Loop*) berisiko salah daftar poli, salah jadwal dokter, atau salah input keluhan.

### Pertanyaan 5: Mengapa solusi dan teknologi yang dipilih tepat? *(Aspek Teknis & Teori)*
- **Temuan Draf Lama:** Memilih arsitektur 4 lapis (Next.js Web Console, Firebase Cloud Functions/Firestore, AI Engine terdekopel *LLM-Agnostic*, dan Flutter SDK) serta mengklaim patuh UU PDP, OWASP MASVS, dan Cetak Biru Kemenkes/SATUSEHAT.
- **Kritik Reviewer:**
  1. **Kontradiksi Serius terhadap UU PDP:** Draf mengklaim *INFRIA* memutus kebocoran NIK & rekam medis dengan mencegah *proxy use*, namun di Bab 3.2 sistem mengirim percakapan pasien ke **AI Engine dengan LLM eksternal (*LLM-Agnostic*)** dan **Firebase**. Mengirim NIK, nama pasien, atau keluhan medis ke API LLM pihak ketiga luar negeri tanpa *on-device/local PII masking*, *consent* eksplisit, dan persetujuan transfer data lintas batas justru **melanggar UU No. 27 Tahun 2022 (UU PDP)** dan standar keamanan data kesehatan.
  2. **Keterbatasan Flutter SDK:** Mengunci lapisan klien hanya pada Flutter langsung membuang >70% ekosistem aplikasi faskes dan layanan publik di Indonesia yang berbasis Web, React Native, Android Native (Kotlin/Java), atau desktop SIMRS.
  3. **Aspek Teori & Pustaka Tipis:** Daftar Pustaka hanya berisi **7 referensi** (terlalu minim untuk klaim infrastruktur lintas standar). Terdapat sitasi `OWASP (2026)` di Bab 2.4 yang **tidak tercantum di Daftar Pustaka**, serta penulisan `Patel, B. et al. (2026)` dan kesalahan cetak spasi/tanda baca (`Tabel 2. 1...`, `skema yang ketat .`). Catatan: Panduan PKM-KI Lampiran 12 **melarang** penggunaan `et al.` atau `dkk` di Daftar Pustaka.

### Pertanyaan 6: Bagaimana membuktikan bahwa produk benar-benar berfungsi & berdampak? *(Keterukuran & 1:1)*
- **Temuan Draf Lama (Cacat Paling Fatal untuk PKM-KI):**
  - Bab 3.3 menulis: *"Validasi Flutter SDK dilakukan dengan menanamkannya ke dalam **purwarupa aplikasi referensi faskes** yang menyimulasikan kapabilitas riil..."*
  - Bab 3.4 menulis: *"Validasi Dynamic Function Calling menggunakan **mock API berstandar HL7 FHIR**..."*
  - Lampiran 1 menulis jadwal kegiatan: *"Perancangan sistem dan desain **prototipe**"*, *"Pembuatan **prototipe**"*, *"Uji coba **prototipe**"*.
  - Lampiran 7 menulis: *"Gambar Lampiran 7.5 **Prototype** Web Console INFRIA"* dan *"7.6 **Prototype** Aplikasi Inang Terintegrasi INFRIA"*.
  - **Vonis:** Penggunaan kata **purwarupa/prototype** dan **mock API** secara langsung melanggar syarat mutlak PKM-KI bahwa luaran adalah **produk fungsional skala penuh (1:1), bukan prototipe**.
- **Kelemahan Rencana Usability Testing & Metrik Teknis:**
  - Short UEQ hanya menargetkan *"skor rata-rata pada zona positif"* — ini terlalu longgar dan tidak mencantumkan jumlah responden, kriteria inklusi, skenario uji, maupun pembanding (*baseline* sebelum vs sesudah memakai INFRIA).
  - Target teknis *"waktu respons di bawah 4 detik"* dan *"akurasi ekstraksi >90%"* tidak dilengkapi metrik keamanan dan reliabilitas kritis: *hallucination rate*, *parameter injection / malformed JSON rate*, *PII leakage rate*, serta uji beban (*concurrency*).
  - Klaim efisiensi developer (*"integrasi di bawah 30 baris kode"*) tidak memiliki rencana pengujian pada developer nyata (mis. eksperimen *controlled coding task* membandingkan developer membangun fitur serupa secara manual vs memakai SDK).

### Audit Tambahan: Jebakan Administrasi & Personalia (Tahap 1)
1. **Judul Draf Lama:** `INFRIA: Pengembangan Infrastruktur AI untuk Meningkatkan Akses Layanan Kesehatan Digital melalui Conversational Interface` (13 kata) — **Gugur/rawan penalti Tahap 1** karena memakai akronim tidak baku (`INFRIA`), frasa bahasa Inggris (`Conversational Interface`), dan tidak seluruhnya huruf kapital.
2. **RAB Tabel 4.1 & Lampiran 4:** Pada Tabel 4.1 tertera dana Belmawa Rp4.500.000 + Rp1.000.000 + Rp1.500.000 + Rp1.000.000 = Rp8.000.000 dan Perguruan Tinggi Rp500.000, namun baris `Jumlah` tertulis `8.000.000` (seharusnya `8.500.000`). Lampiran 4 belum diisi (masih berisi teks contoh panduan: *Cangkul/sabit/gunting, Pakaian tari/kanvas dan cat*).
3. **Personalia & Pembagian Tugas (Lampiran 5):** Menggunakan jabatan startup (`CEO, CTO, CMO, CIO, CFO`) dengan uraian tugas terlalu singkat (*"mengkordinir anggota"*, *"Mengelola administrasi"*), dan seluruh anggota berasal dari 1 prodi (RPL) serta 1 angkatan (NIM `1080825...`). Panduan Umum menyarankan minimal 2 angkatan berbeda agar ada regenerasi, serta kolaborasi lintas prodi bila domain membutuhkan.
4. **Kesesuaian Jadwal Medsos & Kelengkapan Lampiran:** Jadwal dan pos anggaran wajib mencantumkan adsense/iklan media sosial (maks. Rp500.000 untuk 3 konten serentak), sedangkan biodata dan surat pernyataan belum bertanggal/bertanda tangan basah serta Lampiran 8 (Hasil Uji Similaritas $\le 25\%$) masih kosong.

---

## 3. Benchmark Pola Finalis PKM-KI 2026 (`Peserta yang lolos Pendanaan.pdf`)

Berdasarkan dokumen resmi Undangan PIMNAS ke-39 Tahun 2026 (`01-context/Peserta yang lolos Pendanaan.pdf`), dari total **420 tim peserta PIMNAS 2026**, terdapat **21 tim pada kelas PKM-KI** (No. 128–148). Untuk konteks kampus, Universitas Telkom hanya meloloskan **1 tim** di PIMNAS 2026 (pada bidang PKM-KC, belum ada yang lolos di PKM-KI).

### Pola Empiris dari 21 Tim Finalis PKM-KI PIMNAS 2026

1. **Dominasi Produk Fisik / Cyber-Physical / IoT-AI (20 dari 21 tim — 95,2%):**
   Hampir seluruh finalis PKM-KI menghadirkan perangkat keras atau sistem terintegrasi fisik-digital yang **wujud 1:1-nya dapat disentuh, didemonstrasikan langsung di tempat, dan siap diproduksi massal**, antara lain:
   - *Agrimaritim & Industri/UMKM:* `IOSALT` (IPB — terowongan garam pintar IoT-AI), `SIPERU` (IPB — mesin pembersih ubur-ubur ekspor), `Alat Indikator Kelayakan Cocopeat` (ITS), `Smart Aerator AI` (Polibatam), `3D Printer Static Bed` (Politeknik Negeri Madiun), `Smart Rotary Roaster Kemplang Tunu` (Unpad), `Smart Dehumidification Dryer Daun Nilam` (UHO).
   - *Kesehatan, Rehabilitasi & Disabilitas:* `FLEXI STROKE` (ITS — alat rehabilitasi tangan pascastroke), `VISSIA` (ITS — pegangan modular peredam tremor), `Electric Transfer Aid` (Politeknik Negeri Madiun), `SPEKTRA-NAVI` (Polines — asisten latihan goalball tunanetra), `PRIME` (UGM — phantom simulator pencabutan gigi), `Sandal Cerdas LoRaWAN` (UM), `HEAL-BIT KIT` (Unimed — deteksi/mitigasi emosi anak autisme), `I-SORA` (UPI — kacamata pintar AI untuk tunanetra).
   - *Lingkungan & Edukasi Non-Gawai:* `SWARA` (PENS — monitoring sampah sungai urban IoT-AI & geo-crowdsourcing), `LINGO` (UGM — literasi interaktif non-gawai berbasis pengenalan ucapan untuk anak prasekolah).
2. **Anomali Pure Software yang Berhasil Tembus (1 dari 21 tim — 4,8%):**
   - Satu-satunya produk *pure software* yang lolos ke PIMNAS PKM-KI 2026 adalah **No. 134 — Politeknik Negeri Bandung (Polban): `SMARTTRACER: SISTEM TRACER STUDY DIGITAL BERBASIS ANALISIS MULTIDIMENSI OLAP UNTUK MENINGKATKAN KUALITAS EVALUASI LULUSAN PERGURUAN TINGGI`**.
   - **Pelajaran Penting dari `SMARTTRACER`:** *Pure software* **bisa** lolos PKM-KI hingga PIMNAS, **asalkan**:
     1. **End-user dan pembelinya/pengadopsinya nyata & spesifik** (pengelola pusat karier/tracer study PT yang memang sudah ada dan langsung mengoperasikannya).
     2. **Tidak bergantung pada izin pihak ketiga raksasa** (seperti harus menanam SDK ke Mobile JKN).
     3. **Memiliki kerangka metode komputasi/analitik yang jelas & terukur** (OLAP multidimensi) untuk menyelesaikan masalah bisnis/institusional yang terbukti di lapangan.

---

## 4. Analisis Objektif: Upgrade Ide Lama (+ MCP via Source File) vs Pivot Total?

Anda mengusulkan pertanyaan strategis: *Bagaimana jika ide lama `INFRIA` di-upgrade dengan **Model Context Protocol (MCP)** untuk memudahkan developer mengintegrasikan function calling langsung melalui source file?* Mari kita bedah secara objektif dari sisi teknis dan kriteria reviewer PKM-KI.

### A. Kelebihan Jika Di-Upgrade dengan MCP + AST/Source File Extraction
1. **Bobot Rekayasa Perangkat Lunak Meningkat Tajam:** Mengubah *source file* (mis. controller REST API, route handler, atau skema TypeScript/Python/Dart) melalui *Abstract Syntax Tree (AST) / static analysis* menjadi MCP Server + *tool schema* tervalidasi adalah kontribusi rekayasa perangkat lunak yang jauh lebih teknis dan elegan daripada sekadar SDK wrapper manual.
2. **Standar Terbuka & Menghilangkan Ketergantungan Flutter:** MCP adalah protokol terbuka lintas klien/agen AI. Developer tidak lagi terkunci pada Flutter SDK.
3. **Menjawab Masalah Nyata Developer Experience (DX):** Waktu integrasi dari kode sumber eksisting ke *tool calling* bisa diukur secara kuantitatif (*lines of code*, *setup time*, *schema accuracy*).

### B. Kelemahan & Risiko Kritis yang Tetap Menghantui Jika Memaksa Upgrade
1. **Semakin Menjauh dari Masalah Lansia (Risiko Tech-First Berlipat):**
   MCP + *AST source-file extraction* adalah teknologi murni untuk **developer** (*Developer Tooling*). Jika narasi depannya masih memaksakan *"masalah lansia memakai Mobile JKN/SATUSEHAT"*, kesenjangan antara masalah (pasien lansia) dan inovasi teknis (ekstraksi MCP dari source code developer) menjadi semakin jomplang dan membingungkan reviewer.
2. **Pertanyaan Mematikan di Tahap 2 ("Apa bedanya dengan tools yang sudah ada?"):**
   Reviewer IT yang paham ekosistem AI 2026–2027 akan langsung bertanya: *"Sudah banyak generator OpenAPI-to-MCP, FastAPI-MCP, framework agentic seperti LangChain/Vercel AI SDK/Genkit, dan IDE agent. Mengapa developer butuh produk kalian?"* Tanpa pembeda yang sangat spesifik (mis. proteksi PII otomatis sesuai UU PDP + *zero-trust confirmation* + UI aksesibilitas Indonesia), nilai kreativitas akan jatuh.
3. **Sulit Membuktikan Produk 1:1 + Dampak End-User dalam 3–4 Bulan:**
   Untuk membuktikan produk 1:1 (bukan prototipe), Anda tidak cukup menguji di *mock API*. Anda harus mendapatkan **minimal 1–2 aplikasi produksi/layanan nyata milik mitra** yang bersedia diekstrak *source code*-nya dan dipakai oleh *end-user* nyata untuk diukur dampaknya (Realitas & UEQ). Risiko penolakan mitra karena akses *source code* sangat tinggi.
4. **Dampak Ekonomi Nasional & Visualisasi PKP2/PIMNAS Lemah:**
   Dalam kontes PKM-KI yang 95% finalisnya berupa alat fisik/IoT atau sistem operasional langsung, sebuah *developer middleware/MCP tool* cenderung kurang kuat dari sisi "manfaat langsung bagi masyarakat luas" kecuali diarahkan ke domain operasional yang sangat konkret.

### C. Kesimpulan Keputusan (Verdict Reviewer)

| Opsi Strategi | Kelayakan | Catatan Keputusan |
| :--- | :---: | :--- |
| **Upgrade Kosmetik** (Ide lama + tempel kata MCP) | **TIDAK LAYAK** | Pasti ditolak di substansi karena tetap *Tech-First*, kontradiktif dengan UU PDP, dan masih berupa prototipe/*mock API*. |
| **Upgrade Radikal** (Re-framing total ke *Developer-to-Accessibility Bridge* pada aplikasi nyata mitra) | **LAYAK BERSYARAT** | Hanya layak jika fokus diubah total ke inklusivitas layanan publik/klinik lokal berbasis Web/Mobile nyata (bukan SATUSEHAT), dengan AST-to-MCP + PII Redaction + Voice/HITL, dan sudah punya mitra pemilik aplikasi sebelum proposal dikumpul. |
| **Pivot Total ke Masalah Baru** (End-user langsung atau Cyber-Physical Edge-AI) | **SANGAT DIREKOMENDASIKAN** | Jauh lebih mudah memenuhi syarat *Problem-First*, data primer nyata di Surabaya, wujud produk 1:1 tanpa bergantung adopsi SDK oleh pihak ketiga, serta selaras dengan rekam jejak riset dosen pembimbing (Bu Arni). |

---

## 5. Tiga Opsi Arah Pengembangan (Pemantik Brainstorming Tim Hari Ini)

Ketiga opsi berikut dirancang agar **100% sesuai koridor PKM-KI 2027**, realistis dikerjakan dalam 3–4 bulan oleh tim RPL (atau kolaborasi lintas prodi), dan selaras dengan rekam jejak penelitian/pengabdian **Bu Arni Muarifah Amri, S.T., M.T.** (lihat Lampiran 3 draft lama: Asesmen Disleksia berbasis *text similarity* 2022, Transformasi Digital UMKM Pengolahan Ikan/ERP 2025, Deep Learning suara real-time 2025, Sistem Pendukung Keputusan, dan IoT).

---

### Opsi 1 (Upgrade Ide Lama — Re-framing Radikal):
**Platform Jembatan Akses Layanan Publik Inklusif Berbasis Ekstraksi Kode Sumber ke Model Context Protocol (MCP) dengan Proteksi Data Pribadi**
*(Tema 7: Perlindungan Hak Penyandang Disabilitas/Kelompok Rentan — atau Tema 6: Penguatan Sains & Teknologi)*

- **Alur Problem-First:**
  - **Problem:** Banyak sistem layanan digital milik instansi lokal (klinik swasta, puskesmas daerah, layanan administrasi kampus/kelurahan berbasis web/mobile) memiliki antarmuka formulir yang rumit dan tidak ramah bagi pengguna lanjut usia atau penyandang disabilitas penglihatan/motorik ringan. Di sisi lain, pengembang sistem lokal tidak punya kapasitas membangun asisten percakapan yang aman dari nol tanpa membongkar kode lama.
  - **Urgensi:** Ketidakmampuan akses mandiri memaksa pengguna menyerahkan akun/KTP kepada orang lain (*proxy use*) sehingga rentan penyalahgunaan data pribadi, sementara migrasi ulang seluruh aplikasi membutuhkan biaya tinggi yang tidak dimiliki instansi lokal.
  - **Analisis Kebutuhan:** Pengguna akhir butuh interaksi suara/teks sederhana berbahasa Indonesia dengan **konfirmasi langkah sebelum aksi dieksekusi**; pengelola/developer aplikasi lokal butuh mekanisme integrasi otomatis dari *source file/route* yang sudah ada **tanpa mengirim data sensitif (NIK/rekam medis) ke LLM publik**.
  - **Rumusan Ide:** Mesin pengonversi *source code* (AST parser untuk Express/Next.js/FastAPI/Laravel/Flutter) menjadi **MCP Server terstandardisasi** yang dilengkapi *PII Redaction Middleware* (masking NIK/nama sebelum ke LLM), *Human-in-the-Loop confirmation*, serta widget chat/suara aksesibel (*high-contrast, large-text, TTS/STT*) siap pasang ke aplikasi web/mobile milik mitra nyata.
- **Pembeda vs Tools Eksisting (OpenAPI-to-MCP / AI SDK):**
  1. Ekstraksi langsung dari *source file* + komentar/validasi lokal (tidak wajib punya dokumentasi OpenAPI lengkap).
  2. *Built-in UU PDP Guardrail* (tokenisasi/masking PII lokal sebelum *inference* dan *audit log* lokal).
  3. Fokus pada **widget aksesibilitas end-user** (suara + teks sederhana + konfirmasi visual besar), bukan sekadar endpoint API untuk developer.
- **3 Aspek Keterukuran:**
  - *Realitas:* Survei/observasi pada minimal 1–2 mitra nyata (mis. sistem layanan klinik kampus/puskesmas mitra atau layanan akademik) + uji *task completion* & kemandirian pengguna sebelum vs sesudah integrasi.
  - *Teknis:* Waktu integrasi developer ($\le 15$ menit, $< 20$ baris konfigurasi), *AST-to-MCP schema extraction accuracy* ($\ge 95\%$), *PII redaction recall* ($100\%$ pada pola NIK/telepon/nama), *tool-call precision* ($\ge 92\%$), latensi $< 3$ detik.
  - *Teori:* AST Static Analysis, Model Context Protocol (Anthropic/open spec), OWASP API/LLM Top 10, UU No. 27/2022 (UU PDP), WCAG 2.1 AA.
- **Wujud Produk 1:1 & Usability Testing:**
  - Aplikasi CLI + Web Console generator MCP + Widget aksesibel yang **benar-benar terpasang dan berjalan di aplikasi operasional nyata milik mitra** (bukan mock API).
  - Usability testing dua sisi: **UEQ + SUS + Task Success Rate** pada 15–20 *end-user* kelompok rentan/lansia pada skenario nyata, serta uji *Developer Experience* (time-to-integrate) pada 10 developer.
- **Risiko Utama & Mitigasi:** Risiko tidak mendapat izin akses *source code* aplikasi mitra → **Mitigasi:** amankan LoI (surat izin pengujian pada aplikasi nyata) dengan mitra lokal/internal kampus **sebelum Desember 2026**, atau fokus hanya pada aplikasi *open-source* instansi yang benar-benar dipakai warga.

---

### Opsi 2 (Pivot Masalah Baru #1 — Pure Software AI & Manajemen Data, Berkaca pada `SMARTTRACER` Polban):
**Sistem Manajemen Produksi, Audit Keamanan Pangan Digital, dan Verifikasi Porsi Gizi Berbasis Visi Komputer untuk Dapur Katering Skala Massal / UMKM Pangan & SPPG**
*(Tema 2: Kesehatan dan Gizi Masyarakat — atau Tema 9: Penguatan UMKM)*

- **Alur Problem-First:**
  - **Problem:** Dapur produksi makanan skala massal (katering UMKM, penyedia makan siang sekolah/pabrik, maupun Satuan Pelayanan Pemenuhan Gizi / SPPG pada program Makan Bergizi Gratis) masih melakukan pencatatan stok bahan, verifikasi kesesuaian porsi gizi terhadap standar Angka Kecukupan Gizi (AKG), dan pencatatan kontrol suhu/kebersihan (HACCP/CPPOB) secara manual di kertas atau spreadsheet terpisah.
  - **Urgensi:** Kesalahan takaran porsi gizi dan lemahnya pengawasan titik kritis keamanan pangan (suhu simpan, waktu jeda masak-kirim, kedaluwarsa bahan) memicu kasus keracunan pangan massal, ketidaksesuaian standar nutrisi, serta tingginya *food waste* dan pemborosan biaya bahan baku hingga puluhan persen.
  - **Analisis Kebutuhan:** Kepala dapur, ahli gizi lapangan, dan pengelola UMKM katering tidak butuh aplikasi ERP yang rumit saat jam sibuk dapur; mereka butuh pencatatan cepat berbasis foto porsi ompreng/nampan (*computer vision*), peringatan dini batas waktu tunggu makanan (*holding time*), dan laporan audit higienitas harian otomatis dalam satu dasbor.
  - **Rumusan Ide:** Platform web & mobile operasional 1:1 yang mengintegrasikan (a) *Computer Vision* (segmentasi & estimasi porsi komponen menu dari foto nampan sebelum distribusi), (b) modul pelacakan titik kritis keamanan pangan (CPPOB/HACCP digital + kalkulasi *holding time* & *batch traceability*), dan (c) *Decision Support System* (SPK) perencanaan bahan baku agar zero-waste dan sesuai anggaran.
- **Kesesuaian Tim & Dosen Pembimbing:**
  - **Sangat cocok 100% dengan S1 RPL** (Web/Mobile app, Computer Vision terapan, SPK, manajemen database operasional) dan **rekam jejak Bu Arni** (riset 2025: *Transformasi Digital UMKM Pengolahan Ikan / ERP* + pengampu mata kuliah *Sistem Pendukung Keputusan* dan *Analisis Kebutuhan Perangkat Lunak*).
- **3 Aspek Keterukuran:**
  - *Realitas:* Observasi & wawancara langsung di 2–3 dapur katering/UMKM pengolahan pangan di Surabaya/Sidoarjo; ukur penurunan waktu rekap laporan harian (mis. dari 45 menit menjadi $< 5$ menit), pengurangan sisa bahan baku/deviasi porsi sebelum vs sesudah pemakaian selama 2–4 minggu.
  - *Teknis:* Akurasi deteksi komponen menu & estimasi kelas porsi (*mAP / IoU* $\ge 88\%$), waktu inferensi foto $< 2$ detik di perangkat HP standar, *uptime* sistem $\ge 99\%$, keandalan mode *offline-first* saat sinyal dapur lemah.
  - *Teori:* Standar AKG Permenkes RI, Prinsip HACCP / CPPOB BPOM, metode Computer Vision terapan (YOLO/segmentasi ringan), dan metode SPK (mis. SAW/TOPSIS) untuk optimasi bahan & menu.
- **Wujud Produk 1:1 & Usability Testing:**
  - Sistem terdeploy penuh (aplikasi dapur mobile + dasbor admin/ahli gizi) yang **dipakai langsung setiap hari** oleh staf dapur dan pengelola UMKM/katering mitra.
  - Usability testing menggunakan **UEQ lengkap/Short UEQ** dan *Time-on-Task* pada minimal 15 staf dapur & pengelola (target skala UEQ kategori *Good/Excellent* pada *Efficiency* dan *Perspicuity*).
- **Risiko Utama & Mitigasi:** Akurasi estimasi berat hanya dari foto 2D bisa meleset → **Mitigasi:** kombinasikan foto dengan kalibrasi ukuran wadah standar (ompreng/boks) + input cepat timbangan sampel (*spot-check*).

---

### Opsi 3 (Pivot Masalah Baru #2 — Cyber-Physical Edge-AI, Berkaca pada 95% Finalis PIMNAS PKM-KI):
**Perangkat Pendamping & Asesmen Latihan Membaca Adaptif Non-Gawai Berbasis Edge-AI (Pemindai Teks Cetak & Analisis Fonemik Suara Luring) untuk Siswa SD dengan Kesulitan Membaca / Disleksia**
*(Tema 7: Perlindungan Hak Anak dan Penyandang Disabilitas — atau Tema 6: Penguatan Pendidikan, Sains, dan Teknologi)*

- **Alur Problem-First:**
  - **Problem:** Banyak siswa sekolah dasar awal (kelas 1–3 SD) mengalami hambatan kelancaran membaca atau indikasi disleksia ringan–sedang, namun sekolah umum dan orang tua di rumah tidak memiliki alat bantu latihan membaca yang adaptif, terukur, dan bebas distraksi layar gawai (*smartphone*/tablet).
  - **Urgensi:** Keterlambatan deteksi dan latihan fonemik pada usia emas kelas 1–3 SD berdampak jangka panjang terhadap ketertinggalan seluruh mata pelajaran, rendahnya rasa percaya diri anak, serta tingginya beban guru kelas yang harus mendampingi puluhan siswa sekaligus. Di sisi lain, penggunaan aplikasi HP untuk anak usia 6–9 tahun memicu distraksi gim/video dan kelelahan layar (*screen fatigue*).
  - **Analisis Kebutuhan:** Anak butuh pengalaman belajar fisik yang menyenangkan dengan **buku cetak biasa** (tanpa layar HP), umpan balik suara instan saat salah melafalkan suku kata, dan panduan visual/taktil per kata; guru dan orang tua butuh rekaman progres kelancaran membaca, daftar kata/huruf yang sering tertukar (mis. `b-d`, `p-q`), dan asesmen tingkat kesalahan otomatis.
  - **Rumusan Ide:** Perangkat keras meja portabel berbasis *Edge-AI* (mini-komputer/SBC + kamera pemindai halaman buku cetak + mikrofon + speaker + indikator penunjuk/pencahayaan hangat tanpa layar gawai utama) yang mengenali baris teks buku anak secara *offline*, mendengarkan pelafalan suara anak dalam Bahasa Indonesia, menghitung kesalahan substitusi/omisi/inversi fonemik secara real-time, lalu menyinkronkan laporan asesmen ke dasbor web guru/orang tua.
- **Kesesuaian Tim & Dosen Pembimbing:**
  - **Match Terkuat dengan Rekam Jejak Bu Arni:** Lihat Lampiran 3 draft lama — Bu Arni meneliti **Asesmen Komputerisasi Anak Disleksia (Hibah Komdigi 2022)** menggunakan algoritma *Hamming Distance & Text Similarity*, serta **Deteksi Berbasis Suara Real-Time menggunakan Deep Learning (2025)**! Ini bukan kebetulan; secara akademik ini adalah posisi pembimbing paling ideal di PKM-KI.
  - **Kekuatan Tim & Peluang Kolaborasi:** Anggota tim sudah ada yang aktif di **Robotika & Line Follower** (Syahril Farhan Shah) selain keahlian RPL/AI. Untuk memperkuat tim agar memenuhi saran panduan, sangat disarankan mengajak 1 anggota lintas prodi (mis. Teknik Elektro/Desain Produk/Psikologi-Pendidikan) atau lintas angkatan.
  - **Daya Saing PIMNAS:** Mengikuti pola pemenang PKM-KI 2026 seperti `LINGO` (UGM — *literasi interaktif non-gawai berbasis pengenalan ucapan*) dan `HEAL-BIT KIT` (Unimed). Ada **produk fisik nyata 1:1** yang sangat memikat saat presentasi PKP2 dan gelar produk PIMNAS.
- **3 Aspek Keterukuran:**
  - *Realitas:* Validasi kebutuhan bersama guru SD/SLB atau komunitas pendamping anak di Surabaya; ukur peningkatan kecepatan & akurasi baca (*Words Correct Per Minute / WCPM*) dan penurunan tingkat kesalahan fonemik pada siswa uji coba selama 3–4 minggu.
  - *Teknis:* Akurasi OCR teks buku anak ($\ge 95\%$), *Word Error Rate (WER)* pengenalan ucapan anak Bahasa Indonesia ($\le 12\%$), latensi umpan balik audio *offline* ($< 1{,}5$ detik), daya tahan baterai ($\ge 4$ jam pemakaian), serta perhitungan *Bill of Materials* (BoM) siap produksi massal dalam batas RAB Rp6–8 juta.
  - *Teori:* Metode *Orton-Gillingham* / kesadaran fonologis, algoritma *Hamming Distance / Levenshtein / Phonetic Similarity* (selaras riset Bu Arni 2022), serta *Edge ASR/OCR* (Whisper-tiny/Vosk terkuantisasi + PaddleOCR/Tesseract).
- **Wujud Produk 1:1 & Usability Testing:**
  - Unit perangkat fisik skala 1:1 dengan *casing* ergonomis ramah anak (hasil *3D printing* / fabrikasi rapi), bekerja mandiri tanpa internet saat sesi latihan, plus aplikasi web/dashboard monitoring guru & orang tua.
  - Usability testing menggunakan **UEQ** pada guru & orang tua (minimal 15 responden) serta observasi kebergunaan terstruktur (*task completion, engagement, error recovery*) pada 10–15 anak usia 6–9 tahun dengan persetujuan orang tua/sekolah.
- **Risiko Utama & Mitigasi:** Risiko akurasi pengenalan suara anak Bahasa Indonesia pada perangkat edge → **Mitigasi:** batasi kosakata aktif per level buku (*constrained grammar / keyword spotting* + *forced alignment* fonemik terhadap teks yang sudah terpindai OCR), bukan ASR bebas kosakata terbuka.

---

### Matriks Perbandingan 3 Opsi untuk Keputusan Tim Hari Ini

| Dimensi Penilaian PKM-KI | Opsi 1: Upgrade (+ MCP) | Opsi 2: Pivot (Dapur Gizi & Keamanan Pangan) | Opsi 3: Pivot (Perangkat Literasi Non-Gawai Disleksia) |
| :--- | :---: | :---: | :---: |
| **Kepatuhan Problem-First** | Sedang (rawan tergelincir Tech-First) | Sangat Tinggi (masalah aktual nyata) | Sangat Tinggi (masalah nyata & spesifik) |
| **Kejelasan End-User & Akses Lapangan** | Sulit (butuh 2 sisi: dev + lansia, perlu akses source code mitra) | Tinggi (UMKM katering/dapur sekitar Surabaya banyak & mudah diakses) | Tinggi (SD/komunitas disleksia/guru sangat terbuka untuk alat bantu) |
| **Bukti Produk 1:1 (Bukan Prototipe)** | Berat (tergantung aplikasi produksi mitra) | Sangat Kuat (langsung dipakai operasional harian, mirip pola `SMARTTRACER`) | Sangat Kuat (produk fisik + software 1:1, selaras 95% finalis PIMNAS) |
| **Keselarasan Riset Bu Arni** | Sedang | Tinggi (riset ERP UMKM pangan 2025 + SPK) | **Sangat Tinggi** (hibah disleksia 2022 + deep learning suara 2025) |
| **Kelayakan Waktu (Nov 2026 – Mar 2027) & RAB Rp6–8 Jt** | Sedang–Sulit | Sangat Layak (RAB efisien: server, kamera/tablet uji, Ads) | Layak (perlu disiplin desain casing & BoM komponen $\le$ Rp1 jt/item) |
| **Peluang Lolos Pendanaan & PIMNAS** | Sedang | Tinggi | **Sangat Tinggi** |

---

## 6. Panduan & Template Pitch Brainstorming Tim Hari Ini

Karena setiap anggota tim wajib membawa minimal 1 ide hari ini, gunakan **aturan main 5 menit per orang** berikut agar diskusi tidak melebar ke arah *Tech-First*:

1. **Aturan Anti-Tech-First:** Selama 3 menit pertama pemaparan ide, **dilarang menyebut nama framework, bahasa pemrograman, model AI, atau arsitektur** (jangan dulu bahas Next.js, MCP, Flutter, LLM, IoT). Fokus hanya pada **Siapa yang kesusahan, Apa masalah nyatanya, dan Seberapa parah dampaknya**.
2. **Wajib Isi Kartu Ide 1 Halaman:** Setiap anggota wajib mengisi template di bawah ini sebelum sesi voting/eliminasi ide.
3. **Filter Eliminasi Cepat:** Ide yang tidak punya target pengguna spesifik atau wujud produknya baru sebatas "prototipe/mockup" otomatis gugur atau harus di-reframe saat itu juga.

### Template Lembar Validasi Ide (Salin per Anggota)

```markdown
### Kartu Ide — [Nama Anggota]

1. **Tema PKM-KI (Pilih 1 dari 10 Tema):** ...
2. **Problem Faktual (Cerita Nyata di Lapangan, Bukan Asumsi):**
   - Siapa yang mengalami masalah? (Karakteristik, rentang usia, lokasi, perkiraan jumlah):
   - Kejadian nyata apa yang membuat mereka terhambat/dirugikan?
3. **Urgensi (Mengapa Harus Diselesaikan Sekarang?):**
   - Bukti angka/fakta (jurnal/berita/observasi awal) dan dampak jika dibiarkan:
4. **Analisis Kebutuhan Pengguna:**
   - Apa yang sebenarnya dibutuhkan pengguna agar masalah selesai (kebiasaan, keterbatasan fisik/literasi/biaya)?
5. **Rumusan Ide & Wujud Produk 1:1 (Non-Prototipe):**
   - Bentuk akhir produk (fisik / cyber-physical / software operasional penuh):
   - Bagaimana pengguna akhir memakainya secara langsung & berulang?
6. **3 Aspek Keterukuran Objektif:**
   - **Realitas (Dampak before–after):** ...
   - **Teknis (Metrik & ambang batas performa):** ...
   - **Teori (Metode ilmiah, standar, regulasi):** ...
7. **Rencana Usability Testing:**
   - Instrumen (UEQ/SUS/dll), jumlah & profil responden uji, skenario tugas:
8. **Kesiapan Eksekusi Sebelum 12 Maret 2027:**
   - Apakah teknologi sudah dikuasai tanpa riset trial-and-error?
   - Siapa mitra/lokasi uji lapangan yang bisa dihubungi minggu ini?
```

