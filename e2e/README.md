# E2E Test Suite Documentation

## Overview

This directory contains end-to-end (E2E) tests for HaLand PetCare application using Playwright. Tests cover all 4 user roles (OWNER, ADMIN_KLINIK, DOKTER, CUSTOMER) with comprehensive coverage of role-based access control and core workflows.

## Test Structure

### Auth Helper (`auth.ts`)
- `login(page, role)` - Login as specific role
- `logout(page)` - Logout from application
- `ensureLoggedOut(page)` - Ensure user is logged out before test
- `testUsers` - Test credentials for each role

### Test Suites

#### `owner.spec.ts` (8 tests)
Full access verification for OWNER role:
- Login/logout
- Settings access
- User management
- Invoice management
- Appointments, customers, PIN change

#### `admin-klinik.spec.ts` (7 tests)
Limited access for ADMIN_KLINIK role:
- Customer management
- Invoice management
- Appointments
- Access denied to: Settings, User management

#### `dokter.spec.ts` (7 tests)
Read-mostly access for DOKTER role:
- View appointments
- Medical records
- Customers and pets
- Access denied to: Billing, Settings, User management

#### `customer.spec.ts` (12 tests)
Portal-only access for CUSTOMER:
- View own appointments, invoices, pets
- Pet hotel bookings
- Profile and PIN change
- PIN lockout test (5 failed attempts)
- Access denied to staff areas

## Prerequisites

1. **Test Database**: Must have test data seeded with all 4 roles
2. **Dev Server**: Running on `http://localhost:3000`
3. **Test Users**: Created in database with credentials in `auth.ts`

### Seeding Test Data

```bash
# Reset database and seed with test users
npm run db:reset
npm run prisma:seed

# Or manually create test users via API/UI
```

**Required Test Users**:
- OWNER: PIN 111111, Phone 08123456789
- ADMIN_KLINIK: PIN 222222, Phone 08234567890
- DOKTER: PIN 333333, Phone 08345678901
- CUSTOMER: PIN 444444, Phone 08456789012

## Running Tests

### All Tests
```bash
npm run test:e2e
```

### UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### View Report
```bash
npm run test:e2e:report
```

### Specific Test File
```bash
npx playwright test e2e/owner.spec.ts
```

### Specific Test
```bash
npx playwright test -g "OWNER can login successfully"
```

## Configuration

- **Base URL**: `http://localhost:3000` (set via `PLAYWRIGHT_TEST_BASE_URL`)
- **Workers**: 1 (sequential execution to maintain consistent test state)
- **Retries**: 0 local, 2 on CI
- **Reports**: HTML report in `playwright-report/`
- **Screenshots**: On failure only
- **Traces**: On first retry

## Test Maintenance

### Adding New Tests
1. Create new spec file in `e2e/` directory
2. Import `login`, `logout`, `ensureLoggedOut` from `auth.ts`
3. Use role-based login: `await login(page, 'OWNER')`
4. Clean up after test with `ensureLoggedOut`

### Common Selectors
```typescript
// Input fields
page.locator('input[type="text"]')
page.locator('input[inputmode="numeric"]')

// Buttons
page.locator('button').filter({ hasText: /login|masuk/i })

// Navigation
await page.goto('/dashboard')
```

### Handling Async Navigation
```typescript
// Wait for navigation after action
await loginButton.click();
await page.waitForURL('/dashboard', { timeout: 10000 });
```

## Troubleshooting

### Login Fails
1. Verify test database has correct user data
2. Check `testUsers` object in `auth.ts` matches database
3. Verify PIN format (6 digits as string)

### Page Not Found
1. Check URL routing in middleware.ts
2. Verify role-based access control in layout files
3. Check if redirect is happening properly

### Timeout Errors
1. Increase timeout: `await page.waitForLoadState('networkidle', { timeout: 15000 })`
2. Check if page is using infinite loops or hanging requests
3. Verify dev server is running and healthy

## CI/CD Integration

For GitHub Actions / Vercel:

```yaml
- name: Run E2E tests
  run: npm run test:e2e
  env:
    PLAYWRIGHT_TEST_BASE_URL: http://localhost:3000
```

## Known Limitations

1. Tests require live dev server running
2. Tests use in-memory test data (no database transactions between tests)
3. Email notifications not tested (mocked/skipped in tests)
4. File uploads may need mocking

## Best Practices

✅ DO:
- Use `ensureLoggedOut` before each test
- Wait for page load: `await page.waitForLoadState('networkidle')`
- Use role-based login helpers
- Group related tests with `test.describe()`

❌ DON'T:
- Rely on global state between tests
- Use hardcoded IDs/usernames
- Skip error checking in login
- Mix multiple user contexts in one test

## Related Documentation

- [Hardening Implementation](../CHANGES.md) - Security fixes and implementation details
- [Playwright Docs](https://playwright.dev) - Official Playwright documentation
- [Unit Tests](../tests/) - Unit test suite for hardening items
