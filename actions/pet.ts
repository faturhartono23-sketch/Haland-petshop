'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const petSchema = z.object({
  customerId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  species: z.string().trim().min(2).max(60),
  breed: z.string().trim().max(60).optional().or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  gender: z.string().trim().max(20).optional().or(z.literal('')),
  photo: z.string().trim().max(200).optional().or(z.literal('')),
});

const updatePetSchema = petSchema.extend({
  id: z.string().min(1),
});

const deletePetSchema = z.object({
  id: z.string().min(1),
});

function getActorRole(session: Awaited<ReturnType<typeof auth>>) {
  return (session?.user as { role?: string } | undefined)?.role;
}

async function ensureAccess(actorRole: string | undefined) {
  if (!actorRole) {
    return { allowed: false, message: 'Tidak terautentikasi.' };
  }

  if (actorRole === 'OWNER' || actorRole === 'ADMIN_KLINIK') {
    return { allowed: true };
  }

  return { allowed: false, message: 'Anda tidak berwenang mengelola data hewan.' };
}

export async function listPets() {
  const session = await auth();
  const actorRole = getActorRole(session);

  if (!session?.user?.id) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  if (actorRole === 'CUSTOMER') {
    const customer = await prisma.customer.findFirst({ where: { userId: session.user.id } });
    if (!customer) return { success: true, pets: [] };

    const pets = await prisma.pet.findMany({ where: { customerId: customer.id }, orderBy: { name: 'asc' } });
    return { success: true, pets };
  }

  const pets = await prisma.pet.findMany({
    orderBy: { name: 'asc' },
    include: { customer: { select: { id: true, name: true } } },
  });

  return { success: true, pets };
}

export async function getPet(id: string) {
  const session = await auth();
  const actorRole = getActorRole(session);

  if (!session?.user?.id) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  if (actorRole === 'CUSTOMER') {
    const customer = await prisma.customer.findFirst({ where: { userId: session.user.id } });
    if (!customer) return { success: false, message: 'Data tidak ditemukan.' };

    const pet = await prisma.pet.findFirst({ where: { id, customerId: customer.id } });
    return pet ? { success: true, pet } : { success: false, message: 'Data tidak ditemukan.' };
  }

  const pet = await prisma.pet.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      weightLogs: { orderBy: { date: 'asc' } },
      vaccineRecords: { orderBy: { date: 'asc' } },
      diseaseRecords: { orderBy: { date: 'asc' } },
      allergies: { orderBy: { id: 'asc' } },
    },
  });

  return pet ? { success: true, pet } : { success: false, message: 'Data tidak ditemukan.' };
}

export async function createPet(input: z.infer<typeof petSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const parsed = petSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  const permission = await ensureAccess(actorRole);
  if (!permission.allowed) {
    return { success: false, message: permission.message };
  }

  const pet = await prisma.pet.create({
    data: {
      customerId: parsed.data.customerId,
      name: parsed.data.name,
      species: parsed.data.species,
      breed: parsed.data.breed || null,
      birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
      gender: parsed.data.gender || null,
      photo: parsed.data.photo || null,
    },
  });

  revalidatePath('/dashboard/pets');
  return { success: true, pet };
}

export async function updatePet(input: z.infer<typeof updatePetSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const parsed = updatePetSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  const permission = await ensureAccess(actorRole);
  if (!permission.allowed) {
    return { success: false, message: permission.message };
  }

  const pet = await prisma.pet.update({
    where: { id: parsed.data.id },
    data: {
      customerId: parsed.data.customerId,
      name: parsed.data.name,
      species: parsed.data.species,
      breed: parsed.data.breed || null,
      birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
      gender: parsed.data.gender || null,
      photo: parsed.data.photo || null,
    },
  });

  revalidatePath('/dashboard/pets');
  return { success: true, pet };
}

export async function deletePet(input: z.infer<typeof deletePetSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const parsed = deletePetSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  const permission = await ensureAccess(actorRole);
  if (!permission.allowed) {
    return { success: false, message: permission.message };
  }

  await prisma.pet.delete({ where: { id: parsed.data.id } });
  revalidatePath('/dashboard/pets');
  return { success: true };
}
