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

  // Render QR Code onto canvas with center leaf logo
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
          dark: '#000000',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      },
      (error) => {
        if (error) {
          console.error('QR code error:', error);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const cx = size / 2;
        const cy = size / 2;
        const logoBadgeRadius = 24;

        // Draw crisp white circle background badge in center of QR
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, logoBadgeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Draw green organic leaf icon in the center
        const leafSvg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#078A55">
            <path d="M12 2a9 9 0 0 1 9 9c0 4.97-4.03 9-9 9A9 9 0 0 1 3 11C3 6.03 7.03 2 12 2zm3.5 4c-3.2 0-6 2.3-6.5 5.5-1.5-.4-3.5.4-4.3 2-1 1.9-.2 4.3 1.6 5.1 2.8 1.2 6-.4 6.7-3.2 2.5-.4 4.8-2.8 4.8-6 0-2-.9-3.4-2.3-3.4z"/>
          </svg>
        `;
        const blob = new Blob([leafSvg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, cx - 16, cy - 16, 32, 32);
          URL.revokeObjectURL(url);
        };
        img.src = url;
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
    showToast('QR Code image downloaded successfully');
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
        <div className="bg-white border border-[#E4E7EC] rounded-[16px] p-5 sm:p-8 shadow-[0_1px_2px_rgba(16,24,40,0.04)] flex flex-col items-center text-center">
          {/* Restaurant Name Header */}
          <h2 className="text-base sm:text-lg font-bold text-[#101828] uppercase tracking-wider truncate max-w-full">
            {restaurantName}
          </h2>

          {/* QR Code Canvas Container (Strict 1:1 Square) */}
          <div className="my-5 sm:my-6 w-60 h-60 sm:w-72 sm:h-72 aspect-square p-3 sm:p-4 bg-white rounded-[16px] border border-[#EEF1F5] shadow-xs flex items-center justify-center shrink-0">
            <canvas
              ref={canvasRef}
              className="rounded-[10px] w-full h-full aspect-square object-contain block"
            />
          </div>

          {/* Caption text */}
          <p className="text-sm font-semibold text-[#344054]">
            {captionText}
          </p>

          {/* Copyable URL Pill */}
          <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#F7F9FC] border border-[#E4E7EC] rounded-full text-xs text-[#667085] max-w-full">
            <span className="truncate max-w-[160px] sm:max-w-xs font-mono">
              {window.location.host}{targetPath}
            </span>
            <button
              onClick={handleCopyUrl}
              className="hover:text-[#101828] p-0.5 rounded-sm transition-colors cursor-pointer shrink-0"
              aria-label="Copy link"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-[#078A55]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <a
              href={targetPath}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#101828] p-0.5 rounded-sm transition-colors shrink-0"
              aria-label="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm">
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
          <p className="text-xs text-[#98A2B3] mt-5 sm:mt-6">
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
