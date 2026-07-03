'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const medicalRecordSchema = z.object({
  appointmentId: z.string().min(1),
  diagnosis: z.string().trim().max(400).optional().or(z.literal('')),
  treatment: z.string().trim().max(400).optional().or(z.literal('')),
  prescription: z.string().trim().max(400).optional().or(z.literal('')),
  labResult: z.string().trim().max(400).optional().or(z.literal('')),
  photos: z.string().trim().max(400).optional().or(z.literal('')),
  date: z.string().optional().or(z.literal('')),
});

const updateMedicalRecordSchema = medicalRecordSchema.extend({
  id: z.string().min(1),
});

function getActorRole(session: Awaited<ReturnType<typeof auth>>) {
  return (session?.user as { role?: string } | undefined)?.role;
}

function getActorId(session: Awaited<ReturnType<typeof auth>>) {
  return session?.user?.id;
}

async function getCustomerForSession(sessionId: string) {
  return prisma.customer.findFirst({ where: { userId: sessionId } });
}

export async function getMedicalRecordAccess() {
  const session = await auth();
  const role = getActorRole(session);

  if (!session?.user?.id) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  return {
    success: true,
    role,
    canManage: role === 'DOKTER',
    canRead: true,
  };
}

export async function listMedicalRecordOptions() {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);

  if (!actorId) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  const appointments = await prisma.appointment.findMany({
    orderBy: { date: 'asc' },
    include: {
      pet: { select: { id: true, name: true, species: true } },
      customer: { select: { id: true, name: true } },
      doctor: { select: { id: true, name: true } },
    },
    where: actorRole === 'DOKTER' ? { doctorId: actorId } : undefined,
  });

  return { success: true, appointments };
}

export async function listMedicalRecords() {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);

  if (!actorId) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  if (actorRole === 'CUSTOMER') {
    const customer = await getCustomerForSession(actorId);
    if (!customer) {
      return { success: true, records: [] };
    }

    const records = await prisma.medicalRecord.findMany({
      where: { pet: { customerId: customer.id } },
      orderBy: { date: 'desc' },
      include: { appointment: { select: { id: true, date: true, status: true } }, pet: { select: { id: true, name: true, species: true } }, doctor: { select: { id: true, name: true } } },
    });

    return { success: true, records };
  }

  const where = actorRole === 'DOKTER' ? { doctorId: actorId } : undefined;

  const records = await prisma.medicalRecord.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { appointment: { select: { id: true, date: true, status: true } }, pet: { select: { id: true, name: true, species: true } }, doctor: { select: { id: true, name: true } } },
  });

  return { success: true, records };
}

export async function createMedicalRecord(input: z.infer<typeof medicalRecordSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);
  const parsed = medicalRecordSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!actorId) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  if (actorRole !== 'DOKTER') {
    return { success: false, message: 'Hanya Dokter yang dapat membuat rekam medis.' };
  }

  const appointment = await prisma.appointment.findUnique({ where: { id: parsed.data.appointmentId } });
  if (!appointment) {
    return { success: false, message: 'Jadwal pemeriksaan tidak ditemukan.' };
  }

  if (actorRole === 'DOKTER' && appointment.doctorId !== actorId) {
    return { success: false, message: 'Anda hanya bisa membuat rekam medis untuk pasien yang Anda tangani.' };
  }

  const record = await prisma.medicalRecord.create({
    data: {
      appointmentId: parsed.data.appointmentId,
      petId: appointment.petId,
      doctorId: actorId,
      diagnosis: parsed.data.diagnosis || null,
      treatment: parsed.data.treatment || null,
      prescription: parsed.data.prescription || null,
      labResult: parsed.data.labResult || null,
      photos: parsed.data.photos || null,
      date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
    },
  });

  revalidatePath('/medical-records');
  return { success: true, record };
}

export async function updateMedicalRecord(input: z.infer<typeof updateMedicalRecordSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);
  const parsed = updateMedicalRecordSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!actorId) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  const existing = await prisma.medicalRecord.findUnique({ where: { id: parsed.data.id } });
  if (!existing) {
    return { success: false, message: 'Rekam medis tidak ditemukan.' };
  }

  if (actorRole !== 'DOKTER') {
    return { success: false, message: 'Hanya Dokter yang dapat mengubah rekam medis.' };
  }

  if (existing.doctorId !== actorId) {
    return { success: false, message: 'Anda hanya bisa mengubah rekam medis pasien yang Anda tangani.' };
  }

  const record = await prisma.medicalRecord.update({
    where: { id: parsed.data.id },
    data: {
      diagnosis: parsed.data.diagnosis || null,
      treatment: parsed.data.treatment || null,
      prescription: parsed.data.prescription || null,
      labResult: parsed.data.labResult || null,
      photos: parsed.data.photos || null,
      date: parsed.data.date ? new Date(parsed.data.date) : existing.date,
    },
  });

  revalidatePath('/medical-records');
  return { success: true, record };
}
