import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { AuthPage } from './components/auth/AuthPage';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { RestaurantOnboardingScreen } from './components/onboarding/RestaurantOnboardingScreen';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PublicMenuPage } from './components/public/PublicMenuPage';
import { ReviewExperiencePage } from './components/public/ReviewExperiencePage';
import { CombinedLandingPage } from './components/public/CombinedLandingPage';
import { DiscoverPage } from './components/public/DiscoverPage';
import { PWAInstallPrompt } from './components/common/PWAInstallPrompt';

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
  const { user, isSuperAdmin, isUnassigned, business, application, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(window.location.pathname);
    const targetPath = path.split('?')[0];
    if (targetPath !== '/discover' && targetPath !== '/') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
  const combinedQuery = searchParams.get('qr');
  if (combinedMatch || combinedQuery) {
    return <CombinedLandingPage slug={combinedMatch ? combinedMatch[1] : combinedQuery!} />;
  }

  // ── 4. Public Discovery: /discover (Explicit route or search query) ───
  const isExplicitDiscover =
    currentPath === '/discover' ||
    hash === '#/discover' ||
    searchParams.has('discover') ||
    searchParams.has('q');

  if (isExplicitDiscover) {
    return (
      <DiscoverPage
        onNavigateLogin={() => navigateTo('/login')}
        onNavigateMenu={(slug) => navigateTo(`/m/${slug}`)}
        onNavigateDashboard={() => navigateTo('/')}
      />
    );
  }

  // ── 5. Loading ─────────────────────────────────────────────────────────
  if (loading) return <LoadingScreen />;

  // ── 6. Admin routes (Unauthenticated) ──────────────────────────────────
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
          navigateTo('/');
        }}
      />
    );
  }

  // ── 7. Not authenticated ───────────────────────────────────────────────
  if (!user) {
    const isExplicitAuth =
      currentPath === '/login' ||
      currentPath === '/signin' ||
      currentPath === '/auth' ||
      hash === '#/login' ||
      hash === '#/signin' ||
      hash === '#/auth' ||
      searchParams.has('login') ||
      searchParams.has('auth');

    const isExplicitOnboarding =
      currentPath === '/onboarding' ||
      hash === '#/onboarding';

    if (isExplicitOnboarding) {
      return <OnboardingWizard />;
    }

    if (isExplicitAuth) {
      return <AuthPage onNavigateDiscover={() => navigateTo('/discover')} />;
    }

    // Default unauthenticated visitor on homepage "/" sees Food Discovery
    return (
      <DiscoverPage
        onNavigateLogin={() => navigateTo('/login')}
        onNavigateMenu={(slug) => navigateTo(`/m/${slug}`)}
        onNavigateDashboard={() => navigateTo('/')}
      />
    );
  }

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
    return <RestaurantOnboardingScreen />;
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
