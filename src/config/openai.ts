import OpenAI from 'openai';
import fs from 'fs';
import { env } from '../env';
import { supabase } from './supabase';
import fetch from 'node-fetch';
import path from 'path';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function transcribeAudio(filePathOrUrl: string): Promise<string> {
  let audioFile: any;
  let filename = 'audio.webm'; // Default filename
  
  if (env.USE_SUPABASE_STORAGE && filePathOrUrl.startsWith('http')) {
    // Download file from Supabase Storage
    const response = await fetch(filePathOrUrl);
    const buffer = await response.buffer();
    
    // Try to extract file extension from URL
    const urlPath = new URL(filePathOrUrl).pathname;
    const ext = path.extname(urlPath);
    if (ext) {
      filename = `audio${ext}`;
    }
    
    // Create a File-like object for OpenAI
    // OpenAI Whisper supports webm format
    audioFile = new File([buffer], filename, { 
      type: response.headers.get('content-type') || 'audio/webm' 
    });
  } else {
    // Use local file
    // Get the file extension for proper MIME type
    const ext = path.extname(filePathOrUrl);
    filename = `audio${ext || '.webm'}`;
    audioFile = fs.createReadStream(filePathOrUrl);
  }

  try {
    const response = await openai.audio.transcriptions.create({
      file: audioFile,
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