import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getBusinessBySlug, logAnalyticsEvent } from '../../services/firestoreService';
import { Business } from '../../types';
import { ReviewAssistantModal } from './ReviewAssistantModal';
import { Star, Leaf, Utensils, ExternalLink, Info, MapPin, Sparkles } from 'lucide-react';

interface ReviewExperiencePageProps {
  slug: string;
}

export const ReviewExperiencePage: React.FC<ReviewExperiencePageProps> = ({ slug }) => {
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const hasLoggedVisit = useRef(false);

  const urlParams = new URLSearchParams(window.location.search);
  const tableParam = urlParams.get('table');

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const biz = await getBusinessBySlug(slug);
        if (!biz) {
          setError('Restaurant not found.');
          setLoading(false);
          return;
        }
        setBusiness(biz);

        // Log review page view once
        if (!hasLoggedVisit.current) {
          hasLoggedVisit.current = true;
          await logAnalyticsEvent(biz.id, {
            type: 'review_page_visit',
            deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            tableNumber: tableParam || undefined,
            path: window.location.pathname,
          });
        }
      } catch (err) {
        console.error('Error loading review page:', err);
        setError('Failed to load restaurant details.');
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [slug, tableParam]);

  const restaurantName = business?.name || 'Restaurant';
  const tagline =
    business?.description ||
    business?.tagline ||
    '';

  const googleReviewUrl =
    business?.googleReviewUrl ||
    business?.reviewAssistantSettings?.googleReviewUrl ||
    `https://www.google.com/search?q=${encodeURIComponent(restaurantName)}+reviews`;

  const handleDirectReviewClick = async () => {
    if (business?.id) {
      try {
        await logAnalyticsEvent(business.id, {
          type: 'google_review_click',
          deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
          tableNumber: tableParam || undefined,
          path: window.location.pathname,
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-12 h-12 rounded-[12px] bg-[#EAF8F1] flex items-center justify-center text-[#078A55] mb-4 animate-pulse">
          <Leaf className="w-6 h-6 fill-[#078A55] text-[#078A55]" />
        </div>
        <h2 className="text-sm font-bold text-[#101828]">Loading review page...</h2>
        <p className="text-xs text-[#667085] mt-1">Connecting to restaurant profile</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-12 h-12 rounded-[12px] bg-rose-50 flex items-center justify-center text-[#DC2626] mb-4">
          <Info className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-[#101828]">Restaurant Not Found</h2>
        <p className="text-xs text-[#667085] mt-1 mb-4">{error}</p>
        <a
          href="/"
          className="px-4 py-2 bg-[#101828] text-white text-xs font-semibold rounded-[10px]"
        >
          Return to Home
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center p-4 sm:p-6 text-center font-sans">
      <div className="w-full max-w-md bg-white rounded-[20px] border border-[#E4E7EC] shadow-[0_4px_24px_rgba(16,24,40,0.06)] p-6 sm:p-8 space-y-6">
        {/* Restaurant Logo */}
        <div className="flex flex-col items-center">
          {business?.logoUrl ? (
            <img
              src={business.logoUrl}
              alt={restaurantName}
              className="w-20 h-20 rounded-[16px] object-cover border border-[#E4E7EC] shadow-sm mb-3"
            />
          ) : (
            <div className="w-20 h-20 rounded-[16px] bg-[#078A55] text-white text-2xl font-bold flex items-center justify-center border border-[#E4E7EC] shadow-sm mb-3">
              {restaurantName.charAt(0) || 'R'}
            </div>
          )}
          <h1 className="text-xl font-bold text-[#101828] tracking-tight">
            {restaurantName}
          </h1>
          {tagline && (
            <p className="text-xs text-[#667085] mt-1 max-w-xs leading-relaxed">
              {tagline}
            </p>
          )}
        </div>

        {/* 5-Star Highlight Box */}
        <button
          type="button"
          onClick={() => setIsAssistantOpen(true)}
          className="w-full bg-[#FFF7DB] border border-[#FDE68A] hover:border-[#F59E0B] rounded-[16px] p-5 space-y-2 transition-all cursor-pointer group text-center"
        >
          <div className="flex items-center justify-center gap-1.5 text-[#F59E0B] group-hover:scale-110 transition-transform">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="w-6 h-6 fill-[#F59E0B]" />
            ))}
          </div>
          <p className="text-sm font-bold text-[#101828]">
            How was your dining experience?
          </p>
          <p className="text-xs text-[#667085]">
            Tap here to draft an easy review with our Assistant!
          </p>
        </button>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setIsAssistantOpen(true)}
            className="w-full h-[48px] bg-[#078A55] hover:bg-[#067548] text-white font-semibold text-sm rounded-[10px] flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Draft Review with Assistant</span>
          </button>

          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noreferrer"
            onClick={handleDirectReviewClick}
            className="w-full h-[44px] bg-white hover:bg-[#F7F9FC] text-[#344054] border border-[#E4E7EC] font-semibold text-xs sm:text-sm rounded-[10px] flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <span>Open Google Review Directly</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#667085]" />
          </a>

          <a
            href={`/m/${slug}${tableParam ? `?table=${tableParam}` : ''}`}
            className="w-full h-[40px] bg-transparent hover:bg-[#F7F9FC] text-[#667085] hover:text-[#101828] font-medium text-xs rounded-[10px] flex items-center justify-center gap-1.5 transition-all"
          >
            <Utensils className="w-3.5 h-3.5 text-[#078A55]" />
            <span>View Digital Menu</span>
          </a>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-[#EEF1F5] text-[11px] text-[#98A2B3]">
          Powered by Menuestro • Direct Feedback
        </div>
      </div>

      {/* Review Assistant Modal */}
      {business && (
        <ReviewAssistantModal
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
          business={business}
          tableNumber={tableParam || undefined}
        />
      )}
    </div>
  );
};
