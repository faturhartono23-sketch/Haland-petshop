# Troubleshooting Guide

## Login Issues

### ✅ Status Check

First, verify everything is working:

```bash
# 1. Check database connection
npm run test:db

# 2. Check if users exist
npm run db:studio

# 3. Check .env variables
cat .env.local | grep -E "DATABASE_URL|NEXTAUTH_SECRET"

# 4. Build test
npm run build

# 5. Dev server test
npm run dev
```

---

## Common Issues & Solutions

### Issue 1: "Cannot find module" Error

**Symptom**: Build fails with "Cannot find module"

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Regenerate Prisma
npm run prisma:generate

# Build again
npm run build
```

---

### Issue 2: Database Connection Failed

**Symptom**: "Error: connect ECONNREFUSED" or database timeout

**Cause**: Environment variables not loaded

**Check .env.local exists**:
```bash
ls -la .env.local
```

**Should contain**:
```
DATABASE_URL=postgresql://neondb_owner:...
DIRECT_URL=postgresql://neondb_owner:...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

**Fix**:
```bash
# Make sure you have .env.local
cp .env.example .env.local

# Update with real values from Neon dashboard
nano .env.local

# Test connection
npm run test:db
```

---

### Issue 3: "Proxy is missing expected function export"

**Symptom**: Error about proxy.ts during build

**Cause**: proxy.ts file is missing or malformed

**Fix**:
```bash
# Check if proxy.ts exists
ls -la proxy.ts

# If missing, it should be created automatically
# If error persists, delete and rebuild:
rm -rf .next
npm run build
```

---

### Issue 4: Prisma Migration Error

**Symptom**: "Prisma migrate" fails

**Solution**:
```bash
# Push schema without migration
npm run db:push

# Or reset database (WARNING: Deletes data)
npm run db:reset
```

---

### Issue 5: Login Form Appears But Can't Submit

**Symptom**: Form submits but nothing happens

**Cause**: Next.js server error

**Check server logs**:
- Look at browser console (F12 → Console)
- Check terminal where you ran `npm run dev`

**Debug**:
```bash
# Enable verbose logging
npm run dev 2>&1 | tee dev.log

# Then try login and check the log
cat dev.log | grep -i "error\|login\|auth"
```

---

### Issue 6: "RangeError: Maximum call stack size exceeded"

**Symptom**: Build or dev server crashes with this error

**Cause**: Circular variable reference in .env file

**Fix**:
```bash
# Check .env.production
cat .env.production

# Should NOT contain ${...} variables
# Should look like this:
# # Production Environment Variables
# # Set values in Vercel Dashboard

# Remove any ${} substitutions
nano .env.production
```

---

### Issue 7: NEXTAUTH Warnings

**Symptom**: Warnings about NEXTAUTH_URL or NO_SECRET

**This is expected** in development if:
- NEXTAUTH_URL is localhost
- NEXTAUTH_SECRET is set but not production-grade

**Not an error** - can safely ignore during development

**For production**, set proper values in Vercel dashboard

---

### Issue 8: "User tidak ditemukan" at Login

**Symptom**: Database is connected but says user not found

**Cause**: Seed data not loaded

**Check users**:
```bash
npm run db:studio
# Go to "User" table and check if any users exist
```

**Reload seed data**:
```bash
# This will recreate seed data
npm run prisma:seed
```

---

### Issue 9: PIN Not Working

**Symptom**: PIN 1234 doesn't work even though database is connected

**Check PIN hash**:
```bash
npm run db:studio
# Go to User table
# Check pinHash field - should be a bcrypt hash (~60 chars)
```

**Reset PIN**:
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

(async () => {
  const pinHash = await bcrypt.hash('1234', 10);
  await prisma.user.updateMany({
    data: { pinHash, failedPinAttempts: 0, isLocked: false }
  });
  console.log('✅ PIN reset');
  await prisma.\$disconnect();
})();
"
```

---

### Issue 10: Build Works But Dev Server Crashes

**Symptom**: `npm run build` works fine but `npm run dev` crashes

**Solution**:
```bash
# Clear Next.js cache
rm -rf .next

# Try again
npm run dev
```

---

## Advanced Debugging

### Enable Debug Logs

In `lib/auth.ts`, there are already console.log statements. Check:

```bash
# Run dev server and watch logs
npm run dev

# Try to login and watch the terminal
# You'll see debug messages like:
# [authorize] credentials diterima untuk username: owner
# [authorize] Login berhasil untuk user: owner
```

### Check Database Directly

```bash
# Open Prisma Studio
npm run db:studio

# Tables to check:
# - User (login credentials)
# - Customer (customer data)
# - Pet (pet data)
# - Appointment (appointments)
# etc.
```

### Test with Raw Node

```bash
# Test database connection
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.findMany().then(users => {
  console.log('Users:', users.length);
  process.exit(0);
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
"
```

---

## When All Else Fails

### Complete Reset

```bash
# 1. Stop dev server (Ctrl+C)

# 2. Clean up
rm -rf .next node_modules

# 3. Reinstall
npm install

# 4. Regenerate Prisma
npm run prisma:generate

# 5. Push database schema
npm run db:push

# 6. Reload seed data
npm run prisma:seed

# 7. Try dev server again
npm run dev
```

---

## Getting Help

When reporting an issue, include:

1. **Error message** (full text)
2. **When it happens** (login, build, dev server)
3. **Steps to reproduce**
4. **Output of**:
   ```bash
   npm run test:db
   npm run build 2>&1 | tail -100
   ```

---

## Health Check Script

Run this to verify everything:

```bash
#!/bin/bash
echo "🔍 Health Check"
echo "==============="

echo -e "\n1️⃣  Database Connection:"
npm run test:db

echo -e "\n2️⃣  Environment Variables:"
grep -E "DATABASE_URL|NEXTAUTH" .env.local | grep -v "^#"

echo -e "\n3️⃣  Build Test:"
npm run build 2>&1 | tail -5

echo -e "\n4️⃣  Prisma Status:"
npm run prisma:generate 2>&1 | tail -3

echo -e "\n✅ Health check complete"
```

Save as `healthcheck.sh` and run:
```bash
bash healthcheck.sh
```

---

Good luck! 🚀
