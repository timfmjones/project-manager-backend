// src/config/openai.ts - Complete file with Q&A functionality
import OpenAI from 'openai';
import { env } from '../env';
import path from 'path';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function transcribeAudioFromBuffer(buffer: Buffer, originalFilename?: string): Promise<string> {
  try {
    // Determine filename and extension
    let filename = 'audio.webm';
    if (originalFilename) {
      const ext = path.extname(originalFilename);
      filename = `audio${ext || '.webm'}`;
    }

    // Convert Buffer to a File-like object for OpenAI
    // OpenAI needs a File or Blob with a name property
    const file = new File([buffer], filename, {
      type: 'audio/webm',
    });

    const response = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      // Optional: add language hint if you know the language
      // language: 'en',
      // Optional: add prompt to improve accuracy for domain-specific terms
      // prompt: 'Project management, software development, business strategy',
    });
    
    return response.text;
  } catch (error) {
    console.error('Transcription error:', error);
    // If transcription fails, throw a more informative error
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateInsight(input: { contentText?: string; transcript?: string }) {
  const content = input.contentText || input.transcript || '';
  
  if (!content || content.trim().length < 10) {
    throw new Error('Content too short to generate insights');
  }
  
  const systemPrompt = `You are an expert product & business analyst. Given a raw idea dump, return:
shortSummary: 2-4 crisp bullets of the core ideas (no fluff),
recommendations: 2-5 practical business suggestions tailored to an ongoing project,
suggestedTasks: 2-6 atomic tasks with actionable titles, keep scope to 1-2 hours each.
Return strict JSON: { shortSummary: string[], recommendations: string[], suggestedTasks: {title: string, description?: string}[] }`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this idea dump: ${content}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate the response structure
    if (!result.shortSummary || !result.recommendations || !result.suggestedTasks) {
      throw new Error('Invalid response structure from AI');
    }
    
    return result;
  } catch (error) {
    console.error('Insight generation error:', error);
    // Return a fallback structure if AI fails
    return {
      shortSummary: ['Failed to generate summary. Please try again.'],
      recommendations: ['Unable to generate recommendations at this time.'],
      suggestedTasks: [],
    };
  }
}

export async function suggestSummaryUpdate(recentInsights: any[]): Promise<string> {
  if (!recentInsights || recentInsights.length === 0) {
    return '';
  }
  
  const insightsSummary = recentInsights
    .map((i) => i.shortSummary.join(' '))
    .join(' ');

  const systemPrompt = `Given the project's recent insights (most recent 5), propose a single concise banner paragraph (max 220 chars) that captures direction & key ongoing items. No bullets, no extra text. Return: { suggestedSummary: string }`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Recent insights: ${insightsSummary}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 100,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.suggestedSummary || '';
  } catch (error) {
    console.error('Summary suggestion error:', error);
    return '';
  }
}

// Q&A Feature Functions
interface ProjectContext {
  name: string;
  summary: string;
  stats: {
    totalTasks: number;
    completedTasks: number;
    totalInsights: number;
    upcomingMilestones: number;
  };
  recentTasks: Array<{
    title: string;
    status: string;
    description?: string | null;
  }>;
  upcomingMilestones: Array<{
    title: string;
    description?: string | null;
    dueDate?: Date | null;
  }>;
  recentInsights: Array<{
    summary: any;
    recommendations: any;
    suggestedTasks: any;
    source?: string | null;
    date: Date;
  }>;
}

export async function generateQAResponse(
  question: string,
  context: ProjectContext,
  includeExamples: boolean = true
): Promise<{
  answer: string;
  suggestions: string[];
  examples?: string[];
  suggestedTasks?: Array<{ title: string; description?: string }>;
}> {
  const systemPrompt = `You are an expert project management advisor with deep knowledge of best practices from companies like Google, Amazon, and successful startups. 

Given a project's context and a user's question, provide:
1. A direct, actionable answer based on their project data
2. 2-3 follow-up suggestions or questions
3. ${includeExamples ? 'Real-world examples from successful projects/companies' : 'Focus only on their specific project'}
4. If relevant, suggest 1-2 specific tasks they should create

Project Context:
- Project: ${context.name}
- Summary: ${context.summary || 'No summary provided'}
- Progress: ${context.stats.completedTasks}/${context.stats.totalTasks} tasks completed
- Insights generated: ${context.stats.totalInsights}
- Upcoming milestones: ${context.stats.upcomingMilestones}

Be specific, practical, and reference their actual project data when answering.`;

  const userPrompt = `Project Details:
${JSON.stringify(context, null, 2)}

User Question: ${question}

Provide a response in JSON format:
{
  "answer": "Direct answer to their question with specific references to their project",
  "suggestions": ["Follow-up question 1", "Follow-up question 2", "Follow-up question 3"],
  "examples": ["Real example 1", "Real example 2"] (only if includeExamples is true),
  "suggestedTasks": [{"title": "Task title", "description": "Brief description"}] (only if relevant)
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    // Validate response structure
    if (!result.answer) {
      throw new Error('Invalid AI response structure');
    }
    
    return {
      answer: result.answer,
      suggestions: result.suggestions || [],
      examples: includeExamples ? (result.examples || []) : undefined,
      suggestedTasks: result.suggestedTasks || [],
    };
  } catch (error) {
    console.error('Q&A generation error:', error);
    
    // Fallback response
    return {
      answer: "I'm having trouble analyzing your project right now. Based on what I can see, you have " +
              `${context.stats.totalTasks} tasks with ${context.stats.completedTasks} completed. ` +
              "Try asking about specific aspects of your project like task prioritization or milestone planning.",
      suggestions: [
        "What are my highest priority tasks?",
        "How can I improve my project velocity?",
        "What should I focus on this week?",
      ],
      examples: includeExamples ? [
        "Many successful teams use weekly sprints to maintain momentum",
        "Google's OKR system helps align tasks with larger goals",
      ] : undefined,
    };
  }
}