import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { AuthPage } from './components/auth/AuthPage';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PublicMenuPage } from './components/public/PublicMenuPage';
import { ReviewExperiencePage } from './components/public/ReviewExperiencePage';
import { CombinedLandingPage } from './components/public/CombinedLandingPage';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';
import { LogOut, ShieldAlert } from 'lucide-react';

// ─── Not Assigned Screen ──────────────────────────────────────────────────
function NotAssignedScreen() {
  const { logout, user } = useAuth();
  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-5">
        <ShieldAlert className="w-8 h-8 text-amber-500" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">No Restaurant Assigned</h1>
      <p className="text-sm text-slate-600 max-w-sm leading-relaxed mb-1">
        Your account is not assigned to a restaurant.
      </p>
      <p className="text-sm text-slate-500 max-w-sm leading-relaxed mb-6">
        Please contact Menuestro administration to have your email assigned to a restaurant.
      </p>
      <p className="text-xs text-slate-400 font-mono mb-6 bg-slate-100 px-3 py-1.5 rounded-lg">
        {user?.email}
      </p>
      <button
        onClick={logout}
        className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  );
}

// ─── Loading Screen ────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-9 h-9 border-3 border-[#078A55] border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-xs font-semibold text-[#667085]">Loading Menuestro...</p>
    </div>
  );
}

// ─── Main Router ──────────────────────────────────────────────────────────
function MainRouter() {
  const { user, isSuperAdmin, isUnassigned, business, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentPath]);

  const hash = window.location.hash;
  const searchParams = new URLSearchParams(window.location.search);

  // ── 1. Public: Digital Menu  /m/:slug ─────────────────────────────────
  const menuMatch = currentPath.match(/^\/m\/([^/?#]+)/) || hash.match(/^#\/m\/([^/?#]+)/);
  const menuQuery = searchParams.get('m') || searchParams.get('menu');
  if (menuMatch || menuQuery) {
    return <PublicMenuPage slug={menuMatch ? menuMatch[1] : menuQuery!} />;
  }

  // ── 2. Public: Google Review  /r/:slug ────────────────────────────────
  const reviewMatch = currentPath.match(/^\/r\/([^/?#]+)/) || hash.match(/^#\/r\/([^/?#]+)/);
  const reviewQuery = searchParams.get('r') || searchParams.get('review');
  if (reviewMatch || reviewQuery) {
    return <ReviewExperiencePage slug={reviewMatch ? reviewMatch[1] : reviewQuery!} />;
  }

  // ── 3. Public: Combined QR  /q/:slug ──────────────────────────────────
  const combinedMatch = currentPath.match(/^\/q\/([^/?#]+)/) || hash.match(/^#\/q\/([^/?#]+)/);
  const combinedQuery = searchParams.get('q') || searchParams.get('qr');
  if (combinedMatch || combinedQuery) {
    return <CombinedLandingPage slug={combinedMatch ? combinedMatch[1] : combinedQuery!} />;
  }

  // ── 4. Admin routes ────────────────────────────────────────────────────
  const requestedAdminPath =
    currentPath.startsWith('/admin') ||
    hash.startsWith('#/admin') ||
    searchParams.has('admin');

  // Unauthenticated user visiting /admin → show admin login
  if (!user && requestedAdminPath) {
    return (
      <AdminDashboard
        initialTab="dashboard"
        onNavigateHome={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }}
      />
    );
  }

  // ── 5. Loading ─────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen />;

  // ── 6. Not authenticated ───────────────────────────────────────────────
  if (!user) return <AuthPage />;

  // ── 7. Super Admin access ──────────────────────────────────────────────
  // Super admins go to /admin and ONLY /admin. They never see a restaurant dashboard.
  if (isSuperAdmin) {
    // If they haven't navigated to /admin yet, redirect them there
    if (!requestedAdminPath) {
      window.history.replaceState({}, '', '/admin');
      setCurrentPath('/admin');
    }

    const adminRestaurantDetailMatch =
      currentPath.match(/^\/admin\/restaurants\/([^/?#]+)/) ||
      hash.match(/^#\/admin\/restaurants\/([^/?#]+)/);

    let initialTab: any = 'dashboard';
    if (currentPath.includes('/admin/restaurants') || hash.includes('#/admin/restaurants')) initialTab = 'restaurants';
    else if (currentPath.includes('/admin/content') || hash.includes('#/admin/content')) initialTab = 'content';
    else if (currentPath.includes('/admin/analytics') || hash.includes('#/admin/analytics')) initialTab = 'analytics';
    else if (currentPath.includes('/admin/qr') || hash.includes('#/admin/qr')) initialTab = 'qr';
    else if (currentPath.includes('/admin/activity') || hash.includes('#/admin/activity')) initialTab = 'activity';
    else if (currentPath.includes('/admin/settings') || hash.includes('#/admin/settings')) initialTab = 'settings';

    return (
      <AdminDashboard
        initialTab={initialTab}
        initialBusinessId={adminRestaurantDetailMatch ? adminRestaurantDetailMatch[1] : undefined}
        onNavigateHome={() => {
          window.history.pushState({}, '', '/admin');
          setCurrentPath('/admin');
        }}
      />
    );
  }

  // ── 8. Manager: restaurant manager tries /admin → deny silently ────────
  if (requestedAdminPath) {
    // Replace with their restaurant dashboard (or not-assigned if no business)
    window.history.replaceState({}, '', '/');
    setCurrentPath('/');
  }

  // ── 9. Authenticated manager with no restaurant assignment ─────────────
  if (isUnassigned) {
    return <NotAssignedScreen />;
  }

  // ── 10. Authenticated manager with their restaurant ────────────────────
  if (business) {
    // Block /onboarding for already-assigned managers
    if (currentPath === '/onboarding' || hash === '#/onboarding') {
      window.history.replaceState({}, '', '/');
      setCurrentPath('/');
    }
    return <DashboardLayout />;
  }

  // ── 11. New self-signup user: no pre-assignment → Onboarding Wizard ────
  if (currentPath === '/onboarding' || hash === '#/onboarding') {
    return <OnboardingWizard />;
  }

  // Fallback loading state (should not normally be reached)
  return <LoadingScreen />;
}

// ─── Root ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainRouter />
        <PWAInstallPrompt />
      </AuthProvider>
    </ToastProvider>
  );
}
