import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  Unsubscribe,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/drive',
];

const app = getApps().find((a) => a.name === '[DEFAULT]') || initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

let isSigningIn = false;
// Access tokens are cached strictly in memory (never in localStorage or sessionStorage)
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthNeedsToken?: (user: User | null) => void
): Unsubscribe => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        onAuthSuccess?.(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        onAuthNeedsToken?.(user);
      }
    } else {
      cachedAccessToken = null;
      onAuthNeedsToken?.(null);
    }
  });
};

export const googleSignIn = async (
  forceConsent = false,
  loginHint?: string | null
): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const authProvider = new GoogleAuthProvider();
    SCOPES.forEach((scope) => authProvider.addScope(scope));
    const params: Record<string, string> = {
      prompt: forceConsent ? 'consent' : 'select_account',
    };
    if (loginHint && loginHint.trim()) {
      params.login_hint = loginHint.trim();
    }
    authProvider.setCustomParameters(params);

    const result = await signInWithPopup(auth, authProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'Could not obtain a Google Workspace access token. Please grant Gmail and Drive permissions.'
      );
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const invalidateAccessToken = (): void => {
  cachedAccessToken = null;
};

export const logout = async (): Promise<void> => {
  cachedAccessToken = null;
  await auth.signOut();
};
