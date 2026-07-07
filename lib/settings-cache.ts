import { cache } from 'react';
import { prisma } from '@/lib/db';

export const getSettings = cache(async function getSettings() {
  // Cached settings provider used during server-side renders and utility calls.
  // React cache ensures repeated settings lookups in the same execution context
  // reuse the result instead of issuing duplicate database reads.
  return prisma.settings.findFirst({
    where: { id: 'default-settings' },
  });
});
