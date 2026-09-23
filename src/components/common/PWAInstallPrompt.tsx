import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';
import { promptPWAInstall, canInstallPWA } from '../../registerServiceWorker';

export const PWAInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if prompt was dismissed in this session
    const isDismissed = sessionStorage.getItem('menuestro_pwa_dismissed') === 'true';
    if (isDismissed) return;

    if (canInstallPWA()) {
      setShowPrompt(true);
    }

    const handleInstallAvailable = () => {
      if (!sessionStorage.getItem('menuestro_pwa_dismissed')) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    return () => window.removeEventListener('pwa-install-available', handleInstallAvailable);
  }, []);

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      const installed = await promptPWAInstall();
      if (installed) {
        setShowPrompt(false);
      }
    } catch (err) {
      console.warn('PWA install prompt error:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('menuestro_pwa_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-[#0B1220]/95 backdrop-blur-xl border border-slate-800 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#078A55] to-emerald-700 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-950/50">
            <Smartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-white truncate">Install Menuestro App</h4>
              <Sparkles className="w-3 h-3 text-emerald-400 shrink-0" />
            </div>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              Install on your home screen for fast offline menu access
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="h-8 px-3 rounded-lg bg-[#078A55] hover:bg-[#067548] active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isInstalling ? 'Installing...' : 'Install'}</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Dismiss PWA prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
