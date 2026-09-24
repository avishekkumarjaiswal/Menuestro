import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import QRCode from 'qrcode';
import { PageHeader } from '../ui/PageHeader';
import { Tabs } from '../ui/Badge';
import { Button } from '../ui/Button';
import { StandeeModal } from './StandeeModal';
import { Download, Printer, Copy, ExternalLink, Check } from 'lucide-react';

export const QRManagementView: React.FC = () => {
  const { business } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('menu');
  const [isStandeeModalOpen, setIsStandeeModalOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const restaurantName = business?.name || 'Restaurant';
  const slug = business?.slug || '';

  const targetPath =
    activeTab === 'menu'
      ? `/m/${slug}`
      : activeTab === 'review'
      ? `/r/${slug}`
      : `/q/${slug}`;

  const fullTargetUrl = `${window.location.origin}${targetPath}`;

  const captionText =
    activeTab === 'menu'
      ? 'Scan to view our menu'
      : activeTab === 'review'
      ? 'Scan to leave a Google review'
      : 'Scan for menu & reviews';

  const noticeText =
    activeTab === 'combined'
      ? 'Print and place this QR code on tables so diners can both view the menu and leave a review.'
      : activeTab === 'review'
      ? 'Print and place this QR code on bills or checkout counters to collect 5-star Google reviews.'
      : 'Print and place this QR code on your tables for your customers.';

  // Render high-contrast, clean QR Code onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = 260;
    QRCode.toCanvas(
      canvas,
      fullTargetUrl,
      {
        width: size,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      },
      (error) => {
        if (error) {
          console.error('QR code error:', error);
        }
      }
    );
  }, [fullTargetUrl, activeTab]);

  // Download PNG handler
  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${slug}-${activeTab}-qr.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('QR Code downloaded as PNG');
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(fullTargetUrl);
    setIsCopied(true);
    showToast('Direct URL copied to clipboard');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const tabs = [
    { id: 'menu', label: 'Menu QR' },
    { id: 'review', label: 'Review QR' },
    { id: 'combined', label: 'Combined QR' },
  ];

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto select-none font-sans">
      {/* 1. Page Header */}
      <PageHeader
        title="QR Codes"
        description="Generate and download QR codes for table standees, bills and counters."
      />

      {/* 2. QR Type Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* 3. Central QR Preview Card */}
      <div className="max-w-xl mx-auto w-full">
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-8 shadow-xs flex flex-col items-center text-center">
          {/* Restaurant Name Header */}
          <h2 className="text-sm sm:text-base font-bold text-slate-900 uppercase tracking-wider truncate max-w-full">
            {restaurantName}
          </h2>

          {/* QR Code Canvas Container */}
          <div className="my-5 w-56 h-56 sm:w-64 sm:h-64 aspect-square p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
            <canvas
              ref={canvasRef}
              className="rounded-lg w-full h-full aspect-square object-contain block"
            />
          </div>

          {/* Caption text */}
          <p className="text-xs font-semibold text-slate-700">
            {captionText}
          </p>

          {/* Copyable URL Pill */}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 max-w-full">
            <span className="truncate max-w-[160px] sm:max-w-xs font-mono text-[11px]">
              {window.location.host}{targetPath}
            </span>
            <button
              onClick={handleCopyUrl}
              className="hover:text-slate-900 p-0.5 rounded transition-colors cursor-pointer shrink-0"
              aria-label="Copy link"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-[#078A55]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <a
              href={targetPath}
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 p-0.5 rounded transition-colors shrink-0"
              aria-label="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-sm">
            <Button
              variant="primary"
              className="w-full sm:flex-1"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={handleDownloadPNG}
            >
              Download PNG
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:flex-1"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => setIsStandeeModalOpen(true)}
            >
              Print Standee
            </Button>
          </div>

          {/* Bottom notice */}
          <p className="text-[11px] text-slate-400 mt-4">
            {noticeText}
          </p>
        </div>
      </div>

      {/* 4. Standee Modal */}
      <StandeeModal
        isOpen={isStandeeModalOpen}
        onClose={() => setIsStandeeModalOpen(false)}
        restaurantName={restaurantName}
        slug={slug}
        qrType={activeTab as 'menu' | 'review' | 'combined'}
        logoUrl={business?.logoUrl}
      />
    </div>
  );
};
