import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/hash';
import { generateToken } from '../lib/jwt';
import { loginSchema, registerSchema } from '../validators/auth';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';

const router = Router();

// Initialize Google OAuth2 client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Validation schema for Google sign-in
const googleSignInSchema = z.object({
  credential: z.string().min(1), // This is the JWT from Google Identity Services
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = registerSchema.parse(req.body);
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    const token = generateToken(user.id);
    return res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    return res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    return next(error);
  }
});

router.post('/google', async (req, res, next) => {
  try {
    const { credential } = googleSignInSchema.parse(req.body);
    
    try {
      // Verify the Google credential (JWT)
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      
      if (!payload) {
        return res.status(400).json({ error: 'Invalid Google credential' });
      }
      
      const { email, name, picture, sub: googleId } = payload;
      
      if (!email) {
        return res.status(400).json({ error: 'No email associated with this Google account' });
      }
      
      // Check if user exists
      let user = await prisma.user.findUnique({ where: { email } });
      
      if (!user) {
        // Create new user for Google sign-in
        user = await prisma.user.create({
          data: {
            email,
            passwordHash: null, // No password for Google users
            googleUid: googleId,
            displayName: name || null,
            photoUrl: picture || null,
          },
        });
      } else if (!user.googleUid) {
        // Link existing account with Google
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleUid: googleId,
            displayName: name || user.displayName,
            photoUrl: picture || user.photoUrl,
          },
        });
      }
      
      const token = generateToken(user.id);
      return res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email,
          isGoogleUser: true,
          displayName: user.displayName || name,
          photoUrl: user.photoUrl || picture,
        } 
      });
    } catch (googleError: any) {
      console.error('Google verification error:', googleError);
      return res.status(401).json({ 
        error: 'Invalid Google authentication token' 
      });
    }
  } catch (error) {
    console.error('Google sign-in error:', error);
    return next(error);
  }
});

router.post('/guest', async (_req, res, next) => {
  try {
    const guestEmail = `guest-${Date.now()}@temp.local`;
    const user = await prisma.user.create({
      data: { email: guestEmail, passwordHash: null },
    });

    const token = generateToken(user.id);
    return res.json({ token, user: { id: user.id, email: guestEmail, isGuest: true } });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', authenticateToken, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { 
        id: true, 
        email: true, 
        createdAt: true,
        displayName: true,
        photoUrl: true,
        googleUid: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      ...user,
      isGoogleUser: !!user.googleUid,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;