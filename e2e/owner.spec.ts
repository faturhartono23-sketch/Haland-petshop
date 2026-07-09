import { test, expect } from '@playwright/test';
import { login, logout, ensureLoggedOut, testUsers } from './auth';

test.describe('OWNER - Full Access Tests', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page);
  });

  test.afterEach(async ({ page }) => {
    await ensureLoggedOut(page);
  });

  test('OWNER can login successfully', async ({ page }) => {
    await login(page, 'OWNER');
    
    // Verify on dashboard
    expect(page.url()).toContain('/dashboard');
    
    // Verify dashboard elements are visible
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();
  });

  test('OWNER can access settings', async ({ page }) => {
    await login(page, 'OWNER');
    
    // Navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // Verify on settings page
    expect(page.url()).toContain('/settings');
  });

  test('OWNER can manage users', async ({ page }) => {
    await login(page, 'OWNER');
    
    // Navigate to users management
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    
    // Verify on users page
    expect(page.url()).toContain('/users');
    
    // Verify create user button exists
    const createButton = page.locator('button').filter({ hasText: /create|tambah|add/i }).first();
    await expect(createButton).toBeVisible();
  });

  test('OWNER can view invoices', async ({ page }) => {
    await login(page, 'OWNER');
    
    // Navigate to billing/invoices
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');
    
    // Verify on billing page
    expect(page.url()).toContain('/billing');
  });

  test('OWNER can view appointments', async ({ page }) => {
    await login(page, 'OWNER');
    
    // Navigate to appointments
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');
    
    // Verify on appointments page
    expect(page.url()).toContain('/appointments');
  });

  test('OWNER can view customers', async ({ page }) => {
    await login(page, 'OWNER');
    
    // Navigate to customers
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    
    // Verify on customers page
    expect(page.url()).toContain('/customers');
  });

  test('OWNER can change PIN', async ({ page }) => {
    await login(page, 'OWNER');
    
    // Navigate to profile/change PIN
    await page.goto('/change-pin');
    await page.waitForLoadState('networkidle');
    
    // Verify on change PIN page
    expect(page.url()).toContain('/change-pin');
  });

  test('OWNER can logout', async ({ page }) => {
    await login(page, 'OWNER');
    
    // Logout
    await logout(page);
    
    // Verify on login page
    expect(page.url()).toContain('/login');
  });
});
