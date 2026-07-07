import { createNotification } from '@/actions/notification';

export async function notifyUser(
  userId: string | null | undefined,
  title: string,
  message: string,
  type: string,
) {
  if (!userId) {
    return;
  }

  try {
    await createNotification({ userId, title, message, type });
  } catch {
    // ignore notification failures so workflows remain resilient
  }
}
