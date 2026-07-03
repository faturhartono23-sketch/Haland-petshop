# Login & Database Connection Guide

## Database Status ✅

Database sudah terhubung dan berfungsi dengan baik.

**Database**: Neon PostgreSQL  
**Status**: Connected ✅  
**Users Loaded**: 3 accounts  
**PIN System**: Fully functional

---

## Default Login Credentials

Semua akun menggunakan PIN `1234`. **Anda akan diminta untuk mengubah PIN saat login pertama kali.**

| Username | Name | Role | PIN |
|----------|------|------|-----|
| `owner` | Owner HaLand | OWNER | 1234 |
| `admin` | Admin Klinik | ADMIN_KLINIK | 1234 |
| `dr_budi` | Dr. Budi Santoso | DOKTER | 1234 |

---

## Cara Login

### Step 1: Start Dev Server
```bash
npm run dev
```

### Step 2: Open Login Page
Buka browser: `http://localhost:3000`

Akan redirect ke `/login` secara otomatis.

### Step 3: Masukkan Credentials
- **Username**: `owner` (atau `admin` / `dr_budi`)
- **PIN**: `1234`

### Step 4: Login Berhasil
Setelah login berhasil, Anda akan diarahkan ke:
- **OWNER**: `/dashboard`
- **ADMIN_KLINIK**: `/dashboard`
- **DOKTER**: `/dashboard`
- **CUSTOMER**: `/portal`

---

## Role & Permissions

### 1. OWNER
- Full access to all features
- User management
- System settings
- Reports & analytics

### 2. ADMIN_KLINIK (Admin Clinic)
- Manage clinic operations
- Handle appointments
- Manage customers & pets
- View reports

### 3. DOKTER (Doctor)
- View appointments
- Create medical records
- Manage pet health

### 4. CUSTOMER
- View own pets
- Book appointments
- View invoices
- Pet health records

---

## Troubleshooting Login Issues

### Issue: "Username atau PIN salah"

**Cause**: 
- Username doesn't exist
- PIN is incorrect
- Account is locked (5 failed attempts)

**Solution**:
```bash
# Check if users exist in database
npm run db:studio

# Or test credentials directly
npm run test:db
```

### Issue: "akun sedang dikunci"

**Cause**: 5 failed PIN attempts

**Solution**:
Wait 15 minutes for lock to expire, or reset in database:
```bash
# Open database explorer
npm run db:studio

# Find the user and reset:
# - Set failedPinAttempts to 0
# - Set isLocked to false
# - Set lockedUntil to null
```

### Issue: Database Connection Error

**Cause**: Database credentials missing or invalid

**Check .env.local**:
```bash
cat .env.local | grep DATABASE_URL
```

**Should contain**:
```
DATABASE_URL=postgresql://neondb_owner:...
DIRECT_URL=postgresql://neondb_owner:...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

**Test Connection**:
```bash
npm run test:db
```

---

## Database Explorer

View and manage data directly:

```bash
npm run db:studio
```

This opens Prisma Studio at `http://localhost:5555`

---

## Change PIN After Login

When you login for the first time, you'll be prompted to change your PIN.

**New PIN Requirements**:
- Minimum 6 digits
- Must be different from current PIN
- Use numbers only

---

## Account Status

Check account details in database:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const users = await prisma.user.findMany({
    select: { username: true, isActive: true, isLocked: true, failedPinAttempts: true }
  });
  console.table(users);
  await prisma.\$disconnect();
})();
"
```

---

## Reset All Pins to Default

To reset all accounts back to PIN `1234`:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

(async () => {
  const pinHash = await bcrypt.hash('1234', 10);
  await prisma.user.updateMany({
    data: {
      pinHash,
      failedPinAttempts: 0,
      isLocked: false,
      lockedUntil: null,
    }
  });
  console.log('✅ All PINs reset to 1234');
  await prisma.\$disconnect();
})();
"
```

---

## Create New User Account

Add a new user account to the system:

```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

(async () => {
  const pinHash = await bcrypt.hash('1234', 10);
  const newUser = await prisma.user.create({
    data: {
      username: 'newuser',
      name: 'New User Name',
      pinHash,
      role: 'DOKTER', // or ADMIN_KLINIK, CUSTOMER
      isActive: true,
      mustChangePin: true,
    }
  });
  console.log('✅ User created:', newUser.username);
  await prisma.\$disconnect();
})();
"
```

---

## Quick Verification

Everything works if you see:

✅ Database connected with 3 users  
✅ All PINs are valid (tested with bcrypt)  
✅ Build succeeds with 0 errors  
✅ Dev server starts without errors  
✅ Can access `/login` page  
✅ Login form accepts credentials  

---

## Next Steps

1. ✅ Start dev server: `npm run dev`
2. ✅ Open browser: `http://localhost:3000`
3. ✅ Login with `owner` / `1234`
4. ✅ Change PIN when prompted
5. ✅ Explore the dashboard

Good luck! 🚀
