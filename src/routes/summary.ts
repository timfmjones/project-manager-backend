import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { updateSummarySchema } from '../validators/summary';

const router = Router();

router.get('/:id/summary', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      select: { summaryBanner: true },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ summaryBanner: project.summaryBanner });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/summary', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { summaryBanner } = updateSummarySchema.parse(req.body);
    
    const updated = await prisma.project.updateMany({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      data: { summaryBanner },
    });
    
    if (updated.count === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;