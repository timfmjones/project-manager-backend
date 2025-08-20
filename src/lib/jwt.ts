import jwt from 'jsonwebtoken';
import { env } from '../env';

export function generateToken(userId: string): string {
  if (!userId) {
    throw new Error('User ID is required to generate token');
  }
  
  return jwt.sign(
    { userId }, 
    env.JWT_SECRET, 
    { 
      expiresIn: '7d',
      issuer: 'project-management-app',
      subject: userId,
    }
  );
}

export function verifyToken(token: string): { userId: string } {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    
    if (!decoded.userId) {
      throw new Error('Invalid token: missing userId');
    }
    
    return { userId: decoded.userId };
  } catch (error) {
    console.error('Token verification error:', error);
    throw error;
  }
}