import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building, Shield, Lock, Mail, AlertCircle, Eye, EyeOff, CheckCircle2, RefreshCw } from 'lucide-react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { PhoneInput } from '../../components/auth/PhoneInput';
import { OtpInput } from '../../components/auth/OtpInput';
import { clearRecaptchaVerifier } from '../../firebase/auth';

export const Login: React.FC = () => {
  const { login, logout, sendOtp, loginWithOtp } = useAuth();
  const navigate = useNavigate();

  // Primary selections: authMethod and selectedRole
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  const [selectedRole, setSelectedRole] = useState<'owner' | 'customer'>('customer');

  // Email + Password states (defaulting to empty strings for production)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone + OTP states (defaulting to empty strings for production)
  const [phone, setPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  // UI/Error/Success states
  const [errorMsg, setErrorMsg] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // OTP Timer / Resend details
  const [verificationId, setVerificationId] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Cleanup reCAPTCHA verifier when this page unmounts.
  useEffect(() => {
    return () => { clearRecaptchaVerifier(); };
  }, []);

  // Countdown timer effect
  useEffect(() => {
    let timer: any;
    if (otpSent && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [otpSent, countdown]);


  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const userProfile = await login(email, password);
      
      // Strict role check
      if (userProfile.role !== selectedRole && userProfile.role !== 'admin') {
        await logout(); // Clear firebase session
        const roleLabel = selectedRole === 'owner' ? 'an Owner' : 'a Customer';
        throw new Error(`This email address is not registered as ${roleLabel}. Please select the correct account type.`);
      }

      setSuccess(true);
      setTimeout(() => {
        if (userProfile.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (userProfile.role === 'owner') {
          navigate('/owner/dashboard');
        } else {
          navigate('/dashboard');
        }
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneValid) {
      setPhoneError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const response = await sendOtp(phone, 'recaptcha-container');
      setVerificationId(response.verificationId);
      setCountdown(30);
      setCanResend(false);
      setOtp('');
      setOtpSent(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setErrorMsg('Please enter the 6-digit OTP.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      const userProfile = await loginWithOtp(verificationId, otp);
      
      // Strict role check
      if (userProfile.role !== selectedRole && userProfile.role !== 'admin') {
        await logout(); // Clear firebase session
        const roleLabel = selectedRole === 'owner' ? 'an Owner' : 'a Customer';
        throw new Error(`This mobile number is not registered as ${roleLabel}. Please choose the correct account type or register first.`);
      }

      setSuccess(true);
      setTimeout(() => {
        if (userProfile.role === 'admin') {
          navigate('/admin/dashboard');
        } else if (userProfile.role === 'owner') {
          navigate('/owner/dashboard');
        } else {
          navigate('/dashboard');
        }
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Incorrect OTP or verification session expired.');
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setErrorMsg('');
    setLoading(true);
    try {
      const response = await sendOtp(phone, 'recaptcha-container');
      setVerificationId(response.verificationId);
      setCountdown(30);
      setCanResend(false);
      setOtp('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="flex-1 flex items-center justify-center p-4 md:p-6 my-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-navy-100/10 dark:border-slate-700 shadow-2xl rounded-3xl overflow-hidden p-8 space-y-6 relative transition-all duration-300">
          
          {/* invisible reCAPTCHA container for Firebase */}
          <div id="recaptcha-container"></div>

          {/* Success screen overlay */}
          {success && (
            <div className="absolute inset-0 bg-white dark:bg-slate-800 z-50 flex flex-col items-center justify-center space-y-4 p-8 text-center animate-in fade-in duration-300">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 size={48} className="stroke-[2.5]" />
              </div>
              <h2 className="text-2xl font-black text-navy-900 dark:text-white">Authenticated!</h2>
              <p className="text-sm text-navy-450 dark:text-slate-400 font-medium">Entering your secure SAMS dashboard portal...</p>
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 bg-brand-600 dark:bg-brand-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Building size={24} />
            </div>
            <h1 className="text-2xl font-black text-navy-900 dark:text-slate-50 tracking-tight">SAMS Portal Login</h1>
            <p className="text-xs text-navy-450 dark:text-slate-455 font-semibold">Select your profile role and authentication method.</p>
          </div>

          {/* Segmented Controller 1: Role Type */}
          <div className="space-y-1">
            <span className="block text-[10px] font-black uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Account Role</span>
            <div className="flex bg-navy-50 dark:bg-slate-900 p-1 rounded-xl border border-navy-100/50 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('customer');
                  setErrorMsg('');
                }}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                  selectedRole === 'customer'
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-md'
                    : 'text-navy-450 dark:text-slate-400 hover:text-navy-700 dark:hover:text-slate-200'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('owner');
                  setErrorMsg('');
                }}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                  selectedRole === 'owner'
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-md'
                    : 'text-navy-450 dark:text-slate-400 hover:text-navy-700 dark:hover:text-slate-200'
                }`}
              >
                Apartment Owner
              </button>
            </div>
          </div>

          {/* Segmented Controller 2: Auth Method */}
          <div className="space-y-1">
            <span className="block text-[10px] font-black uppercase tracking-wider text-navy-400 dark:text-slate-400 mb-1.5">Login Method</span>
            <div className="flex bg-navy-50 dark:bg-slate-900 p-1 rounded-xl border border-navy-100/50 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('password');
                  setErrorMsg('');
                  setOtpSent(false);
                }}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                  authMethod === 'password'
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-md'
                    : 'text-navy-450 dark:text-slate-400 hover:text-navy-700 dark:hover:text-slate-200'
                }`}
              >
                Email & Password
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('otp');
                  setErrorMsg('');
                }}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                  authMethod === 'otp'
                    ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-white shadow-md'
                    : 'text-navy-450 dark:text-slate-400 hover:text-navy-700 dark:hover:text-slate-200'
                }`}
              >
                Mobile OTP
              </button>
            </div>
          </div>

          {/* Render Email Login form */}
          {authMethod === 'password' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-450 dark:text-slate-400 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-navy-400 dark:text-slate-500 w-5 h-5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm font-semibold text-navy-850 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-450 dark:text-slate-400 mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-navy-400 dark:text-slate-500 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-sm font-semibold text-navy-850 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-navy-400 hover:text-navy-600 dark:hover:text-slate-350"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl text-xs font-semibold text-red-800 dark:text-red-400 flex items-start space-x-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/10 active:scale-95 transition-all duration-200"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Render Mobile OTP form */}
          {authMethod === 'otp' && (
            <div className="space-y-4 pt-1">
              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-450 dark:text-slate-400 mb-1.5">Mobile Number</label>
                    <PhoneInput
                      value={phone}
                      onChange={(val, valid) => {
                        setPhone(val);
                        setPhoneValid(valid);
                      }}
                      error={phoneError}
                      setError={setPhoneError}
                    />
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl text-xs font-semibold text-red-800 dark:text-red-400 flex items-start space-x-2">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !phoneValid}
                    className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-navy-100 dark:disabled:bg-slate-700 disabled:text-navy-400 dark:disabled:text-slate-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/10 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Login OTP</span>
                        <Shield size={14} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtpLogin} className="space-y-6 animate-in fade-in duration-200">
                  <div className="text-center space-y-1">
                    <h3 className="font-extrabold text-sm text-navy-900 dark:text-white">Verify Mobile Number</h3>
                    <p className="text-xs text-navy-450 dark:text-slate-400">
                      OTP verification code has been sent to
                    </p>
                    <div className="flex items-center justify-center space-x-1.5 pt-1">
                      <span className="font-black text-sm text-navy-850 dark:text-slate-100">+91 {phone.slice(0, 5)} {phone.slice(5, 10)}</span>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <OtpInput value={otp} onChange={setOtp} error={!!errorMsg} />

                    <div className="flex items-center justify-between text-xs px-2">
                      <span className="text-navy-450 dark:text-slate-400 font-semibold">
                        {countdown > 0 ? (
                          `Resend in ${countdown}s`
                        ) : (
                          'Ready to resend'
                        )}
                      </span>

                      <button
                        type="button"
                        disabled={!canResend || loading}
                        onClick={handleResendOtp}
                        className={`flex items-center space-x-1.5 font-bold ${
                          canResend
                            ? 'text-brand-600 dark:text-brand-400 hover:underline'
                            : 'text-navy-300 dark:text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                        <span>Resend OTP</span>
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl text-xs font-semibold text-red-800 dark:text-red-400 flex items-start space-x-2">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otp.length < 6}
                    className="w-full py-3.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-700 hover:to-brand-800 disabled:from-navy-200 disabled:to-navy-200 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/10 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Verifying OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Login</span>
                        <Shield size={14} />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Bottom redirect link */}
          <div className="text-center text-xs font-semibold text-navy-500 dark:text-slate-400 border-t border-navy-50 dark:border-slate-700/50 pt-4 transition-colors">
            <span>New customer? </span>
            <Link to="/register" className="text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 hover:underline">
              Register Account
            </Link>
          </div>

        </div>
      </div>
    </PublicLayout>
  );
};
