import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DashboardView } from './DashboardView';
import { MenuManagementView } from './MenuManagementView';
import { QRManagementView } from './QRManagementView';
import { ReviewsView } from './ReviewsView';
import { SettingsView } from './SettingsView';
import { UpgradeModal } from './UpgradeModal';
import {
  LayoutDashboard,
  List,
  QrCode,
  Star,
  Settings,
  ExternalLink,
  LogOut,
  Menu as MenuIcon,
  X,
  Leaf,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'menu' | 'qr' | 'reviews' | 'settings';

export const DashboardLayout: React.FC = () => {
  const { user, business, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);

  const restaurantName = business?.name || 'The Artisan Bistro';
  const restaurantSlug = business?.slug || 'the-artisan-bistro';

  const navItems: { id: NavTab; label: string; mobileLabel: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Dashboard', icon: LayoutDashboard },
    { id: 'menu', label: 'Menu', mobileLabel: 'Menu', icon: List },
    { id: 'qr', label: 'QR Codes', mobileLabel: 'QR', icon: QrCode },
    { id: 'reviews', label: 'Review Library', mobileLabel: 'Review', icon: Star },
    { id: 'settings', label: 'Settings', mobileLabel: 'Settings', icon: Settings },
  ];

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col md:flex-row text-[#101828] antialiased font-sans">
      {/* Mobile Top App Bar */}
      <header className="md:hidden bg-[#0B1220] text-white px-4 h-[64px] flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-[#078A55]/20 text-[#078A55] flex items-center justify-center">
            <Leaf className="w-4 h-4 fill-[#078A55] text-[#078A55]" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Menuestro</span>
        </div>

        <div className="flex items-center gap-2">

          <a
            href={`/m/${restaurantSlug}`}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 text-slate-200 hover:text-white rounded-[8px] bg-white/10 text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
          >
            <span>Live Menu</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </a>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-[8px] cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Desktop Left Sidebar (280px fixed width, #0B1220 background) */}
      <aside className="hidden md:flex flex-col w-[280px] bg-[#0B1220] shrink-0 h-screen sticky top-0 justify-between select-none border-r border-[#111B2B]">
        <div>
          {/* Brand Logo Header (72px height, 24px padding) */}
          <div className="h-[72px] px-6 flex items-center gap-3 border-b border-[#111B2B]">
            <div className="w-8 h-8 rounded-[8px] bg-[#078A55]/20 flex items-center justify-center text-[#078A55]">
              <Leaf className="w-4 h-4 fill-[#078A55] text-[#078A55]" />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">
              Menuestro
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full h-12 flex items-center gap-3.5 px-4 rounded-[10px] text-sm font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-[#1C293D] text-white'
                      : 'text-[#98A2B3] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-[#98A2B3]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User / Business Card */}
        <div className="p-4 space-y-3 border-t border-[#111B2B]">


          <div className="p-3.5 bg-[#111B2B] border border-slate-800/80 rounded-[12px] space-y-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#078A55] shrink-0" />
                <p className="text-xs font-bold text-white truncate">
                  {restaurantName}
                </p>
              </div>
              <p className="text-[11px] text-[#98A2B3] font-normal pl-4 mt-0.5">
                Free Plan
              </p>
            </div>

            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="w-full h-9 rounded-[8px] bg-[#078A55] hover:bg-[#067548] text-white font-semibold text-xs transition-all active:scale-[0.98] cursor-pointer text-center"
            >
              Upgrade
            </button>
          </div>

          {/* Live Menu Link & Sign Out */}
          <div className="flex items-center justify-between px-2 text-xs text-[#98A2B3]">
            <a
              href={`/m/${restaurantSlug}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <span>View live menu</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={logout}
              className="hover:text-rose-400 transition-colors cursor-pointer text-xs"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (Hamburger Menu) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#0F172A]/60 backdrop-blur-[4px] flex flex-col justify-end">
          <div className="bg-[#0B1220] rounded-t-[20px] p-6 space-y-4 border-t border-slate-800 text-white animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="font-semibold text-base text-white">Menu Navigation</span>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="cursor-pointer text-slate-400 hover:text-white p-1"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleTabChange(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-[10px] text-sm font-semibold transition-all cursor-pointer ${
                      active ? 'bg-[#1C293D] text-white' : 'text-[#98A2B3] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 p-3 text-rose-400 font-semibold text-xs border border-rose-900/50 rounded-[10px] hover:bg-rose-950/20 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area (Unified Layout: max-width 1440px, padding 40px desktop, 24px tablet, 16px mobile) */}
      <main
        ref={mainContentRef}
        className="flex-1 w-full max-w-[1440px] mx-auto p-4 sm:p-6 md:p-10 pb-28 sm:pb-32 md:pb-10 overflow-x-hidden"
      >
        {activeTab === 'dashboard' && <DashboardView onNavigate={handleTabChange} />}
        {activeTab === 'menu' && <MenuManagementView />}
        {activeTab === 'qr' && <QRManagementView />}
        {activeTab === 'reviews' && <ReviewsView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav 
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0B1220] border-t border-slate-800 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))] flex items-center justify-around z-30 shadow-lg"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`flex flex-col items-center py-1 px-3 rounded-[8px] text-[11px] font-semibold transition-colors cursor-pointer ${
                active ? 'text-[#078A55] font-bold' : 'text-[#98A2B3]'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${active ? 'text-[#078A55]' : 'text-[#98A2B3]'}`} />
              <span>{item.mobileLabel || item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Upgrade Pro Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
};
