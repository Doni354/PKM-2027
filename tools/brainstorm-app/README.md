# Idea Studio — Collaborative Brainstorming & Idea Maturity App

Aplikasi web kolaboratif real-time yang minimalis ala **FigJam** untuk eksplorasi ide seluas mungkin bersama tim, diskusi via sticky notes & komentar, melihat **kursor tim secara live**, lalu mematangkan ide ke target lomba/inovasi mana pun (**PKM-KI, PKM-KC, PKM-K, PKM-PM, PKM-PI, PKM-RE/RSH, GEMASTIK, Hackathon, hingga Startup/Produk Mandiri**).

---

## Alur 5 Tahap Perumusan Ide Terintegrasi (Double Diamond + Problem-First)

Setiap ide yang lahir dari brainstorming memiliki entitas mandiri (**Multi-Ide** — bisa ganti-ganti ide di Tab 2, 3, dan 4 tanpa saling menimpa):

1. **1. Ruang Ide (Discover — Kanvas Bebas ala FigJam)**
   - Kanvas *dot-grid* interaktif dengan **live multiplayer cursors** aktif default, streaming posisi drag real-time (40ms), dan **auto-layout Masonry**.
   - **QoL ala FigJam:** Mode Pilih/Blok (`V`) untuk *marquee selection*, Geser kanvas (`H` / tahan `Space`), **Undo/Redo (`Ctrl+Z`/`Ctrl+Y`)**, **Copy/Cut/Paste/Duplicate (`Ctrl+C/X/V/D`)**, `Ctrl+A`, dan `Del`.
   - **Gambar Referensi Visual (Cloudinary):** Langsung `Ctrl+V` screenshot, drag-and-drop file gambar, atau klik tombol **Gambar** — tampil bersih khusus sebagai gambar referensi (ubah ukuran + lightbox + caption).
   - Klik **Bedah →** pada sticky note untuk membuat **Ide Baru** atau menggabungkannya ke **Ide yang sudah ada** di salah satu 4 pilar.
2. **2. Bedah (Define — 4 Pilar Kanban Trello & Sintesis Akar Masalah per Ide)**
   - Pilih ide aktif di **Idea Switcher Bar**. Drag-and-drop kartu di 4 kolom (**Masalah Nyata, Urgensi & Bukti, Target Pengguna, Kebutuhan Inti**).
   - Kartu **Sintesis Akar Masalah (PoV)** otomatis menggabungkan ke-4 pilar dan mengirimkannya menjadi **Root Mindmap** ide tersebut.
3. **3. Mindmap (Develop — Peta Solusi & 3 Keterukuran per Ide)**
   - Setiap ide memiliki kanvas Mindmap sendiri (bisa berpindah antar ide kapan saja).
   - Root Node menampilkan indikator 4 pilar Bedah + tombol **Sinkron 4 Pilar**, bercabang ke **Opsi Solusi** (`Software`, `Hardware`, `IoT`, `AI / Data`, `Bisnis`, `Sosial`, `Kreatif`) **→ 3 Indikator Keterukuran** (`Realitas`, `Teknis`, `Teori`), lalu 1-klik **Matangkan**.
4. **4. Ide Matang (Deliver — Blueprint & Keberlanjutan per Ide)**
   - Setiap ide memiliki blueprint sendiri lengkap dengan panel **Sumber Terhubung** & tombol 1-klik **Tarik dari Bedah & Mindmap** (baik seluruhnya maupun per bagian).
   - Mendukung semua target track (**PKM-KI/KC/K/PM/PI/RE/VGK, GEMASTIK, Hackathon, Startup, atau Custom**), tema bebas, status kematangan, rencana realisasi 1:1, UEQ, dan keberlanjutan.
5. **5. Hasil (Portfolio, Perbandingan & Preview One-Pager Semua Ide)**
   - Menampilkan **seluruh ide** hasil sesi brainstorming dalam tampilan **Kartu Portfolio** maupun **Tabel Perbandingan** responsif.
   - Tandai keputusan tim (**Prioritas Utama / Kandidat / Cadangan / Arsip**), lakukan voting akhir, buka **Preview Lengkap (One-Pager Pitch)** yang melacak alur penuh dari sticky note awal hingga blueprint final, salin ringkasan, atau export Markdown per ide maupun semua ide sekaligus.

---

## 1. Setup Lokal & `.env`

File `.env` sudah disiapkan untuk proyek Firebase `pkm2027-4bc57` (region `asia-southeast1`) dan Cloudinary unsigned preset `idea_studio_unsigned` (`pornijiv`) agar API secret tidak pernah masuk ke bundle browser. Jika setup di mesin lain, salin `.env.example` menjadi `.env`.

```bash
cd tools/brainstorm-app
npm install
npm run dev
```

---

## 2. Rules Firebase Realtime Database

Pastikan **Realtime Database → Rules** di Firebase Console mengizinkan read/write pada path `rooms` selama sesi berlangsung:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

---

## 3. Deploy Cepat

### Opsi A — Vercel
1. Import repo di [vercel.com/new](https://vercel.com/new) dengan **Root Directory**: `tools/brainstorm-app`.
2. Tambahkan 7 variabel `VITE_FIREBASE_*` dari `.env` di menu **Environment Variables**.
3. Deploy dan bagikan link `https://<domain-anda>.vercel.app/?room=pkm-ki-2027`.

### Opsi B — Firebase Hosting
File `firebase.json` dan `.firebaserc` (`pkm2027-4bc57`) sudah siap:

```bash
cd tools/brainstorm-app
npm run build
npx firebase-tools login
npx firebase-tools deploy --only hosting
```

Bagikan link `https://pkm2027-4bc57.web.app/?room=pkm-ki-2027` ke teman satu tim!
