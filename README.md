# Keuangan Saya

Aplikasi keuangan pribadi (HTML, CSS, JavaScript tanpa framework).

## Fitur
- Catat pemasukan dan pengeluaran, lengkap dengan keterangan, sumber/kategori, dan tanggal
- **Edit dan hapus** transaksi lama
- Kategori otomatis dari keterangan (contoh: "makan" → Makanan)
- Transaksi berulang otomatis setiap bulan (gaji, listrik, wifi, kos)
- Ringkasan: saldo awal, total pemasukan, total pengeluaran, saldo akhir
- Pembukuan mingguan dan bulanan
- Laporan dengan ekspor PDF (tombol cetak → Simpan sebagai PDF) dan salin ke Excel/Sheets
- Nasihat keuangan otomatis
- Bisa dipakai offline setelah pertama kali dibuka

## Struktur
```
index.html          halaman utama
css/style.css       tampilan
js/app.js           logika aplikasi
sw.js               dukungan offline
manifest.webmanifest  pengaturan aplikasi (PWA)
icon.svg            ikon aplikasi
```

## Menjalankan
Cukup buka `index.html` di browser. Data disimpan di perangkat (localStorage).

## Upload ke GitHub
```
git init
git add .
git commit -m "Aplikasi keuangan"
git branch -M main
git remote add origin https://github.com/USERNAME/keuangan-app.git
git push -u origin main
```
Atau tanpa terminal: buat repositori baru di github.com, pilih "uploading an existing file", lalu seret semua isi folder ini.

## Publikasi (GitHub Pages)
Settings → Pages → Source: Deploy from a branch → branch `main`, folder `/ (root)`.
Aplikasi akan tersedia di `https://USERNAME.github.io/keuangan-app/`.

## Membuat APK
Buka alamat GitHub Pages di pwabuilder.com → Package for stores → Android. Untuk tampilan terbaik, tambahkan ikon PNG 512×512 bila diminta.

## Catatan
Data tersimpan di browser perangkat. Untuk membackup, gunakan tombol Salin Teks Laporan atau ekspor PDF secara berkala.
