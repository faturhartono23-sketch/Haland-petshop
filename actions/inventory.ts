'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const stockMovementSchema = z.object({
  productId: z.string().min(1),
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.coerce.number().int().min(1),
  note: z.string().optional(),
});

function getActorRole(session: Awaited<ReturnType<typeof auth>>) {
  return (session?.user as { role?: string } | undefined)?.role;
}

function getActorId(session: Awaited<ReturnType<typeof auth>>) {
  return session?.user?.id;
}

export async function listInventory() {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);

  if (!actorId || !['OWNER', 'ADMIN_KLINIK'].includes(actorRole ?? '')) {
    return { success: false, message: 'Anda tidak berwenang melihat data ini.' };
  }

  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: {
      category: { select: { name: true } },
      supplier: { select: { name: true } },
    },
  });

  return { success: true, products };
}

export async function recordStockMovement(input: z.infer<typeof stockMovementSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);
  const parsed = stockMovementSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!actorId || !['OWNER', 'ADMIN_KLINIK'].includes(actorRole ?? '')) {
    return { success: false, message: 'Anda tidak berwenang mencatat pergerakan stok.' };
  }

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) {
    return { success: false, message: 'Produk tidak ditemukan.' };
  }

  let newStock = product.stock;
  if (parsed.data.type === 'IN') {
    newStock += parsed.data.quantity;
  } else if (parsed.data.type === 'OUT') {
    if (product.stock < parsed.data.quantity) {
      return { success: false, message: 'Stok tidak mencukupi.' };
    }
    newStock -= parsed.data.quantity;
  } else if (parsed.data.type === 'ADJUSTMENT') {
    newStock = parsed.data.quantity;
  }

  await Promise.all([
    prisma.product.update({
      where: { id: parsed.data.productId },
      data: { stock: newStock },
    }),
    prisma.stockMovement.create({
      data: {
        productId: parsed.data.productId,
        type: parsed.data.type,
        quantity: parsed.data.quantity,
        note: parsed.data.note || null,
      },
    }),
  ]);

  revalidatePath('/petshop/inventory');
  return { success: true, newStock };
}

export async function listStockMovements(productId: string) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);

  if (!actorId || !['OWNER', 'ADMIN_KLINIK'].includes(actorRole ?? '')) {
    return { success: false, message: 'Anda tidak berwenang melihat data ini.' };
  }

  const movements = await prisma.stockMovement.findMany({
    where: { productId },
    orderBy: { date: 'desc' },
  });

  return { success: true, movements };
}

export async function getLowStockSummary() {
  const products = await prisma.product.findMany({
    orderBy: { stock: 'asc' },
  });

  const lowStockProducts = products.filter((p) => p.stock <= p.minStock);

  return { success: true, lowStockCount: lowStockProducts.length };
}
