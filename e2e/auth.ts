import { Page } from '@playwright/test';

export type UserRole = 'OWNER' | 'ADMIN_KLINIK' | 'DOKTER' | 'CUSTOMER';

export interface TestUser {
  pin: string;
  phone?: string;
  name: string;
}

// Test users - sesuaikan dengan data di test database
export const testUsers: Record<UserRole, TestUser> = {
  OWNER: {
    pin: '111111',
    phone: '08123456789',
    name: 'Owner Test',
  },
  ADMIN_KLINIK: {
    pin: '222222',
    phone: '08234567890',
    name: 'Admin Klinik Test',
  },
  DOKTER: {
    pin: '333333',
    phone: '08345678901',
    name: 'Dokter Test',
  },
  CUSTOMER: {
    pin: '444444',
    phone: '08456789012',
    name: 'Customer Test',
  },
};

export async function login(page: Page, role: UserRole): Promise<void> {
  const user = testUsers[role];

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const usernameInput = page.locator('input[autocomplete="username"]').first();
  if (await usernameInput.isVisible().catch(() => false)) {
    await usernameInput.fill(user.name.toLowerCase().includes('owner') ? 'owner' : role === 'ADMIN_KLINIK' ? 'admin' : role === 'DOKTER' ? 'dr_budi' : 'customer');
  }

  const pinInputs = page.locator('input[inputmode="numeric"]');
  const pinString = user.pin;
  for (let i = 0; i < pinString.length; i++) {
    await pinInputs.nth(i).fill(pinString[i]);
  }

  const loginButton = page.locator('button').filter({ hasText: /login|masuk/i }).first();
  await loginButton.click();

  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);

  if (role === 'CUSTOMER') {
    await page.waitForURL(/\/portal(\/|$)/, { timeout: 10000 });
  } else {
    await page.waitForURL(/\/dashboard(\/|$)/, { timeout: 10000 });
  }
}

export async function logout(page: Page): Promise<void> {
  const logoutButton = page.locator('button[aria-label="Keluar dari sistem"], button:has-text("Keluar")').first();
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL(/\/login(\/|$)/, { timeout: 5000 });
    return;
  }

  await page.goto('/login');
  await page.waitForLoadState('networkidle');
}

export async function ensureLoggedOut(page: Page): Promise<void> {
  if (page.url().includes('/login')) {
    return;
  }

  try {
    await logout(page);
  } catch {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  }
}
