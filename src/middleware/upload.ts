import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

// Always use memory storage for audio files since we won't save them
const memoryStorage = multer.memoryStorage();

export const upload = multer({
  storage: memoryStorage,
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

// Middleware to handle audio processing without storage
export async function processAudioWithoutStorage(
  req: Request & { file?: Express.Multer.File; audioBuffer?: Buffer },
  _res: Response,
  next: NextFunction
) {
  if (!req.file) {
    return next();
  }

  // Just pass the buffer along for transcription
  req.audioBuffer = req.file.buffer;
  next();
}