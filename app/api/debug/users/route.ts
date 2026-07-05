import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, role: true, pinHash: true, isActive: true },
      take: 10,
    });

    return Response.json({ success: true, users });
  } catch (error) {
    return Response.json({ success: false, error: String(error) }, { status: 500 });
  }
}
