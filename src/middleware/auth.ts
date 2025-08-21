import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';

// Extend Express Request type to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export interface AuthRequest extends Request {
  userId?: string;
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, env.JWT_SECRET, (err, decoded): void => {
    if (err) {
      console.error('Token verification error:', err);
      res.status(403).json({ error: 'Invalid or expired token' });
      return;
    }
    
    const payload = decoded as { userId: string };
    
    if (!payload.userId) {
      console.error('Token payload missing userId');
      res.status(403).json({ error: 'Invalid token payload' });
      return;
    }
    
    req.userId = payload.userId;
    next();
  });
}