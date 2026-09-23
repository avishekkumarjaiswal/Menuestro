import React, { useRef } from 'react';
import { Download, Printer, Leaf, Star, Smartphone } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useToast } from '../common/Toast';
import QRCode from 'qrcode';

interface StandeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantName: string;
  slug: string;
  qrType: 'menu' | 'review' | 'combined';
  logoUrl?: string;
}

export const StandeeModal: React.FC<StandeeModalProps> = ({
  isOpen,
  onClose,
  restaurantName,
  slug,
  qrType,
  logoUrl,
}) => {
  const { showToast } = useToast();
  const printContainerRef = useRef<HTMLDivElement>(null);

  const targetPath =
    qrType === 'menu'
      ? `/m/${slug}`
      : qrType === 'review'
      ? `/r/${slug}`
      : `/q/${slug}`;
  const fullTargetUrl = `${window.location.origin}${targetPath}`;

  const headingText =
    qrType === 'menu'
      ? 'SCAN FOR LIVE MENU'
      : qrType === 'review'
      ? 'SCAN TO REVIEW US'
      : 'SCAN FOR MENU & REVIEWS';

  const subtitleText =
    qrType === 'menu'
      ? 'Instant live dishes & ingredients'
      : qrType === 'review'
      ? 'Rate your experience on Google'
      : 'View digital menu or leave a Google review';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    showToast('Print dialog launched. Select "Save as PDF" to export.');
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print-Ready Table Standee"
      description="Optimized for standard A5/A6 acrylic stands on dining tables"
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Printer className="w-4 h-4" />}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            variant="primary"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleDownloadPDF}
          >
            Download PDF
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center justify-center p-2 sm:p-4">
        {/* Printable Standee Card */}
        <div
          ref={printContainerRef}
          className="w-[280px] bg-[#0B1220] text-white rounded-[20px] p-6 text-center shadow-[0_4px_24px_rgba(11,18,32,0.18)] border border-slate-800 flex flex-col items-center relative overflow-hidden"
        >
          {/* Subtle top decoration or restaurant logo */}
          {logoUrl ? (
            <div className="w-12 h-12 rounded-full bg-white p-1 flex items-center justify-center mb-3 shadow-md overflow-hidden border border-white/20">
              <img
                src={logoUrl}
                alt={restaurantName}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-[10px] bg-[#078A55]/20 text-[#078A55] flex items-center justify-center mb-3">
              <Leaf className="w-5 h-5 fill-[#078A55] text-[#078A55]" />
            </div>
          )}

          <h2 className="text-base font-bold text-white tracking-wider uppercase">
            {restaurantName}
          </h2>

          <p className="text-xs font-bold text-[#078A55] uppercase tracking-wider mt-1">
            {headingText}
          </p>

          {/* Center QR canvas */}
          <div className="my-4 p-3 bg-white rounded-[14px] shadow-sm">
            <StandeeQRCanvas url={fullTargetUrl} size={150} />
          </div>

          <p className="text-[11px] text-[#98A2B3] font-normal max-w-[200px] leading-tight mb-3">
            {subtitleText}
          </p>

          {/* Bottom badge */}
          <div className="pt-3 border-t border-slate-800/80 w-full flex items-center justify-center gap-1.5 text-[10px] font-semibold text-[#98A2B3]">
            <Smartphone className="w-3 h-3 text-[#078A55]" />
            <span>No App Required • Scan with Camera</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

const StandeeQRCanvas: React.FC<{ url: string; size: number }> = ({ url, size }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(
      canvasRef.current,
      url,
      {
        width: size,
        margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' },
        errorCorrectionLevel: 'H',
      },
      (err) => {
        if (err) console.error(err);
      }
    );
  }, [url, size]);

  return <canvas ref={canvasRef} className="rounded-[8px]" />;
};
