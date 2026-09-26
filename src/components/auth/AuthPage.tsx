import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { auth } from '../../lib/firebase';
import { QrCode, Star, BarChart3, Leaf, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export interface AuthPageProps {
  onNavigateDiscover?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onNavigateDiscover }) => {
  const { signIn, signUp, signInWithGoogle, sendPasswordReset, refreshBusiness } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast('Please enter your email address', 'error');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        if (!password) {
          showToast('Please enter your password', 'error');
          setLoading(false);
          return;
        }
        await signIn(email, password);
        showToast('Welcome back to Menuestro!');
      } else if (mode === 'signup') {
        if (!password || password.length < 6) {
          showToast('Password must be at least 6 characters', 'error');
          setLoading(false);
          return;
        }
        await signUp(email, password, name);
        showToast('Account created successfully! Welcome to Menuestro.');
      } else if (mode === 'forgot') {
        await sendPasswordReset(email);
        showToast('Password reset email sent! Check your inbox.');
        setMode('login');
      }
    } catch (err: any) {
      console.error(err);
      let msg = 'Authentication failed. Please check your credentials.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Invalid email or password.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Try signing in.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak. Please use at least 6 characters.';
      }
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      showToast('Signed in with Google!');
    } catch (err: any) {
      console.error(err);
      showToast('Google sign-in was cancelled or failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md lg:max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col lg:flex-row">
        {/* Left Brand Panel (Desktop only) */}
        <div className="hidden lg:flex lg:w-5/12 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white p-8 lg:p-10 flex-col justify-between relative overflow-hidden shrink-0">
          {/* Subtle background glow & restaurant atmosphere overlay */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80')] bg-cover bg-center opacity-15 mix-blend-overlay pointer-events-none" />
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#078A55]/20 flex items-center justify-center text-[#078A55] border border-[#078A55]/30">
                <Leaf className="w-5 h-5 fill-[#078A55] text-[#078A55]" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                Menuestro
              </span>
            </div>

            <div className="mt-10">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white leading-tight">
                Digital Menus & 5-Star Reviews.
              </h1>
              <p className="mt-3 text-slate-300 text-xs leading-relaxed">
                Empowering modern restaurants with high-speed digital menus, smart Google reviews, and actionable dining analytics.
              </p>
            </div>
          </div>

          <div className="relative z-10 space-y-2.5 my-6">
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
                <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Digital Menus</p>
                <p className="text-[10px] text-slate-400">Zero lag instant scans with allergen tags.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <Star className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Google Reviews</p>
                <p className="text-[10px] text-slate-400">Turn happy diners into 5-star verified reviews.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Real Insights</p>
                <p className="text-[10px] text-slate-400">Track dish popularities and QR scan counts.</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-[11px] text-slate-400">
            Trusted by 500+ restaurants, cafes & cloud kitchens.
          </div>
        </div>

        {/* Right Form Panel (Universal) */}
        <div className="w-full lg:w-7/12 p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
          <div className="max-w-sm w-full mx-auto">
            {/* Mobile Header Logo */}
            <div className="flex lg:hidden items-center justify-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-xl bg-[#078A55]/20 flex items-center justify-center text-[#078A55] border border-[#078A55]/30">
                <Leaf className="w-5 h-5 fill-[#078A55] text-[#078A55]" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Menuestro
              </span>
            </div>

            {/* Mode switch header */}
            <div className="mb-6 text-center lg:text-left">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {mode === 'login' && 'Welcome back'}
                {mode === 'signup' && 'Create your restaurant account'}
                {mode === 'forgot' && 'Reset your password'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {mode === 'login' && 'Sign in to your account to manage your menu & reviews.'}
                {mode === 'signup' && 'Get your digital menu & review system live in under 5 minutes.'}
                {mode === 'forgot' && 'Enter your email address to receive password reset instructions.'}
              </p>
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Chef Ravi"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm transition-all bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@restaurant.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm transition-all bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm transition-all bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    <span>Remember me</span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#078A55] hover:bg-[#067347] text-white text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'login' && 'Sign in'}
                      {mode === 'signup' && 'Create Restaurant Profile'}
                      {mode === 'forgot' && 'Send Reset Link'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative flex items-center justify-center my-5">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium absolute">
                - or continue with -
              </span>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors shadow-xs cursor-pointer"
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
              <span>Continue with Google</span>
            </button>

            {/* Bottom switcher */}
            <div className="mt-6 text-center text-xs text-slate-500 space-y-3">
              <div>
                {mode === 'login' ? (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('signup')}
                      className="font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onNavigateDiscover || (() => { window.location.href = '/discover'; })}
                  className="text-xs font-medium text-slate-500 hover:text-emerald-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Looking for food?</span>
                  <span className="font-semibold underline">Search dishes on Menuestro →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
