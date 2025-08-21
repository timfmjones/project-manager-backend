// src/routes/insights.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/projects/:id/insights
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

export default router;