import React, { useRef, useEffect } from 'react';
import { Download, Printer, Leaf, Smartphone, X } from 'lucide-react';
import { Modal } from '../ui/Modal';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const targetPath =
    qrType === 'menu'
      ? `/m/${slug}`
      : qrType === 'review'
      ? `/r/${slug}`
      : `/q/${slug}`;
  const fullTargetUrl = `${window.location.origin}${targetPath}`;

  const headingText =
    qrType === 'menu'
      ? 'SCAN FOR MENU'
      : qrType === 'review'
      ? 'SCAN TO REVIEW US'
      : 'SCAN FOR MENU & REVIEWS';

  const subtitleText =
    qrType === 'menu'
      ? 'View dishes, prices & allergens'
      : qrType === 'review'
      ? 'Rate your dining experience on Google'
      : 'Explore digital menu or leave a Google review';

  // Draw clean, high-resolution QR on canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      fullTargetUrl,
      {
        width: 200,
        margin: 1,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
      },
      (err) => {
        if (err) console.error('QR generation error:', err);
      }
    );
  }, [isOpen, fullTargetUrl]);

  // Direct PNG download of the full standee artwork
  const handleDownloadPNG = () => {
    const qrCanvas = canvasRef.current;
    if (!qrCanvas) return;

    // Create a high-resolution export canvas (width: 600px, height: 850px)
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 600;
    exportCanvas.height = 850;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    // Background Card
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, 600, 850);

    // Subtle border
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 580, 830);

    // Top Emerald accent bar
    ctx.fillStyle = '#078A55';
    ctx.fillRect(10, 10, 580, 14);

    // Restaurant Name Header
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(restaurantName.toUpperCase(), 300, 110);

    // Action Tagline
    ctx.fillStyle = '#078A55';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(headingText, 300, 155);

    // QR Code Container Box
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.roundRect(100, 190, 400, 400, 24);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw QR Code in Center
    ctx.drawImage(qrCanvas, 130, 220, 340, 340);

    // Subtitle instruction
    ctx.fillStyle = '#475569';
    ctx.font = '500 18px sans-serif';
    ctx.fillText(subtitleText, 300, 640);

    // Camera Scan Pill
    ctx.fillStyle = '#F1F5F9';
    ctx.beginPath();
    ctx.roundRect(130, 680, 340, 46, 23);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('📷 Scan with your phone camera', 300, 709);

    // Footer
    ctx.fillStyle = '#94A3B8';
    ctx.font = '500 14px sans-serif';
    ctx.fillText('Powered by Menuestro • No App Download Required', 300, 780);

    // Trigger File Download
    const downloadLink = document.createElement('a');
    downloadLink.download = `${slug}-standee-${qrType}.png`;
    downloadLink.href = exportCanvas.toDataURL('image/png');
    downloadLink.click();
    showToast('Standee image downloaded as high-res PNG');
  };

  const handlePrint = () => {
    const qrCanvas = canvasRef.current;
    const qrDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : '';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${restaurantName} - Table Standee</title>
          <style>
            @page { size: A5 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 90vh;
              background-color: #f8fafc;
              color: #0f172a;
            }
            .standee-card {
              width: 130mm;
              background: #ffffff;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 32px 24px;
              text-align: center;
              box-shadow: 0 4px 20px rgba(0,0,0,0.06);
            }
            .restaurant-title {
              font-size: 22px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.04em;
              margin: 0 0 6px 0;
              color: #0f172a;
            }
            .action-tag {
              font-size: 14px;
              font-weight: 700;
              color: #078a55;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin: 0 0 20px 0;
            }
            .qr-container {
              display: inline-block;
              padding: 16px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 14px;
              margin-bottom: 20px;
            }
            .qr-image {
              width: 180px;
              height: 180px;
              display: block;
            }
            .subtitle {
              font-size: 13px;
              color: #475569;
              margin: 0 0 16px 0;
            }
            .scan-pill {
              display: inline-block;
              background: #f1f5f9;
              padding: 6px 14px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: 600;
              color: #0f172a;
              margin-bottom: 16px;
            }
            .footer-text {
              font-size: 11px;
              color: #94a3b8;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="standee-card">
            <h1 class="restaurant-title">${restaurantName}</h1>
            <p class="action-tag">${headingText}</p>
            <div class="qr-container">
              <img class="qr-image" src="${qrDataUrl}" alt="QR Code" />
            </div>
            <p class="subtitle">${subtitleText}</p>
            <div class="scan-pill">📷 No App Required • Scan with Camera</div>
            <p class="footer-text">Powered by Menuestro</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Print-Ready Table Standee"
      description="Optimized for standard A5/A6 acrylic stands"
      maxWidth="sm"
      footer={
        <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition cursor-pointer min-h-[40px] flex items-center justify-center"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 text-xs font-medium rounded-lg border border-slate-200 transition cursor-pointer min-h-[40px] flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Print</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPNG}
            className="w-full sm:w-auto px-4 py-2 bg-[#078A55] hover:bg-[#067347] text-white text-xs font-medium rounded-lg transition cursor-pointer min-h-[40px] flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>
        </div>
      }
    >
      <div className="flex flex-col items-center justify-center py-2">
        {/* Clean, Premium Standee Card Preview */}
        <div className="w-full max-w-[280px] bg-white text-slate-900 rounded-xl p-5 text-center shadow-sm border border-slate-200 flex flex-col items-center relative overflow-hidden">
          {/* Top Emerald Accent Bar */}
          <div className="w-full h-1 bg-[#078A55] absolute top-0 left-0 right-0" />

          {/* Logo or Brand Mark */}
          {logoUrl ? (
            <div className="w-10 h-10 rounded-lg p-0.5 bg-white border border-slate-200 shadow-xs mb-2 overflow-hidden">
              <img src={logoUrl} alt={restaurantName} className="w-full h-full object-cover rounded-md" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#078A55] flex items-center justify-center mb-2 border border-emerald-100">
              <Leaf className="w-4 h-4 fill-[#078A55] text-[#078A55]" />
            </div>
          )}

          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider truncate max-w-full">
            {restaurantName}
          </h2>

          <p className="text-[11px] font-semibold text-[#078A55] uppercase tracking-wide mt-0.5">
            {headingText}
          </p>

          {/* QR Code Container */}
          <div className="my-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center">
            <canvas ref={canvasRef} className="rounded block" />
          </div>

          <p className="text-xs text-slate-500 leading-tight mb-2.5">
            {subtitleText}
          </p>

          {/* Bottom badge */}
          <div className="pt-2 border-t border-slate-100 w-full flex items-center justify-center gap-1 text-[10px] font-medium text-slate-500">
            <Smartphone className="w-3 h-3 text-[#078A55]" />
            <span>Scan with your camera</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
