'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { canAccessModule, canPerformAction, isCustomerRole, isStaffRole, type ModuleName, type PermissionAction, type Role } from '@/lib/permissions';

export function usePermissions() {
  const { data: session, status } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role as Role | undefined;

  return useMemo(() => ({
    role,
    isLoading: status === 'loading',
    isAuthenticated: Boolean(session?.user?.id),
    isStaff: isStaffRole(role),
    isOwner: role === 'OWNER',
    isAdmin: role === 'ADMIN_KLINIK',
    isDoctor: role === 'DOKTER',
    isCustomer: isCustomerRole(role),
    canAccess: (module: ModuleName) => canAccessModule(role, module),
    canPerform: (module: ModuleName, action: PermissionAction) => canPerformAction(role, module, action),
  }), [role, session?.user?.id, status]);
}
