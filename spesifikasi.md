# SPESIFIKASI TEKNIS — HALAND PETCARE

> **Dokumen ini adalah SUMBER KEBENARAN MUTLAK (single source of truth)** untuk pengembangan aplikasi Haland Petcare. Semua developer maupun AI coding assistant (Copilot, Claude, dsb) WAJIB mengikuti dokumen ini sebagai acuan utama. Jika ada instruksi lain yang bertentangan dengan dokumen ini, dokumen ini yang menang.

---

## 1. Ringkasan Aplikasi

**Haland Petcare** adalah aplikasi manajemen **Klinik Hewan dan Petshop** berbasis web untuk **satu cabang (single-branch, single-tenant)**. Aplikasi mengintegrasikan pelanggan, hewan peliharaan, pemeriksaan, rekam medis, rawat inap (pet hotel), penjualan produk petshop, inventori, pembayaran/invoice, laporan, dan manajemen pengguna dalam satu sistem.

Aplikasi memiliki **dua sisi penggunaan**:
1. **Sisi Staff/Internal** — digunakan oleh Owner, Admin Klinik, dan Dokter untuk operasional klinik sehari-hari.
2. **Sisi Customer (Portal Pelanggan)** — digunakan oleh pelanggan untuk melihat data hewan peliharaan miliknya, riwayat kunjungan/medis, tagihan, dan booking pet hotel miliknya sendiri.

**Filosofi utama:** sederhana, cepat dibangun, mudah dipelihara, minim bug, mudah dipahami oleh manusia maupun AI coding assistant.

---

## 2. Prinsip Arsitektur (WAJIB DIIKUTI)

Semua kode yang ditulis — oleh manusia maupun AI — HARUS mematuhi prinsip berikut. Ini bukan saran, ini aturan.

1. **Satu halaman = satu file utama.** Setiap route (`page.tsx`) berisi logika utama halaman tersebut. Jangan memecah halaman menjadi banyak sub-komponen kecil yang tersebar di banyak file kecuali benar-benar dipakai ulang (reusable) di lebih dari satu tempat.
2. **Satu komponen menangani satu alur lengkap.** Misalnya komponen `CustomerForm` menangani seluruh alur tambah & edit customer dalam satu file (state, validasi, submit), bukan dipecah menjadi `CustomerFormFields`, `CustomerFormValidation`, `CustomerFormSubmitHandler`, dll.
3. **Hindari abstraksi berlebihan.** Jangan membuat layer generic/reusable (custom hooks kompleks, factory pattern, repository pattern berlapis) kecuali pola yang sama sudah berulang di ≥3 tempat berbeda dengan struktur identik.
4. **CRUD sederhana dan konsisten.** Semua modul mengikuti pola CRUD yang sama persis: List (tabel + search + filter + pagination) → Dialog Tambah → Dialog Ubah → Konfirmasi Hapus. Tidak ada variasi pola antar modul tanpa alasan kuat.
5. **UI langsung terlihat tanpa membuka banyak file.** Struktur JSX halaman ditulis langsung di dalam `page.tsx` (atau maksimal 1 file client component pendamping), bukan disusun dari 5-10 komponen kecil yang saling import.
6. **Struktur folder dangkal (flat).** Maksimal 2-3 level kedalaman folder. Hindari nested folder yang dalam seperti `modules/pets/components/forms/fields/`.
7. **Hindari kompleksitas yang memicu error.** Tidak menggunakan state management eksternal (Redux, Zustand, dll) kecuali benar-benar diperlukan. Gunakan React state bawaan + Server Actions. Tidak menggunakan caching layer kompleks di awal.
8. **Server Actions sebagai default** untuk mutasi data (create/update/delete), bukan API Route terpisah, kecuali dibutuhkan oleh pihak ketiga (webhook, dsb).
9. **Setiap file harus bisa dibaca dan dipahami dalam satu kali scroll** oleh developer atau AI tanpa perlu membuka banyak file referensi.
10. **Akses berbasis peran (role-based access) dicek di dua lapis:** middleware (proteksi route) dan di dalam Server Action (proteksi mutasi data) — tidak pernah mengandalkan UI saja (menyembunyikan tombol) sebagai satu-satunya bentuk proteksi.

---

## 3. Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Next.js (App Router) |
| Bahasa | TypeScript |
| ORM | Prisma |
| Database Dev | SQLite |
| Database Prod | PostgreSQL |
| Auth | NextAuth — **Credentials Provider (username + PIN)** |
| Hashing PIN | bcrypt |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Validasi | Zod |
| Mutasi Data | Server Actions (Next.js) |
| Grafik | Recharts (berat badan, laporan) |

**Tidak digunakan:** Redux/Zustand, GraphQL, microservices, WebSocket/real-time server, message queue, layer caching eksternal (Redis dll), ORM kedua, arsitektur clean/hexagonal berlapis, login via email/password, login via OAuth pihak ketiga (Google, dll), sistem registrasi mandiri (self sign-up).

---

## 4. Autentikasi & Otorisasi

### 4.1 Prinsip Login

- **Satu metode login untuk SEMUA role**: `username` + `PIN`. Tidak ada email/password, tidak ada OTP SMS/WhatsApp, tidak ada OAuth.
- **Tidak ada halaman registrasi publik.** Tidak seorang pun bisa membuat akunnya sendiri lewat form pendaftaran. Semua akun dibuat oleh pihak berwenang di dalam sistem (lihat §4.3).
- **PIN**: 6 digit angka, disimpan dalam bentuk hash (bcrypt), tidak pernah disimpan/ditampilkan dalam bentuk plain text setelah dibuat.
- **Username**: unik di seluruh sistem (baik staff maupun customer berbagi ruang nama yang sama), huruf kecil, angka, dan underscore, tanpa spasi.
- Setelah login sukses, sistem membaca `role` milik user dan mengarahkan (redirect) ke dashboard sesuai role (lihat §4.4).

### 4.2 Keamanan Login Sederhana

- Maksimal **5 kali percobaan PIN salah** berturut-turut → akun dikunci sementara (`isLocked = true`) selama 15 menit, atau sampai di-unlock manual oleh Owner/Admin Klinik dari menu Users.
- Tidak ada "lupa PIN" mandiri oleh user — reset PIN hanya bisa dilakukan oleh Owner (untuk semua role) atau Admin Klinik (khusus untuk akun Customer), melalui menu Users.
- Session menggunakan JWT strategy bawaan NextAuth (tanpa database session table terpisah) agar tetap sederhana.

### 4.3 Aturan Pembuatan Akun (Siapa Boleh Membuat Akun Apa)

| Pembuat Akun | Boleh Membuat Role |
|---|---|
| **Owner** | Owner, Admin Klinik, Dokter, Customer (**semua role**) |
| **Admin Klinik** | **Customer saja** |
| **Dokter** | Tidak bisa membuat akun apa pun |
| **Customer** | Tidak bisa membuat akun apa pun (termasuk untuk dirinya sendiri — tidak ada self sign-up) |

Catatan:
- Saat Admin Klinik atau Owner mendaftarkan pelanggan baru di modul **Customer**, sistem otomatis menawarkan opsi "Buatkan akun login" — jika diaktifkan, sistem membuat `User` baru dengan role `CUSTOMER` dan menautkannya ke record `Customer` tersebut (lihat §7 skema `Customer.userId`). Jika tidak diaktifkan, data customer tetap tersimpan tanpa akses login (misalnya pelanggan yang tidak butuh portal online).
- PIN awal akun yang baru dibuat di-generate otomatis (6 digit acak) dan ditampilkan **satu kali** kepada pembuat akun untuk diberikan ke pemilik akun. User yang bersangkutan wajib mengganti PIN pada login pertama (`mustChangePin = true`).

### 4.4 Routing Berdasarkan Role

- Owner, Admin Klinik, Dokter → diarahkan ke **`/dashboard`** (dashboard staff, isi berbeda-beda sesuai hak akses di §5).
- Customer → diarahkan ke **`/portal`** (dashboard/portal pelanggan, terpisah dari sisi staff).
- Middleware (`middleware.ts`) memeriksa `role` dari token sesi pada setiap request ke route `/dashboard/**` (hanya staff) dan `/portal/**` (hanya customer). Role yang tidak sesuai otomatis di-redirect ke dashboard miliknya sendiri.

---

## 5. Role & Hak Akses Dashboard

Terdapat **4 role tetap**: `OWNER`, `ADMIN_KLINIK`, `DOKTER`, `CUSTOMER`. Tidak ada role tambahan/dinamis — daftar role bersifat fixed enum di database, bukan tabel role yang bisa diedit user (menjaga kesederhanaan).

### 5.1 OWNER — Akses Penuh (Full Access)

Pemilik klinik. Melihat dan mengelola **seluruh sistem** tanpa batasan.

- Dashboard: seluruh ringkasan bisnis (pendapatan, penjualan, appointment, rawat inap, stok, performa dokter).
- Customer, Pets, Appointment, Medical Records, Pet Hotel, Petshop/Inventori, POS, Billing: akses penuh (create/read/update/delete).
- Reports: akses penuh ke semua jenis laporan, semua periode.
- **Users**: satu-satunya role yang bisa membuat/mengelola akun Owner, Admin Klinik, dan Dokter. Bisa membuat akun Customer, mengaktifkan/menonaktifkan akun apa pun, reset PIN siapa pun, unlock akun terkunci.
- Settings: akses penuh (identitas klinik, format invoice, audit log, backup & restore).
- Profile: kelola profil & PIN sendiri.

### 5.2 ADMIN KLINIK — Operasional Harian

Staf administrasi/resepsionis yang menjalankan operasional harian klinik, tanpa akses ke hal-hal strategis/sensitif seperti pengaturan sistem inti atau data finansial mendalam.

- Dashboard: ringkasan operasional harian (appointment hari ini, rawat inap berjalan, stok menipis, penjualan hari ini) — **tanpa** ringkasan laba/margin bisnis.
- Customer: akses penuh (create/read/update/delete), **termasuk membuat akun login Customer**.
- Pets, Appointment, Pet Hotel, Petshop/Inventori, POS, Billing: akses penuh (create/read/update/delete).
- Medical Records: hanya **lihat (read-only)** — tidak bisa membuat/mengubah hasil pemeriksaan medis (itu wewenang Dokter).
- Reports: akses ke laporan operasional (penjualan, appointment, inventori, pet hotel) — **tidak** ke laporan performa dokter atau laba bersih klinik.
- **Users**: hanya bisa membuat & mengelola akun **Customer** (aktivasi, reset PIN, unlock). Tidak bisa membuat/mengubah akun Owner, Admin Klinik, atau Dokter.
- Settings: hanya bagian non-sensitif (identitas klinik dasar) — **tidak** bisa akses backup/restore database atau audit log penuh (opsional, tergantung kebijakan; default: read-only audit log).
- Profile: kelola profil & PIN sendiri.

### 5.3 DOKTER — Klinis

Dokter hewan yang menangani pemeriksaan dan rekam medis.

- Dashboard: ringkasan jadwal pribadi (appointment hari ini miliknya, pasien menunggu, jumlah pasien ditangani bulan ini).
- Appointment: lihat semua jadwal, khususnya miliknya sendiri; bisa mengubah status pemeriksaan (mulai periksa, selesai) untuk appointment yang ditugaskan padanya.
- Medical Records: akses penuh (create/read/update) **hanya untuk pasien yang ia tangani**; tidak bisa menghapus rekam medis (delete hanya oleh Owner, untuk audit).
- Pets & Customer: **read-only** — perlu melihat riwayat hewan/pemilik untuk keperluan pemeriksaan, tapi tidak boleh mengubah data administratif pelanggan.
- Pet Hotel: **read-only** — bisa melihat catatan log harian jika pasien sedang rawat inap, tidak mengelola booking/kamar.
- Petshop, Inventori, POS, Billing, Users, Settings: **tidak ada akses**.
- Reports: hanya laporan yang berkaitan dengan performa/rekam medis miliknya sendiri.
- Profile: kelola profil & PIN sendiri.

### 5.4 CUSTOMER — Portal Pelanggan (Self-Service Terbatas)

Pelanggan hanya bisa melihat **data miliknya sendiri**. Tidak pernah bisa melihat data pelanggan lain.

- Portal (`/portal`): ringkasan hewan peliharaan miliknya, appointment mendatang, tagihan belum lunas, booking pet hotel aktif, notifikasi (jadwal vaksin/kontrol).
- Pets miliknya: **read-only** — lihat profil hewan, grafik berat badan, riwayat vaksin, riwayat penyakit, alergi. Tidak bisa mengedit data medis.
- Appointment: bisa **mengajukan permintaan jadwal baru** (status masuk sebagai `WAITING`, dikonfirmasi oleh Admin Klinik) dan melihat riwayat/menunggu appointment miliknya; bisa membatalkan appointment yang belum berjalan.
- Medical Records miliknya: **read-only**, termasuk unduh/lihat hasil pemeriksaan, resep, hasil lab.
- Pet Hotel: lihat status booking miliknya (read-only), bisa mengajukan reservasi baru (dikonfirmasi Admin Klinik).
- Billing/Invoice miliknya: **read-only** — lihat riwayat invoice & status pembayaran, unduh PDF invoice. Tidak memproses pembayaran di dalam aplikasi (pembayaran tetap dilakukan di klinik/kasir).
- Petshop, Inventori, POS, Reports, Users, Settings: **tidak ada akses**.
- Profile: kelola profil & PIN sendiri.

### 5.5 Ringkasan Matriks Akses Modul

| Modul | Owner | Admin Klinik | Dokter | Customer |
|---|:---:|:---:|:---:|:---:|
| Dashboard (bisnis penuh) | ✅ | Operasional saja | Jadwal pribadi | Portal pribadi |
| Customer | CRUD | CRUD | Read | Read (diri sendiri) |
| Pets | CRUD | CRUD | Read | Read (miliknya) |
| Appointment | CRUD | CRUD | Read + update status | Ajukan/lihat/batal (miliknya) |
| Medical Records | CRUD | Read | CRUD (pasiennya, no delete) | Read (miliknya) |
| Pet Hotel | CRUD | CRUD | Read | Ajukan/lihat (miliknya) |
| Petshop & Inventori | CRUD | CRUD | ✗ | ✗ |
| POS | ✅ | ✅ | ✗ | ✗ |
| Billing/Invoice | CRUD | CRUD | ✗ | Read (miliknya) |
| Reports | Semua | Operasional | Miliknya | ✗ |
| Users | Semua role | Customer saja | ✗ | ✗ |
| Settings | ✅ | Sebagian | ✗ | ✗ |
| Profile | ✅ | ✅ | ✅ | ✅ |

---

## 6. Struktur Folder (Flat & Dangkal)

```
haland-petcare/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx            # form: username + PIN saja
│   ├── (staff)/
│   │   ├── dashboard/
│   │   │   └── page.tsx            # isi dinamis sesuai role (Owner/Admin/Dokter)
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── pets/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   │       └── page.tsx
│   │   ├── appointments/
│   │   │   └── page.tsx
│   │   ├── medical-records/
│   │   │   └── page.tsx
│   │   ├── pet-hotel/
│   │   │   └── page.tsx
│   │   ├── petshop/
│   │   │   ├── products/
│   │   │   │   └── page.tsx
│   │   │   └── inventory/
│   │   │       └── page.tsx
│   │   ├── pos/
│   │   │   └── page.tsx
│   │   ├── billing/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   ├── users/
│   │   │   └── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── profile/
│   │       └── page.tsx
│   ├── (customer)/
│   │   └── portal/
│   │       ├── page.tsx            # ringkasan portal pelanggan
│   │       ├── pets/
│   │       │   └── page.tsx
│   │       ├── appointments/
│   │       │   └── page.tsx
│   │       ├── pet-hotel/
│   │       │   └── page.tsx
│   │       ├── invoices/
│   │       │   └── page.tsx
│   │       └── profile/
│   │           └── page.tsx
│   └── layout.tsx
├── components/
│   ├── ui/                         # shadcn/ui generated components (jangan diedit manual)
│   ├── layout/
│   │   ├── sidebar.tsx             # sidebar staff (menu sesuai role)
│   │   ├── portal-nav.tsx          # navigasi portal customer
│   │   ├── navbar.tsx
│   │   └── notification-bell.tsx
│   └── shared/
│       ├── data-table.tsx          # tabel generik: search, filter, pagination
│       ├── confirm-dialog.tsx      # dialog konfirmasi hapus generik
│       └── empty-state.tsx
├── lib/
│   ├── db.ts                       # Prisma client instance
│   ├── auth.ts                     # NextAuth config (Credentials: username + PIN)
│   ├── permissions.ts              # helper cek hak akses per role (satu file, flat)
│   ├── utils.ts                    # helper umum (format tanggal, currency, dll)
│   └── validations/
│       └── *.ts                    # Zod schema per modul (customer.ts, pet.ts, dll)
├── actions/
│   ├── auth.ts                     # Server Actions: create user, reset pin, unlock
│   ├── customer.ts
│   ├── pet.ts
│   ├── appointment.ts
│   ├── medical-record.ts
│   ├── pet-hotel.ts
│   ├── product.ts
│   ├── inventory.ts
│   ├── pos.ts
│   ├── invoice.ts
│   ├── report.ts
│   ├── user.ts
│   ├── settings.ts
│   └── notification.ts
├── middleware.ts                   # proteksi route /dashboard/** vs /portal/** by role
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                     # seed akun Owner pertama kali
└── spesifikasi.md                  # dokumen ini
```

**Aturan folder:**
- Setiap route hanya berisi `page.tsx` (+ opsional `[id]/page.tsx` untuk detail). Tidak ada `loading.tsx`/`error.tsx` custom kecuali diperlukan khusus.
- Semua Server Actions per modul dikumpulkan dalam **satu file per modul** di folder `actions/`, bukan dipecah per fungsi.
- Komponen di `components/shared/` hanya untuk elemen yang benar-benar dipakai di ≥3 modul (tabel, dialog konfirmasi, empty state).
- `lib/permissions.ts` berisi fungsi-fungsi sederhana seperti `canAccessModule(role, module)` dan `canPerformAction(role, module, action)` — dipakai konsisten di middleware maupun Server Actions, satu sumber kebenaran untuk aturan §5.

---

## 7. Prinsip Relasi Data (Disederhanakan)

- **User adalah satu-satunya pintu login untuk semua role**, termasuk Customer. Tabel `Customer` (data bisnis pelanggan: nama, telepon, alamat) tetap terpisah dari `User` (data login), dihubungkan lewat field opsional `Customer.userId` — **opsional** karena tidak semua pelanggan harus punya akun login (misal pelanggan walk-in yang datanya dicatat staff tanpa diberi akses portal).
- **Pet Hotel dan Medical Records dipisah, tidak saling relasi kompleks.** Aktivitas harian di Pet Hotel (pemberian makan, pemberian obat, catatan kondisi) dicatat sebagai **log teks sederhana di dalam record Pet Hotel itu sendiri** (tabel `PetHotelLog`), BUKAN merujuk ke tabel Medical Records. Medical Records murni untuk hasil pemeriksaan resmi dari appointment (diagnosis, tindakan, resep).
- **Semua invoice digabung menjadi satu.** Tidak ada invoice terpisah per modul. Satu tabel `Invoice` dengan child table `InvoiceItem` yang punya field `type` (`KONSULTASI` | `TINDAKAN` | `OBAT` | `PET_HOTEL` | `PRODUK`). Kasir/admin bisa menambahkan item dari sumber manapun ke satu invoice yang sama.
- **Notifikasi bersifat in-app saja**, disimpan di tabel `Notification` sederhana (bukan real-time/WebSocket). Ditampilkan lewat bell icon dengan badge, diambil ulang saat halaman dibuka atau polling ringan (interval 30-60 detik). Berlaku juga untuk sisi Customer (mis. notifikasi jadwal vaksin, appointment dikonfirmasi, invoice baru).
- **Audit log manual & sederhana.** Tabel `AuditLog` mencatat otomatis siapa mengubah apa dan kapan, termasuk aksi sensitif seperti pembuatan akun dan reset PIN, tapi **hanya untuk dilihat** di menu Settings — tidak ada fitur rollback otomatis.
- **Backup & restore manual.** Menu Settings menyediakan tombol "Backup Now" (generate & unduh file database) dan "Restore" (upload file backup). Tidak ada scheduler otomatis, tidak ada sistem backup berlapis. Hanya Owner yang bisa mengakses fitur ini.

---

## 8. Skema Database (Ringkas)

> Skema lengkap ada di `prisma/schema.prisma`. Berikut ringkasan entitas utama dan relasinya.

### Autentikasi & Pengguna
- **User** — id, username (unik), pinHash, name, phone, role (`OWNER` | `ADMIN_KLINIK` | `DOKTER` | `CUSTOMER`), isActive, isLocked, mustChangePin, failedPinAttempts, lockedUntil, createdById (FK ke User yang membuat akun ini), createdAt

### Entitas Inti
- **Customer** — id, userId (opsional, FK ke User jika punya akun login), name, phone, address, notes
- **Pet** — id, customerId, name, species, breed, birthDate, gender, photo
- **PetWeightLog** — id, petId, weight, date
- **PetVaccineRecord** — id, petId, vaccineName, date, nextDueDate
- **PetDiseaseRecord** — id, petId, diseaseName, note, date
- **PetAllergy** — id, petId, allergen, note

### Operasional Klinik
- **Appointment** — id, petId, customerId, doctorId, date, queueNumber, status (`WAITING` | `IN_PROGRESS` | `DONE` | `CANCELLED`), requestedByCustomer (boolean, true jika diajukan lewat portal)
- **MedicalRecord** — id, appointmentId, petId, doctorId, diagnosis, treatment, prescription, labResult, photos, date
- **PetHotelBooking** — id, petId, roomId, checkInDate, checkOutDate, status (`BOOKED` | `CHECKED_IN` | `CHECKED_OUT`), requestedByCustomer (boolean)
- **PetHotelRoom** — id, name, status (`AVAILABLE` | `OCCUPIED`)
- **PetHotelLog** — id, bookingId, type (`FEEDING` | `MEDICINE` | `NOTE`), description, photo, date

### Petshop & Inventori
- **Product** — id, name, sku, barcode, categoryId, supplierId, buyPrice, sellPrice, stock, minStock
- **ProductCategory** — id, name
- **Supplier** — id, name, contact
- **StockMovement** — id, productId, type (`IN` | `OUT` | `ADJUSTMENT` | `OPNAME`), quantity, note, date

### Billing (Gabungan)
- **Invoice** — id, customerId, invoiceNumber, status (`UNPAID` | `PAID` | `CANCELLED`), totalAmount, date
- **InvoiceItem** — id, invoiceId, type (`KONSULTASI` | `TINDAKAN` | `OBAT` | `PET_HOTEL` | `PRODUK`), description, qty, price, subtotal
- **Payment** — id, invoiceId, method (`CASH` | `NON_CASH`), amount, date

### Sistem
- **Notification** — id, userId, title, message, isRead, type, date
- **AuditLog** — id, userId, action, entity, entityId, description, date
- **Settings** — id, clinicName, logo, address, phone, operationalHours, invoiceFormat, currency

---

## 9. Daftar Modul & Fitur

### 9.1 Login
Form tunggal: `username` + `PIN` (6 digit, input numerik/OTP-style). Tanpa tautan "daftar akun". Redirect otomatis ke `/dashboard` (staff) atau `/portal` (customer) sesuai role setelah berhasil login.

### 9.2 Dashboard Staff (Owner / Admin Klinik / Dokter)
Menampilkan ringkasan sesuai hak akses masing-masing role (detail di §5): jumlah pelanggan, jumlah hewan, appointment hari ini, pasien rawat inap, kamar terisi, stok hampir habis, penjualan hari ini, pendapatan harian & bulanan (Owner), jadwal pribadi (Dokter).

### 9.3 Customer
CRUD data pelanggan (Owner & Admin Klinik), riwayat kunjungan, riwayat transaksi, total pengeluaran, catatan khusus, opsi buatkan akun login portal (role `CUSTOMER`).

### 9.4 Pets
CRUD data hewan + pemilik, grafik riwayat berat badan, riwayat vaksin, riwayat penyakit, alergi, riwayat operasi, pengingat vaksin & kontrol berikutnya (ditampilkan via in-app notification, termasuk ke Customer terkait).

### 9.5 Appointment
Jadwal pemeriksaan, nomor antrian, check-in, ubah jadwal, batal, status real-time (via refresh/polling, bukan WebSocket). Customer dapat mengajukan permintaan appointment dari portal; Admin Klinik mengonfirmasi/mengatur jadwal final.

### 9.6 Medical Records
Hasil pemeriksaan, diagnosis, tindakan, resep obat, vaksin, hasil lab, foto kondisi, grafik berat badan, riwayat lengkap yang bisa dicetak/export PDF. Hanya Dokter yang bisa mengisi; Customer dan Admin Klinik hanya bisa melihat.

### 9.7 Pet Hotel
Kamar, reservasi, check-in/out, perpanjangan, log pemberian makan & obat (`PetHotelLog`), foto kondisi masuk/keluar, status kamar real-time. Customer dapat mengajukan reservasi dari portal.

### 9.8 Petshop (Produk + Inventori digabung)
Kategori produk, supplier, barcode, SKU, harga beli/jual, margin, stok minimum, stok masuk/keluar, penyesuaian, stock opname, riwayat perubahan stok. Khusus staff (Owner & Admin Klinik).

### 9.9 POS (Penjualan Petshop)
Transaksi kasir: cari produk, scan barcode, keranjang, diskon, pembayaran tunai/non-tunai, cetak struk. Khusus staff (Owner & Admin Klinik).

### 9.10 Billing (Invoice Gabungan)
Satu invoice per transaksi/kunjungan yang bisa berisi item dari konsultasi, tindakan, obat, pet hotel, dan produk sekaligus. Pembayaran, pembatalan sesuai aturan, riwayat pembayaran, cetak & export PDF. Customer dapat melihat & mengunduh invoice miliknya sendiri dari portal (read-only, tanpa proses pembayaran online).

### 9.11 Reports
Laporan pendapatan, penjualan, inventori, appointment, rekam medis, pet hotel, pelanggan, produk terlaris, layanan terlaris, performa dokter, berdasarkan periode yang dipilih — cakupan laporan mengikuti hak akses role (§5).

### 9.12 Users
Kelola akun berdasarkan role (Owner, Admin Klinik, Dokter, Customer) sesuai aturan pembuatan akun di §4.3: aktivasi/nonaktivasi akun, reset PIN, unlock akun terkunci, generate PIN awal untuk akun baru.

### 9.13 Settings
Identitas klinik (nama, logo, alamat, telepon, jam operasional), format nomor invoice, mata uang, **audit log (read-only)**, **backup & restore manual** (khusus Owner).

### 9.14 Profile
Update profil (nama, telepon), ganti PIN — mandiri per user, berlaku untuk semua role termasuk Customer.

### 9.15 Portal Pelanggan (Customer)
Ringkasan hewan peliharaan miliknya, appointment mendatang & riwayat, status booking pet hotel, riwayat & status invoice, notifikasi (pengingat vaksin/kontrol, konfirmasi jadwal, invoice baru). Semua data dibatasi hanya milik customer yang login (row-level filtering berdasarkan `customerId` yang terhubung ke `userId` sesi aktif).

### 9.16 Global Search & Notification
Kolom pencarian global (pelanggan, hewan, appointment, rekam medis, invoice, produk) — khusus sisi staff. Notifikasi in-app (bell icon) untuk: jadwal kontrol, jadwal vaksin, appointment hari ini, booking pet hotel, stok menipis/habis, invoice belum dibayar (staff), serta notifikasi personal untuk Customer terkait hewan/janji temu/invoice miliknya.

---

## 10. Pola CRUD Standar (Wajib Sama di Semua Modul)

Setiap halaman modul list mengikuti pola berikut, tanpa variasi:

1. **Header halaman** — judul modul + tombol "Tambah [Entitas]" di kanan atas (hanya muncul jika role punya hak `create` untuk modul tsb).
2. **Search bar & filter** — di atas tabel.
3. **Tabel data** — dengan pagination di bawah, terfilter otomatis sesuai hak akses row-level (mis. Dokter hanya lihat rekam medis pasiennya; Customer hanya lihat datanya sendiri).
4. **Dialog Tambah** — form modal, validasi Zod, submit via Server Action.
5. **Dialog Ubah** — form modal sama seperti tambah, terisi data existing.
6. **Dialog Konfirmasi Hapus** — modal konfirmasi sebelum delete (hanya muncul jika role punya hak `delete`).
7. **Loading state** — skeleton/spinner saat fetch data.
8. **Empty state** — ilustrasi/teks saat data kosong.
9. **Toast notification** — hasil sukses/gagal dari setiap aksi (pakai `sonner` dari shadcn/ui).

> Pola ini di-generate ulang di setiap modul sesuai kebutuhan field-nya, tetapi urutan dan struktur file HARUS identik agar developer/AI baru bisa langsung paham tanpa belajar ulang. Setiap Server Action WAJIB memvalidasi role pemanggil sebelum eksekusi (lihat `lib/permissions.ts`).

---

## 11. Pedoman UI/UX

**Gaya visual:** Modern, minimalis, hitam-putih (monokrom), profesional. Cocok dipakai di mobile maupun desktop (fully responsive) — termasuk portal Customer yang harus optimal di mobile karena mayoritas pelanggan mengakses lewat HP.

### 11.1 Palet Warna
| Elemen | Warna |
|---|---|
| Background utama | Putih (`#FFFFFF`) / Putih keabuan (`#FAFAFA`) |
| Teks utama | Hitam pekat (`#0A0A0A`) |
| Teks sekunder | Abu-abu (`#6B7280`) |
| Border/divider | Abu-abu muda (`#E5E7EB`) |
| Aksen/primary action | Hitam (`#111827`) dengan hover abu gelap |
| Success | Hijau minimal (`#16A34A`) — dipakai secukupnya, bukan dominan |
| Warning | Kuning/oranye minimal (`#D97706`) |
| Danger/Delete | Merah minimal (`#DC2626`) |

Warna selain hitam-putih-abu HANYA dipakai untuk status/badge (sukses, peringatan, bahaya) — bukan untuk elemen dekoratif.

### 11.2 Tipografi
- Font sans-serif modern (misal `Inter` atau font default sistem via Tailwind).
- Hierarki jelas: heading tebal (`font-semibold`/`font-bold`), body normal, label kecil abu-abu.
- Ukuran cukup besar & mudah dibaca di layar kecil (mobile-first).

### 11.3 Layout & Responsivitas
- **Mobile-first**: semua halaman didesain dulu untuk layar kecil, lalu diperluas ke desktop dengan breakpoint Tailwind (`sm`, `md`, `lg`).
- **Desktop (staff)**: sidebar tetap di kiri + konten utama.
- **Mobile (staff)**: sidebar berubah jadi bottom navigation atau hamburger drawer.
- **Portal Customer**: navigasi bottom-tab sederhana (Beranda, Hewan, Janji Temu, Tagihan, Profil) — didesain seperti aplikasi mobile ringan, bukan dashboard admin.
- Tabel di mobile beralih ke tampilan card-list agar tidak perlu scroll horizontal.
- Spacing konsisten menggunakan skala Tailwind (`p-4`, `gap-4`, dst), hindari nilai custom sembarangan.

### 11.4 Komponen
- Semua komponen dasar (button, input, dialog, table, badge, toast) menggunakan **shadcn/ui** apa adanya, kustomisasi warna via Tailwind config agar konsisten hitam-putih.
- Input PIN memakai komponen OTP-style (kotak digit terpisah) untuk kejelasan input 6 digit.
- Ikon menggunakan `lucide-react`, ukuran & style konsisten (outline, bukan filled).
- Sudut (border-radius) konsisten sedang (`rounded-lg` / `rounded-xl`), tidak terlalu tajam atau terlalu bulat.
- Shadow minimal/tipis (`shadow-sm`), hindari efek dekoratif berlebihan.

---

## 12. Penanganan Error & Stabilitas

- Semua Server Action WAJIB dibungkus try-catch dan mengembalikan bentuk hasil konsisten: `{ success: boolean, message: string, data?: T }`.
- Validasi input WAJIB memakai Zod di sisi server sebelum data masuk ke Prisma — tidak mengandalkan validasi client saja.
- Setiap Server Action yang bersifat mutasi WAJIB memeriksa role & kepemilikan data (mis. Customer hanya boleh memutasi data miliknya sendiri, Dokter hanya boleh mengubah rekam medis pasien yang ia tangani) sebelum query dijalankan — gunakan helper terpusat di `lib/permissions.ts`.
- Tidak menggunakan `any` di TypeScript kecuali benar-benar tidak terhindarkan (harus diberi komentar alasan).
- Setiap query Prisma yang bisa gagal (not found, constraint) ditangani dengan pesan error yang jelas ke user, bukan crash halaman.
- Hindari nested try-catch dan logika kondisional bertingkat dalam (>3 level) — refactor menjadi early return.
- Percobaan login gagal berulang (PIN salah) ditangani dengan pesan generik ("Username atau PIN salah") — tidak membocorkan apakah username terdaftar atau tidak.
- Setiap fitur baru harus bisa berjalan independen tanpa mengubah struktur modul lain — mencegah efek domino error.

---

## 13. Pedoman untuk AI Coding Assistant (Copilot/Claude/dsb)

Ketika membangun/mengubah fitur pada proyek ini, AI assistant WAJIB:

1. Membaca dokumen ini terlebih dahulu sebagai konteks utama sebelum menulis kode.
2. Mengikuti struktur folder di **Bagian 6** — tidak membuat folder/file baru di luar pola tersebut tanpa alasan kuat.
3. Mengikuti pola CRUD standar di **Bagian 10** untuk setiap modul baru.
4. Selalu menerapkan aturan hak akses di **Bagian 5** — setiap route dan Server Action baru harus jelas: role mana yang boleh mengakses, dan apakah bersifat penuh atau read-only.
5. Tidak menambahkan library/dependency baru di luar **Bagian 3** tanpa konfirmasi eksplisit dari pengguna.
6. Tidak membuat abstraksi baru (hook generik, class helper, provider context baru) kecuali pola yang sama sudah terbukti berulang ≥3 kali.
7. Menulis satu modul (list + form + actions) dalam jumlah file seminimal mungkin sesuai **Bagian 6**.
8. Selalu mengikuti palet warna & gaya UI di **Bagian 11** — hitam putih minimalis, tanpa warna dekoratif tambahan.
9. Tidak pernah membuat form/flow autentikasi selain username + PIN (tidak menambahkan email/password, OAuth, atau OTP) tanpa konfirmasi eksplisit dari pengguna.
10. Menjaga agar setiap perubahan tidak merusak modul lain (isolated change).

---

## 14. Status Dokumen

| Versi | Tanggal | Catatan |
|---|---|---|
| 1.0 | 2026-07-02 | Versi awal — hasil diskusi penyederhanaan notifikasi (in-app), relasi data (disederhanakan), invoice (digabung), audit log & backup (manual di Settings) |
| 2.0 | 2026-07-02 | Login disatukan menjadi username + PIN untuk semua role; role difinalkan menjadi 4 (`OWNER`, `ADMIN_KLINIK`, `DOKTER`, `CUSTOMER`); ditambahkan Portal Pelanggan; ditambahkan aturan pembuatan akun (Owner buat semua role, Admin Klinik hanya buat Customer); ditambahkan matriks hak akses dashboard per role; skema `User` & `Customer` disesuaikan |
