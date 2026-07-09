import { test, expect } from '@playwright/test';
import { login, logout, ensureLoggedOut } from './auth';

test.describe('DOKTER - Read-Mostly Access Tests', () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedOut(page);
  });

  test.afterEach(async ({ page }) => {
    await ensureLoggedOut(page);
  });

  test('DOKTER can login successfully', async ({ page }) => {
    await login(page, 'DOKTER');
    
    // Verify on dashboard
    expect(page.url()).toContain('/dashboard');
  });

  test('DOKTER can view appointments', async ({ page }) => {
    await login(page, 'DOKTER');
    
    // Navigate to appointments
    await page.goto('/appointments');
    await page.waitForLoadState('networkidle');
    
    // Verify on appointments page
    expect(page.url()).toContain('/appointments');
  });

  test('DOKTER can view medical records', async ({ page }) => {
    await login(page, 'DOKTER');
    
    // Navigate to medical records
    await page.goto('/medical-records');
    await page.waitForLoadState('networkidle');
    
    // Verify on medical records page
    expect(page.url()).toContain('/medical-records');
  });

  test('DOKTER can view customers', async ({ page }) => {
    await login(page, 'DOKTER');
    
    // Navigate to customers
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    
    // Verify on customers page
    expect(page.url()).toContain('/customers');
  });

  test('DOKTER can view pets', async ({ page }) => {
    await login(page, 'DOKTER');
    
    // Navigate to pets
    await page.goto('/pets');
    await page.waitForLoadState('networkidle');
    
    // Verify on pets page
    expect(page.url()).toContain('/pets');
  });

  test('DOKTER CANNOT access billing', async ({ page }) => {
    await login(page, 'DOKTER');
    
    // Try to navigate to billing
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected or see access denied
    const isRedirected = !page.url().includes('/billing') || page.url().includes('/dashboard');
    const hasErrorMessage = await page.locator('text=/access|tidak berwenang|tidak diizinkan/i').isVisible().catch(() => false);
    
    expect(isRedirected || hasErrorMessage).toBeTruthy();
  });

  test('DOKTER CANNOT access settings', async ({ page }) => {
    await login(page, 'DOKTER');
    
    // Try to navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected or see access denied
    const isRedirected = !page.url().includes('/settings') || page.url().includes('/dashboard');
    const hasErrorMessage = await page.locator('text=/access|tidak berwenang|tidak diizinkan/i').isVisible().catch(() => false);
    
    expect(isRedirected || hasErrorMessage).toBeTruthy();
  });

  test('DOKTER CANNOT access user management', async ({ page }) => {
    await login(page, 'DOKTER');
    
    // Try to navigate to users
    await page.goto('/users');
    await page.waitForLoadState('networkidle');
    
    // Should be redirected or see access denied
    const isRedirected = !page.url().includes('/users') || page.url().includes('/dashboard');
    const hasErrorMessage = await page.locator('text=/access|tidak berwenang|tidak diizinkan/i').isVisible().catch(() => false);
    
    expect(isRedirected || hasErrorMessage).toBeTruthy();
  });

  test('DOKTER can logout', async ({ page }) => {
    await login(page, 'DOKTER');
    
    // Logout
    await logout(page);
    
    // Verify on login page
    expect(page.url()).toContain('/login');
  });
});
