import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { upload, handleSupabaseUpload } from '../middleware/upload';
import { createTextIdeaDumpSchema } from '../validators/ideaDump';
import { transcribeAudio, generateInsight } from '../config/openai';

const router = Router();

router.post('/:id/idea-dumps/text', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const { contentText } = createTextIdeaDumpSchema.parse(req.body);
    const projectId = req.params.id;
    
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.userId },
    });
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const ideaDump = await prisma.ideaDump.create({
      data: {
        projectId,
        userId: req.userId!,
        contentText,
      },
    });
    
    const insightData = await generateInsight({ contentText });
    
    const insight = await prisma.insight.create({
      data: {
        ideaDumpId: ideaDump.id,
        shortSummary: insightData.shortSummary || [],
        recommendations: insightData.recommendations || [],
        suggestedTasks: insightData.suggestedTasks || [],
      },
    });
    
    if (insightData.suggestedTasks && Array.isArray(insightData.suggestedTasks)) {
      const tasks = insightData.suggestedTasks.map((task: any, index: number) => ({
        projectId,
        title: task.title,
        description: task.description || null,
        status: 'TODO' as const,
        position: Date.now() + index,
      }));
      
      await prisma.task.createMany({ data: tasks });
    }
    
    return res.json({ ideaDump, insight });
  } catch (error) {
    return next(error);
  }
});

router.post(
  '/:id/idea-dumps/audio',
  authenticateToken,
  upload.single('file'),
  handleSupabaseUpload,
  async (req: AuthRequest & { audioUrl?: string }, res, next) => {
    try {
      const projectId = req.params.id;
      
      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }
      
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.userId },
      });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Use Supabase URL or local path
      const audioUrl = req.audioUrl || `/uploads/${req.file.filename}`;
      const filePathOrUrl = req.audioUrl || req.file.path;
      
      const transcript = await transcribeAudio(filePathOrUrl);
      
      const ideaDump = await prisma.ideaDump.create({
        data: {
          projectId,
          userId: req.userId!,
          audioUrl,
          transcript,
        },
      });
      
      const insightData = await generateInsight({ transcript });
      
      const insight = await prisma.insight.create({
        data: {
          ideaDumpId: ideaDump.id,
          shortSummary: insightData.shortSummary || [],
          recommendations: insightData.recommendations || [],
          suggestedTasks: insightData.suggestedTasks || [],
        },
      });
      
      if (insightData.suggestedTasks && Array.isArray(insightData.suggestedTasks)) {
        const tasks = insightData.suggestedTasks.map((task: any, index: number) => ({
          projectId,
          title: task.title,
          description: task.description || null,
          status: 'TODO' as const,
          position: Date.now() + index,
        }));
        
        await prisma.task.createMany({ data: tasks });
      }
      
      return res.json({ ideaDump, insight });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;