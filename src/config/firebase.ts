import * as admin from 'firebase-admin';
import { env } from '../env';

// Initialize Firebase Admin SDK
let isInitialized = false;
let authInstance: admin.auth.Auth | null = null;

function initializeFirebase() {
  if (!isInitialized && env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: env.FIREBASE_PROJECT_ID,
            clientEmail: env.FIREBASE_CLIENT_EMAIL,
            // Replace escaped newlines in private key
            privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
        console.log('Firebase Admin initialized successfully');
        authInstance = admin.auth();
        isInitialized = true;
      } else {
        authInstance = admin.auth();
        isInitialized = true;
      }
    } catch (error) {
      console.error('Firebase Admin initialization error:', error);
      console.log('Google Sign-In will not be available');
    }
  }
}

// Initialize on module load if env vars are present
initializeFirebase();

// Export a getter for auth that ensures initialization
export function getAuth(): admin.auth.Auth | null {
  if (!isInitialized) {
    initializeFirebase();
  }
  return authInstance;
}

/**
 * Verify a Firebase ID token
 */
export async function verifyIdToken(idToken: string) {
  const auth = getAuth();
  if (!auth) {
    throw new Error('Firebase is not initialized. Check your environment variables.');
  }
  
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    throw new Error('Invalid authentication token');
  }
}

/**
 * Get or create a user from Firebase token
 */
export async function getFirebaseUser(uid: string) {
  const auth = getAuth();
  if (!auth) {
    throw new Error('Firebase is not initialized. Check your environment variables.');
  }
  
  try {
    const user = await auth.getUser(uid);
    return user;
  } catch (error) {
    console.error('Error getting Firebase user:', error);
    throw new Error('User not found');
  }
}