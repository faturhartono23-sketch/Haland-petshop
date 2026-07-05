import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { pin, pinHash } = await req.json();

    if (!pin || !pinHash) {
      return Response.json({ error: 'Missing pin or pinHash' }, { status: 400 });
    }

    const result = await bcrypt.compare(pin, pinHash);
    return Response.json({ success: true, pin, pinHashStarts: pinHash.substring(0, 20), result });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
