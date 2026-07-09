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
  
  // Navigate to login
  await page.goto('/login');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  
  // Fill phone number
  const phoneInput = page.locator('input[type="text"]').first();
  await phoneInput.fill(user.phone || '');
  
  // Fill PIN
  const pinInputs = page.locator('input[inputmode="numeric"]');
  const pinString = user.pin;
  for (let i = 0; i < pinString.length; i++) {
    await pinInputs.nth(i).fill(pinString[i]);
  }
  
  // Click login button
  const loginButton = page.locator('button').filter({ hasText: /login|masuk/i }).first();
  await loginButton.click();
  
  // Wait for redirect to dashboard/portal
  if (role === 'CUSTOMER') {
    await page.waitForURL('/portal/**', { timeout: 10000 });
  } else {
    await page.waitForURL('/dashboard', { timeout: 10000 });
  }
}

export async function logout(page: Page): Promise<void> {
  // Click on profile/menu
  const menuButton = page.locator('[aria-label*="Profile"], [aria-label*="profile"], button:has-text("Profile")').first();
  if (await menuButton.isVisible()) {
    await menuButton.click();
  }
  
  // Click logout
  const logoutButton = page.locator('button').filter({ hasText: /logout|keluar/i }).first();
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  }
  
  // Wait for redirect to login
  await page.waitForURL('/login', { timeout: 5000 });
}

export async function ensureLoggedOut(page: Page): Promise<void> {
  // Check if already at login page
  if (page.url().includes('/login')) {
    return;
  }
  
  try {
    await logout(page);
  } catch (error) {
    // Already logged out, navigate to login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  }
}
