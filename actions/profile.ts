'use server';

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  address: z.string().trim().max(200).optional().or(z.literal('')),
  email: z.string().trim().email().max(100).optional().or(z.literal('')),
  emergencyContact: z.string().trim().max(100).optional().or(z.literal('')),
  photo: z.string().trim().max(500).optional().or(z.literal('')),
});

const pinSchema = z.string().trim().regex(/^\d{6}$/, 'PIN harus 6 digit.');

const changePinSchema = z.object({
  currentPin: pinSchema,
  newPin: pinSchema,
});

export async function getProfileData() {
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false, message: 'Tidak terautentikasi.', data: null };
  }

  const [user, customer] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, username: true, name: true, phone: true, role: true },
    }),
    prisma.customer.findFirst({
      where: { userId: session.user.id },
      select: { id: true, name: true, phone: true, email: true, address: true, emergencyContact: true, photo: true },
    }),
  ]);

  if (!user) {
    return { success: false, message: 'Data pengguna tidak ditemukan.', data: null };
  }

  return { success: true, message: 'Profil berhasil dimuat.', data: { user, customer } };
}

export async function updateProfile(input: z.infer<typeof profileSchema>) {
  const session = await auth();
  const parsed = profileSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data profil tidak valid.', data: null };
  }

  if (!session?.user?.id) {
    return { success: false, message: 'Tidak terautentikasi.', data: null };
  }

  const actorRole = session.user.role as string | undefined;

  const result = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone || null,
      },
    });

    const existingCustomer = await tx.customer.findFirst({ where: { userId: session.user.id } });

    let customer = existingCustomer;
    if (existingCustomer) {
      customer = await tx.customer.update({
        where: { id: existingCustomer.id },
        data: {
          name: parsed.data.name,
          phone: parsed.data.phone || null,
          email: parsed.data.email || null,
          address: parsed.data.address || null,
          emergencyContact: parsed.data.emergencyContact || null,
          photo: parsed.data.photo || null,
        },
      });
    } else if (actorRole === 'CUSTOMER') {
      customer = await tx.customer.create({
        data: {
          userId: session.user.id,
          name: parsed.data.name,
          phone: parsed.data.phone || null,
          email: parsed.data.email || null,
          address: parsed.data.address || null,
          emergencyContact: parsed.data.emergencyContact || null,
          photo: parsed.data.photo || null,
        },
      });
    }

    return { user: updatedUser, customer };
  });

  return { success: true, message: 'Profil berhasil disimpan.', data: result };
}

export async function changePin(input: z.infer<typeof changePinSchema>) {
  const session = await auth();
  const parsed = changePinSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data PIN tidak valid.', data: null };
  }

  if (!session?.user?.id) {
    return { success: false, message: 'Tidak terautentikasi.', data: null };
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return { success: false, message: 'Pengguna tidak ditemukan.', data: null };
  }

  if (parsed.data.currentPin === parsed.data.newPin) {
    return { success: false, message: 'PIN baru tidak boleh sama dengan PIN lama.', data: null };
  }

  const isValid = await bcrypt.compare(parsed.data.currentPin, user.pinHash);
  if (!isValid) {
    return { success: false, message: 'PIN saat ini tidak sesuai.', data: null };
  }

  const newPinHash = await bcrypt.hash(parsed.data.newPin, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      pinHash: newPinHash,
      mustChangePin: false,
      failedPinAttempts: 0,
      isLocked: false,
      lockedUntil: null,
    },
  });

  return { success: true, message: 'PIN berhasil diperbarui.', data: null };
}
