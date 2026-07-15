import { test, expect } from '@playwright/test';
import { login, logout, ensureLoggedOut } from './auth';

test.describe('CUSTOMER - Portal Access Tests', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page);
  });

  test.afterEach(async ({ page }) => {
    await ensureLoggedOut(page);
  });

  test('CUSTOMER can login successfully', async ({ page }) => {
    await login(page, 'CUSTOMER');
    
    await expect(page).toHaveURL(/\/portal(\/|$)/);
  });

  test('CUSTOMER can view own appointments', async ({ page }) => {
    await login(page, 'CUSTOMER');
    
    await page.goto('/portal/appointments');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/portal\/appointments(\/|$)/);
  });

  test('CUSTOMER can view own invoices', async ({ page }) => {
    await login(page, 'CUSTOMER');
    
    await page.goto('/portal/invoices');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/portal\/invoices(\/|$)/);
  });

  test('CUSTOMER can view own pets', async ({ page }) => {
    await login(page, 'CUSTOMER');
    
    await page.goto('/portal/pets');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/portal\/pets(\/|$)/);
  });

  test('CUSTOMER can view pet hotel bookings', async ({ page }) => {
    await login(page, 'CUSTOMER');
    
    await page.goto('/portal/pet-hotel');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/portal\/pet-hotel(\/|$)/);
  });

  test('CUSTOMER can view profile', async ({ page }) => {
    await login(page, 'CUSTOMER');
    
    await page.goto('/portal/profile');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/portal\/profile(\/|$)/);
  });

  test('CUSTOMER can change PIN', async ({ page }) => {
    await login(page, 'CUSTOMER');
    
    // Navigate to change PIN
    await page.goto('/change-pin');
    await page.waitForLoadState('networkidle');
    
    // Verify on change PIN page
    expect(page.url()).toContain('/change-pin');
  });

  test('CUSTOMER CANNOT access staff dashboard', async ({ page }) => {
    await login(page, 'CUSTOMER');
    
    // Try to navigate to staff dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected to portal
    const isRedirected = page.url().includes('/portal') || !page.url().includes('/dashboard');
    
    expect(isRedirected).toBeTruthy();
  });

  test('CUSTOMER CANNOT access customers management', async ({ page }) => {
    await login(page, 'CUSTOMER');
    
    // Try to navigate to customers
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected or see access denied
    const isRedirected = page.url().includes('/portal') || !page.url().includes('/customers');
    
    expect(isRedirected).toBeTruthy();
  });

  test('CUSTOMER CANNOT access user management', async ({ page }) => {
    await login(page, 'CUSTOMER');
    
    // Try to navigate to users
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected or see access denied
    const isRedirected = page.url().includes('/portal') || !page.url().includes('/users');
    
    expect(isRedirected).toBeTruthy();
  });

  test('CUSTOMER can logout', async ({ page }) => {
    await login(page, 'CUSTOMER');
    
    // Logout
    await logout(page);
    
    await expect(page).toHaveURL(/\/login(\/|$)/);
  });

  test('CUSTOMER PIN lockout after 5 failed attempts', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    
    // Try to login with wrong PIN 5 times
    for (let attempt = 0; attempt < 5; attempt++) {
      // Fill phone number
      const phoneInput = page.locator('input[type="text"]').first();
      await phoneInput.fill('08456789012');
      
      // Fill wrong PIN
      const pinInputs = page.locator('input[inputmode="numeric"]');
      for (let i = 0; i < 6; i++) {
        await pinInputs.nth(i).fill('0');
      }
      
      // Click login button
      const loginButton = page.locator('button').filter({ hasText: /login|masuk/i }).first();
      await loginButton.click();
      
      // Wait a bit before next attempt
      await page.waitForTimeout(1000);
    }
    
    // After 5 failed attempts, should be locked
    // Try one more time with correct PIN
    const phoneInput = page.locator('input[type="text"]').first();
    await phoneInput.fill('08456789012');
    
    const pinInputs = page.locator('input[inputmode="numeric"]');
    const correctPin = '444444';
    for (let i = 0; i < correctPin.length; i++) {
      await pinInputs.nth(i).fill(correctPin[i]);
    }
    
    const loginButton = page.locator('button').filter({ hasText: /login|masuk/i }).first();
    await loginButton.click();
    
    // Should see error message about being locked
    const errorVisible = await page.locator('text=/locked|terkunci|terlalu banyak percobaan/i').isVisible().catch(() => false);
    const stillOnLogin = page.url().includes('/login');
    
    expect(errorVisible || stillOnLogin).toBeTruthy();
  });
});
