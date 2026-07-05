'use server';

import {
  createUser as createUserInternal,
  resetPin as resetPinInternal,
  unlockUser as unlockUserInternal,
} from '@/lib/user-management';

export async function createUser(input: unknown) {
  return createUserInternal(input);
}

export async function resetPin(input: unknown) {
  return resetPinInternal(input);
}

export async function unlockUser(input: unknown) {
  return unlockUserInternal(input);
}
