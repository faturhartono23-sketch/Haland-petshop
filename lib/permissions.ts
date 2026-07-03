import { redirect } from 'next/navigation';

export type Role =
  | 'OWNER'
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'ADMIN_KLINIK'
  | 'VETERINARIAN'
  | 'CASHIER'
  | 'RECEPTIONIST'
  | 'STAFF'
  | 'DOKTER'
  | 'CUSTOMER'
  | 'GUEST';

export type ModuleName =
  | 'dashboard'
  | 'customers'
  | 'pets'
  | 'appointments'
  | 'medical-records'
  | 'pet-hotel'
  | 'petshop'
  | 'pos'
  | 'billing'
  | 'reports'
  | 'users'
  | 'settings'
  | 'notifications'
  | 'customer-portal'
  | 'profile';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'cancel' | 'export' | 'print' | 'payment' | 'stock-adjustment';

export const STAFF_ROLES: Role[] = ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'ADMIN_KLINIK', 'VETERINARIAN', 'CASHIER', 'RECEPTIONIST', 'STAFF', 'DOKTER'];

const FULL_ACCESS_ROLES: Role[] = ['OWNER', 'SUPER_ADMIN'];
const ADMIN_LIKE_ROLES: Role[] = ['ADMIN', 'ADMIN_KLINIK'];
const MEDICAL_ROLES: Role[] = ['VETERINARIAN', 'DOKTER'];
const FRONT_DESK_ROLES: Role[] = ['CASHIER', 'RECEPTIONIST', 'STAFF'];
const CUSTOMER_ROLES: Role[] = ['CUSTOMER', 'GUEST'];

export function isStaffRole(role: string | undefined): role is Exclude<Role, 'CUSTOMER' | 'GUEST'> {
  return Boolean(role && STAFF_ROLES.includes(role as Role));
}

export function isCustomerRole(role: string | undefined) {
  return Boolean(role && CUSTOMER_ROLES.includes(role as Role));
}

export function getDefaultRedirectPath(role: string | undefined) {
  if (!role) {
    return '/login';
  }

  if (isCustomerRole(role)) {
    return '/portal';
  }

  if (role === 'GUEST') {
    return '/login';
  }

  return '/dashboard';
}

export function getRoleLabel(role: string | undefined) {
  switch (role) {
    case 'OWNER':
      return 'Owner';
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'ADMIN':
      return 'Admin';
    case 'ADMIN_KLINIK':
      return 'Admin Klinik';
    case 'VETERINARIAN':
      return 'Veterinarian';
    case 'CASHIER':
      return 'Cashier';
    case 'RECEPTIONIST':
      return 'Receptionist';
    case 'STAFF':
      return 'Staff';
    case 'DOKTER':
      return 'Doctor';
    case 'CUSTOMER':
      return 'Customer';
    case 'GUEST':
      return 'Guest';
    default:
      return 'Tidak diketahui';
  }
}

function isModuleAccessibleByRole(role: Role, module: ModuleName) {
  if (FULL_ACCESS_ROLES.includes(role)) {
    return true;
  }

  if (ADMIN_LIKE_ROLES.includes(role)) {
    return true;
  }

  if (MEDICAL_ROLES.includes(role)) {
    return ['dashboard', 'customers', 'pets', 'appointments', 'medical-records', 'pet-hotel', 'reports', 'profile'].includes(module);
  }

  if (FRONT_DESK_ROLES.includes(role)) {
    return ['dashboard', 'customers', 'pets', 'appointments', 'billing', 'pet-hotel', 'reports', 'profile', 'notifications'].includes(module);
  }

  if (role === 'CUSTOMER') {
    return ['profile', 'customer-portal'].includes(module);
  }

  return ['profile'].includes(module);
}

export function canAccessModule(role: Role, module: ModuleName) {
  return isModuleAccessibleByRole(role, module);
}

export function canPerformAction(role: Role, module: ModuleName, action: PermissionAction) {
  if (FULL_ACCESS_ROLES.includes(role)) {
    return true;
  }

  if (ADMIN_LIKE_ROLES.includes(role)) {
    if (module === 'users') {
      return ['create', 'read', 'update', 'delete'].includes(action);
    }

    return ['create', 'read', 'update', 'delete', 'approve', 'cancel', 'export', 'print', 'payment', 'stock-adjustment'].includes(action);
  }

  if (MEDICAL_ROLES.includes(role)) {
    if (module === 'medical-records') {
      return ['create', 'read', 'update'].includes(action);
    }

    if (module === 'appointments') {
      return ['read', 'update'].includes(action);
    }

    return action === 'read';
  }

  if (FRONT_DESK_ROLES.includes(role)) {
    if (module === 'users') {
      return action === 'read';
    }

    if (module === 'billing' || module === 'pos' || module === 'customers' || module === 'pets' || module === 'appointments' || module === 'pet-hotel') {
      return ['create', 'read', 'update', 'cancel', 'export', 'print', 'payment'].includes(action);
    }

    return action === 'read';
  }

  if (role === 'CUSTOMER') {
    return action === 'read' && ['profile', 'customer-portal'].includes(module);
  }

  return false;
}

/**
 * Server-side helper to require access to a module.
 * If user doesn't have access, redirects to /dashboard.
 */
export function requireModuleAccess(role: Role | undefined, module: ModuleName) {
  if (!role) {
    redirect('/login');
  }

  if (!canAccessModule(role as Role, module)) {
    redirect(getDefaultRedirectPath(role));
  }
}

