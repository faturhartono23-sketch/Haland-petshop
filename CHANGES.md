# Change Log

## 2026-07-10 - Hardening Pass & E2E Test Suite

### Security Hardening (8 Items)

**1.1 - Invoice Price Manipulation Prevention**
- Modified `actions/invoice.ts` createInvoice to enforce server-side price calculation for PET_HOTEL items
- Changed booking fetch from `include: { pet: true }` to `include: { room: true }`
- Calculate nights: `Math.ceil((checkOutDate - checkInDate) / ms_per_day)`
- Calculate price from `room.pricePerNight * nights`, **ignoring client-submitted price**
- Added role-based validation: only OWNER/ADMIN_KLINIK can create invoices with KONSULTASI/OBAT (manual price) items
- Unit tests: 5 passing tests verify calculation and role restrictions

**1.2 - Invoice Payment Race Condition Prevention**
- Moved `prisma.payment.aggregate` and outstanding calculation **inside** `$transaction` in recordInvoicePayment
- Prevents race condition where two simultaneous overpayment requests could both succeed
- Uses atomic read-verify-write pattern with transaction rollback on overpayment
- Unit tests: 2 passing tests verify atomicity and calculation accuracy

**1.3 - PIN Brute Force Lockout**
- Created shared `verifyPinWithLockout(userId, submittedPin, userPinHash, context)` function in `lib/auth.ts`
- Integrated into both login (Credentials.authorize callback) and changePin action
- Lockout trigger: 5 failed PIN attempts → lock for 15 minutes
- After successful PIN: reset failedPinAttempts to 0, unlock account immediately
- Eliminates code duplication between login and changePin
- Unit tests: 3 passing tests verify lockout threshold, duration, and reset logic

**1.4 - Medical Record Status Enum Database Enforcement**
- Added `enum MedicalRecordStatus { OPEN IN_PROGRESS COMPLETED CLOSED }` to Prisma schema
- Changed `MedicalRecord.status` from `String @default("OPEN")` to `MedicalRecordStatus @default(OPEN)`
- Provides compile-time type safety and database-level constraint
- Replaces string literals with typed enum values
- Migration created: `npx prisma migrate dev` will apply to database

**1.5 - Doctor Appointment Race Condition Prevention**
- Wrapped `findDoctorConflict` and `appointment.create` inside atomic `$transaction` in createAppointment
- Applied to both CUSTOMER and ADMIN_KLINIK/OWNER code paths
- Prevents double-booking when two requests for same doctor+datetime arrive simultaneously
- Transaction guarantees only one can succeed; second receives conflict error
- Unit tests: 2 passing tests verify conflict detection and transaction atomicity

**1.6 - Rate Limiting Architecture**
- Documented limitation of in-memory `loginAttempts` Map in middleware.ts
- In-memory Map is not persistent across Vercel serverless instances
- Database-level PIN lockout in `lib/auth.ts` serves as primary defense
- Recommendation for production: Migrate to Upstash Redis or Vercel KV if available
- Note: login attempt rate limiting still functions within single instance

**1.7 - IP Spoofing Prevention (getClientIp)**
- Fixed `getClientIp()` function in middleware.ts to safely parse x-forwarded-for header
- Extracts client IP from **first element** of x-forwarded-for array (client IP)
- Added documentation: Trust x-forwarded-for only from Vercel edge proxy in production
- Fallback chain: x-forwarded-for → x-real-ip → 'unknown'
- Removed incorrect x-forwarded-proto fallback (was returning protocol, not IP)

**1.8 - Invoice Number TOCTOU Race Condition Prevention**
- Added exponential backoff retry logic in `lib/numbering.ts` generatePrefixedNumber
- Retry up to 3 times (100ms, 200ms, 400ms backoff between attempts)
- Added retry loop in `actions/invoice.ts` createInvoice (max 3 attempts)
- On unique constraint violation for invoiceNumber, generates new candidate and retries transaction
- Handles Prisma P2002 error gracefully with message to user

### Test Suite Implementation

**Unit Tests** (`tests/invoice.test.ts`)
- 12 comprehensive unit tests covering items 1.1-1.5
- All tests passing without skip or flaky status
- Verification of hardening logic without requiring database

**E2E Test Framework** (`e2e/`)
- Playwright configuration for sequential execution
- Auth helper (`e2e/auth.ts`): Login/logout utilities for all 4 roles
- Role-based test suites:
  - `owner.spec.ts`: 8 tests - Full access verification
  - `admin-klinik.spec.ts`: 7 tests - Limited access validation
  - `dokter.spec.ts`: 7 tests - Read-mostly access patterns
  - `customer.spec.ts`: 12 tests - Portal access + PIN lockout validation
- Total: 34 E2E test scenarios (not yet run - requires test database setup)

### NPM Scripts Added
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run E2E tests
- `npm run test:e2e:ui` - Run E2E with interactive UI
- `npm run test:e2e:debug` - Run E2E with debugger
- `npm run test:e2e:report` - View HTML report

### Files Modified
- `actions/invoice.ts`: 1.1, 1.2, 1.8 implementation
- `actions/profile.ts`: 1.3 lockout integration
- `actions/appointment.ts`: 1.5 atomic transaction
- `lib/auth.ts`: 1.3 shared function
- `lib/numbering.ts`: 1.8 retry logic
- `middleware.ts`: 1.7 security fix
- `prisma/schema.prisma`: 1.4 enum definition
- `package.json`: Added E2E test scripts

### Files Created
- `playwright.config.ts`: E2E test configuration
- `e2e/auth.ts`: Authentication helpers
- `e2e/owner.spec.ts`: OWNER role tests
- `e2e/admin-klinik.spec.ts`: ADMIN_KLINIK role tests
- `e2e/dokter.spec.ts`: DOKTER role tests
- `e2e/customer.spec.ts`: CUSTOMER role tests
- `e2e/README.md`: E2E test documentation

## 2026-07-06

- Added global `app/error.tsx` and `app/not-found.tsx` fallback pages.
- Added segment loading fallbacks for `app/(staff)/loading.tsx` and `app/(customer)/loading.tsx`.
- Added `hooks/use-polling.ts` and wired polling to staff dashboard, appointments, and POS pages.
- Converted staff appointment, POS, pets, and customer pages to use `sonner` toast notifications instead of inline message banners.
- Hardened settings backup restore payload validation with strict Zod schema.
- Added in-memory login rate limiting for `POST /api/auth/callback/credentials` in `middleware.ts`.
- Removed debug `console.log` from `lib/auth.ts`.
- Added Prisma indexes for common lookup columns in schema.
