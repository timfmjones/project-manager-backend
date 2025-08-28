import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { upload, processAudioWithoutStorage } from '../middleware/upload';
import { createTextIdeaDumpSchema } from '../validators/ideaDump';
import { transcribeAudioFromBuffer, generateInsight } from '../config/openai';

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
    
    // Return the insight with ideaDump data included, matching the format expected by frontend
    return res.json({ 
      ideaDump, 
      insight,
      // Also return tasks if they were created
      createdTasks: insightData.suggestedTasks?.length || 0
    });
  } catch (error) {
    return next(error);
  }
});

router.post(
  '/:id/idea-dumps/audio',
  authenticateToken,
  upload.single('file'),
  processAudioWithoutStorage,
  async (req: AuthRequest & { audioBuffer?: Buffer }, res, next) => {
    try {
      const projectId = req.params.id;
      
      if (!req.file || !req.audioBuffer) {
        return res.status(400).json({ error: 'No audio file provided' });
      }
      
      const project = await prisma.project.findFirst({
        where: { id: projectId, userId: req.userId },
      });
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Transcribe the audio from buffer (no storage)
      const transcript = await transcribeAudioFromBuffer(req.audioBuffer, req.file.originalname);
      
      // Create idea dump with transcript only (no audioUrl)
      const ideaDump = await prisma.ideaDump.create({
        data: {
          projectId,
          userId: req.userId!,
          transcript,
          // Not storing audioUrl anymore
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
      
      // Return the insight with ideaDump data included, matching the format expected by frontend
      return res.json({ 
        ideaDump, 
        insight,
        // Also return tasks if they were created
        createdTasks: insightData.suggestedTasks?.length || 0
      });
    } catch (error) {
      return next(error);
    }
  }
);

export default router;