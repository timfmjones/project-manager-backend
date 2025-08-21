import multer from 'multer';
import path from 'path';
import { env } from '../env';
import { supabase } from '../config/supabase';
import { Request, Response, NextFunction } from 'express';

// Local storage configuration
const localStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Memory storage for Supabase upload
const memoryStorage = multer.memoryStorage();

export const upload = multer({
  storage: env.USE_SUPABASE_STORAGE ? memoryStorage : localStorage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Extended list of audio MIME types including webm
    const allowedMimes = [
      'audio/mpeg',
      'audio/wav',
      'audio/wave',
      'audio/webm',
      'audio/mp4',
      'audio/ogg',
      'audio/opus',
      'audio/flac',
      'audio/x-m4a',
      'audio/mp3',
      'audio/x-wav',
      'audio/x-flac',
      // Some browsers might send these for webm
      'video/webm', // WebM can contain audio-only
      'application/octet-stream', // Fallback for unknown types
    ];
    
    // Check MIME type or file extension
    const isAllowedMime = allowedMimes.includes(file.mimetype);
    const fileExt = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.mp3', '.wav', '.webm', '.ogg', '.m4a', '.opus', '.flac', '.mp4'];
    const isAllowedExt = allowedExts.includes(fileExt);
    
    if (isAllowedMime || isAllowedExt) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Only audio files are allowed. Received: ${file.mimetype}`));
    }
  },
});

// Middleware to handle Supabase storage upload
export async function handleSupabaseUpload(
  req: Request & { file?: Express.Multer.File; audioUrl?: string },
  res: Response,
  next: NextFunction
) {
  if (!env.USE_SUPABASE_STORAGE || !req.file) {
    return next();
  }

  try {
    const file = req.file;
    const fileExt = path.extname(file.originalname) || '.webm'; // Default to .webm if no extension
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExt}`;
    const filePath = `audio/${fileName}`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype || 'audio/webm',
        cacheControl: '3600',
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(filePath);

    req.audioUrl = publicUrl;
    next();
  } catch (error) {
    console.error('Supabase upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
}