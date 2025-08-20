import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

router.get('/:id/insights', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const insights = await prisma.insight.findMany({
      where: {
        ideaDump: {
          projectId: req.params.id,
        },
      },
      include: {
        ideaDump: {
          select: {
            contentText: true,
            transcript: true,
            audioUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(insights);
  } catch (error) {
    next(error);
  }
});

router.patch('/insights/:id/pin', authenticateToken, async (req: AuthRequest, res, next) => {
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
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;