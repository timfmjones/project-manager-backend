import OpenAI from 'openai';
import fs from 'fs';
import { env } from '../env';
import { supabase } from './supabase';
import fetch from 'node-fetch';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export async function transcribeAudio(filePathOrUrl: string): Promise<string> {
  let audioFile: any;
  
  if (env.USE_SUPABASE_STORAGE && filePathOrUrl.startsWith('http')) {
    // Download file from Supabase Storage
    const response = await fetch(filePathOrUrl);
    const buffer = await response.buffer();
    
    // Create a File-like object for OpenAI
    audioFile = new File([buffer], 'audio.mp3', { type: 'audio/mpeg' });
  } else {
    // Use local file
    audioFile = fs.createReadStream(filePathOrUrl);
  }

  const response = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
  });
  
  return response.text;
}

export async function generateInsight(input: { contentText?: string; transcript?: string }) {
  const content = input.contentText || input.transcript || '';
  
  const systemPrompt = `You are an expert product & business analyst. Given a raw idea dump, return:
shortSummary: 2-4 crisp bullets of the core ideas (no fluff),
recommendations: 2-5 practical business suggestions tailored to an ongoing project,
suggestedTasks: 2-6 atomic tasks with actionable titles, keep scope to 1-2 hours each.
Return strict JSON: { shortSummary: string[], recommendations: string[], suggestedTasks: {title: string, description?: string}[] }`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Analyze this idea dump: ${content}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  return JSON.parse(response.choices[0].message.content || '{}');
}

export async function suggestSummaryUpdate(recentInsights: any[]): Promise<string> {
  const insightsSummary = recentInsights
    .map((i) => i.shortSummary.join(' '))
    .join(' ');

  const systemPrompt = `Given the project's recent insights (most recent 5), propose a single concise banner paragraph (max 220 chars) that captures direction & key ongoing items. No bullets, no extra text. Return: { suggestedSummary: string }`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Recent insights: ${insightsSummary}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const result = JSON.parse(response.choices[0].message.content || '{}');
  return result.suggestedSummary || '';
}