import { prisma } from '@/lib/db';

export async function getSettings() {
  return prisma.settings.findFirst({
    where: { id: 'default-settings' },
  });
}
