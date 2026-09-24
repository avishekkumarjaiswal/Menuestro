import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Store,
  Sparkles,
  BarChart3,
  QrCode,
  History,
  Settings,
  LogOut,
  Plus,
  Leaf,
  MoreHorizontal,
  X,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'restaurants'
  | 'restaurant-detail'
  | 'content'
  | 'analytics'
  | 'qr'
  | 'activity'
  | 'settings';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab, businessId?: string) => void;
  selectedBusinessId?: string | null;
  onOpenCreateRestaurantModal?: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onSelectTab,
  selectedBusinessId,
  onOpenCreateRestaurantModal,
  children,
}) => {
  const { user, profile, logout } = useAuth();
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const mainAdminRef = useRef<HTMLElement>(null);

  const primaryNavItems: { id: AdminTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'restaurants', label: 'Restaurants', icon: Store },
    { id: 'content', label: 'Content Studio', icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'qr', label: 'QR Management', icon: QrCode },
    { id: 'activity', label: 'Audit Logs', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  // Mobile Bottom Navigation Tabs
  const mobileBottomNav: { id: AdminTab | 'more'; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'restaurants', label: 'Restaurants', icon: Store },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'more', label: 'More', icon: MoreHorizontal },
  ];

  const handleNavClick = (tab: AdminTab) => {
    onSelectTab(tab);
    setIsMoreSheetOpen(false);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (mainAdminRef.current) {
      mainAdminRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (mainAdminRef.current) {
      mainAdminRef.current.scrollTop = 0;
    }
  }, [currentTab]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col md:flex-row antialiased font-sans">
      {/* Mobile Fixed Top App Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[#0F172A] border-b border-slate-800 px-4 flex items-center justify-between z-30 shadow-xs">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#078A55]/20 text-[#078A55] flex items-center justify-center">
            <Leaf className="w-3.5 h-3.5 fill-[#078A55] text-[#078A55]" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-sm text-white block leading-tight truncate">
              Menuestro
            </span>
            <span className="text-[10px] text-slate-400 font-medium block -mt-0.5">
              Super Admin
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenCreateRestaurantModal && (
            <button
              onClick={onOpenCreateRestaurantModal}
              className="h-8 px-2.5 bg-[#078A55] hover:bg-[#067347] text-white rounded-lg transition text-xs font-semibold flex items-center gap-1 shadow-xs active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          )}
        </div>
      </header>

      {/* Desktop Persistent Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0F172A] border-r border-slate-800/80 shrink-0 h-screen sticky top-0 text-slate-300 select-none">
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#078A55]/20 flex items-center justify-center text-[#078A55]">
              <Leaf className="w-4 h-4 fill-[#078A55] text-[#078A55]" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">Menuestro</span>
              <p className="text-[10px] text-slate-400 font-medium -mt-0.5">
                Platform Administration
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Button */}
        {onOpenCreateRestaurantModal && (
          <div className="p-3">
            <button
              onClick={onOpenCreateRestaurantModal}
              className="w-full h-9 px-3 bg-[#078A55] hover:bg-[#067347] text-white font-medium text-xs rounded-lg shadow-xs flex items-center justify-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Restaurant</span>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          <div className="px-2.5 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Workspace
          </div>

          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentTab === item.id || (item.id === 'restaurants' && currentTab === 'restaurant-detail');

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-[#078A55]' : 'text-slate-400'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom User & Logout Card */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800/60">
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-center shrink-0 border border-slate-700">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-medium text-slate-200 truncate">
                  {profile?.name || user?.displayName || 'Administrator'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user?.email || 'admin@menuestro.com'}
                </p>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace Area */}
      <main
        ref={mainAdminRef}
        className="flex-1 min-h-screen bg-[#F8FAFC] pt-14 md:pt-0 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-8 overflow-x-hidden"
      >
        {children}
      </main>

      {/* Mobile Fixed Bottom Navigation */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0F172A] border-t border-slate-800 px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))] flex items-center justify-around z-40 shadow-lg"
      >
        {mobileBottomNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.id === 'more'
              ? isMoreSheetOpen ||
                ['content', 'qr', 'activity', 'settings'].includes(currentTab)
              : currentTab === item.id ||
                (item.id === 'restaurants' && currentTab === 'restaurant-detail');

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'more') {
                  setIsMoreSheetOpen(true);
                } else {
                  handleNavClick(item.id as AdminTab);
                }
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 min-w-[64px] min-h-[44px] rounded-lg text-[10px] font-medium transition-colors cursor-pointer active:scale-95 ${
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
                <h3 className="text-sm font-bold text-white">Platform Administration</h3>
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

            {/* Additional Navigation Items in Sheet */}
            <div className="grid grid-cols-1 gap-1">
              {[
                { id: 'content', label: 'Content Studio', icon: Sparkles, desc: 'Phrases & templates' },
                { id: 'qr', label: 'QR Management', icon: QrCode, desc: 'Standees & printable codes' },
                { id: 'activity', label: 'Audit Logs', icon: History, desc: 'Platform activity history' },
                { id: 'settings', label: 'Platform Settings', icon: Settings, desc: 'Credentials & system state' },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id as AdminTab)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-medium transition cursor-pointer min-h-[44px] ${
                      isActive
                        ? 'bg-slate-800 text-white font-semibold'
                        : 'text-slate-300 hover:bg-slate-850 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <div className="text-left">
                        <p className="font-semibold text-slate-200">{item.label}</p>
                        <p className="text-[10px] text-slate-400">{item.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </button>
                );
              })}
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
    </div>
  );
};
