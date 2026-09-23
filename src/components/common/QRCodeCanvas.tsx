import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, Copy, Check, ExternalLink } from 'lucide-react';
import { useToast } from './Toast';

interface QRCodeCanvasProps {
  value: string;
  size?: number;
  color?: string;
  logoUrl?: string;
  showLogo?: boolean;
  label?: string;
  tableNumber?: string;
  type?: 'menu' | 'review' | 'combined';
  restaurantName?: string;
}

export const QRCodeCanvas: React.FC<QRCodeCanvasProps> = ({
  value,
  size = 240,
  color = '#16A34A',
  logoUrl,
  showLogo = true,
  label = 'Scan to View Our Menu',
  tableNumber,
  type = 'menu',
  restaurantName = 'Menuestro',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const fullUrl = value.startsWith('http')
    ? value
    : `${window.location.origin}${value}`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    QRCode.toCanvas(
      canvas,
      fullUrl,
      {
        width: size,
        margin: 2,
        color: {
          dark: color || '#16A34A',
          light: '#FFFFFF',
        },
        errorCorrectionLevel: 'H',
      },
      (error) => {
        if (error) {
          console.error('Error generating QR code:', error);
          return;
        }

        // Draw center logo if enabled and provided
        if (showLogo && logoUrl) {
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = logoUrl;
          img.onload = () => {
            const logoSize = size * 0.22;
            const x = (size - logoSize) / 2;
            const y = (size - logoSize) / 2;

            // Background circle behind logo
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, logoSize / 2 + 5, 0, Math.PI * 2);
            ctx.fill();

            // Circular clip for logo
            ctx.save();
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, logoSize / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, x, y, logoSize, logoSize);
            ctx.restore();
          };
        }
      }
    );
  }, [fullUrl, size, color, logoUrl, showLogo]);

  const downloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${restaurantName.toLowerCase().replace(/\s+/g, '-')}-qr-${type}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('QR Code downloaded as PNG');
  };

  const downloadSVG = async () => {
    try {
      const svgString = await QRCode.toString(fullUrl, {
        type: 'svg',
        color: { dark: color || '#16A34A', light: '#FFFFFF' },
      });
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${restaurantName.toLowerCase().replace(/\s+/g, '-')}-qr-${type}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showToast('QR Code downloaded as SVG vector');
    } catch (err) {
      console.error(err);
      showToast('Could not generate SVG', 'error');
    }
  };

  const printStandee = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to print QR standee', 'info');
      return;
    }

    const canvas = canvasRef.current;
    const qrDataUrl = canvas ? canvas.toDataURL('image/png') : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${restaurantName} - Table Standee</title>
          <style>
            @page { size: A5 portrait; margin: 10mm; }
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
            .brand-badge {
              display: inline-block;
              padding: 4px 14px;
              background-color: #f1f5f9;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #64748b;
              margin-bottom: 12px;
            }
            .restaurant-title {
              font-size: 24px;
              font-weight: 700;
              margin: 0 0 6px 0;
              color: #0f172a;
            }
            .instruction {
              font-size: 14px;
              color: #475569;
              margin: 0 0 24px 0;
            }
            .qr-container {
              display: inline-block;
              padding: 16px;
              background: #f8fafc;
              border: 1px solid #f1f5f9;
              border-radius: 14px;
              margin-bottom: 20px;
            }
            .qr-image {
              width: 200px;
              height: 200px;
              display: block;
            }
            .table-badge {
              font-size: 15px;
              font-weight: 600;
              color: ${color || '#16A34A'};
              margin-bottom: 8px;
            }
            .footer-text {
              font-size: 11px;
              color: #94a3b8;
              margin-top: 16px;
            }
          </style>
        </head>
        <body>
          <div class="standee-card">
            ${tableNumber ? `<div class="brand-badge">Table ${tableNumber}</div>` : ''}
            <h1 class="restaurant-title">${restaurantName}</h1>
            <p class="instruction">${label}</p>
            <div class="qr-container">
              <img class="qr-image" src="${qrDataUrl}" alt="QR Code" />
            </div>
            <div class="table-badge">${type === 'menu' ? 'Scan for Digital Menu' : type === 'review' ? 'Leave a Google Review' : 'Scan for Menu & Reviews'}</div>
            <p class="footer-text">Powered by Menuestro • Point your phone camera to scan</p>
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

  const copyUrl = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    showToast('Direct link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col items-center justify-center">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="rounded-lg max-w-full h-auto"
        />
        <div className="mt-3 text-center">
          <p className="text-xs font-semibold text-slate-900 tracking-wide uppercase">
            {tableNumber ? `Table ${tableNumber}` : label}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-[220px] truncate">
            {fullUrl}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 w-full max-w-xs">
        <button
          onClick={downloadPNG}
          className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>PNG</span>
        </button>
        <button
          onClick={downloadSVG}
          className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>SVG</span>
        </button>
        <button
          onClick={printStandee}
          className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors shadow-xs cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Standee</span>
        </button>
        <button
          onClick={copyUrl}
          className="p-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          title="Copy URL"
          aria-label="Copy URL"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        </button>
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          title="Open in new tab"
          aria-label="Open URL in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};
