import { z } from 'zod';

export const petSchema = z.object({
  customerId: z.string().min(1, 'Pelanggan wajib dipilih'),
  name: z.string().min(1, 'Nama hewan wajib diisi'),
  species: z.string().min(1, 'Spesies wajib diisi'),
  breed: z.string().optional(),
  birthDate: z.string().optional(),
  gender: z.string().optional(),
  photo: z.string().optional(),
});
