import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  getBusinessBySlug,
  subscribeCategories,
  getAllMenuItems,
  logAnalyticsEvent,
  getCachedPublicMenu,
  setCachedPublicMenu,
} from '../../services/firestoreService';
import { Business, Category, MenuItem } from '../../types';
import { Modal } from '../ui/Modal';
import { SearchInput } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { PublicMenuItemSkeleton } from '../ui/Skeleton';
import { ReviewAssistantModal } from './ReviewAssistantModal';
import { TagBadge } from '../ui/TagBadge';
import {
  Leaf,
  Info,
  Search,
  Star,
  ArrowRight,
  ArrowLeft,
  X,
  MapPin,
  Phone,
} from 'lucide-react';

interface PublicMenuPageProps {
  slug: string;
}

export const PublicMenuPage: React.FC<PublicMenuPageProps> = ({ slug }) => {
  // 1. Instant 0ms cached state initialization
  const initialCache = useMemo(() => getCachedPublicMenu(slug), [slug]);

  const [business, setBusiness] = useState<Business | null>(() => initialCache?.business || null);
  const [categories, setCategories] = useState<Category[]>(() => initialCache?.categories || []);
  const [items, setItems] = useState<MenuItem[]>(() => initialCache?.items || []);
  const [loading, setLoading] = useState(!initialCache?.business);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isReviewAssistantOpen, setIsReviewAssistantOpen] = useState(false);
  const hasLoggedScan = useRef(false);

  // URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const tableParam = urlParams.get('table');
  const itemParam = urlParams.get('item');

  // Format price cleanly without silently rounding values
  const formatPrice = (price: number | string) => {
    const sym = business?.currencySymbol || business?.currency || '₹';
    const num = typeof price === 'number' ? price : parseFloat(String(price));
    if (isNaN(num)) return `${sym}${price}`;
    
    const hasDecimals = num % 1 !== 0;
    const formatted = hasDecimals
      ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : num.toLocaleString('en-US');
    return `${sym}${formatted}`;
  };

  useEffect(() => {
    let isMounted = true;
    let unsubCategories: (() => void) | undefined;

    const initData = async () => {
      try {
        if (!initialCache?.business) {
          setLoading(true);
        }
        const biz = await getBusinessBySlug(slug);
        if (!biz) {
          if (!initialCache?.business) {
            setError('Restaurant not found. Please verify the URL.');
            setLoading(false);
          }
          return;
        }
        if (!isMounted) return;
        setBusiness(biz);

        // Log scan event once per page visit
        if (!hasLoggedScan.current) {
          hasLoggedScan.current = true;
          logAnalyticsEvent(biz.id, {
            type: tableParam ? 'menu_scan' : 'menu_view',
            deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            tableNumber: tableParam || undefined,
            path: window.location.pathname,
          }).catch(console.warn);
        }

        // Real-time listener for categories & items (parallelized & cached)
        unsubCategories = subscribeCategories(biz.id, async (cats) => {
          if (!isMounted) return;
          setCategories(cats);

          const allItems = cats.length > 0 ? await getAllMenuItems(biz.id, cats) : [];
          
          // Deduplicate items by ID
          const uniqueItemsMap = new Map<string, MenuItem>();
          allItems.forEach((it) => {
            if (!uniqueItemsMap.has(it.id)) {
              uniqueItemsMap.set(it.id, it);
            }
          });
          const uniqueItems = Array.from(uniqueItemsMap.values());

          if (isMounted) {
            setItems(uniqueItems);
            setLoading(false);

            // Update local cache
            setCachedPublicMenu(slug, {
              business: biz,
              categories: cats,
              items: uniqueItems,
            });

            if (itemParam) {
              const match = uniqueItems.find(
                (i) => (i.id === itemParam || i.name.toLowerCase() === itemParam.toLowerCase()) && i.isAvailable !== false
              );
              if (match) setSelectedItem(match);
            }
          }
        });
      } catch (err) {
        console.error('Error loading public menu:', err);
        if (isMounted && !initialCache?.business) {
          setError('Failed to load restaurant menu. Please try again.');
          setLoading(false);
        }
      }
    };

    initData();

    return () => {
      isMounted = false;
      if (unsubCategories) unsubCategories();
    };
  }, [slug, tableParam, itemParam, initialCache]);

  // Handle Google Review click & event logging
  const handleReviewClick = async () => {
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

  // Filter items - Only show AVAILABLE items to customers
  const availableItems = useMemo(() => {
    return items.filter((item) => item.isAvailable !== false);
  }, [items]);

  // Active category names lookup for search matching
  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name.toLowerCase()));
    return map;
  }, [categories]);

  // Full category object lookup
  const categoryMap = useMemo(() => {
    const map = new Map<string, (typeof categories)[0]>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  // Search and Category filtered items
  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return availableItems.filter((item) => {
      const matchCategory = activeCategory === 'all' || item.categoryId === activeCategory;
      if (!matchCategory) return false;

      if (!query) return true;

      const categoryName = categoryNameMap.get(item.categoryId) || '';
      const matchName = item.name.toLowerCase().includes(query);
      const matchDesc = item.description ? item.description.toLowerCase().includes(query) : false;
      const matchCat = categoryName.includes(query);
      const matchTags = item.tags ? item.tags.some((t) => t.toLowerCase().includes(query)) : false;

      return matchName || matchDesc || matchCat || matchTags;
    });
  }, [availableItems, activeCategory, searchQuery, categoryNameMap]);

  // Category counts based solely on AVAILABLE items
  const availableCategories = useMemo(() => {
    return categories.filter((cat) => 
      cat.isActive !== false && availableItems.some((item) => item.categoryId === cat.id)
    );
  }, [categories, availableItems]);

  // Group items by category for clean sectioned display
  const groupedSections = useMemo(() => {
    const targetCats = activeCategory === 'all'
      ? availableCategories
      : availableCategories.filter((c) => c.id === activeCategory);

    const sections: { category: (typeof categories)[0]; items: typeof items }[] = [];

    targetCats.forEach((cat) => {
      const catItems = filteredItems.filter((i) => i.categoryId === cat.id);
      if (catItems.length > 0) {
        sections.push({ category: cat, items: catItems });
      }
    });

    // Handle any uncategorized items (if any)
    const uncategorizedItems = filteredItems.filter(
      (i) => !availableCategories.some((c) => c.id === i.categoryId)
    );
    if (uncategorizedItems.length > 0 && activeCategory === 'all') {
      sections.push({
        category: { id: 'uncategorized', name: 'Other Dishes', order: 999 } as any,
        items: uncategorizedItems,
      });
    }

    return sections;
  }, [availableCategories, activeCategory, filteredItems]);

  const restaurantName = business?.name || 'Restaurant';
  const description =
    business?.description ||
    business?.tagline ||
    '';
  const coverImg = business?.coverImageUrl || '';
  const logoImg = business?.logoUrl || '';
  
  const googleReviewDestination = business?.googleReviewUrl || `/r/${slug}${tableParam ? `?table=${tableParam}` : ''}`;

  const googleMapsDestination = useMemo(() => {
    if (business?.googleMapsUrl && business.googleMapsUrl.trim().length > 0) {
      return business.googleMapsUrl.trim();
    }
    const locationQuery = [restaurantName, business?.address].filter(Boolean).join(', ');
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationQuery)}`;
  }, [business?.googleMapsUrl, business?.address, restaurantName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] w-full max-w-[560px] mx-auto space-y-4 font-sans select-none">
        <div className="h-[140px] bg-white border-b border-[#E4E7EC] animate-pulse" />
        <div className="px-4 space-y-3.5">
          <div className="h-11 bg-white rounded-[10px] border border-[#E4E7EC] animate-pulse" />
          <div className="flex gap-2 overflow-hidden py-1">
            <div className="h-8 w-16 bg-white rounded-full border border-[#E4E7EC] animate-pulse shrink-0" />
            <div className="h-8 w-24 bg-white rounded-full border border-[#E4E7EC] animate-pulse shrink-0" />
            <div className="h-8 w-24 bg-white rounded-full border border-[#E4E7EC] animate-pulse shrink-0" />
          </div>
          <div className="space-y-2.5 pt-1">
            <PublicMenuItemSkeleton />
            <PublicMenuItemSkeleton />
            <PublicMenuItemSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] w-full max-w-[560px] mx-auto flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-12 h-12 rounded-[12px] bg-rose-50 text-[#DC2626] flex items-center justify-center mb-4">
          <Info className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#101828]">Restaurant Not Found</h2>
        <p className="text-xs text-[#667085] mt-1 max-w-sm mb-6">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#101828] font-sans pb-12 antialiased">
      {/* Centered Mobile Container (Max Width 560px) */}
      <div className="w-full max-w-[560px] mx-auto min-h-screen flex flex-col bg-[#F7F9FC]">
        
        {/* Restaurant Header with Primary Visual Identity Cover Photo */}
        <header className="bg-white border-b border-[#E4E7EC] shadow-[0_1px_3px_rgba(16,24,40,0.03)] overflow-hidden">
          {/* Cover Photo: Mobile 150-180px, retaining overlapping logo */}
          <div className="relative h-[160px] sm:h-[170px] md:h-[180px] w-full bg-[#1E293B] overflow-hidden">
            {coverImg ? (
              <img
                src={coverImg}
                alt={restaurantName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1E293B] to-[#0F172A] flex items-center justify-center">
                <Leaf className="w-8 h-8 text-white/20" />
              </div>
            )}

            {/* Table Badge if scanned from specific table */}
            {tableParam && (
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-0.5 rounded-full text-[11px] font-bold text-[#101828] shadow-xs border border-white/50">
                Table #{tableParam}
              </div>
            )}
          </div>

          {/* Restaurant Identity Container */}
          <div className="px-4 pt-0 pb-4 relative">
            {/* Logo Overlapping Cover Bottom */}
            <div className="flex items-end justify-between -mt-7 mb-2.5">
              <div className="relative">
                {logoImg ? (
                  <img
                    src={logoImg}
                    alt={restaurantName}
                    loading="lazy"
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-[12px] object-cover border-2 border-white shadow-sm bg-white shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[12px] bg-[#078A55] text-white font-bold text-xl flex items-center justify-center border-2 border-white shadow-sm shrink-0">
                    {restaurantName.charAt(0) || 'M'}
                  </div>
                )}
              </div>

              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#078A55] bg-[#EAF8F1] px-2 py-0.5 rounded-full border border-[#D1EEDC]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#078A55] animate-pulse" />
                <span>Live Menu</span>
              </span>
            </div>

            {/* Restaurant Name & Description */}
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl font-bold text-[#101828] tracking-tight leading-snug">
                {restaurantName}
              </h1>
              {description && (
                <p className="text-xs text-[#667085] leading-relaxed line-clamp-2">
                  {description}
                </p>
              )}
            </div>

            {/* Google Review CTA below restaurant identity - Opens Review Assistant Popup */}
            <div className="mt-3.5 pt-3 border-t border-[#EEF1F5]">
              <button
                type="button"
                onClick={() => {
                  handleReviewClick();
                  setIsReviewAssistantOpen(true);
                }}
                className="w-full bg-[#FFF7DB] hover:bg-[#FEF3C7] active:scale-[0.99] border border-[#FDE68A] text-[#101828] rounded-[10px] px-3.5 py-2 flex items-center justify-between transition-all shadow-xs group cursor-pointer text-left"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[#F59E0B] text-sm shrink-0">⭐</span>
                  <span className="text-xs font-semibold truncate">
                    Enjoyed your meal? <span className="text-[#B45309]">Review us on Google</span>
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#B45309] shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </header>

        {/* Sticky Search & Category Bar - Stays pinned at the top as user scrolls up */}
        <div className="sticky top-0 z-30 bg-[#F7F9FC] px-4 pt-3 pb-2.5 space-y-2.5 border-b border-[#E4E7EC] shadow-sm">
          {/* Search Bar - Fixed sticky at top */}
          <SearchInput
            placeholder="Search dishes, drinks, ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
          />

          {/* Horizontally Scrollable Categories */}
          <nav 
            aria-label="Menu categories"
            className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4 select-none whitespace-nowrap flex-nowrap scroll-smooth"
          >
            <button
              type="button"
              onClick={(e) => {
                setActiveCategory('all');
                (e.currentTarget as HTMLElement).scrollIntoView({
                  behavior: 'smooth',
                  block: 'nearest',
                  inline: 'center',
                });
              }}
              className={`h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                activeCategory === 'all'
                  ? 'bg-[#078A55] text-white shadow-xs'
                  : 'bg-white text-[#344054] border border-[#E4E7EC] hover:bg-[#F7F9FC]'
              }`}
            >
              All ({availableItems.length})
            </button>
            {availableCategories.map((cat) => {
              const count = availableItems.filter((i) => i.categoryId === cat.id).length;
              const isCatActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={(e) => {
                    setActiveCategory(cat.id);
                    (e.currentTarget as HTMLElement).scrollIntoView({
                      behavior: 'smooth',
                      block: 'nearest',
                      inline: 'center',
                    });
                  }}
                  className={`h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isCatActive
                      ? 'bg-[#078A55] text-white shadow-xs'
                      : 'bg-white text-[#344054] border border-[#E4E7EC] hover:bg-[#F7F9FC]'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
            {/* Generous trailing spacer so the last category is never cut off at the edge */}
            <div className="shrink-0 w-6 h-1 pointer-events-none" aria-hidden="true" />
          </nav>
        </div>

        {/* Menu Items List Grouped by Category */}
        <main className="flex-1 px-4 py-3 space-y-5">
          {availableItems.length === 0 ? (
            <div className="bg-white border border-[#E4E7EC] rounded-[16px] p-8 text-center mt-4">
              <div className="w-12 h-12 rounded-full bg-[#EAF8F1] text-[#078A55] flex items-center justify-center mx-auto mb-3">
                <Leaf className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#101828]">No dishes available right now</h3>
              <p className="text-xs text-[#667085] mt-1.5 max-w-xs mx-auto">
                Please check back soon.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="bg-white border border-[#E4E7EC] rounded-[16px] p-8 text-center mt-2">
              <div className="w-12 h-12 rounded-full bg-[#F7F9FC] text-[#667085] flex items-center justify-center mx-auto mb-3 border border-[#E4E7EC]">
                <Search className="w-5 h-5 text-[#667085]" />
              </div>
              <h3 className="text-base font-bold text-[#101828]">No matching dishes found</h3>
              <p className="text-xs text-[#667085] mt-1 max-w-xs mx-auto">
                Try searching for another dish or ingredient.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveCategory('all');
                }}
                className="mt-4 px-4 py-2 bg-[#101828] hover:bg-black text-white text-xs font-semibold rounded-[8px] transition-colors"
              >
                Clear Search
              </button>
            </div>
          ) : (
            groupedSections.map((section) => (
              <section key={section.category.id} className="space-y-2.5">
                {/* Clean Category Header */}
                <div className="pt-3 pb-1.5 border-b border-[#E4E7EC]">
                  <h2 className="text-base font-bold text-[#101828] tracking-tight">
                    {section.category.name}
                  </h2>
                </div>

                {/* Items in this Category */}
                <div className="space-y-2.5">
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedItem(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedItem(item);
                        }
                      }}
                      className="bg-white border border-[#E4E7EC] rounded-[12px] p-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)] flex gap-3 cursor-pointer hover:border-[#D0D5DD] hover:shadow-[0_2px_4px_rgba(16,24,40,0.06)] active:scale-[0.99] active:bg-[#F9FAFB] transition-all select-none group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#078A55]"
                    >
                      {/* Dish Photo */}
                      <img
                        src={
                          item.imageUrl ||
                          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop&q=80'
                        }
                        alt={item.name}
                        loading="lazy"
                        className="w-[84px] h-[84px] rounded-[10px] object-cover border border-[#E4E7EC] shrink-0 bg-[#F7F9FC] group-hover:scale-[1.02] transition-transform"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&auto=format&fit=crop&q=80';
                        }}
                      />

                      {/* Dish Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-start py-0.5">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[15px] sm:text-base font-semibold text-[#101828] leading-tight truncate group-hover:text-[#078A55] transition-colors">
                            {item.name}
                          </h3>
                          <span className="text-[15px] sm:text-base font-bold text-[#101828] shrink-0">
                            {formatPrice(item.price)}
                          </span>
                        </div>

                        {/* Item Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {item.tags.map((tag, idx) => (
                              <TagBadge key={idx} tag={tag} size="xs" />
                            ))}
                          </div>
                        )}

                        {item.description && (
                          <p className="text-[13px] text-[#667085] mt-1 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </main>

        {/* Bottom Review CTA (Subtle & Non-Intrusive) */}
        <section className="px-4 py-4 mt-2">
          <div className="bg-white border border-[#E4E7EC] rounded-[14px] p-4 text-center shadow-xs">
            <button
              type="button"
              onClick={() => setIsReviewAssistantOpen(true)}
              className="flex items-center justify-center gap-1 text-[#F59E0B] mb-1.5 mx-auto cursor-pointer hover:scale-105 transition-transform"
              title="Draft a review"
            >
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className="w-4 h-4 fill-[#F59E0B]" />
              ))}
            </button>
            <h4 className="text-sm font-bold text-[#101828]">
              How was your experience today?
            </h4>
            <p className="text-xs text-[#667085] mt-0.5 mb-3">
              Your feedback helps {restaurantName} provide great hospitality.
            </p>
            <button
              type="button"
              onClick={() => setIsReviewAssistantOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 w-full h-[42px] bg-[#078A55] hover:bg-[#067548] active:scale-[0.98] text-white text-xs font-semibold rounded-[10px] transition-all cursor-pointer shadow-xs"
            >
              <Star className="w-3.5 h-3.5 fill-white" />
              <span>Review on Google (with Assistant)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>

        {/* Restaurant Contact Information (Optional Address & Phone) */}
        {(business?.address || business?.phone || business?.googleMapsUrl) && (
          <section className="px-4 py-2">
            <div className="bg-white border border-[#E4E7EC] rounded-[14px] p-3.5 shadow-xs space-y-2.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {(business?.address || business?.googleMapsUrl) && (
                  <a
                    href={googleMapsDestination}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-3 bg-[#F7F9FC] hover:bg-[#EEF1F5] text-[#344054] hover:text-[#101828] text-xs font-semibold rounded-[8px] border border-[#E4E7EC] transition-colors cursor-pointer group"
                  >
                    <MapPin className="w-3.5 h-3.5 text-[#078A55] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Get Directions</span>
                  </a>
                )}
                {business?.phone && (
                  <a
                    href={`tel:${business.phone.replace(/[^0-9+]/g, '')}`}
                    className="flex-1 inline-flex items-center justify-center gap-2 h-10 px-3 bg-[#F7F9FC] hover:bg-[#EEF1F5] text-[#344054] hover:text-[#101828] text-xs font-semibold rounded-[8px] border border-[#E4E7EC] transition-colors cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#078A55] shrink-0" />
                    <span className="truncate">Call Restaurant</span>
                  </a>
                )}
              </div>
              {business?.address && (
                <a
                  href={googleMapsDestination}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[11px] text-[#667085] hover:text-[#078A55] hover:underline text-center truncate transition-colors cursor-pointer"
                  title="Open location on Google Maps"
                >
                  📍 {business.address}
                </a>
              )}
            </div>
          </section>
        )}

        {/* Footer Brand */}
        <footer className="pt-4 pb-8 text-center text-xs text-[#98A2B3]">
          <div className="inline-flex items-center gap-1.5 font-medium">
            <Leaf className="w-3.5 h-3.5 text-[#078A55]" />
            <span>Powered by Menuestro</span>
          </div>
          <p className="text-[11px] text-[#98A2B3] mt-1">
            Scan. Search. See what's available. Review.
          </p>
        </footer>
      </div>

      {/* Simplified Dish Detail Modal (Mobile-Safe, 90dvh, internal scroll, accessible close) */}
      {selectedItem && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={selectedItem.name}
          maxWidth="sm"
        >
          <div className="space-y-3.5">
            <img
              src={
                selectedItem.imageUrl ||
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80'
              }
              alt={selectedItem.name}
              loading="lazy"
              className="w-full max-h-56 sm:max-h-64 object-cover rounded-[12px] border border-[#E4E7EC] bg-[#F7F9FC] shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
              }}
            />

            <div className="flex items-start justify-between gap-2 pt-1">
              <div>
                <h3 className="text-lg font-bold text-[#101828]">
                  {selectedItem.name}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  {categoryMap.get(selectedItem.categoryId) && (
                    <span className="inline-block text-xs font-semibold text-[#078A55] bg-[#EAF8F1] px-2 py-0.5 rounded-full border border-[#078A55]/10">
                      {categoryMap.get(selectedItem.categoryId)?.name}
                    </span>
                  )}
                  {selectedItem.tags && selectedItem.tags.map((tag, idx) => (
                    <TagBadge key={idx} tag={tag} size="sm" />
                  ))}
                </div>
              </div>
              <span className="text-lg font-bold text-[#078A55] shrink-0">
                {formatPrice(selectedItem.price)}
              </span>
            </div>

            {selectedItem.description && (
              <p className="text-sm text-[#475467] leading-relaxed">
                {selectedItem.description}
              </p>
            )}

            <div className="pt-3 border-t border-[#EEF1F5] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="w-full sm:w-auto px-5 h-[40px] bg-[#F2F4F7] hover:bg-[#E4E7EC] text-[#344054] text-xs font-semibold rounded-[8px] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Menu</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Interactive Rule-Based Review Assistant Modal */}
      {business && (
        <ReviewAssistantModal
          isOpen={isReviewAssistantOpen}
          onClose={() => setIsReviewAssistantOpen(false)}
          business={business}
          tableNumber={tableParam || undefined}
        />
      )}
    </div>
  );
};

