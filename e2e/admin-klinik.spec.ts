import { test, expect } from '@playwright/test';
import { login, logout, ensureLoggedOut } from './auth';

test.describe('ADMIN_KLINIK - Limited Access Tests', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page);
  });

  test.afterEach(async ({ page }) => {
    await ensureLoggedOut(page);
  });

  test('ADMIN_KLINIK can login successfully', async ({ page }) => {
    await login(page, 'ADMIN_KLINIK');
    
    await expect(page).toHaveURL(/\/dashboard(\/|$)/);
  });

  test('ADMIN_KLINIK can manage customers', async ({ page }) => {
    await login(page, 'ADMIN_KLINIK');
    
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/customers(\/|$)/);
  });

  test('ADMIN_KLINIK can view invoices', async ({ page }) => {
    await login(page, 'ADMIN_KLINIK');
    
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/billing(\/|$)/);
  });

  test('ADMIN_KLINIK CANNOT access settings', async ({ page }) => {
    await login(page, 'ADMIN_KLINIK');
    
    // Try to navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected or see access denied
    const isRedirected = !page.url().includes('/settings') || page.url().includes('/dashboard');
    const hasErrorMessage = await page.locator('text=/access|tidak berwenang|tidak diizinkan/i').isVisible().catch(() => false);
    
    expect(isRedirected || hasErrorMessage).toBeTruthy();
  });

  test('ADMIN_KLINIK CANNOT access user management', async ({ page }) => {
    await login(page, 'ADMIN_KLINIK');
    
    // Try to navigate to users
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected or see access denied
    const isRedirected = !page.url().includes('/users') || page.url().includes('/dashboard');
    const hasErrorMessage = await page.locator('text=/access|tidak berwenang|tidak diizinkan/i').isVisible().catch(() => false);
    
    expect(isRedirected || hasErrorMessage).toBeTruthy();
  });

  test('ADMIN_KLINIK can view appointments', async ({ page }) => {
    await login(page, 'ADMIN_KLINIK');
    
    // Navigate to appointments
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');
    
    // Verify on appointments page
    expect(page.url()).toContain('/appointments');
  });

  test('ADMIN_KLINIK can logout', async ({ page }) => {
    await login(page, 'ADMIN_KLINIK');
    
    // Logout
    await logout(page);
    
    await expect(page).toHaveURL(/\/login(\/|$)/);
  });
});
