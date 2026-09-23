import React, { useState, useEffect, useRef } from 'react';
import { getBusinessBySlug, subscribeToBusiness, logAnalyticsEvent } from '../../services/firestoreService';
import { Business } from '../../types';
import { Star, MapPin, Sparkles, Store, Leaf, ArrowRight } from 'lucide-react';
import { ReviewAssistantModal } from './ReviewAssistantModal';

interface CombinedLandingPageProps {
  slug: string;
}

export const CombinedLandingPage: React.FC<CombinedLandingPageProps> = ({ slug }) => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [isReviewAssistantOpen, setIsReviewAssistantOpen] = useState(false);
  const hasLoggedScan = useRef(false);

  const urlParams = new URLSearchParams(window.location.search);
  const tableNumber = urlParams.get('table');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const init = async () => {
      try {
        const biz = await getBusinessBySlug(slug);
        setBusiness(biz);
        if (biz) {
          if (!hasLoggedScan.current) {
            hasLoggedScan.current = true;
            await logAnalyticsEvent(biz.id, {
              type: 'menu_scan',
              tableNumber: tableNumber || undefined,
              deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
              path: window.location.pathname,
            });
          }
          // Real-time listener for live sync when settings are updated
          unsubscribe = subscribeToBusiness(biz.id, (updatedBiz) => {
            if (updatedBiz) {
              setBusiness(updatedBiz);
            }
          });
        }
      } catch (err) {
        console.error('CombinedLandingPage error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [slug, tableNumber]);

  const restaurantName = business?.name || 'Restaurant';
  const tagline = business?.tagline || business?.description || '';
  const reviewUrl = business?.googleReviewUrl || `/r/${slug}`;
  const themeColor = business?.primaryColor || '#078A55';
  const coverPhoto = business?.coverImageUrl || '';

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-slate-950 font-sans select-none">
      {/* Background Restaurant Photo (only if set) or Elegant Dark Backdrop */}
      {coverPhoto ? (
        <div
          className="absolute inset-0 bg-cover bg-center scale-105 filter blur-[0.5px] transition-all duration-700"
          style={{
            backgroundImage: `url('${coverPhoto}')`,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0B1220] to-slate-950" />
      )}
      {/* Dark gradient overlay for contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/45 to-black/75" />

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6 max-w-sm mx-auto w-full text-center">
        {/* Logo Badge: White Circle with Custom Logo or Restaurant Initial */}
        <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center p-1.5 mb-5 border-2 border-white/80 overflow-hidden shrink-0">
          {business?.logoUrl ? (
            <img
              src={business.logoUrl}
              alt={restaurantName}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center font-black text-xl text-white select-none"
              style={{ backgroundColor: themeColor }}
            >
              {restaurantName.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Restaurant Name */}
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider uppercase mb-1.5 drop-shadow-md">
          {restaurantName}
        </h1>

        {/* Tagline / Subtitle (only displayed if provided) */}
        {tagline ? (
          <p className="text-sm font-medium text-white/90 drop-shadow-sm mb-9 max-w-xs leading-snug">
            {tagline}
          </p>
        ) : (
          <div className="mb-6" />
        )}

        {/* Action Buttons Stack */}
        <div className="w-full space-y-3.5">
          {/* Button 1: View Menu (Theme colored pill button) */}
          <a
            href={`/m/${slug}${tableNumber ? `?table=${tableNumber}` : ''}`}
            style={{ backgroundColor: themeColor }}
            className="w-full py-3.5 px-6 rounded-2xl hover:brightness-110 active:scale-[0.98] text-white font-bold text-base shadow-lg border border-white/20 flex items-center justify-center transition-all cursor-pointer"
          >
            <span>View Menu</span>
          </a>

          {/* Button 2: Leave a Google Review (Opens the Review Drafter Assistant Popup) */}
          <button
            type="button"
            onClick={() => {
              if (business?.id) {
                logAnalyticsEvent(business.id, {
                  type: 'google_review_click',
                  deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
                  tableNumber: tableNumber || undefined,
                  path: window.location.pathname,
                }).catch(console.warn);
              }
              setIsReviewAssistantOpen(true);
            }}
            className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-800 font-bold text-base shadow-lg flex items-center justify-center gap-2.5 transition-all cursor-pointer"
          >
            <Star className="w-5 h-5 fill-amber-400 text-amber-400 stroke-[1.5]" />
            <span>Leave a Google Review</span>
          </button>
        </div>
      </div>

      {/* Bottom Floating White Card with 3 Badges & Menuestro Brand */}
      <div className="relative z-10 max-w-sm mx-auto w-full px-4 pb-6">
        <div className="bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col items-center">
          {/* 3 Value Pillars / Badges Row */}
          <div className="grid grid-cols-3 gap-2 w-full text-center pb-4 pt-1">
            {/* 1. Fresh Food */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 mb-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 stroke-[1.8] text-slate-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <span className="text-[11px] font-medium text-slate-600 tracking-tight leading-snug">
                Fresh Food
              </span>
            </div>

            {/* 2. Great Ambience */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 mb-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 stroke-[1.8] text-slate-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                  />
                </svg>
              </div>
              <span className="text-[11px] font-medium text-slate-600 tracking-tight leading-snug">
                Great Ambience
              </span>
            </div>

            {/* 3. Happy Customers */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 mb-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 stroke-[1.8] text-slate-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-[11px] font-medium text-slate-600 tracking-tight leading-snug">
                Happy Customers
              </span>
            </div>
          </div>

          {/* Powered by Menuestro */}
          <div className="pt-2 border-t border-slate-100 w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <span>Powered by</span>
            <div className="flex items-center gap-1 font-bold text-slate-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 text-[#0B7A4B] fill-[#0B7A4B]"
              >
                <path d="M17.5 3.5c-4 0-7.5 3-8 7-2-.5-4.5.5-5.5 2.5-1.2 2.4-.2 5.5 2 6.5 3.5 1.5 7.5-.5 8.5-4 3-.5 6-3.5 6-7.5 0-2.5-1-4.5-3-4.5z" />
              </svg>
              <span>Menuestro</span>
            </div>
          </div>
        </div>
      </div>

      {/* Review Drafter / AI Assistant Popup */}
      {business && (
        <ReviewAssistantModal
          isOpen={isReviewAssistantOpen}
          onClose={() => setIsReviewAssistantOpen(false)}
          business={business}
          tableNumber={tableNumber || undefined}
        />
      )}
    </div>
  );
};
