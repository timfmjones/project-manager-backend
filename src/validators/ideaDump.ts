import { z } from 'zod';

export const createTextIdeaDumpSchema = z.object({
  contentText: z.string().min(1),
});