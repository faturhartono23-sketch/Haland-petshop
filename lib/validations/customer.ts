import { z } from 'zod';

export const customerSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});
