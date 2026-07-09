import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { 
  subscribeToAuthChanges, 
  logoutUser, 
  loginWithEmailPassword,
  sendOtp as firebaseSendOtp,
  loginWithOtp as firebaseLoginWithOtp,
  registerCustomer as firebaseRegisterCustomer,
  sendVerificationEmail as firebaseSendVerificationEmail
} from '../firebase/auth';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  loginWithOtp: (verificationId: string, otp: string) => Promise<UserProfile>;
  registerWithOtp: (
    email: string,
    password: string,
    displayName: string,
    phoneNumber: string,
    verificationId: string,
    otp: string
  ) => Promise<UserProfile>;
  sendOtp: (phone: string, recaptchaContainerId?: string) => Promise<{ verificationId: string }>;
  logout: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  isAdmin: boolean;
  isOwner: boolean;
  isCustomer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((profile) => {
      setUser(profile);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const profile = await loginWithEmailPassword(email, password);
      setUser(profile);
      return profile;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const loginWithOtp = async (verificationId: string, otp: string) => {
    setLoading(true);
    try {
      const profile = await firebaseLoginWithOtp(verificationId, otp);
      setUser(profile);
      return profile;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const registerWithOtp = async (
    email: string,
    password: string,
    displayName: string,
    phoneNumber: string,
    verificationId: string,
    otp: string
  ) => {
    setLoading(true);
    try {
      const profile = await firebaseRegisterCustomer(email, password, displayName, phoneNumber, verificationId, otp);
      setUser(profile);
      return profile;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const sendOtp = async (phone: string, recaptchaContainerId?: string) => {
    return await firebaseSendOtp(phone, recaptchaContainerId);
  };

  const sendVerificationEmail = async () => {
    await firebaseSendVerificationEmail();
  };

  const logout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isOwner = user?.role === 'owner';
  const isCustomer = user?.role === 'customer';

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      loginWithOtp, 
      registerWithOtp, 
      sendOtp, 
      logout,
      sendVerificationEmail,
      isAdmin, 
      isOwner, 
      isCustomer 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
