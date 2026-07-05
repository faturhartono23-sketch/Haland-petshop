import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const defaultPin = '123456';
    const newHash = await bcrypt.hash(defaultPin, 10);

    // Update all users with the new hash
    const result = await prisma.user.updateMany({
      data: {
        pinHash: newHash,
      },
    });

    return Response.json({
      success: true,
      message: 'All PINs rehashed',
      newHash,
      updatedCount: result.count,
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
