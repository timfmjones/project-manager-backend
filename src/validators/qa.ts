// src/validators/qa.ts - New validator file for Q&A feature
import { z } from 'zod';

export const askQuestionSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters').max(500, 'Question must be less than 500 characters'),
  includeExamples: z.boolean().optional().default(true),
});

export const feedbackSchema = z.object({
  helpful: z.boolean(),
});