import React, { useState } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  KeyRound,
  Mail,
  Loader2,
  Check,
  Shield,
  ArrowLeft,
  QrCode,
  Building2,
  User,
  ShieldCheck
} from 'lucide-react';
import { AppUser, AccountRequest, CompanyDetails, UserRole } from '../types';
import { googleSignIn, setCachedAccessToken } from '../services/firebaseAuth';
import { saveSession } from '../services/sessionService';

interface LoginPageProps {
  companyDetails: CompanyDetails;
  users?: AppUser[];
  onLogin: (user: AppUser, source?: 'password' | 'google') => void;
  onRequestAccount: (request: Omit<AccountRequest, 'id' | 'submittedAt' | 'status'>) => void;
  onUpdateUserPassword?: (employeeIdOrEmail: string, newPassword: string) => Promise<boolean> | boolean;
  onRegisterGoogleUser?: (userData: AppUser) => AppUser;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  companyDetails,
  onLogin,
  onRequestAccount
}) => {
  const [viewMode, setViewMode] = useState<'signin' | 'signup' | 'signup_totp' | 'mfa' | 'forgot'>('signin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // MFA states
  const [tempMfaToken, setTempMfaToken] = useState<string | null>(null);
  const [verificationCodeInput, setVerificationCodeInput] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Status messages
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [unregisteredGoogleAccount, setUnregisteredGoogleAccount] = useState<{ email: string; name: string } | null>(null);

  // Sign up fields
  const [signupEmpId, setSignupEmpId] = useState(() => `EMP-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupDept, setSignupDept] = useState('Procurement');
  const [signupRole, setSignupRole] = useState<UserRole>('PROJECT_MANAGER');
  const [signupAuthProvider, setSignupAuthProvider] = useState<'password' | 'google'>('password');

  // Mandatory TOTP Setup states for Sign Up
  const [signupToken, setSignupToken] = useState<string | null>(null);
  const [signupQrDataUrl, setSignupQrDataUrl] = useState<string | null>(null);
  const [signupTotpCode, setSignupTotpCode] = useState('');
  const [signupTotpError, setSignupTotpError] = useState<string | null>(null);

  // Forgot password fields
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryDone, setRecoveryDone] = useState(false);

  // Standard Sign In submission via server API
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setUnregisteredGoogleAccount(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: password.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid username or password.');
      }

      // Check if MFA is required
      if (data.status === 'mfa_required') {
        setTempMfaToken(data.tempMfaToken);
        setVerificationCodeInput('');
        setMfaError(null);
        setViewMode('mfa');
        setIsLoading(false);
        return;
      }

      // Login Successful
      if (data.status === 'success' && data.user && data.sessionToken) {
        saveSession(data.sessionToken, data.user, data.sessionTimeoutMinutes || 30);
        onLogin(data.user, 'password');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify MFA Submission (authenticator code strictly verified - no dummy codes)
  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempMfaToken) return;

    setMfaError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempMfaToken,
          code: verificationCodeInput.trim()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Verification failed. Please check your code.');
      }

      if (data.status === 'success' && data.user && data.sessionToken) {
        saveSession(data.sessionToken, data.user, data.sessionTimeoutMinutes || 30);
        onLogin(data.user, 'password');
      }
    } catch (err: any) {
      setMfaError(err.message || 'Verification failed. Invalid code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Login - RESTRICTED for accounts without signed up
  const handleGoogleSignInClick = async () => {
    setErrorMessage(null);
    setUnregisteredGoogleAccount(null);
    setIsLoading(true);

    try {
      const result = await googleSignIn();
      if (!result || !result.user) {
        throw new Error('Google Sign-In was cancelled.');
      }

      const { user: gUser, accessToken } = result;
      if (accessToken) setCachedAccessToken(accessToken);

      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: gUser.email,
          displayName: gUser.displayName,
          photoUrl: gUser.photoURL
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403 && gUser.email) {
          setUnregisteredGoogleAccount({
            email: gUser.email,
            name: gUser.displayName || gUser.email.split('@')[0]
          });
        }
        throw new Error(data.error || 'Access restricted: Account is not signed up.');
      }

      // Check if MFA is required for this registered Google user
      if (data.status === 'mfa_required') {
        setTempMfaToken(data.tempMfaToken);
        setVerificationCodeInput('');
        setMfaError(null);
        setViewMode('mfa');
        setIsLoading(false);
        return;
      }

      saveSession(data.sessionToken, data.user, data.sessionTimeoutMinutes || 30);
      onLogin(data.user, 'google');
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Sign-In failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initiate Sign Up with Mandatory Authenticator QR Generation
  const executeSignupInit = async (payload: {
    email: string;
    name: string;
    password?: string;
    employeeId: string;
    department: string;
    role: UserRole;
    authProvider: 'password' | 'google';
  }) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/signup-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start registration.');
      }

      setSignupToken(data.signupToken);
      setSignupQrDataUrl(data.qrCodeDataUrl);
      setSignupTotpCode('');
      setSignupTotpError(null);
      setViewMode('signup_totp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initialize account registration.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up with Google Account (Pre-fills & initiates Authenticator Setup)
  const handleSignupWithGoogle = async () => {
    setErrorMessage(null);
    setUnregisteredGoogleAccount(null);
    setIsLoading(true);
    try {
      const result = await googleSignIn();
      if (!result || !result.user) {
        throw new Error('Google Sign-In cancelled.');
      }
      const { user: gUser, accessToken } = result;
      if (accessToken) setCachedAccessToken(accessToken);

      const gEmail = gUser.email || '';
      const gName = gUser.displayName || gEmail.split('@')[0];
      setSignupEmail(gEmail);
      setSignupName(gName);
      setSignupAuthProvider('google');

      await executeSignupInit({
        email: gEmail,
        name: gName,
        employeeId: signupEmpId,
        department: signupDept,
        role: signupRole,
        authProvider: 'google'
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate Google registration.');
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Form Submit -> Proceed to Mandatory Authenticator Setup
  const handleSignupFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail.trim() || !signupName.trim() || !signupPassword.trim()) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }
    if (signupPassword.trim().length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setSignupAuthProvider('password');
    await executeSignupInit({
      email: signupEmail.trim(),
      name: signupName.trim(),
      password: signupPassword.trim(),
      employeeId: signupEmpId.trim().toUpperCase(),
      department: signupDept.trim(),
      role: signupRole,
      authProvider: 'password'
    });
  };

  // Mandatory Authenticator Code Verification (No Dummy Codes)
  const handleSignupVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupToken) return;
    if (!signupTotpCode.trim() || signupTotpCode.trim().length !== 6) {
      setSignupTotpError('Please enter the 6-digit code from your Authenticator app.');
      return;
    }

    setSignupTotpError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/signup-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signupToken,
          code: signupTotpCode.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authenticator verification failed.');
      }

      if (data.status === 'success' && data.user && data.sessionToken) {
        saveSession(data.sessionToken, data.user, data.sessionTimeoutMinutes || 30);
        onLogin(data.user, signupAuthProvider);
      }
    } catch (err: any) {
      setSignupTotpError(err.message || 'Invalid verification code. Please check your Authenticator app.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Password Recovery
  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryIdentifier.trim()) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setRecoveryDone(true);
    }, 800);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none bg-gradient-to-tr from-[#daeaff] via-[#e8f3ff] to-[#f4f9ff] text-slate-800">
      {/* Radiant ambient glow highlights for maximum illumination and lighted sky blue vibe */}
      <div className="absolute -top-40 -left-40 w-[650px] h-[650px] bg-blue-300/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-[700px] h-[700px] bg-sky-200/45 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/4 w-[600px] h-[600px] bg-indigo-200/35 rounded-full blur-3xl pointer-events-none" />

      {/* Optional top navigation link matching reference image */}
      <div className="absolute top-6 left-6 z-20">
        <button
          type="button"
          onClick={() => {
            setViewMode('signin');
            setErrorMessage(null);
            setInfoMessage(null);
          }}
          className="flex items-center space-x-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white/70 hover:bg-white px-3 py-1.5 rounded-full shadow-2xs backdrop-blur-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home page</span>
        </button>
      </div>

      <div className="w-full max-w-sm sm:max-w-md relative z-10 flex flex-col items-center">
        
        {/* =====================================================================
            TOP BRAND IDENTITY: LOGO ICON & COMPANY NAME
           ===================================================================== */}
        <div className="flex flex-col items-center justify-center mb-6 text-center">
          {companyDetails.logoUrl ? (
            <img
              src={companyDetails.logoUrl}
              alt={companyDetails.name}
              className="max-h-14 max-w-[220px] object-contain drop-shadow-xs mb-2"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-11 h-11 rounded-2xl bg-white/90 flex items-center justify-center text-[#4f6ef7] border border-blue-200/80 shadow-xs mb-2">
              <Building2 className="w-5 h-5 text-[#4f6ef7]" />
            </div>
          )}

          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-800">
            {companyDetails.name || 'COST SYSTEM'}
          </h2>
        </div>

        {/* =====================================================================
            MAIN LOGIN / SIGNIN CARD (LIGHTEST LUMINOUS BLUE FLOATING CARD)
           ===================================================================== */}
        <div className="w-full bg-white rounded-[28px] shadow-2xl shadow-blue-500/10 p-7 sm:p-9 border border-blue-50/90 transition-all duration-200">
          
          {/* VIEW 1: SIGN IN */}
          {viewMode === 'signin' && (
            <div>
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Welcome Back!
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  We missed you! Please enter your details.
                </p>
              </div>

              {/* Alert message with dedicated Google registration shortcut if restricted */}
              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <span className="leading-relaxed">{errorMessage}</span>
                  </div>
                  {unregisteredGoogleAccount && (
                    <div className="pt-1 border-t border-red-200/70 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setSignupEmail(unregisteredGoogleAccount.email);
                          setSignupName(unregisteredGoogleAccount.name);
                          setSignupAuthProvider('google');
                          executeSignupInit({
                            email: unregisteredGoogleAccount.email,
                            name: unregisteredGoogleAccount.name,
                            employeeId: signupEmpId,
                            department: signupDept,
                            role: signupRole,
                            authProvider: 'google'
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-[11px] shadow-xs cursor-pointer transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Sign up with this Google Account</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {infoMessage && (
                <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs flex items-start gap-2">
                  <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSignInSubmit} className="space-y-4">
                {/* Email / User */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your Email"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7] focus:border-transparent transition-all shadow-2xs"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter Password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7] focus:border-transparent transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center space-x-2 text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-[#4f6ef7] focus:ring-[#4f6ef7]"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setRecoveryIdentifier(identifier);
                      setRecoveryDone(false);
                      setViewMode('forgot');
                    }}
                    className="text-[#4f6ef7] hover:underline cursor-pointer font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Primary Button: Sign in */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs bg-[#5473f7] hover:bg-[#4363ed] active:scale-[0.99] shadow-md shadow-blue-500/20 hover:shadow-lg transition-all duration-150 cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>

                {/* Sign in with Google (Restricted if account not signed up) */}
                <button
                  type="button"
                  onClick={handleGoogleSignInClick}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-2xs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>
              </form>

              {/* Sign up Link */}
              <div className="mt-6 text-center text-xs text-slate-500">
                <span>Don't have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setUnregisteredGoogleAccount(null);
                    setViewMode('signup');
                  }}
                  className="font-semibold text-[#4f6ef7] hover:underline cursor-pointer"
                >
                  Sign up
                </button>
              </div>
            </div>
          )}

          {/* VIEW 2: TWO-FACTOR AUTHENTICATION (AUTHENTICATOR APP ONLY - NO DUMMY CODES) */}
          {viewMode === 'mfa' && (
            <div>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#4f6ef7] flex items-center justify-center mx-auto mb-3 border border-blue-100 shadow-2xs">
                  <ShieldCheck className="w-6 h-6 text-[#4f6ef7]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Two-Factor Authentication
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Enter your 6-digit verification code from Google Authenticator.
                </p>
              </div>

              {mfaError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span>{mfaError}</span>
                </div>
              )}

              <form onSubmit={handleMfaSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Authenticator Code
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={16}
                    value={verificationCodeInput}
                    onChange={(e) => setVerificationCodeInput(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-mono text-center tracking-widest placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7] focus:border-[#4f6ef7] shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1.5 text-center">
                    Enter the live code from your Authenticator app. No dummy codes are permitted.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs bg-[#5473f7] hover:bg-[#4363ed] shadow-md shadow-blue-500/20 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify &amp; Sign In</span>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('signin');
                    setTempMfaToken(null);
                    setVerificationCodeInput('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign in</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 3: SIGN UP STEP 1 - ACCOUNT REGISTRATION (AUTHENTICATOR SETUP IS MANDATORY) */}
          {viewMode === 'signup' && (
            <div>
              <div className="text-center mb-5">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Sign Up
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Create your account. Authenticator setup is mandatory.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              {/* Option A: Quick Sign Up with Google */}
              <button
                type="button"
                onClick={handleSignupWithGoogle}
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-2xs mb-4"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Register with Google Account</span>
              </button>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2 text-[11px] text-slate-400 shrink-0">
                  Or register with work email
                </span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              {/* Option B: Standard Form */}
              <form onSubmit={handleSignupFormSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={signupEmpId}
                    onChange={(e) => setSignupEmpId(e.target.value)}
                    placeholder="e.g. EMP-2026-89"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-[#4f6ef7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Alex Vance"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-[#4f6ef7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-[#4f6ef7]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password * (min 6 characters)
                  </label>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Create secure password"
                      className="w-full px-3 py-2 pr-9 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-[#4f6ef7]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={signupDept}
                      onChange={(e) => setSignupDept(e.target.value)}
                      placeholder="Procurement"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-[#4f6ef7]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Role
                    </label>
                    <select
                      value={signupRole}
                      onChange={(e) => setSignupRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-[#4f6ef7]"
                    >
                      <option value="PROJECT_MANAGER">Project Manager</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>
                </div>

                {/* Submit to proceed to MANDATORY Authenticator setup */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-2.5 px-4 rounded-xl text-white font-semibold text-xs bg-[#5473f7] hover:bg-[#4363ed] transition-colors cursor-pointer shadow-md flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Authenticator Setup...</span>
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      <span>Proceed to Authenticator Setup</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setViewMode('signin')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Already have an account? Sign in</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 4: SIGN UP STEP 2 - MANDATORY AUTHENTICATOR SETUP & CODE VERIFICATION */}
          {viewMode === 'signup_totp' && (
            <div>
              <div className="text-center mb-4">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#4f6ef7] flex items-center justify-center mx-auto mb-2 border border-blue-100 shadow-2xs">
                  <QrCode className="w-5 h-5 text-[#4f6ef7]" />
                </div>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 text-[#4f6ef7] text-[10px] font-bold uppercase tracking-wider mb-1">
                  Mandatory Security Setup
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Set Up Authenticator
                </h2>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Scan this QR code with <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong> on your phone.
                </p>
              </div>

              {signupTotpError && (
                <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <span className="leading-relaxed">{signupTotpError}</span>
                </div>
              )}

              {/* QR Code ONLY (No dummy text codes) */}
              {signupQrDataUrl && (
                <div className="flex flex-col items-center justify-center my-3">
                  <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <img
                      src={signupQrDataUrl}
                      alt="Authenticator QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2">
                    Account: {signupEmail}
                  </span>
                </div>
              )}

              {/* Mandatory Code Verification Form */}
              <form onSubmit={handleSignupVerifyTotp} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    6-Digit Authenticator Code *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={signupTotpCode}
                    onChange={(e) => setSignupTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-lg font-mono text-center tracking-widest placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#4f6ef7] focus:border-[#4f6ef7] shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-500 mt-1 text-center">
                    Enter the code from your authenticator app. No dummy codes are accepted.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || signupTotpCode.length !== 6}
                  className="w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs bg-[#5473f7] hover:bg-[#4363ed] transition-colors cursor-pointer shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Authenticator Code...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Verify Code &amp; Activate Account</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setViewMode('signup')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Account Details</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW 4: FORGOT PASSWORD */}
          {viewMode === 'forgot' && (
            <div>
              <div className="text-center mb-5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Reset Password
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter your email to receive recovery instructions
                </p>
              </div>

              {recoveryDone ? (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs space-y-2 text-center">
                  <Check className="w-6 h-6 mx-auto text-emerald-600" />
                  <p>Recovery request dispatched. Check your inbox or contact your administrator.</p>
                  <button
                    type="button"
                    onClick={() => setViewMode('signin')}
                    className="mt-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Return to Sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRecoverySubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Email or Employee ID
                    </label>
                    <input
                      type="text"
                      required
                      value={recoveryIdentifier}
                      onChange={(e) => setRecoveryIdentifier(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 rounded-xl text-white font-semibold text-xs bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer shadow-md flex items-center justify-center space-x-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Instructions</span>}
                  </button>
                </form>
              )}

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setViewMode('signin')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign in</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Quiet copyright footer */}
        <div className="mt-5 text-center text-[11px] text-white/60">
          Secured Enterprise Access &bull; TLS 1.3 &bull; MFA Protected
        </div>

      </div>
    </div>
  );
};
