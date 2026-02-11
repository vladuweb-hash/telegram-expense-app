import { z } from 'zod';

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().max(255).optional().nullable(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
