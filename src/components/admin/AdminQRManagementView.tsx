import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Download,
  Printer,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { Business } from '../../types';
import { subscribeAllBusinesses } from '../../services/firestoreService';
import { useToast } from '../common/Toast';

export const AdminQRManagementView: React.FC = () => {
  const { addToast } = useToast();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('all');
  const [qrTypeFilter, setQrTypeFilter] = useState<'all' | 'menu' | 'review' | 'combined'>('all');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeAllBusinesses(setBusinesses);
    return () => unsub();
  }, []);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    addToast('URL copied to clipboard!', 'info');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const filteredBusinesses = businesses.filter((b) =>
    selectedBusinessId === 'all' ? true : b.id === selectedBusinessId
  );

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <QrCode className="w-5 h-5 sm:w-6 sm:h-6 text-[#078A55]" />
            <span>QR Code Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Generate, preview, and download high-resolution QR codes and standee links for all restaurants.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition self-start md:self-auto shadow-xs"
        >
          <Printer className="w-4 h-4" />
          <span>Print Standees</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:space-x-2 flex-1 max-w-md">
          <label className="text-xs font-semibold text-slate-700 flex-shrink-0">Filter Venue:</label>
          <select
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 rounded-lg px-3 py-2 focus:bg-white focus:border-[#078A55] focus:outline-none"
          >
            <option value="all">All Restaurants ({businesses.length})</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} (/m/{b.slug})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto self-start sm:self-auto">
          {(['all', 'menu', 'review', 'combined'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setQrTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg font-medium capitalize whitespace-nowrap transition ${
                qrTypeFilter === type
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* QR Cards Grid */}
      <div className="space-y-6">
        {filteredBusinesses.map((biz) => {
          const baseUrl = window.location.origin;
          const menuUrl = `${baseUrl}/m/${biz.slug}`;
          const reviewUrl = `${baseUrl}/r/${biz.slug}`;
          const combinedUrl = `${baseUrl}/q/${biz.slug}`;

          const qrs = [
            { type: 'menu', title: 'Digital Menu QR', url: menuUrl },
            { type: 'review', title: 'Review Assistant QR', url: reviewUrl },
            { type: 'combined', title: 'Table Standee Combined QR', url: combinedUrl },
          ].filter((q) => qrTypeFilter === 'all' || q.type === qrTypeFilter);

          return (
            <div key={biz.id} className="bg-white p-5 md:p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#078A55] flex items-center justify-center font-bold text-xs">
                    {biz.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{biz.name}</h2>
                    <p className="text-[11px] text-slate-500 font-mono">/m/{biz.slug}</p>
                  </div>
                </div>

                <a
                  href={`/m/${biz.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#078A55] hover:text-[#067347] flex items-center gap-1 font-medium"
                >
                  <span>Open Live Menu</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {qrs.map((qr) => {
                  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                    qr.url
                  )}&color=000000`;

                  return (
                    <div
                      key={qr.type}
                      className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center flex flex-col justify-between"
                    >
                      <div>
                        <div className="w-32 h-32 mx-auto bg-white p-2 rounded-lg shadow-xs mb-3 flex items-center justify-center border border-slate-200">
                          <img src={qrImg} alt={qr.title} className="w-full h-full object-contain" />
                        </div>
                        <h3 className="text-xs font-semibold text-slate-900">{qr.title}</h3>
                        <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">
                          {qr.url}
                        </p>
                      </div>

                      <div className="flex items-center justify-center space-x-2 mt-4 pt-3 border-t border-slate-200">
                        <button
                          onClick={() => handleCopy(qr.url)}
                          className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-md text-xs border border-slate-200 shadow-xs"
                          title="Copy Target URL"
                        >
                          {copiedUrl === qr.url ? (
                            <Check className="w-3.5 h-3.5 text-[#078A55]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <a
                          href={qrImg}
                          download={`${biz.slug}-${qr.type}-qr.png`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 text-xs font-medium rounded-md flex items-center gap-1 border border-slate-200 shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download PNG</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
