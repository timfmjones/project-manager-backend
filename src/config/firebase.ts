import { initializeApp, cert, getApps, App, ServiceAccount } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { env } from '../env';

// Initialize Firebase Admin SDK
let firebaseApp: App | null = null;
let authInstance: Auth | null = null;

function initializeFirebase() {
  if (!firebaseApp && env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    try {
      const apps = getApps();
      if (apps.length === 0) {
        const serviceAccount: ServiceAccount = {
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines in private key
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        };

        firebaseApp = initializeApp({
          credential: cert(serviceAccount),
        });
        
        console.log('Firebase Admin initialized successfully');
        authInstance = getAuth(firebaseApp);
      } else {
        firebaseApp = apps[0];
        authInstance = getAuth(firebaseApp);
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
export function getFirebaseAuth(): Auth | null {
  if (!authInstance) {
    initializeFirebase();
  }
  return authInstance;
}

/**
 * Verify a Firebase ID token
 */
export async function verifyIdToken(idToken: string) {
  const auth = getFirebaseAuth();
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
  const auth = getFirebaseAuth();
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