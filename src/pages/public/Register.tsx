import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building, User, Mail, Lock, Phone, AlertCircle, ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2, RefreshCw, Eye, EyeOff, Check, X } from 'lucide-react';
import { PublicLayout } from '../../layouts/PublicLayout';
import { PhoneInput } from '../../components/auth/PhoneInput';
import { OtpInput } from '../../components/auth/OtpInput';
import { clearRecaptchaVerifier } from '../../firebase/auth';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { registerWithOtp, sendOtp } = useAuth();

  // Multi-step: 1 = Details, 2 = Phone Input, 3 = OTP Verification
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneValid, setPhoneValid] = useState(false);
  const [otp, setOtp] = useState('');

  // Password Visibility Toggle
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // UI/Error states
  const [errorMsg, setErrorMsg] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // OTP Verification details
  const [verificationId, setVerificationId] = useState('');
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Password Checklist validation states
  const hasMinLength = password.length >= 8 && password.length <= 64;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const satisfiedCount = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  
  let strengthLabel = 'Weak';
  let strengthColor = 'bg-red-500';
  let strengthTextColor = 'text-red-500';

  if (satisfiedCount >= 5) {
    strengthLabel = 'Strong';
    strengthColor = 'bg-emerald-500';
    strengthTextColor = 'text-emerald-500';
  } else if (satisfiedCount >= 3) {
    strengthLabel = 'Medium';
    strengthColor = 'bg-amber-500';
    strengthTextColor = 'text-amber-500';
  }

  // Cleanup reCAPTCHA verifier when this page unmounts.
  // Without this, navigating away and back creates a second verifier on the
  // same #recaptcha-container DOM node, causing Firebase to throw:
  // "reCAPTCHA has already been rendered in this element"
  useEffect(() => {
    return () => { clearRecaptchaVerifier(); };
  }, []);

  // Timer Effect
  useEffect(() => {
    let timer: any;
    if (step === 3 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (satisfiedCount < 5) {
      setErrorMsg('Please satisfy all password strength rules before proceeding.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    
    setStep(2);
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
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setErrorMsg('Please enter the 6-digit code.');
      return;
    }

    setErrorMsg('');
    setLoading(true);
    try {
      await registerWithOtp(email, password, name, phone, verificationId, otp);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Try again.');
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

  const checklistItem = (label: string, satisfied: boolean) => (
    <div className="flex items-center space-x-2 text-[11px] font-semibold">
      {satisfied ? (
        <Check size={12} className="text-emerald-500 stroke-[3]" />
      ) : (
        <X size={12} className="text-navy-300 dark:text-slate-600 stroke-[3]" />
      )}
      <span className={satisfied ? 'text-emerald-600 dark:text-emerald-400' : 'text-navy-450 dark:text-slate-400'}>
        {label}
      </span>
    </div>
  );

  return (
    <PublicLayout>
      <div className="flex-1 flex items-center justify-center p-4 md:p-6 my-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 border border-navy-100/10 dark:border-slate-700 shadow-2xl rounded-3xl overflow-hidden p-8 space-y-6 relative transition-all duration-300">
          
          {/* reCAPTCHA target */}
          <div id="recaptcha-container"></div>

          {/* Success Overlay Screen */}
          {success && (
            <div className="absolute inset-0 bg-white dark:bg-slate-800 z-50 flex flex-col items-center justify-center space-y-4 p-8 text-center animate-in fade-in duration-300">
              <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                <CheckCircle2 size={48} className="stroke-[2.5]" />
              </div>
              <h2 className="text-2xl font-black text-navy-900 dark:text-white">Mobile Verified!</h2>
              <p className="text-sm text-navy-450 dark:text-slate-400 font-medium">Your account has been created successfully. Welcome to SAMS Portal.</p>
              <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {/* Stepper Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-12 h-12 bg-brand-600 dark:bg-brand-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Building size={24} />
            </div>
            <h1 className="text-2xl font-black text-navy-900 dark:text-slate-50 tracking-tight">Create SAMS Account</h1>
            
            <div className="flex items-center space-x-3 pt-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                step === 1 ? 'bg-brand-600 text-white ring-4 ring-brand-500/20' : 'bg-emerald-500 text-white'
              }`}>
                {step > 1 ? '✓' : '1'}
              </div>
              <div className={`h-0.5 w-6 rounded ${step > 1 ? 'bg-emerald-500' : 'bg-navy-100 dark:bg-slate-700'}`} />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                step === 2 
                  ? 'bg-brand-600 text-white ring-4 ring-brand-500/20' 
                  : step > 2 ? 'bg-emerald-500 text-white' : 'bg-navy-100 dark:bg-slate-700 text-navy-450 dark:text-slate-400'
              }`}>
                {step > 2 ? '✓' : '2'}
              </div>
              <div className={`h-0.5 w-6 rounded ${step > 2 ? 'bg-emerald-500' : 'bg-navy-100 dark:bg-slate-700'}`} />
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${
                step === 3 ? 'bg-brand-600 text-white ring-4 ring-brand-500/20' : 'bg-navy-100 dark:bg-slate-700 text-navy-450 dark:text-slate-400'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* STEP 1: Details */}
          {step === 1 && (
            <form onSubmit={handleNextStep1} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-450 dark:text-slate-400 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-navy-400 dark:text-slate-500 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter name"
                    className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm font-semibold text-navy-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-450 dark:text-slate-400 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-navy-400 dark:text-slate-500 w-5 h-5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm font-semibold text-navy-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-450 dark:text-slate-400 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-navy-400 dark:text-slate-500 w-5 h-5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter Password"
                      className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-sm font-semibold text-navy-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
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

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-navy-450 dark:text-slate-400 mb-1">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-navy-400 dark:text-slate-500 w-5 h-5" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm Password"
                      className="w-full bg-navy-50/50 dark:bg-transparent border border-navy-100 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-sm font-semibold text-navy-800 dark:text-slate-100 focus:outline-none focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-3 text-navy-400 hover:text-navy-600 dark:hover:text-slate-350"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Strength Checklist & Bar */}
              {password.length > 0 && (
                <div className="bg-navy-50/30 dark:bg-slate-900/40 p-4 rounded-2xl border border-navy-100/50 dark:border-slate-750 space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-navy-450 dark:text-slate-400">Password Strength:</span>
                    <span className={`font-black uppercase tracking-wider text-[11px] ${strengthTextColor}`}>{strengthLabel}</span>
                  </div>
                  
                  {/* Strength Bar */}
                  <div className="h-1.5 w-full bg-navy-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-300 ${strengthColor}`} style={{ width: `${(satisfiedCount / 5) * 100}%` }} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {checklistItem('Min 8 characters', hasMinLength)}
                    {checklistItem('Uppercase letter', hasUppercase)}
                    {checklistItem('Lowercase letter', hasLowercase)}
                    {checklistItem('Number digit', hasNumber)}
                    {checklistItem('Special character', hasSpecial)}
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl text-xs font-semibold text-red-800 dark:text-red-400 flex items-start space-x-2">
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/10 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
              >
                <span>Continue to Mobile Verification</span>
                <ArrowRight size={14} />
              </button>
            </form>
          )}

          {/* STEP 2: Phone input */}
          {step === 2 && (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="bg-blue-50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 flex items-start space-x-3">
                <ShieldCheck className="text-brand-500 mt-0.5 flex-shrink-0" size={18} />
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-xs text-navy-900 dark:text-white">Mobile Number Policy 📱</h4>
                  <p className="text-[10px] text-navy-450 dark:text-slate-400 leading-normal">Only valid +91 numbers are allowed. You will receive a verification code on this number.</p>
                </div>
              </div>

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

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-3 border border-navy-150 dark:border-slate-700 text-navy-600 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-navy-50/50 dark:hover:bg-slate-900 transition-colors flex items-center space-x-1"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={loading || !phoneValid}
                  className="flex-1 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-navy-100 dark:disabled:bg-slate-700 disabled:text-navy-400 dark:disabled:text-slate-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-brand-500/10 active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Send OTP</span>
                      <ShieldCheck size={14} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: OTP verify */}
          {step === 3 && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              
              <div className="text-center space-y-1">
                <h3 className="font-extrabold text-sm text-navy-900 dark:text-white">Verify Your Mobile Number</h3>
                <p className="text-xs text-navy-450 dark:text-slate-400">
                  Verification OTP code has been sent to
                </p>
                <div className="flex items-center justify-center space-x-1.5 pt-1">
                  <span className="font-black text-sm text-navy-850 dark:text-slate-100">+91 {phone.slice(0, 5)} {phone.slice(5, 10)}</span>
                  <button 
                    type="button" 
                    onClick={() => setStep(2)}
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
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Register</span>
                    <ShieldCheck size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Stepper Footer redirect */}
          <div className="text-center text-xs font-semibold text-navy-500 dark:text-slate-400 border-t border-navy-50 dark:border-slate-700/50 pt-4 transition-colors">
            <span>Already registered? </span>
            <Link to="/login" className="text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 hover:underline">
              Sign In
            </Link>
          </div>

        </div>
      </div>
    </PublicLayout>
  );
};
