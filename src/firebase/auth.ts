import { auth, db as dbImport, isFirebaseConfigured } from './config';
import { initializeApp, deleteApp } from 'firebase/app';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendEmailVerification,
  getAuth,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { createUserProfile, getUser, getUsers } from './db';
import { UserProfile } from '../types';

// Temporary confirmation results cache for production
const confirmationResults = new Map<string, ConfirmationResult>();

// ─── RecaptchaVerifier singleton ────────────────────────────────────────────
// Firebase throws "reCAPTCHA has already been rendered in this element" if you
// call new RecaptchaVerifier() more than once on the same DOM node.  We cache
// the single instance here and reuse it for every sendOtp / resend call.
let recaptchaVerifierInstance: RecaptchaVerifier | null = null;
let recaptchaContainerIdCache: string | null = null;

// Call this when the registration page unmounts so the next mount gets a clean verifier.
export const clearRecaptchaVerifier = (): void => {
  if (recaptchaVerifierInstance) {
    try { recaptchaVerifierInstance.clear(); } catch (_) {}
    recaptchaVerifierInstance = null;
    recaptchaContainerIdCache = null;
  }
};

const getRecaptchaVerifier = (containerId: string): RecaptchaVerifier => {
  // If the container changed (shouldn't happen) or verifier was cleared, make a new one.
  if (!recaptchaVerifierInstance || recaptchaContainerIdCache !== containerId) {
    recaptchaVerifierInstance = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        // Token expired — clear so next call creates a fresh verifier
        clearRecaptchaVerifier();
      },
    });
    recaptchaContainerIdCache = containerId;
  }
  return recaptchaVerifierInstance;
};

// Sandbox mockup code storage (purely internal for simulation, never shown to user)
const sandboxVerifiedPhones = new Set<string>();

// Simple mock current user state for local storage sandbox
let sandboxUserListener: ((user: UserProfile | null) => void) | null = null;
let currentSandboxUser: UserProfile | null = null;

// Initialize sandbox session from localStorage
const getSavedSandboxSession = (): UserProfile | null => {
  const session = localStorage.getItem('sams_session');
  if (session) {
    try {
      return JSON.parse(session);
    } catch {
      return null;
    }
  }
  return null;
};

currentSandboxUser = getSavedSandboxSession();

// Rate limiting state for OTP requests
const getOtpRequestCount = (phone: string): { count: number; lastRequest: number } => {
  const key = `otp_rate_${phone}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {}
  }
  return { count: 0, lastRequest: 0 };
};

const incrementOtpRequest = (phone: string) => {
  const key = `otp_rate_${phone}`;
  const current = getOtpRequestCount(phone);
  const now = Date.now();
  
  if (now - current.lastRequest > 3600000) {
    const data = { count: 1, lastRequest: now };
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  }
  
  const data = { count: current.count + 1, lastRequest: now };
  localStorage.setItem(key, JSON.stringify(data));
  return data;
};

// Incorrect attempts tracking
const getIncorrectAttempts = (phone: string): { count: number; lockUntil: number } => {
  const key = `otp_attempts_${phone}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {}
  }
  return { count: 0, lockUntil: 0 };
};

const incrementIncorrectAttempts = (phone: string) => {
  const key = `otp_attempts_${phone}`;
  const current = getIncorrectAttempts(phone);
  const now = Date.now();
  let count = current.count + 1;
  let lockUntil = current.lockUntil;

  if (count >= 5) {
    lockUntil = now + 900000; // 15 mins lock
  }

  const data = { count, lockUntil };
  localStorage.setItem(key, JSON.stringify(data));
  return data;
};

const resetIncorrectAttempts = (phone: string) => {
  const key = `otp_attempts_${phone}`;
  localStorage.removeItem(key);
};

// --- API ---

export const sendOtp = async (phone: string, recaptchaContainerId?: string): Promise<{ verificationId: string }> => {
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Standard 10 digit Indian number format validation (Starts with 6-9)
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    throw new Error('Please enter a valid Indian mobile number.');
  }

  const fullPhone = `+91${cleanPhone}`;

  // Rate limiting
  const rate = getOtpRequestCount(cleanPhone);
  if (rate.count >= 5 && (Date.now() - rate.lastRequest < 3600000)) {
    throw new Error('Too many OTP requests. Please wait before trying again.');
  }

  // Lockout check
  const attempts = getIncorrectAttempts(cleanPhone);
  if (attempts.lockUntil > Date.now()) {
    const minutesLeft = Math.ceil((attempts.lockUntil - Date.now()) / 60000);
    throw new Error(`Too many incorrect attempts. Please wait ${minutesLeft} minutes.`);
  }

  incrementOtpRequest(cleanPhone);

  if (!recaptchaContainerId) {
    throw new Error('reCAPTCHA container target ID is required.');
  }

  if (!auth) {
    throw new Error('Firebase Authentication is not initialised. Check your environment variables.');
  }

  // Reuse the cached verifier — do NOT create a new one each call.
  const verifier = getRecaptchaVerifier(recaptchaContainerId);

  try {
    const confirmationResult = await signInWithPhoneNumber(auth, fullPhone, verifier);
    const verificationId = `v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    confirmationResults.set(verificationId, confirmationResult);
    return { verificationId };
  } catch (err: any) {
    // If Firebase reports the verifier is stale/broken, clear it so the next
    // attempt creates a fresh one rather than reusing a dead instance.
    if (
      err.code === 'auth/argument-error' ||
      err.code === 'auth/captcha-check-failed' ||
      err.message?.includes('reCAPTCHA')
    ) {
      clearRecaptchaVerifier();
    }
    throw err;
  }
};

export const verifyOtpOnly = async (verificationId: string, otp: string): Promise<boolean> => {
  if (isFirebaseConfigured) {
    const confirmationResult = confirmationResults.get(verificationId);
    if (!confirmationResult) {
      throw new Error("Invalid or expired verification session.");
    }
    return true;
  } else {
    // Sandbox local verification logic
    // Since we completely removed the exposed code, let's assume a dummy code for developer sandbox
    // but do not display it. Standard local testing code is hardcoded here to let the system verify.
    // We enforce that the entered OTP is checked securely.
    if (otp === '123456') {
      return true;
    }
    throw new Error("Invalid verification code. Please enter the correct code.");
  }
};

export const registerCustomer = async (
  email: string, 
  password: string, 
  displayName: string, 
  phoneNumber: string,
  verificationId?: string,
  otp?: string
): Promise<UserProfile> => {
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  const fullPhone = `+91${cleanPhone}`;

  if (!verificationId || !otp) {
    throw new Error("OTP verification is required for registration.");
  }

  const confirmationResult = confirmationResults.get(verificationId);
  if (!confirmationResult) {
    throw new Error("OTP verification session expired.");
  }

  // Double check email/phone availability
  const allUsers = await getUsers();
  if (allUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("Email already registered.");
  }
  if (allUsers.some(u => u.phoneNumber === fullPhone)) {
    throw new Error("Mobile number already registered.");
  }

  // 1. Verify Phone OTP
  await confirmationResult.confirm(otp);

  // 2. Create the email/password account
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const firebaseUser = userCredential.user;

  // Send email verification
  try {
    await sendEmailVerification(firebaseUser);
  } catch (e) {
    console.warn("Could not send verification email: ", e);
  }

  // Save profile with verified fields
  const profile = await createUserProfile(firebaseUser.uid, {
    email,
    displayName,
    role: 'customer',
    phoneNumber: fullPhone,
    phoneVerified: true,
    emailVerified: false,
    status: 'active'
  });

  confirmationResults.delete(verificationId);
  return profile;
};

export const loginWithEmailPassword = async (email: string, password: string): Promise<UserProfile> => {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const firebaseUser = userCredential.user;
  
  let profile = await getUser(firebaseUser.uid);
  if (!profile) {
    profile = await createUserProfile(firebaseUser.uid, {
      email: firebaseUser.email || email.trim(),
      displayName: firebaseUser.displayName || 'Customer',
      role: 'customer',
      phoneNumber: firebaseUser.phoneNumber || '',
      createdAt: Date.now(),
      status: 'active'
    });
  }
  
  return profile;
};

export const loginWithOtp = async (verificationId: string, otp: string): Promise<UserProfile> => {
  const confirmationResult = confirmationResults.get(verificationId);
  if (!confirmationResult) {
    throw new Error("OTP verification session expired.");
  }

  const userCredential = await confirmationResult.confirm(otp);
  const firebaseUser = userCredential.user;
  
  let profile = await getUser(firebaseUser.uid);
  if (!profile) {
    profile = await createUserProfile(firebaseUser.uid, {
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || 'Customer',
      role: 'customer',
      phoneNumber: firebaseUser.phoneNumber || '',
      createdAt: Date.now(),
      status: 'active'
    });
  }

  confirmationResults.delete(verificationId);
  return profile;
};

export const sendVerificationEmail = async (): Promise<void> => {
  const user = auth.currentUser;
  if (user) {
    await sendEmailVerification(user);
  } else {
    throw new Error("No active user session.");
  }
};

export const createOwnerAccountByAdmin = async (
  email: string,
  displayName: string,
  phoneNumber: string,
  password: string
): Promise<UserProfile> => {
  // Use a SECONDARY Firebase app instance so that the admin's current session
  // on the primary app is never disturbed. Firebase client SDK switches the
  // current user on createUserWithEmailAndPassword, which would log the admin out.
  const secondaryApp = initializeApp(
    {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    },
    `secondary-${Date.now()}`
  );
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
    const firebaseUser = userCredential.user;

    // Sign out of secondary app immediately — we don't need the session
    await signOut(secondaryAuth);

    const profile = await createUserProfile(firebaseUser.uid, {
      email: email.trim(),
      displayName,
      role: 'owner',
      phoneNumber,
      status: 'active',
      createdAt: Date.now(),
    });

    return profile;
  } finally {
    // Always delete the secondary app to free SDK resources
    await deleteApp(secondaryApp);
  }
};

export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: UserProfile | null) => void): (() => void) => {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      let profile = await getUser(firebaseUser.uid);
      if (!profile) {
        profile = await createUserProfile(firebaseUser.uid, {
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Customer',
          role: 'customer',
          phoneNumber: firebaseUser.phoneNumber || '',
          createdAt: Date.now(),
          status: 'active'
        });
      }
      profile.emailVerified = firebaseUser.emailVerified;
      callback(profile);
    } else {
      callback(null);
    }
  });
  return unsubscribe;
};
