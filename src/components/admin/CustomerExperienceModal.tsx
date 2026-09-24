import React, { useState } from 'react';
import { Smartphone, Monitor, Tablet, ExternalLink, X, RotateCcw } from 'lucide-react';

interface CustomerExperienceModalProps {
  slug: string;
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'menu' | 'review' | 'combined';
}

export const CustomerExperienceModal: React.FC<CustomerExperienceModalProps> = ({
  slug,
  isOpen,
  onClose,
  defaultMode = 'menu',
}) => {
  const [device, setDevice] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [mode, setMode] = useState<'menu' | 'review' | 'combined'>(defaultMode);
  const [key, setKey] = useState(0);

  if (!isOpen) return null;

  const targetPath =
    mode === 'menu' ? `/m/${slug}` : mode === 'review' ? `/r/${slug}` : `/q/${slug}`;
  const fullUrl = `${window.location.origin}${targetPath}`;

  const deviceStyles = {
    mobile: 'w-[360px] h-[700px] rounded-[32px] border-[8px] border-slate-900 shadow-2xl',
    tablet: 'w-[640px] h-[760px] rounded-[24px] border-[8px] border-slate-900 shadow-2xl',
    desktop: 'w-full max-w-4xl h-[760px] rounded-xl border-4 border-slate-900 shadow-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Top Controller Bar */}
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl p-2.5 mb-3 flex flex-wrap items-center justify-between shadow-xl gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-semibold text-emerald-400 px-2.5 py-0.5 bg-emerald-950 border border-emerald-800 rounded-md">
            Customer Simulator
          </span>
          <span className="text-xs font-mono text-slate-400 truncate max-w-[160px] sm:max-w-xs">
            {targetPath}
          </span>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setMode('menu')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
              mode === 'menu' ? 'bg-[#078A55] text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Digital Menu
          </button>
          <button
            onClick={() => setMode('review')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
              mode === 'review' ? 'bg-[#078A55] text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Review Flow
          </button>
          <button
            onClick={() => setMode('combined')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
              mode === 'combined' ? 'bg-[#078A55] text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Standee
          </button>
        </div>

        {/* Device Switcher & Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setDevice('mobile')}
            className={`p-1.5 rounded-lg transition ${
              device === 'mobile' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Mobile"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`p-1.5 rounded-lg transition ${
              device === 'tablet' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Tablet"
          >
            <Tablet className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDevice('desktop')}
            className={`p-1.5 rounded-lg transition ${
              device === 'desktop' ? 'bg-slate-800 text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
            title="Desktop"
          >
            <Monitor className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={() => setKey((k) => k + 1)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            title="Reload Preview"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <a
            href={fullUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800"
            title="Close Simulator"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Frame Viewer */}
      <div className="flex-1 flex items-center justify-center w-full max-h-[82vh] overflow-hidden">
        <div
          className={`${deviceStyles[device]} bg-slate-900 overflow-hidden relative transition-all duration-300 flex flex-col`}
        >
          {device === 'mobile' && (
            <div className="w-20 h-3.5 bg-slate-900 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-lg z-20" />
          )}
          <iframe
            key={key}
            src={fullUrl}
            title="Customer Preview"
            className="w-full h-full bg-white border-0 flex-1"
          />
        </div>
      </div>
    </div>
  );
};
