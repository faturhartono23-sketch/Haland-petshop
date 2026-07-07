import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessModule, canPerformAction, canManageTargetRole } from '../lib/permissions';

test('OWNER can access every module and every action', () => {
  const modules = ['dashboard', 'customers', 'pets', 'appointments', 'medical-records', 'procedures', 'pet-hotel', 'petshop', 'pos', 'billing', 'reports', 'users', 'settings', 'notifications', 'customer-portal', 'profile'] as const;
  for (const moduleName of modules) {
    assert.equal(canAccessModule('OWNER', moduleName), true);
    assert.equal(canPerformAction('OWNER', moduleName, 'create'), true);
    assert.equal(canPerformAction('OWNER', moduleName, 'read'), true);
    assert.equal(canPerformAction('OWNER', moduleName, 'update'), true);
    assert.equal(canPerformAction('OWNER', moduleName, 'delete'), true);
    assert.equal(canPerformAction('OWNER', moduleName, 'approve'), true);
    assert.equal(canPerformAction('OWNER', moduleName, 'cancel'), true);
    assert.equal(canPerformAction('OWNER', moduleName, 'export'), true);
    assert.equal(canPerformAction('OWNER', moduleName, 'payment'), true);
    assert.equal(canPerformAction('OWNER', moduleName, 'stock-adjustment'), true);
  }
});

test('ADMIN_KLINIK cannot access settings but can manage users and staff workflows', () => {
  assert.equal(canAccessModule('ADMIN_KLINIK', 'settings'), false);
  assert.equal(canAccessModule('ADMIN_KLINIK', 'billing'), true);
  assert.equal(canPerformAction('ADMIN_KLINIK', 'users', 'create'), true);
  assert.equal(canPerformAction('ADMIN_KLINIK', 'users', 'delete'), true);
  assert.equal(canPerformAction('ADMIN_KLINIK', 'appointments', 'cancel'), true);
  assert.equal(canPerformAction('ADMIN_KLINIK', 'reports', 'export'), true);
  assert.equal(canPerformAction('ADMIN_KLINIK', 'petshop', 'stock-adjustment'), true);
});

test('DOKTER can only read most modules and create/update medical records', () => {
  assert.equal(canAccessModule('DOKTER', 'medical-records'), true);
  assert.equal(canPerformAction('DOKTER', 'medical-records', 'create'), true);
  assert.equal(canPerformAction('DOKTER', 'medical-records', 'update'), true);
  assert.equal(canPerformAction('DOKTER', 'medical-records', 'delete'), false);
  assert.equal(canPerformAction('DOKTER', 'appointments', 'update'), true);
  assert.equal(canPerformAction('DOKTER', 'appointments', 'create'), false);
  assert.equal(canPerformAction('DOKTER', 'pets', 'read'), true);
  assert.equal(canPerformAction('DOKTER', 'pets', 'create'), false);
});

test('CUSTOMER has minimal access and cannot manage other modules', () => {
  assert.equal(canAccessModule('CUSTOMER', 'profile'), true);
  assert.equal(canAccessModule('CUSTOMER', 'customer-portal'), true);
  assert.equal(canAccessModule('CUSTOMER', 'appointments'), false);
  assert.equal(canPerformAction('CUSTOMER', 'profile', 'read'), true);
  assert.equal(canPerformAction('CUSTOMER', 'profile', 'update'), false);
  assert.equal(canPerformAction('CUSTOMER', 'customer-portal', 'read'), true);
  assert.equal(canPerformAction('CUSTOMER', 'customer-portal', 'create'), false);
});

test('canManageTargetRole allows OWNER to manage every role', () => {
  assert.deepEqual(canManageTargetRole('OWNER', 'OWNER'), { allowed: true });
  assert.deepEqual(canManageTargetRole('OWNER', 'ADMIN_KLINIK'), { allowed: true });
  assert.deepEqual(canManageTargetRole('OWNER', 'DOKTER'), { allowed: true });
  assert.deepEqual(canManageTargetRole('OWNER', 'CUSTOMER'), { allowed: true });
});

test('canManageTargetRole allows ADMIN_KLINIK only to manage CUSTOMER', () => {
  assert.deepEqual(canManageTargetRole('ADMIN_KLINIK', 'CUSTOMER'), { allowed: true });
  assert.deepEqual(canManageTargetRole('ADMIN_KLINIK', 'DOKTER'), { allowed: false, message: 'Anda tidak berwenang mengelola akun tersebut.' });
});

test('canManageTargetRole denies DOKTER and CUSTOMER management access', () => {
  assert.deepEqual(canManageTargetRole('DOKTER', 'CUSTOMER'), { allowed: false, message: 'Anda tidak berwenang mengelola akun tersebut.' });
  assert.deepEqual(canManageTargetRole('CUSTOMER', 'CUSTOMER'), { allowed: false, message: 'Anda tidak terautentikasi.' });
});
