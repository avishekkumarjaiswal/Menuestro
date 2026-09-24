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
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-40 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="bg-[#0F172A] border border-slate-800 text-white p-3 rounded-xl shadow-xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#078A55]/20 text-[#078A55] flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h4 className="text-xs font-semibold text-white truncate">Install Menuestro</h4>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Fast 1-tap home screen access
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="h-7 px-2.5 rounded-lg bg-[#078A55] hover:bg-[#067347] active:scale-95 text-white font-medium text-xs flex items-center gap-1 transition-all shadow-xs cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>{isInstalling ? '...' : 'Install'}</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Dismiss PWA prompt"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
