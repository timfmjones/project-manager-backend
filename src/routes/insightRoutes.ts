// src/routes/insightRoutes.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// PATCH /api/insights/:id/pin
router.patch('/:id/pin', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const pinSchema = z.object({ pinned: z.boolean() });
    const { pinned } = pinSchema.parse(req.body);
    
    const insight = await prisma.insight.findFirst({
      where: { id: req.params.id },
      include: {
        ideaDump: {
          select: { userId: true },
        },
      },
    });
    
    if (!insight || insight.ideaDump.userId !== req.userId) {
      return res.status(404).json({ error: 'Insight not found' });
    }
    
    await prisma.insight.update({
      where: { id: req.params.id },
      data: { pinned },
    });
    
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
});

export default router;