// src/validators/milestone.ts
import { z } from 'zod';

export const createMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),  // Changed to be more permissive
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
});