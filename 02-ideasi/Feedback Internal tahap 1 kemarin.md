"Revisi Proposal PKM-KI INFRIA

Secara umum, INFRIA memiliki potensi sebagai karya inovatif di bidang infrastruktur AI untuk akses layanan kesehatan digital. Proposal sudah memuat rancangan arsitektur sistem, komponen teknologi, serta rencana pengujian teknis. Namun, masih terdapat beberapa hal yang perlu diperjelas agar produk yang dihasilkan benar-benar fungsional, klaimnya dapat dibuktikan, dan ruang lingkupnya realistis untuk dilaksanakan.

1. Tegaskan ruang lingkup dan tingkat kesiapan produk

- Bedakan dengan jelas fitur yang sudah berupa prototype, fitur yang sedang dikembangkan, dan fitur yang akan selesai pada akhir program.
- Proposal menargetkan infrastruktur AI, web console, backend, AI Engine, serta Flutter SDK. Jelaskan keluaran minimum yang wajib berfungsi pada akhir PKM-KI.
- Perjelas apakah aplikasi kesehatan yang menjadi tempat integrasi merupakan aplikasi simulasi buatan tim atau aplikasi kesehatan yang sudah digunakan secara nyata.
- Jika pengujian hanya menggunakan aplikasi referensi dan mock API, nyatakan bahwa hasilnya merupakan validasi integrasi pada lingkungan simulasi, bukan bukti bahwa INFRIA telah terintegrasi dengan layanan kesehatan nasional.
- Pertimbangkan membatasi cakupan awal pada satu atau dua alur layanan administratif yang benar-benar dapat didemonstrasikan secara end-to-end.

2. Perjelas kebaruan dan pembanding produk

- Jelaskan secara spesifik perbedaan INFRIA dengan chatbot berbasis aturan, chatbot berbasis RAG, dan SDK percakapan yang sudah tersedia.
- Jangan hanya menyatakan bahwa kombinasi RAG dan Dynamic Function Calling merupakan kebaruan. Tunjukkan kontribusi teknis yang benar-benar dihasilkan dari integrasi keduanya.
- Lengkapi matriks perbandingan menggunakan sumber yang dapat diverifikasi, dengan kriteria yang konsisten seperti kemampuan menjawab berdasarkan basis pengetahuan, pemanggilan fungsi, integrasi aplikasi, penanganan pertanyaan di luar cakupan, dan kontrol keamanan.
- Hindari klaim absolut seperti “keunikan mutlak”, “menjamin validitas medis”, atau “menghilangkan proxy use” apabila belum didukung hasil pengujian yang memadai.
- Jelaskan mengapa Flutter SDK menjadi pendekatan yang tepat untuk masalah yang diangkat dan bagaimana integrasinya lebih mudah dibandingkan implementasi chatbot secara langsung.

3. Perjelas integrasi dengan ekosistem layanan kesehatan

- Proposal menyebut potensi integrasi dengan SATUSEHAT dan ekosistem JKN. Tegaskan apakah integrasi tersebut sudah dilakukan, sedang diupayakan, atau baru menjadi arah pengembangan.
- Jika belum ada akses API resmi, kredensial, dokumentasi teknis yang sesuai, atau persetujuan pihak terkait, gunakan mock API untuk pengujian dan nyatakan keterbatasannya secara eksplisit.
- Jangan menyamakan penggunaan mock API yang mengikuti struktur tertentu dengan integrasi aktual ke sistem layanan kesehatan nasional.
- Jelaskan alur autentikasi, otorisasi, validasi input, dan penanganan kegagalan ketika sistem meminta layanan administratif.
- Jika target akhir adalah produk yang siap ditanamkan pada aplikasi lain, sediakan contoh aplikasi inang yang membuktikan proses integrasi SDK dari awal sampai akhir.

4. Perkuat metode pengujian teknis

- Proposal telah menetapkan 60 query valid, 20 query ambigu, dan 20 query di luar basis pengetahuan. Jelaskan cara menyusun dataset, sumber pertanyaan, kriteria jawaban benar, dan metode penilaiannya.
- Definisikan secara operasional istilah “akurasi ekstraksi data di atas 90%”. Tentukan apakah yang dihitung adalah ketepatan ekstraksi entitas, ketepatan jawaban berdasarkan sumber, keberhasilan pemanggilan fungsi, atau gabungan indikator.
- Pisahkan pengujian RAG, pengujian Dynamic Function Calling, pengujian integrasi SDK, dan pengujian kinerja sistem. Setiap pengujian perlu memiliki indikator dan kriteria keberhasilan masing-masing.
- Untuk pertanyaan ambigu dan di luar basis pengetahuan, ukur apakah sistem mampu meminta klarifikasi, menolak memberikan jawaban yang tidak didukung, atau mengarahkan pengguna ke sumber yang sesuai.
- Target respons di bawah empat detik perlu disertai kondisi pengukuran, misalnya jumlah pengulangan, lingkungan pengujian, ukuran input, serta penggunaan nilai rata-rata atau persentil.
- Target integrasi di bawah 30 baris kode perlu didefinisikan: apakah hanya untuk menampilkan antarmuka, melakukan autentikasi, mengonfigurasi fungsi, atau menyelesaikan satu alur layanan secara utuh.

5. Perkuat pengujian pengguna dan pemilihan instrumen

- Jelaskan karakteristik dan jumlah peserta yang akan dilibatkan, cara perekrutan, serta alasan pemilihan peserta.
- Tentukan tugas yang harus diselesaikan peserta, misalnya mencari jadwal pemeriksaan atau memperoleh informasi layanan melalui antarmuka konvensional dan antarmuka percakapan.
- Ukur indikator yang relevan, seperti tingkat keberhasilan tugas, waktu penyelesaian, jumlah kesalahan, kebutuhan bantuan, dan persepsi pengalaman pengguna.
- Jika menggunakan Short User Experience Questionnaire (UEQ-S), jelaskan prosedur penggunaan instrumen dan cara penghitungan hasilnya.
- Jangan menyimpulkan bahwa INFRIA mengurangi beban kognitif atau menghilangkan proxy use hanya berdasarkan hasil kuesioner pengalaman pengguna. Klaim tersebut memerlukan indikator dan bukti yang sesuai.
- Jika memungkinkan, lakukan perbandingan pada peserta dan skenario tugas yang sebanding agar hasilnya dapat diinterpretasikan secara lebih bertanggung jawab.

6. Perjelas keamanan, privasi, dan batasan AI kesehatan

- Penggunaan mock API dan data sintetis merupakan langkah yang baik untuk menghindari paparan data medis asli. Jelaskan pula bagaimana data percakapan, log, kredensial, dan konfigurasi proyek disimpan serta dilindungi.
- Perjelas mekanisme isolasi data antarproyek, autentikasi pengguna, manajemen secret/API key, dan pembatasan akses pada web console.
- Jelaskan cara sistem mencegah prompt injection, manipulasi basis pengetahuan, pemanggilan fungsi tanpa otorisasi, serta akses ke data yang tidak relevan.
- RAG tidak otomatis menjamin informasi medis benar. Tetapkan sumber pengetahuan yang digunakan, proses kurasi, pencantuman sumber jawaban, dan mekanisme penanganan informasi yang tidak ditemukan.
- Bedakan layanan administratif dengan saran medis. Untuk ruang lingkup awal, prioritaskan tugas administratif yang dapat divalidasi dan batasi keluaran yang berpotensi ditafsirkan sebagai diagnosis atau rekomendasi klinis.
- Hindari klaim “menjamin privasi” atau “sangat aman” tanpa model ancaman, kontrol keamanan, dan hasil pengujian yang mendukung.

7. Realistiskan arsitektur dan jadwal pengembangan

- Pengembangan Next.js, Firebase, AI Engine, RAG, Dynamic Function Calling, dan Flutter SDK merupakan cakupan yang luas. Jelaskan dependensi antarbagian serta urutan pengembangannya.
- Gunakan pendekatan vertical slice secara konkret: selesaikan satu alur layanan dari input pengguna, pemrosesan AI, pemanggilan fungsi, hingga hasil ditampilkan di aplikasi sebelum memperluas fitur.
- Rinci keluaran setiap tahap, seperti backend aktif, basis pengetahuan terkurasi, fungsi administratif yang berjalan, SDK terintegrasi, dan laporan pengujian.
- Sisihkan waktu khusus untuk integrasi, debugging, pengujian keamanan, dan perbaikan berdasarkan hasil pengujian.
- Pastikan pembagian tugas anggota sesuai kompetensi teknis dan beban pekerjaan yang diperlukan untuk menghasilkan produk fungsional.

8. Perjelas anggaran dan dasar kebutuhannya

- RAB mencantumkan dana Belmawa sebesar Rp8.000.000 dan dukungan perguruan tinggi sebesar Rp500.000. Jelaskan penggunaan setiap pos secara spesifik dan hubungkan dengan tahapan pengembangan produk.
- Rincikan kebutuhan biaya layanan AI/API, hosting, database, penyimpanan, domain, atau layanan pendukung lainnya jika memang digunakan.
- Jelaskan apakah perangkat komputer yang disebutkan dalam metode merupakan fasilitas laboratorium yang sudah tersedia atau membutuhkan biaya tambahan.
- Pastikan biaya langganan atau penggunaan layanan cloud dihitung berdasarkan durasi dan perkiraan penggunaan selama kegiatan.
- Cocokkan rincian RAB dengan rekapitulasi, sumber dana, batas persentase setiap kategori, dan pedoman PKM-KI tahun pengusulan.

9. Perbaiki konsistensi referensi dan klaim manfaat

- Pastikan setiap sumber dapat ditelusuri dan mendukung klaim yang dirujuk.
- Jelaskan konteks studi yang menghasilkan skor SUS 60,9 dan hindari menggeneralisasi skor tersebut sebagai gambaran seluruh aplikasi atau pengguna layanan kesehatan digital.
- Bedakan hasil yang akan dibuktikan selama PKM dengan manfaat jangka panjang yang masih berupa potensi.
- Klaim efisiensi waktu dan biaya pengembangan perlu diukur melalui pembanding yang jelas, misalnya waktu integrasi dengan dan tanpa SDK pada tugas yang setara.
- Gunakan istilah “siap diintegrasikan” hanya jika produk telah diuji sesuai ruang lingkup integrasi yang dinyatakan."