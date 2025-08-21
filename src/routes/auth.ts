import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/hash';
import { generateToken } from '../lib/jwt';
import { loginSchema, registerSchema, googleSignInSchema } from '../validators/auth';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { verifyIdToken } from '../config/firebase';

const router = Router();

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
    const { idToken } = googleSignInSchema.parse(req.body);
    
    // Verify the Firebase ID token
    const decodedToken = await verifyIdToken(idToken);
    const { email, name, picture } = decodedToken;
    
    if (!email) {
      return res.status(400).json({ error: 'No email associated with this Google account' });
    }
    
    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      // Create new user for Google sign-in
      // Store Google UID in a new field or use email as unique identifier
      user = await prisma.user.create({
        data: {
          email,
          passwordHash: null, // No password for Google users
          // You might want to add these fields to your User model:
          // googleUid: uid,
          // displayName: name,
          // photoUrl: picture,
        },
      });
    } else if (user.passwordHash) {
      // User exists with password (registered normally)
      // You might want to link the Google account or handle this case differently
      // For now, we'll allow login but you might want to merge accounts
    }
    
    const token = generateToken(user.id);
    return res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email,
        isGoogleUser: true,
        displayName: name,
        photoUrl: picture,
      } 
    });
  } catch (error) {
    console.error('Google sign-in error:', error);
    if (error instanceof Error && error.message === 'Invalid authentication token') {
      return res.status(401).json({ error: 'Invalid Google authentication token' });
    }
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
      select: { id: true, email: true, createdAt: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(user);
  } catch (error) {
    return next(error);
  }
});

export default router;