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
import { Utensils, Star, ExternalLink, QrCode } from 'lucide-react';

function MainRouter() {
  const { user, profile, isSuperAdmin, business, loading } = useAuth();
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

  // Check for public routes (supports paths, hashes, and query params)
  const hash = window.location.hash;
  const searchParams = new URLSearchParams(window.location.search);

  // 1. Digital Menu: /m/:slug, #/m/:slug, or ?m=:slug
  const menuMatch = currentPath.match(/^\/m\/([^/?#]+)/) || hash.match(/^#\/m\/([^/?#]+)/);
  const menuQuery = searchParams.get('m') || searchParams.get('menu');
  if (menuMatch || menuQuery) {
    return <PublicMenuPage slug={menuMatch ? menuMatch[1] : menuQuery!} />;
  }

  // 2. Google Review: /r/:slug, #/r/:slug, or ?r=:slug
  const reviewMatch = currentPath.match(/^\/r\/([^/?#]+)/) || hash.match(/^#\/r\/([^/?#]+)/);
  const reviewQuery = searchParams.get('r') || searchParams.get('review');
  if (reviewMatch || reviewQuery) {
    return <ReviewExperiencePage slug={reviewMatch ? reviewMatch[1] : reviewQuery!} />;
  }

  // 3. Combined Landing: /q/:slug, #/q/:slug, or ?q=:slug
  const combinedMatch = currentPath.match(/^\/q\/([^/?#]+)/) || hash.match(/^#\/q\/([^/?#]+)/);
  const combinedQuery = searchParams.get('q') || searchParams.get('qr');
  if (combinedMatch || combinedQuery) {
    return <CombinedLandingPage slug={combinedMatch ? combinedMatch[1] : combinedQuery!} />;
  }

  // 4. SUPER ADMIN ACCESS - STRICTLY FOR managebox02@gmail.com
  const isSuperAdminEmail = user?.email?.toLowerCase() === 'managebox02@gmail.com';
  const requestedAdminPath =
    currentPath.startsWith('/admin') ||
    hash.startsWith('#/admin') ||
    searchParams.has('admin');

  // If user is authenticated as Super Admin AND explicitly requested /admin
  if (user && isSuperAdminEmail && requestedAdminPath) {
    const adminRestaurantDetailMatch =
      currentPath.match(/^\/admin\/restaurants\/([^/?#]+)/) ||
      hash.match(/^#\/admin\/restaurants\/([^/?#]+)/);

    let initialTab: any = 'dashboard';
    if (currentPath.includes('/admin/restaurants') || hash.includes('#/admin/restaurants')) {
      initialTab = 'restaurants';
    } else if (currentPath.includes('/admin/content') || hash.includes('#/admin/content')) {
      initialTab = 'content';
    } else if (currentPath.includes('/admin/analytics') || hash.includes('#/admin/analytics')) {
      initialTab = 'analytics';
    } else if (currentPath.includes('/admin/qr') || hash.includes('#/admin/qr')) {
      initialTab = 'qr';
    } else if (currentPath.includes('/admin/activity') || hash.includes('#/admin/activity')) {
      initialTab = 'activity';
    } else if (currentPath.includes('/admin/settings') || hash.includes('#/admin/settings')) {
      initialTab = 'settings';
    }

    return (
      <AdminDashboard
        initialTab={initialTab}
        initialBusinessId={adminRestaurantDetailMatch ? adminRestaurantDetailMatch[1] : undefined}
        onNavigateHome={() => {
          window.history.pushState({}, '', '/');
          setCurrentPath('/');
        }}
      />
    );
  }

  // If unauthenticated user explicitly visits /admin, show the dedicated Super Admin login screen
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-9 h-9 border-3 border-[#078A55] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-[#667085]">Loading Menuestro...</p>
      </div>
    );
  }

  // Unauthenticated user -> AuthPage or default Super Admin login
  if (!user) {
    return <AuthPage />;
  }

  // If user explicitly navigated to /onboarding, show wizard
  if (currentPath === '/onboarding' || hash === '#/onboarding') {
    return <OnboardingWizard />;
  }

  // Authenticated user -> Direct to Home Dashboard page
  return <DashboardLayout />;
}

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
