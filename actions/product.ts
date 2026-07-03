'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const productSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  categoryId: z.string().optional(),
  supplierId: z.string().optional(),
  buyPrice: z.coerce.number().min(0),
  sellPrice: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  minStock: z.coerce.number().int().min(0),
});

const updateProductSchema = productSchema.extend({
  id: z.string().min(1),
});

const categorySchema = z.object({
  name: z.string().min(1).max(100),
});

const updateCategorySchema = categorySchema.extend({
  id: z.string().min(1),
});

const supplierSchema = z.object({
  name: z.string().min(1).max(200),
  contact: z.string().optional(),
});

const updateSupplierSchema = supplierSchema.extend({
  id: z.string().min(1),
});

function getActorRole(session: Awaited<ReturnType<typeof auth>>) {
  return (session?.user as { role?: string } | undefined)?.role;
}

function getActorId(session: Awaited<ReturnType<typeof auth>>) {
  return session?.user?.id;
}

// CATEGORIES
export async function listProductCategories() {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);

  if (!actorId || !['OWNER', 'ADMIN_KLINIK'].includes(actorRole ?? '')) {
    return { success: false, message: 'Anda tidak berwenang melihat data ini.' };
  }

  const categories = await prisma.productCategory.findMany({
    orderBy: { name: 'asc' },
  });

  return { success: true, categories };
}

export async function createProductCategory(input: z.infer<typeof categorySchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);
  const parsed = categorySchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!actorId || !['OWNER', 'ADMIN_KLINIK'].includes(actorRole ?? '')) {
    return { success: false, message: 'Anda tidak berwenang membuat kategori.' };
  }

  const category = await prisma.productCategory.create({
    data: { name: parsed.data.name },
  });

  revalidatePath('/petshop/products');
  return { success: true, category };
}

export async function updateProductCategory(input: z.infer<typeof updateCategorySchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);
  const parsed = updateCategorySchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!actorId || !['OWNER', 'ADMIN_KLINIK'].includes(actorRole ?? '')) {
    return { success: false, message: 'Anda tidak berwenang mengubah kategori.' };
  }

  const category = await prisma.productCategory.update({
    where: { id: parsed.data.id },
    data: { name: parsed.data.name },
  });

  revalidatePath('/petshop/products');
  return { success: true, category };
}

export async function deleteProductCategory(id: string) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);

  if (!actorId || actorRole !== 'OWNER') {
    return { success: false, message: 'Hanya Owner yang dapat menghapus kategori.' };
  }

  await prisma.productCategory.delete({ where: { id } });

  revalidatePath('/petshop/products');
  return { success: true };
}

// SUPPLIERS
export async function listSuppliers() {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);

  if (!actorId || !['OWNER', 'ADMIN_KLINIK'].includes(actorRole ?? '')) {
    return { success: false, message: 'Anda tidak berwenang melihat data ini.' };
  }

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
  });

  return { success: true, suppliers };
}

export async function createSupplier(input: z.infer<typeof supplierSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);
  const parsed = supplierSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!actorId || !['OWNER', 'ADMIN_KLINIK'].includes(actorRole ?? '')) {
    return { success: false, message: 'Anda tidak berwenang membuat supplier.' };
  }

  const supplier = await prisma.supplier.create({
    data: { name: parsed.data.name, contact: parsed.data.contact || null },
  });

  revalidatePath('/petshop/products');
  return { success: true, supplier };
}

export async function updateSupplier(input: z.infer<typeof updateSupplierSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);
  const parsed = updateSupplierSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!actorId || !['OWNER', 'ADMIN_KLINIK'].includes(actorRole ?? '')) {
    return { success: false, message: 'Anda tidak berwenang mengubah supplier.' };
  }

  const supplier = await prisma.supplier.update({
    where: { id: parsed.data.id },
    data: { name: parsed.data.name, contact: parsed.data.contact || null },
  });

  revalidatePath('/petshop/products');
  return { success: true, supplier };
}

export async function deleteSupplier(id: string) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);

  if (!actorId || actorRole !== 'OWNER') {
    return { success: false, message: 'Hanya Owner yang dapat menghapus supplier.' };
  }

  await prisma.supplier.delete({ where: { id } });

  revalidatePath('/petshop/products');
  return { success: true };
}

// PRODUCTS
export async function listProducts() {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);

  if (!actorId || !['OWNER', 'ADMIN_KLINIK'].includes(actorRole ?? '')) {
    return { success: false, message: 'Anda tidak berwenang melihat data ini.' };
  }

  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' },
    include: { category: { select: { name: true } }, supplier: { select: { name: true } } },
  });

  return { success: true, products };
}

export async function createProduct(input: z.infer<typeof productSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);
  const parsed = productSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!actorId || !['OWNER', 'ADMIN_KLINIK'].includes(actorRole ?? '')) {
    return { success: false, message: 'Anda tidak berwenang membuat produk.' };
  }

  const product = await prisma.product.create({
    data: {
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      barcode: parsed.data.barcode || null,
      categoryId: parsed.data.categoryId || null,
      supplierId: parsed.data.supplierId || null,
      buyPrice: parsed.data.buyPrice,
      sellPrice: parsed.data.sellPrice,
      stock: parsed.data.stock,
      minStock: parsed.data.minStock,
    },
  });

  revalidatePath('/petshop/products');
  revalidatePath('/petshop/inventory');
  return { success: true, product };
}

export async function updateProduct(input: z.infer<typeof updateProductSchema>) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);
  const parsed = updateProductSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, message: 'Data tidak valid.' };
  }

  if (!actorId || !['OWNER', 'ADMIN_KLINIK'].includes(actorRole ?? '')) {
    return { success: false, message: 'Anda tidak berwenang mengubah produk.' };
  }

  const product = await prisma.product.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      barcode: parsed.data.barcode || null,
      categoryId: parsed.data.categoryId || null,
      supplierId: parsed.data.supplierId || null,
      buyPrice: parsed.data.buyPrice,
      sellPrice: parsed.data.sellPrice,
      minStock: parsed.data.minStock,
    },
  });

  revalidatePath('/petshop/products');
  revalidatePath('/petshop/inventory');
  return { success: true, product };
}

export async function deleteProduct(id: string) {
  const session = await auth();
  const actorRole = getActorRole(session);
  const actorId = getActorId(session);

  if (!actorId || actorRole !== 'OWNER') {
    return { success: false, message: 'Hanya Owner yang dapat menghapus produk.' };
  }

  await prisma.product.delete({ where: { id } });

  revalidatePath('/petshop/products');
  revalidatePath('/petshop/inventory');
  return { success: true };
}
