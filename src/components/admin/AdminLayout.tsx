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
  ShieldCheck,
  Menu as MenuIcon,
  X,
  Leaf,
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mainAdminRef = useRef<HTMLElement>(null);

  const navItems: { id: AdminTab; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'restaurants', label: 'Restaurants', icon: Store },
    { id: 'content', label: 'Content Studio', icon: Sparkles },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'qr', label: 'QR Management', icon: QrCode },
    { id: 'activity', label: 'Audit Logs', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (tab: AdminTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
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
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0F172A] border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-[8px] bg-[#078A55]/20 text-[#078A55] flex items-center justify-center">
            <Leaf className="w-4 h-4 fill-[#078A55] text-[#078A55]" />
          </div>
          <div>
            <span className="font-bold text-sm text-white block leading-tight">
              Menuestro
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Platform Administration
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenCreateRestaurantModal && (
            <button
              onClick={onOpenCreateRestaurantModal}
              className="p-1.5 bg-[#078A55] hover:bg-[#067347] text-white rounded-lg transition text-xs font-semibold flex items-center gap-1 px-2.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0F172A] border-r border-slate-800/80 flex-shrink-0 min-h-screen sticky top-0 h-screen text-slate-300">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-[8px] bg-[#078A55]/20 flex items-center justify-center text-[#078A55]">
              <Leaf className="w-4 h-4 fill-[#078A55] text-[#078A55]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">Menuestro</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Platform Administration
              </p>
            </div>
          </div>
        </div>

        {/* Quick Action Button */}
        {onOpenCreateRestaurantModal && (
          <div className="px-4 pt-4 pb-2">
            <button
              onClick={onOpenCreateRestaurantModal}
              className="w-full py-2.5 px-3 bg-[#078A55] hover:bg-[#067347] text-white font-semibold text-xs rounded-lg shadow-sm flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Restaurant</span>
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <div className="px-3 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Management
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              currentTab === item.id || (item.id === 'restaurants' && currentTab === 'restaurant-detail');

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#078A55]' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-medium text-slate-400">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Identity & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-slate-900/80 border border-slate-800/60">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-center flex-shrink-0 border border-slate-700">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-medium text-slate-200 truncate">
                  {profile?.name || user?.displayName || 'Administrator'}
                </p>
                <p className="text-[11px] text-slate-400 truncate">
                  {user?.email || 'admin@menuestro.com'}
                </p>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-[8px] bg-[#078A55]/20 text-[#078A55] flex items-center justify-center">
                <Leaf className="w-4 h-4 fill-[#078A55] text-[#078A55]" />
              </div>
              <div>
                <span className="font-bold text-white text-base block leading-tight">Menuestro</span>
                <span className="text-[11px] text-slate-400">Platform Administration</span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="py-4 space-y-4">
            {onOpenCreateRestaurantModal && (
              <button
                onClick={() => {
                  onOpenCreateRestaurantModal();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 px-4 bg-[#078A55] hover:bg-[#067347] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                <span>New Restaurant</span>
              </button>
            )}

            <nav className="space-y-1 pt-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-medium transition ${
                      isActive
                        ? 'bg-slate-800 text-white font-semibold shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#078A55]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-800/80 space-y-3">
            <div className="px-2 py-1.5 flex items-center justify-between text-xs text-slate-400">
              <span className="truncate max-w-[200px] text-slate-300 font-medium">
                {user?.email || 'admin@menuestro.com'}
              </span>
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                Super Admin
              </span>
            </div>

            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-900 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl text-xs font-semibold transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content View Area */}
      <main
        ref={mainAdminRef}
        className="flex-1 overflow-y-auto min-h-screen bg-[#F8FAFC]"
      >
        {children}
      </main>
    </div>
  );
};
