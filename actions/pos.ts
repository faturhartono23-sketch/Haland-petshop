'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma, getOrCreateGuestCustomer } from '@/lib/db';
import { isStaffRole } from '@/lib/permissions';
import { notifyUser } from '@/lib/notifications-helper';
import { calculatePosTotals, getPaymentStatus, roundCurrency } from '@/lib/pos';
import { getActorRole } from '@/lib/utils';
import { generateInvoiceNumber } from '@/lib/numbering';
import { deductProductStock, validateStockAvailability } from '@/lib/inventory-helpers';

const productSearchSchema = z.object({
  query: z.string().trim().min(1, 'Pencarian tidak boleh kosong.'),
});

const listPosProductsSchema = z.object({
  categoryId: z.string().trim().optional().or(z.literal('')),
  query: z.string().trim().optional().or(z.literal('')),
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).optional(),
});

const listProductCategoriesSchema = z.object({});

const createPosSaleSchema = z.object({
  customerId: z.string().trim().optional().or(z.literal('')),
  isWalkIn: z.boolean().optional().default(false),
  items: z
    .array(
      z.object({
        productId: z.string().trim().min(1, 'Produk tidak valid.'),
        qty: z.coerce.number().int().positive('Kuantitas harus lebih dari nol.'),
        price: z.coerce.number().min(0, 'Harga tidak boleh negatif.'),
        description: z.string().trim().min(1, 'Deskripsi produk wajib diisi.'),
      }),
    )
    .min(1, 'Keranjang tidak boleh kosong.'),
  discountAmount: z.coerce.number().min(0, 'Diskon tidak boleh negatif.').optional(),
  paymentMethod: z.enum(['CASH', 'NON_CASH'], { errorMap: () => ({ message: 'Metode pembayaran tidak valid.' }) }),
  paymentAmount: z.coerce.number().min(0, 'Jumlah pembayaran tidak boleh negatif.'),
  taxRate: z.coerce.number().min(0, 'Pajak tidak boleh negatif.').optional(),
});



function normalizeSearchQuery(query: string) {
  return query.trim().toLowerCase();
}

function mapProductResult(product: { id: string; name: string; sku: string | null; barcode: string | null; sellPrice: number; stock: number; category: { name: string } | null; imageUrl: string | null; }) {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    barcode: product.barcode,
    sellPrice: product.sellPrice,
    stock: product.stock,
    categoryName: product.category?.name ?? null,
    imageUrl: product.imageUrl,
  };
}

export async function listPosProducts(input: z.infer<typeof listPosProductsSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const parsed = listPosProductsSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data produk tidak valid.' };
  }

  if (!isStaffRole(actorRole)) {
    return { success: false, message: 'Anda tidak berwenang mencari produk.' };
  }

  const normalizedQuery = normalizeSearchQuery(parsed.data.query ?? '');
  const categoryId = parsed.data.categoryId?.trim() || undefined;
  const shouldSearch = Boolean(normalizedQuery);

  const whereClause: any = {
    isArchived: false,
    status: 'ACTIVE',
    ...(categoryId ? { categoryId } : {}),
  };

  if (shouldSearch) {
    whereClause.OR = [
      { name: { contains: normalizedQuery, mode: 'insensitive' } },
      { sku: { contains: normalizedQuery, mode: 'insensitive' } },
      { barcode: { contains: normalizedQuery, mode: 'insensitive' } },
      { brand: { contains: normalizedQuery, mode: 'insensitive' } },
      { description: { contains: normalizedQuery, mode: 'insensitive' } },
    ];
  }

  const products = await prisma.product.findMany({
    where: whereClause,
    orderBy: [
      { createdAt: 'desc' },
      { name: 'asc' },
    ],
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      sellPrice: true,
      stock: true,
      category: { select: { name: true } },
      imageUrl: true,
    },
    skip: parsed.data.skip ?? 0,
    take: parsed.data.take ?? 24,
  });

  return { success: true, products: products.map(mapProductResult) };
}

export async function listProductCategories() {
  const session = await auth();
  const actorRole = getActorRole(session);

  if (!isStaffRole(actorRole)) {
    return { success: false, message: 'Anda tidak berwenang mengakses kategori produk.' };
  }

  const categories = await prisma.productCategory.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      _count: { select: { products: true } },
    },
  });

  return {
    success: true,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      activeProductCount: category._count.products,
    })),
  };
}

export async function searchProducts(input: z.infer<typeof productSearchSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const parsed = productSearchSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Query pencarian tidak valid.' };
  }

  if (!isStaffRole(actorRole)) {
    return { success: false, message: 'Anda tidak berwenang mencari produk.' };
  }

  const result = await listPosProducts({ query: parsed.data.query, take: 24 });
  return result;
}

export async function createPosSale(input: z.infer<typeof createPosSaleSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = session?.user?.id;
  const parsed = createPosSaleSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data transaksi tidak valid.' };
  }

  if (!actorId || !isStaffRole(actorRole)) {
    return { success: false, message: 'Anda tidak berwenang melakukan penjualan POS.' };
  }

  if (!parsed.data.customerId && !parsed.data.isWalkIn) {
    return { success: false, message: 'Pelanggan wajib dipilih untuk transaksi POS.' };
  }

  let resolvedCustomerId: string;
  if (parsed.data.isWalkIn) {
    const guestCustomer = await getOrCreateGuestCustomer();
    resolvedCustomerId = guestCustomer.id;
  } else {
    const customer = await prisma.customer.findUnique({ where: { id: parsed.data.customerId! } });
    if (!customer) {
      return { success: false, message: 'Pelanggan tidak ditemukan.' };
    }
    resolvedCustomerId = customer.id;
  }

  const items = parsed.data.items;

  const invoiceNumber = await generateInvoiceNumber();

  const productStockDeductionItems = items.map((item) => ({ productId: item.productId, qty: item.qty }));

  if (productStockDeductionItems.length > 0) {
    const stockAvailability = await validateStockAvailability(prisma as any, productStockDeductionItems);
    if (!stockAvailability.ok) {
      return { success: false, message: stockAvailability.message };
    }
  }

  try {
    const invoiceResult = await prisma.$transaction(async (tx) => {
      const productLookups = await Promise.all(
        items.map((item) => tx.product.findUnique({ where: { id: item.productId } })),
      );

      const validatedItems = items.map((item, index) => {
        const product = productLookups[index];
        if (!product) {
          throw new Error(`Produk ${item.description} tidak ditemukan.`);
        }

        if (roundCurrency(item.price) !== roundCurrency(product.sellPrice)) {
          throw new Error(`Harga produk ${product.name} sudah berubah. Segarkan halaman dan coba lagi.`);
        }

        return {
          product,
          qty: item.qty,
          description: item.description,
          price: product.sellPrice,
          subtotal: roundCurrency(item.qty * product.sellPrice),
        };
      });

      const subtotal = roundCurrency(validatedItems.reduce((sum, item) => sum + item.subtotal, 0));
      const taxRate = parsed.data.taxRate ?? 0;
      const totals = calculatePosTotals(subtotal, parsed.data.discountAmount ?? 0, taxRate);

      if (parsed.data.paymentAmount < totals.totalAmount) {
        throw new Error('Jumlah pembayaran kurang dari total transaksi.');
      }

      const status = getPaymentStatus(parsed.data.paymentAmount, totals.totalAmount);

      const createdInvoice = await tx.invoice.create({
        data: {
          customerId: resolvedCustomerId,
          invoiceNumber,
          status,
          subtotal: totals.subtotal,
          discountAmount: totals.discountAmount,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          items: {
            create: validatedItems.map((item) => ({
              type: 'PRODUK',
              description: item.description,
              qty: item.qty,
              price: item.price,
              subtotal: item.subtotal,
              productId: item.product.id,
            })),
          },
          payments: {
            create: {
              method: parsed.data.paymentMethod,
              amount: roundCurrency(parsed.data.paymentAmount),
            },
          },
        },
        include: {
          customer: true,
          items: true,
          payments: true,
        },
      });

      const deductionResult = await deductProductStock(tx, productStockDeductionItems);
      if (!deductionResult.ok) {
        throw new Error('Stok produk berubah, transaksi dibatalkan.');
      }

      for (const item of validatedItems) {
        await tx.stockMovement.create({
          data: {
            productId: item.product.id,
            type: 'OUT',
            quantity: item.qty,
            note: `Penjualan POS - ${invoiceNumber}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: actorId,
          action: 'CREATE',
          entity: 'Invoice',
          entityId: createdInvoice.id,
          description: `Penjualan POS ${invoiceNumber}`,
        },
      });

      return { invoice: createdInvoice, totals };
    });

    const { invoice, totals } = invoiceResult;

    const customerUser = await prisma.customer.findUnique({ where: { id: resolvedCustomerId }, select: { userId: true } });
    await notifyUser(customerUser?.userId ?? actorId, 'Penjualan POS selesai', `Transaksi ${invoice.invoiceNumber} berhasil dicatat.`, 'pos');

    revalidatePath('/pos');
    revalidatePath('/billing');
    revalidatePath('/dashboard');
    revalidatePath('/portal/invoices');

    return {
      success: true,
      invoice,
      changeAmount: roundCurrency(parsed.data.paymentAmount - totals.totalAmount),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transaksi POS gagal.';
    return { success: false, message };
  }
}
