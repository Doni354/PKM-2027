# Idea Studio — Collaborative Brainstorming & Idea Maturity App

Aplikasi web kolaboratif real-time yang minimalis ala **FigJam** untuk eksplorasi ide seluas mungkin bersama tim, diskusi via sticky notes & komentar, melihat **kursor tim secara live**, lalu mematangkan ide ke target lomba/inovasi mana pun (**PKM-KI, PKM-KC, PKM-K, PKM-PM, PKM-PI, PKM-RE/RSH, GEMASTIK, Hackathon, hingga Startup/Produk Mandiri**).

---

## Alur 4 Tahap Pematangan Ide

1. **1. Ruang Ide (Kanvas Bebas ala FigJam)**
   - Kanvas *dot-grid* interaktif dengan **live multiplayer cursors** terisolasi (tanpa re-render kanvas), streaming posisi drag real-time (40ms), dan **auto-layout Masonry** berbasis tinggi kartu aktual.
   - Klik ganda kanvas atau tekan `+ Sticky Note` untuk langsung mengetik ide bebas warna-warni (mendukung **Dark Mode & Light Mode**).
   - Beri **Upvote**, tulis **Notes/Komentar diskusi** di tiap sticky note, lalu klik **Bedah →** untuk membawa ide terpilih ke tahap berikutnya.
2. **2. Bedah (Kanban Drag-and-Drop ala Trello)**
   - 4 kolom (**Masalah Nyata, Urgensi & Bukti, Target Pengguna, Kebutuhan Inti**) dengan fitur **drag-and-drop antar kolom & ubah urutan vertikal** (*pointer-capture* + akselerasi GPU + dukungan tombol panah keyboard) tersinkron real-time ke Firebase.
   - Dilengkapi filter kelompok ide, urutan manual Trello / Top Vote / Terbaru, catatan diskusi per kartu, dan tombol 1-klik **Mindmap**.
3. **3. Mindmap (Peta Solusi & Keterukuran)**
   - Kanvas `@xyflow/react` dengan streaming drag real-time, kartu bersih ala *Linear × Whimsical*, kurva Bezier, dan tombol **Rapikan** berbasis *real-height hierarchical tree layout* (anti-overlap).
   - Memecah **Akar Masalah → Opsi Solusi** (`Software`, `Hardware`, `IoT`, `AI / Data`, `Bisnis`, `Sosial`, `Kreatif`) **→ Indikator Keterukuran** (`Realitas`, `Teknis`, `Teori`).
4. **4. Ide Matang (Blueprint & Keberlanjutan Multi-Track)**
   - Pelacak status kematangan (**Bibit Ide → Sedang Dibedah → Tervalidasi → Ide Matang**).
   - Pilih arah target bebas (**semua skema PKM, GEMASTIK/LIDM, Hackathon, Startup, atau Custom**) dan tema bebas.
   - Dilengkapi blok **Keberlanjutan Ide & Potensi Lomba/Hilirisasi** agar ide tidak berhenti di satu lomba saja.
- **Tombol Inspirasi** di header menyajikan 3 opsi pemantik dari `02-ideasi/01-evaluasi-draft-lama.md` kapan pun dibutuhkan tanpa memenuhi ruang kerja.
- **Export .md** mengunduh seluruh isi 4 tahap (sticky notes + komentar, board bedah, mindmap + diagram Mermaid, dan blueprint ide matang) menjadi 1 file Markdown siap simpan ke `02-ideasi/`.

---

## 1. Setup Lokal & `.env`

File `.env` sudah disiapkan untuk proyek Firebase `pkm2027-4bc57` (region `asia-southeast1`). Jika setup di mesin lain, salin `.env.example` menjadi `.env`.

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
