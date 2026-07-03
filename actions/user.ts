'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { canPerformAction, type Role } from '@/lib/permissions';

type UserRole = Role;

const userInputSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-z0-9_]+$/),
  name: z.string().trim().min(2).max(80),
  role: z.enum(['OWNER', 'SUPER_ADMIN', 'ADMIN', 'ADMIN_KLINIK', 'VETERINARIAN', 'CASHIER', 'RECEPTIONIST', 'STAFF', 'DOKTER', 'CUSTOMER', 'GUEST']),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  isActive: z.boolean().optional(),
});

const updateUserSchema = userInputSchema.extend({
  id: z.string().min(1),
});

const deleteUserSchema = z.object({
  id: z.string().min(1),
});

const activateUserSchema = z.object({
  id: z.string().min(1),
});

const resetPinSchema = z.object({
  id: z.string().min(1),
});

const unlockUserSchema = z.object({
  id: z.string().min(1),
});

function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getActorRole(session: Awaited<ReturnType<typeof auth>>) {
  return (session?.user as { role?: string } | undefined)?.role as Role | undefined;
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function canManageTarget(actorRole: Role | undefined, targetRole: UserRole) {
  if (!actorRole) {
    return { allowed: false, message: 'Tidak terautentikasi.' };
  }

  if (actorRole === 'OWNER' || actorRole === 'SUPER_ADMIN') {
    return { allowed: true };
  }

  if ((actorRole === 'ADMIN' || actorRole === 'ADMIN_KLINIK') && targetRole === 'CUSTOMER') {
    return { allowed: true };
  }

  return { allowed: false, message: 'Anda tidak berwenang mengelola akun tersebut.' };
}

export async function listUsers() {
  const session = await auth();
  const actorRole = getActorRole(session);

  if (!session?.user?.id) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  if (!actorRole || !canPerformAction(actorRole, 'users', 'read')) {
    return { success: false, message: 'Anda tidak berwenang melihat daftar pengguna.' };
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
      isLocked: true,
      mustChangePin: true,
      failedPinAttempts: true,
      createdAt: true,
      createdBy: {
        select: { username: true, name: true },
      },
    },
  });

  return { success: true, users };
}

export async function createUser(input: z.infer<typeof userInputSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const parsed = userInputSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!session?.user?.id) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  if (!actorRole || !canPerformAction(actorRole, 'users', 'create')) {
    return { success: false, message: 'Anda tidak berwenang membuat akun.' };
  }

  const permission = canManageTarget(actorRole, parsed.data.role);
  if (!permission.allowed) {
    return { success: false, message: permission.message };
  }

  const normalizedUsername = normalizeUsername(parsed.data.username);
  const existing = await prisma.user.findFirst({ where: { username: { equals: normalizedUsername, mode: 'insensitive' } } });
  if (existing) {
    return { success: false, message: 'Username sudah dipakai.' };
  }

  const temporaryPin = generatePin();
  const pinHash = await bcrypt.hash(temporaryPin, 10);
  const actorId = session.user.id;

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: normalizedUsername,
          pinHash,
          name: parsed.data.name,
          phone: parsed.data.phone || null,
          role: parsed.data.role,
          isActive: parsed.data.isActive ?? true,
          mustChangePin: true,
          createdById: actorId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          entity: 'User',
          entityId: created.id,
          description: `Membuat akun ${created.username}`,
        },
      });

      return created;
    });

    revalidatePath('/users');
    return { success: true, userId: user.id, temporaryPin };
  } catch (error) {
    console.error('Failed to create user', error);
    return { success: false, message: 'Gagal membuat akun.' };
  }
}

export async function updateUser(input: z.infer<typeof updateUserSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const parsed = updateUserSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!session?.user?.id) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  if (!actorRole || !canPerformAction(actorRole, 'users', 'update')) {
    return { success: false, message: 'Anda tidak berwenang mengubah akun.' };
  }

  const actorId = session.user.id;
  const targetUser = await prisma.user.findUnique({ where: { id: parsed.data.id } });
  if (!targetUser) {
    return { success: false, message: 'Akun tidak ditemukan.' };
  }

  const permission = canManageTarget(actorRole, targetUser.role);
  if (!permission.allowed) {
    return { success: false, message: permission.message };
  }

  if ((actorRole === 'ADMIN' || actorRole === 'ADMIN_KLINIK') && parsed.data.role !== 'CUSTOMER') {
    return { success: false, message: 'Admin hanya dapat mengubah akun Customer.' };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.user.update({
        where: { id: parsed.data.id },
        data: {
          username: normalizeUsername(parsed.data.username),
          name: parsed.data.name,
          phone: parsed.data.phone || null,
          role: parsed.data.role,
          isActive: parsed.data.isActive ?? targetUser.isActive,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE',
          entity: 'User',
          entityId: current.id,
          description: `Memperbarui akun ${current.username}`,
        },
      });

      return current;
    });

    revalidatePath('/users');
    return { success: true, userId: updated.id };
  } catch (error) {
    console.error('Failed to update user', error);
    return { success: false, message: 'Gagal memperbarui akun.' };
  }
}

export async function deleteUser(input: z.infer<typeof deleteUserSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const parsed = deleteUserSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!session?.user?.id) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  if (!actorRole || !canPerformAction(actorRole, 'users', 'delete')) {
    return { success: false, message: 'Anda tidak berwenang menonaktifkan akun.' };
  }

  const actorId = session.user.id;
  const targetUser = await prisma.user.findUnique({ where: { id: parsed.data.id } });
  if (!targetUser) {
    return { success: false, message: 'Akun tidak ditemukan.' };
  }

  if (targetUser.id === actorId) {
    return { success: false, message: 'Tidak dapat menonaktifkan akun sendiri.' };
  }

  const permission = canManageTarget(actorRole, targetUser.role);
  if (!permission.allowed) {
    return { success: false, message: permission.message };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.user.update({
        where: { id: parsed.data.id },
        data: {
          isActive: false,
          isLocked: false,
          lockedUntil: null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'DELETE',
          entity: 'User',
          entityId: current.id,
          description: `Menonaktifkan akun ${current.username}`,
        },
      });

      return current;
    });

    revalidatePath('/users');
    return { success: true, userId: updated.id };
  } catch (error) {
    console.error('Failed to deactivate user', error);
    return { success: false, message: 'Gagal menonaktifkan akun.' };
  }
}

export async function activateUser(input: z.infer<typeof activateUserSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const parsed = activateUserSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!session?.user?.id) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  if (!actorRole || !canPerformAction(actorRole, 'users', 'update')) {
    return { success: false, message: 'Anda tidak berwenang mengaktifkan akun.' };
  }

  const actorId = session.user.id;
  const targetUser = await prisma.user.findUnique({ where: { id: parsed.data.id } });
  if (!targetUser) {
    return { success: false, message: 'Akun tidak ditemukan.' };
  }

  const permission = canManageTarget(actorRole, targetUser.role);
  if (!permission.allowed) {
    return { success: false, message: permission.message };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.user.update({
        where: { id: parsed.data.id },
        data: {
          isActive: true,
          isLocked: false,
          lockedUntil: null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE',
          entity: 'User',
          entityId: current.id,
          description: `Mengaktifkan akun ${current.username}`,
        },
      });

      return current;
    });

    revalidatePath('/users');
    return { success: true, userId: updated.id };
  } catch (error) {
    console.error('Failed to activate user', error);
    return { success: false, message: 'Gagal mengaktifkan akun.' };
  }
}

export async function resetPin(input: z.infer<typeof resetPinSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const parsed = resetPinSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!session?.user?.id) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  if (!actorRole || !canPerformAction(actorRole, 'users', 'update')) {
    return { success: false, message: 'Anda tidak berwenang mereset PIN.' };
  }

  const actorId = session.user.id;
  const targetUser = await prisma.user.findUnique({ where: { id: parsed.data.id } });
  if (!targetUser) {
    return { success: false, message: 'Akun tidak ditemukan.' };
  }

  const permission = canManageTarget(actorRole, targetUser.role);
  if (!permission.allowed) {
    return { success: false, message: permission.message };
  }

  const temporaryPin = generatePin();
  const pinHash = await bcrypt.hash(temporaryPin, 10);

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.user.update({
        where: { id: parsed.data.id },
        data: {
          pinHash,
          mustChangePin: true,
          failedPinAttempts: 0,
          isLocked: false,
          lockedUntil: null,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE',
          entity: 'User',
          entityId: current.id,
          description: `Mereset PIN akun ${current.username}`,
        },
      });

      return current;
    });

    revalidatePath('/users');
    return { success: true, userId: updated.id, temporaryPin };
  } catch (error) {
    console.error('Failed to reset PIN', error);
    return { success: false, message: 'Gagal mereset PIN.' };
  }
}

export async function unlockUser(input: z.infer<typeof unlockUserSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const parsed = unlockUserSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!session?.user?.id) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  if (!actorRole || !canPerformAction(actorRole, 'users', 'update')) {
    return { success: false, message: 'Anda tidak berwenang membuka kunci akun.' };
  }

  const actorId = session.user.id;
  const targetUser = await prisma.user.findUnique({ where: { id: parsed.data.id } });
  if (!targetUser) {
    return { success: false, message: 'Akun tidak ditemukan.' };
  }

  const permission = canManageTarget(actorRole, targetUser.role);
  if (!permission.allowed) {
    return { success: false, message: permission.message };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.user.update({
        where: { id: parsed.data.id },
        data: {
          isLocked: false,
          lockedUntil: null,
          failedPinAttempts: 0,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'UPDATE',
          entity: 'User',
          entityId: current.id,
          description: `Membuka kunci akun ${current.username}`,
        },
      });

      return current;
    });

    revalidatePath('/users');
    return { success: true, userId: updated.id };
  } catch (error) {
    console.error('Failed to unlock user', error);
    return { success: false, message: 'Gagal membuka kunci akun.' };
  }
}
