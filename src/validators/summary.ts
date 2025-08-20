import { z } from 'zod';

export const updateSummarySchema = z.object({
  summaryBanner: z.string().max(220),
});