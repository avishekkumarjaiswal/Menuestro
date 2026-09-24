import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminLayout, AdminTab } from './AdminLayout';
import { AdminDashboardView } from './AdminDashboardView';
import { AdminRestaurantsView } from './AdminRestaurantsView';
import { RestaurantDetailView } from './RestaurantDetailView';
import { ContentStudioView } from './ContentStudioView';
import { AdminAnalyticsView } from './AdminAnalyticsView';
import { AdminQRManagementView } from './AdminQRManagementView';
import { AdminActivityLogsView } from './AdminActivityLogsView';
import { AdminSettingsView } from './AdminSettingsView';
import { ShieldCheck, Lock, Mail, Key, LogIn, ArrowRight, AlertCircle, RefreshCw, Leaf } from 'lucide-react';
import { useToast } from '../common/Toast';

interface AdminDashboardProps {
  initialTab?: AdminTab;
  initialBusinessId?: string;
  onNavigateHome?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  initialTab = 'dashboard',
  initialBusinessId,
  onNavigateHome,
}) => {
  const { user, profile, isSuperAdmin, loading, signIn, signInWithGoogle } = useAuth();
  const { addToast } = useToast();

  const [currentTab, setCurrentTab] = useState<AdminTab>(initialTab);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(
    initialBusinessId || null
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Login form state for unauthorized / unauthenticated users
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Synchronize hash or tab
  useEffect(() => {
    if (initialTab) setCurrentTab(initialTab);
    if (initialBusinessId) {
      setSelectedBusinessId(initialBusinessId);
      setCurrentTab('restaurant-detail');
    }
  }, [initialTab, initialBusinessId]);

  const handleSelectTab = (tab: AdminTab, businessId?: string) => {
    if (businessId) {
      setSelectedBusinessId(businessId);
      setCurrentTab('restaurant-detail');
    } else {
      if (tab !== 'restaurant-detail') {
        setSelectedBusinessId(null);
      }
      setCurrentTab(tab);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectRestaurant = (businessId: string) => {
    setSelectedBusinessId(businessId);
    setCurrentTab('restaurant-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signIn(email, password);
      addToast('Signed in to Super Admin panel', 'success');
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || 'Invalid Super Admin credentials');
      addToast('Authentication failed', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await signInWithGoogle();
      addToast('Signed in to Super Admin panel', 'success');
    } catch (err: any) {
      setAuthError(err.message || 'Google sign-in failed');
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <p className="text-sm font-semibold tracking-wide">Authenticating Super Admin session...</p>
      </div>
    );
  }

  // If not authenticated or not a Super Admin, show the Super Admin security gate
  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#078A55]/20 border border-[#078A55]/30 flex items-center justify-center text-[#078A55] shadow-lg font-black text-xl mx-auto mb-3">
              <Leaf className="w-6 h-6 fill-[#078A55] text-[#078A55]" />
            </div>
            <h2 className="text-xl font-black text-white">Menuestro Super Admin</h2>
            <p className="text-xs text-slate-400 mt-1">
              Platform administration portal
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {user && !isSuperAdmin && (
            <div className="mb-5 p-4 rounded-2xl bg-amber-950/60 border border-amber-800/80 text-amber-200 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-white">Logged in as {user.email}</p>
                  <p className="text-amber-300/80 text-[11px] mt-0.5">
                    This account is not authorized for Super Admin access.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.history.pushState({}, '', '/');
                  window.location.href = '/';
                }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition text-center block"
              >
                Open My Restaurant Dashboard →
              </button>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@menuestro.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <LogIn className="w-4 h-4" />
              <span>{authLoading ? 'Verifying...' : 'Access Super Admin'}</span>
            </button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-slate-900 px-2 text-slate-500 font-bold">Or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={authLoading}
            className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition"
          >
            <span>Sign In with Google</span>
          </button>

          {onNavigateHome && (
            <div className="mt-6 text-center">
              <button
                onClick={onNavigateHome}
                className="text-xs text-slate-500 hover:text-slate-300 transition"
              >
                ← Return to Restaurant
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // RENDER MAIN SUPER ADMIN INTERFACE
  return (
    <AdminLayout
      currentTab={currentTab}
      onSelectTab={handleSelectTab}
      selectedBusinessId={selectedBusinessId}
      onOpenCreateRestaurantModal={() => setIsCreateModalOpen(true)}
    >
      {currentTab === 'dashboard' && (
        <AdminDashboardView
          onNavigateToRestaurants={() => handleSelectTab('restaurants')}
          onNavigateToRestaurantDetail={handleSelectRestaurant}
          onNavigateToContent={() => handleSelectTab('content')}
          onNavigateToActivity={() => handleSelectTab('activity')}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />
      )}

      {currentTab === 'restaurants' && (
        <AdminRestaurantsView
          onSelectRestaurant={handleSelectRestaurant}
          isCreateModalOpen={isCreateModalOpen}
          onCloseCreateModal={() => setIsCreateModalOpen(false)}
          onOpenCreateModal={() => setIsCreateModalOpen(true)}
        />
      )}

      {currentTab === 'restaurant-detail' && selectedBusinessId && (
        <RestaurantDetailView
          businessId={selectedBusinessId}
          onBack={() => handleSelectTab('restaurants')}
        />
      )}

      {currentTab === 'content' && <ContentStudioView />}

      {currentTab === 'analytics' && <AdminAnalyticsView />}

      {currentTab === 'qr' && <AdminQRManagementView />}

      {currentTab === 'activity' && <AdminActivityLogsView />}

      {currentTab === 'settings' && <AdminSettingsView />}
    </AdminLayout>
  );
};
