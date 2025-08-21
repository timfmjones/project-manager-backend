import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { suggestSummaryUpdate } from '../config/openai';
import rateLimit from 'express-rate-limit';

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: 'Too many AI requests, please try again later',
});

router.post('/:id/summary/suggest', authenticateToken, aiLimiter, async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: { id: req.params.id, userId: req.userId },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const recentInsights = await prisma.insight.findMany({
      where: {
        ideaDump: {
          projectId: req.params.id,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    
    if (recentInsights.length === 0) {
      return res.status(400).json({ error: 'No insights available to generate summary' });
    }
    
    const suggestedSummary = await suggestSummaryUpdate(recentInsights);
    
    return res.json({ suggestedSummary });
  } catch (error) {
    return next(error);
  }
});

export default router;