import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  team: string;
}

export interface LoginPageProps {
  onBackToLanding: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onBackToLanding,
  onLoginSuccess,
}) => {
  const [email, setEmail] = useState('alex.turner@enterprise-ops.io');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Please enter your operational password.');
      return;
    }

    setIsLoading(true);
    // Simulate instantaneous enterprise auth verification
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        email: email.trim(),
        role: email.includes('supervisor') ? 'Shift Supervisor' : 'Lead Operations Engineer',
        team: 'Platform Reliability (Tier 1)',
      });
    }, 450);
  };

  const handleQuickDemoFill = (type: 'lead' | 'supervisor') => {
    if (type === 'lead') {
      setEmail('alex.turner@enterprise-ops.io');
      setPassword('OpsLead2026!');
    } else {
      setEmail('supervisor@enterprise-ops.io');
      setPassword('Supervisor2026!');
    }
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-slate-900 font-sans flex flex-col justify-between selection:bg-blue-100 selection:text-blue-900 antialiased">
      {/* Top Header */}
      <header className="px-6 py-6 max-w-7xl w-full mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-950 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to ShiftFlow</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold font-mono text-xs shadow-xs">
            SF
          </div>
          <span className="font-bold text-slate-900 text-sm tracking-tight">ShiftFlow</span>
        </div>
      </header>

      {/* Center Auth Card */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-200/90 shadow-sm p-7 sm:p-9">
          {/* Card Header */}
          <div className="mb-7">
            <span className="text-[11px] font-semibold tracking-widest text-blue-700 uppercase mb-2 block">
              OPERATIONS PORTAL
            </span>
            <h1 className="text-2xl font-bold text-slate-950 tracking-tight">
              Sign in to ShiftFlow
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
              Access active shift records, timeline normalizers, and handover notes.
            </p>
          </div>

          {/* Error Notice */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Forgot Password Modal / Banner */}
          {showForgotNotice && (
            <div className="mb-5 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start justify-between gap-2">
              <div>
                <span className="font-semibold block mb-0.5">Enterprise Password Reset</span>
                <span>Contact your IT/IdP administrator or use Single Sign-On below.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotNotice(false)}
                className="text-blue-700 font-semibold text-xs hover:underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@enterprise-ops.io"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotNotice(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Remember this device for 30 days</span>
              </label>
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <span className="relative bg-white px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Or single sign-on
            </span>
          </div>

          {/* Enterprise SSO Button */}
          <button
            type="button"
            id="login-sso-btn"
            onClick={() => {
              onLoginSuccess({
                name: 'Alex Turner',
                email: 'alex.turner@enterprise-ops.io',
                role: 'Lead Operations Engineer',
                team: 'Platform Reliability (Tier 1)',
              });
            }}
            className="w-full py-2.5 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <Shield className="w-4 h-4 text-slate-500" />
            <span>Sign in with Enterprise SSO (Okta / Google)</span>
          </button>

          {/* 1-Click Demo Profiles */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Quick 1-Click Role Profiles
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemoFill('lead')}
                className="p-2 text-left rounded border border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/40 transition-colors cursor-pointer"
              >
                <span className="font-semibold text-slate-900 block truncate">Ops Engineer</span>
                <span className="text-[10px] text-slate-500 font-mono block truncate">
                  alex.turner@...
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('supervisor')}
                className="p-2 text-left rounded border border-slate-200 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/40 transition-colors cursor-pointer"
              >
                <span className="font-semibold text-slate-900 block truncate">Shift Supervisor</span>
                <span className="text-[10px] text-slate-500 font-mono block truncate">
                  supervisor@...
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="py-6 px-6 text-center text-xs text-slate-400 border-t border-slate-200/60">
        <span>© 2026 ShiftFlow • Operations Shift Handover Management</span>
      </footer>
    </div>
  );
};
