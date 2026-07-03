'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const invoiceItemSchema = z.object({
  type: z.enum(['KONSULTASI', 'TINDAKAN', 'OBAT', 'PET_HOTEL', 'PRODUK']),
  description: z.string().min(1),
  qty: z.coerce.number().int().min(1),
  price: z.coerce.number().min(0),
});

const createInvoiceSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(invoiceItemSchema).min(1),
  discountAmount: z.coerce.number().min(0).optional(),
  initialPaymentAmount: z.coerce.number().min(0).optional(),
  initialPaymentMethod: z.enum(['CASH', 'NON_CASH']).optional(),
});

const invoiceIdSchema = z.object({ id: z.string().min(1) });

const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  method: z.enum(['CASH', 'NON_CASH']),
  amount: z.coerce.number().min(0),
});

const cancelInvoiceSchema = z.object({ id: z.string().min(1) });

function getActorRole(session: Awaited<ReturnType<typeof auth>>) {
  return (session?.user as { role?: string } | undefined)?.role;
}

function getActorId(session: Awaited<ReturnType<typeof auth>>) {
  return session?.user?.id;
}

function isStaff(role?: string) {
  return role === 'OWNER' || role === 'ADMIN_KLINIK';
}

export async function getInvoiceLookups() {
  const session = await auth();
  const actorRole = getActorRole(session);

  if (!isStaff(actorRole)) {
    return { success: false, message: 'Anda tidak berwenang mengakses data ini.' };
  }

  const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
  return { success: true, customers };
}

export async function listInvoices() {
  const session = await auth();
  const actorRole = getActorRole(session);

  if (!isStaff(actorRole)) {
    return { success: false, message: 'Anda tidak berwenang melihat invoice.' };
  }

  const invoices = await prisma.invoice.findMany({
    orderBy: { date: 'desc' },
    include: {
      customer: { select: { id: true, name: true } },
      items: true,
      payments: true,
    },
  });

  return { success: true, invoices };
}

export async function getInvoiceById(id: string) {
  const session = await auth();
  const actorRole = getActorRole(session);

  if (!isStaff(actorRole)) {
    return { success: false, message: 'Anda tidak berwenang melihat invoice.' };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
      items: true,
      payments: true,
    },
  });

  if (!invoice) {
    return { success: false, message: 'Invoice tidak ditemukan.' };
  }

  return { success: true, invoice };
}

export async function createInvoice(input: z.infer<typeof createInvoiceSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const parsed = createInvoiceSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data invoice tidak valid.' };
  }

  if (!isStaff(actorRole)) {
    return { success: false, message: 'Anda tidak berwenang membuat invoice.' };
  }

  const customer = await prisma.customer.findUnique({ where: { id: parsed.data.customerId } });
  if (!customer) {
    return { success: false, message: 'Pelanggan tidak ditemukan.' };
  }

  const subtotal = parsed.data.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const discountAmount = parsed.data.discountAmount ?? 0;
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const initialPaymentAmount = parsed.data.initialPaymentAmount ?? 0;
  const initialPaymentMethod = parsed.data.initialPaymentMethod ?? 'CASH';
  const status = initialPaymentAmount >= totalAmount ? 'PAID' : 'UNPAID';

  const invoice = await prisma.invoice.create({
    data: {
      customerId: parsed.data.customerId,
      invoiceNumber,
      status,
      totalAmount,
      items: {
        create: parsed.data.items.map((item) => ({
          type: item.type,
          description: item.description,
          qty: item.qty,
          price: item.price,
          subtotal: item.qty * item.price,
        })),
      },
      payments: initialPaymentAmount > 0 ? {
        create: {
          method: initialPaymentMethod,
          amount: initialPaymentAmount,
        },
      } : undefined,
    },
    include: {
      customer: true,
      items: true,
      payments: true,
    },
  });

  revalidatePath('/billing');
  revalidatePath('/portal/invoices');
  revalidatePath('/dashboard');

  return { success: true, invoice };
}

export async function recordInvoicePayment(input: z.infer<typeof recordPaymentSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const parsed = recordPaymentSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data pembayaran tidak valid.' };
  }

  if (!isStaff(actorRole)) {
    return { success: false, message: 'Anda tidak berwenang mencatat pembayaran.' };
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: parsed.data.invoiceId } });
  if (!invoice) {
    return { success: false, message: 'Invoice tidak ditemukan.' };
  }

  if (invoice.status === 'CANCELLED') {
    return { success: false, message: 'Invoice yang dibatalkan tidak bisa dibayar.' };
  }

  await prisma.payment.create({
    data: {
      invoiceId: parsed.data.invoiceId,
      method: parsed.data.method,
      amount: parsed.data.amount,
    },
  });

  const aggregate = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: { invoiceId: parsed.data.invoiceId },
  });

  const totalPaid = aggregate._sum.amount ?? 0;
  const status = totalPaid >= invoice.totalAmount ? 'PAID' : 'UNPAID';

  const updatedInvoice = await prisma.invoice.update({
    where: { id: parsed.data.invoiceId },
    data: { status },
    include: { customer: true, items: true, payments: true },
  });

  revalidatePath('/billing');
  revalidatePath('/portal/invoices');
  revalidatePath('/dashboard');

  return { success: true, invoice: updatedInvoice };
}

export async function cancelInvoice(input: z.infer<typeof cancelInvoiceSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const parsed = cancelInvoiceSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!isStaff(actorRole)) {
    return { success: false, message: 'Anda tidak berwenang membatalkan invoice.' };
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: parsed.data.id } });
  if (!invoice) {
    return { success: false, message: 'Invoice tidak ditemukan.' };
  }

  if (invoice.status === 'CANCELLED') {
    return { success: false, message: 'Invoice sudah dibatalkan.' };
  }

  const updatedInvoice = await prisma.invoice.update({
    where: { id: parsed.data.id },
    data: { status: 'CANCELLED' },
    include: { customer: true, items: true, payments: true },
  });

  revalidatePath('/billing');
  revalidatePath('/portal/invoices');
  revalidatePath('/dashboard');

  return { success: true, invoice: updatedInvoice };
}

export async function getStaffBillingSummary() {
  const session = await auth();
  const actorRole = getActorRole(session);

  if (!isStaff(actorRole)) {
    return { success: false, message: 'Anda tidak berwenang mengakses ringkasan ini.' };
  }

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  const invoiceCount = await prisma.invoice.count({
    where: {
      date: { gte: start, lt: end },
      status: { not: 'CANCELLED' },
    },
  });

  const revenueResult = await prisma.invoice.aggregate({
    _sum: { totalAmount: true },
    where: { date: { gte: start, lt: end }, status: 'PAID' },
  });

  return { success: true, invoiceCount, revenueToday: revenueResult._sum.totalAmount ?? 0 };
}

export async function getPortalInvoices() {
  const session = await auth();
  const actorId = getActorId(session);

  if (!actorId) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  const customer = await prisma.customer.findFirst({ where: { userId: actorId } });
  if (!customer) {
    return { success: false, message: 'Data pelanggan tidak ditemukan.' };
  }

  const invoices = await prisma.invoice.findMany({
    where: { customerId: customer.id },
    orderBy: { date: 'desc' },
    include: {
      items: true,
      payments: true,
    },
  });

  return { success: true, invoices };
}

export async function getPortalInvoiceSummary() {
  const session = await auth();
  const actorId = getActorId(session);

  if (!actorId) {
    return { success: false, message: 'Tidak terautentikasi.' };
  }

  const customer = await prisma.customer.findFirst({ where: { userId: actorId } });
  if (!customer) {
    return { success: false, message: 'Data pelanggan tidak ditemukan.' };
  }

  const unpaidCount = await prisma.invoice.count({
    where: { customerId: customer.id, status: 'UNPAID' },
  });

  return { success: true, unpaidCount };
}
