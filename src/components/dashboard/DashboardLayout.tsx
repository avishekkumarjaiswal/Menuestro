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
  Leaf,
  MoreHorizontal,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'menu' | 'qr' | 'reviews' | 'settings';

export const DashboardLayout: React.FC = () => {
  const { user, business, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);

  const restaurantName = business?.name || 'Restaurant';
  const restaurantSlug = business?.slug || '';

  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'menu', label: 'Menu', icon: List },
    { id: 'qr', label: 'QR Standees', icon: QrCode },
    { id: 'reviews', label: 'Review Library', icon: Star },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Mobile Bottom Navigation Tabs (Home, Menu, QR, Reviews, More)
  const mobileBottomNav: { id: NavTab | 'more'; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'menu', label: 'Menu', icon: List },
    { id: 'qr', label: 'QR', icon: QrCode },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    setIsMoreSheetOpen(false);
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
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row text-slate-900 antialiased font-sans">
      {/* Mobile Fixed Top App Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0F172A] text-white px-4 flex items-center justify-between z-30 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#078A55]/20 text-[#078A55] flex items-center justify-center shrink-0">
            <Leaf className="w-3.5 h-3.5 fill-[#078A55] text-[#078A55]" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sm tracking-tight text-white truncate block">
              {restaurantName}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`/m/${restaurantSlug}`}
            target="_blank"
            rel="noreferrer"
            className="h-8 px-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <span>Live Menu</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </header>

      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0F172A] shrink-0 h-screen sticky top-0 justify-between select-none border-r border-slate-800/80 text-slate-300">
        <div>
          {/* Brand Header */}
          <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-[#078A55]/20 flex items-center justify-center text-[#078A55]">
              <Leaf className="w-4 h-4 fill-[#078A55] text-[#078A55]" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-sm tracking-tight text-white block">Menuestro</span>
              <p className="text-[10px] text-slate-400 font-medium truncate -mt-0.5">
                {restaurantName}
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-0.5">
            <div className="px-2.5 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Management
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                    active
                      ? 'bg-slate-800 text-white font-semibold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      active ? 'text-[#078A55]' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User / Business Card */}
        <div className="p-3 space-y-2.5 border-t border-slate-800/80 bg-slate-950/40">
          <div className="p-2.5 bg-slate-900/80 border border-slate-800/60 rounded-lg space-y-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#078A55] shrink-0" />
                <p className="text-xs font-medium text-white truncate">
                  {restaurantName}
                </p>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate pl-3 mt-0.5">
                /m/{restaurantSlug}
              </p>
            </div>

            <button
              onClick={() => setIsUpgradeModalOpen(true)}
              className="w-full h-7 rounded-md bg-[#078A55] hover:bg-[#067347] text-white font-medium text-xs transition active:scale-95 cursor-pointer text-center"
            >
              Upgrade Plan
            </button>
          </div>

          {/* Live Menu Link & Sign Out */}
          <div className="flex items-center justify-between px-1 text-xs text-slate-400">
            <a
              href={`/m/${restaurantSlug}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-white flex items-center gap-1 transition-colors text-[11px]"
            >
              <span>View live menu</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={logout}
              className="hover:text-rose-400 transition-colors cursor-pointer text-[11px]"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area (Clean margins, independent scroll, safe-area padding on mobile) */}
      <main
        ref={mainContentRef}
        className="flex-1 w-full max-w-[1440px] mx-auto pt-14 md:pt-0 p-4 sm:p-6 md:p-8 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 overflow-x-hidden"
      >
        {activeTab === 'dashboard' && <DashboardView onNavigate={handleTabChange} />}
        {activeTab === 'menu' && <MenuManagementView />}
        {activeTab === 'qr' && <QRManagementView />}
        {activeTab === 'reviews' && <ReviewsView />}
        {activeTab === 'settings' && <SettingsView />}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F172A] border-t border-slate-800 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))] flex items-center justify-around z-40 shadow-lg"
      >
        {mobileBottomNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.id === 'more'
              ? isMoreSheetOpen || activeTab === 'settings'
              : activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'more') {
                  setIsMoreSheetOpen(true);
                } else {
                  handleTabChange(item.id as NavTab);
                }
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[44px] rounded-lg text-[10px] font-medium transition-colors cursor-pointer active:scale-95 ${
                isActive ? 'text-emerald-400 font-semibold' : 'text-slate-400'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile "More" Native Bottom Sheet */}
      {isMoreSheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="md:hidden fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsMoreSheetOpen(false);
          }}
        >
          <div className="bg-[#0F172A] border-t border-slate-800 rounded-t-2xl p-4 space-y-3 animate-in slide-in-from-bottom duration-200 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
            {/* Drag Handle */}
            <div className="flex justify-center pb-1">
              <div className="w-10 h-1 bg-slate-700 rounded-full" />
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">{restaurantName}</h3>
                <p className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">
                  {user?.email}
                </p>
              </div>
              <button
                onClick={() => setIsMoreSheetOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1">
              <button
                onClick={() => handleTabChange('settings')}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition cursor-pointer min-h-[44px] ${
                  activeTab === 'settings'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-850 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Settings className={`w-4 h-4 ${activeTab === 'settings' ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <div className="text-left">
                    <p className="font-semibold text-slate-200">Restaurant Settings</p>
                    <p className="text-[10px] text-slate-400">Profile, address, branding & hours</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button
                onClick={() => {
                  setIsMoreSheetOpen(false);
                  setIsUpgradeModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-850 hover:text-white transition cursor-pointer min-h-[44px]"
              >
                <div className="flex items-center space-x-3">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <div className="text-left">
                    <p className="font-semibold text-slate-200">Upgrade Plan</p>
                    <p className="text-[10px] text-slate-400">Unlimited scans & Google review tools</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <a
                href={`/m/${restaurantSlug}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-850 hover:text-white transition cursor-pointer min-h-[44px]"
              >
                <div className="flex items-center space-x-3">
                  <ExternalLink className="w-4 h-4 text-slate-400" />
                  <div className="text-left">
                    <p className="font-semibold text-slate-200">Open Public Menu</p>
                    <p className="text-[10px] text-slate-400 font-mono">/m/{restaurantSlug}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </a>
            </div>

            {/* Sign Out Button */}
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  setIsMoreSheetOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 border border-rose-900/40 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Pro Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
};
