import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken } from '../middleware/auth';
import { createProjectSchema, updateProjectSchema } from '../validators/project';

const router = Router();

// All routes use authenticateToken middleware
router.use(authenticateToken);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User ID not found in request' });
    }

    const projects = await prisma.project.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
    });
    res.json(projects);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate userId exists
    if (!req.userId) {
      return res.status(401).json({ error: 'User ID not found in request' });
    }

    // Validate request body
    const { name } = createProjectSchema.parse(req.body);
    
    // Verify user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!userExists) {
      return res.status(404).json({ error: 'User not found in database' });
    }
    
    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        userId: req.userId,
      },
    });
    
    res.json(project);
  } catch (error) {
    console.error('Project creation error:', error);
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User ID not found in request' });
    }

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

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'User ID not found in request' });
    }

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