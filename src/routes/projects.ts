import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createProjectSchema, updateProjectSchema } from '../validators/project';

const router = Router();

router.get('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { name } = createProjectSchema.parse(req.body);
    
    const project = await prisma.project.create({
      data: {
        name,
        userId: req.userId!,
      },
    });
    
    res.json(project);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { name } = updateProjectSchema.parse(req.body);
    
    const project = await prisma.project.updateMany({
      where: {
        id: req.params.id,
        userId: req.userId,
      },
      data: { name },
    });
    
    if (project.count === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;