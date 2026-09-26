import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  getDiscoveryRestaurantsWithMenus,
  searchPublicDishes,
} from '../../services/firestoreService';
import { RestaurantWithDishes, RestaurantSearchResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { TagBadge } from '../ui/TagBadge';
import {
  Search,
  X,
  Leaf,
  Utensils,
  ArrowRight,
  Loader2,
  Store,
} from 'lucide-react';

interface DiscoverPageProps {
  onNavigateLogin?: () => void;
  onNavigateMenu?: (slug: string) => void;
  onNavigateDashboard?: () => void;
}

const EXAMPLE_SEARCHES = [
  'Momos',
  'Butter Chicken',
  'Pizza',
  'Cold Coffee',
  'Biryani',
  'Himachali Food',
];

const SCROLL_STORAGE_KEY = 'menuestro_discover_scroll_y';
const QUERY_STORAGE_KEY = 'menuestro_discover_last_query';

export const DiscoverPage: React.FC<DiscoverPageProps> = ({
  onNavigateLogin,
  onNavigateMenu,
  onNavigateDashboard,
}) => {
  const { user } = useAuth();

  // 1. URL Query Extraction helper
  const getQueryFromUrl = useCallback((): string => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlQ = params.get('q');
      if (urlQ !== null && urlQ !== undefined) {
        return urlQ;
      }
    } catch {}
    return '';
  }, []);

  const [restaurants, setRestaurants] = useState<RestaurantWithDishes[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState<string>(() => getQueryFromUrl());
  const [debouncedQuery, setDebouncedQuery] = useState<string>(() => getQueryFromUrl());
  const [isSearching, setIsSearching] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasRestoredScrollRef = useRef(false);

  // 2. Debounce input to keep UI snappy and update debouncedQuery
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setIsSearching(false);
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. Keep URL search query parameter in sync (/discover?q=rice)
  useEffect(() => {
    try {
      const currentParams = new URLSearchParams(window.location.search);
      const currentUrlQ = currentParams.get('q') || '';
      const trimmed = debouncedQuery.trim();

      if (trimmed !== currentUrlQ) {
        if (trimmed) {
          currentParams.set('q', trimmed);
        } else {
          currentParams.delete('q');
        }

        const newSearch = currentParams.toString();
        const basePath = window.location.pathname;
        const newUrl = `${basePath}${newSearch ? `?${newSearch}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', newUrl);
      }
    } catch (err) {
      console.warn('Could not update history state:', err);
    }
  }, [debouncedQuery]);

  // 4. Handle browser BACK / FORWARD events (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const qFromUrl = getQueryFromUrl();
      setSearchQuery(qFromUrl);
      setDebouncedQuery(qFromUrl);
      hasRestoredScrollRef.current = false; // Allow scroll restoration on popstate
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [getQueryFromUrl]);

  // 5. Load active discovery restaurants (reused from cache if already loaded)
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setLoadingData(true);
        const data = await getDiscoveryRestaurantsWithMenus();
        if (isMounted) {
          setRestaurants(data);
        }
      } catch (err) {
        console.error('Failed to load discovery data:', err);
      } finally {
        if (isMounted) {
          setLoadingData(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // 6. Compute search results deterministically
  const searchResults: RestaurantSearchResult[] = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return [];
    }
    return searchPublicDishes(debouncedQuery, restaurants);
  }, [debouncedQuery, restaurants]);

  // 7. Scroll restoration: Restore scroll position when returning via BACK button
  useEffect(() => {
    if (!loadingData && !hasRestoredScrollRef.current) {
      try {
        const savedScroll = sessionStorage.getItem(SCROLL_STORAGE_KEY);
        if (savedScroll !== null) {
          const scrollY = parseInt(savedScroll, 10);
          if (!isNaN(scrollY) && scrollY > 0) {
            hasRestoredScrollRef.current = true;
            // Double-frame delay to ensure content layout is complete
            requestAnimationFrame(() => {
              setTimeout(() => {
                window.scrollTo({ top: scrollY, behavior: 'instant' });
                document.documentElement.scrollTop = scrollY;
                document.body.scrollTop = scrollY;
              }, 40);
            });
          }
        }
      } catch {}
    }
  }, [loadingData, searchResults.length, restaurants.length]);

  // Total matching dishes across all restaurants
  const totalMatchingDishes = useMemo(() => {
    return searchResults.reduce((acc, r) => acc + r.matchingItems.length, 0);
  }, [searchResults]);

  // Extract unique categories from real data for quick discovery chips
  const availableCategories = useMemo(() => {
    const catMap = new Map<string, number>();
    restaurants.forEach((r) => {
      r.categories.forEach((c) => {
        if (c.name && c.name.trim().length > 0) {
          const name = c.name.trim();
          catMap.set(name, (catMap.get(name) || 0) + 1);
        }
      });
    });
    return Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 8);
  }, [restaurants]);

  // Price formatter
  const formatPrice = (price: number | string, symbol = '₹') => {
    const num = typeof price === 'number' ? price : parseFloat(String(price));
    if (isNaN(num)) return `${symbol}${price}`;
    const hasDecimals = num % 1 !== 0;
    const formatted = hasDecimals
      ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : num.toLocaleString('en-US');
    return `${symbol}${formatted}`;
  };

  const handleSelectExample = (term: string) => {
    try {
      sessionStorage.removeItem(SCROLL_STORAGE_KEY);
    } catch {}
    setSearchQuery(term);
    setDebouncedQuery(term);
    searchInputRef.current?.focus();
  };

  const handleClear = () => {
    try {
      sessionStorage.removeItem(SCROLL_STORAGE_KEY);
      sessionStorage.removeItem(QUERY_STORAGE_KEY);
    } catch {}
    setSearchQuery('');
    setDebouncedQuery('');
    searchInputRef.current?.focus();
  };

  // 8. Navigate to Restaurant Menu: Preserve scroll and search state
  const handleViewMenu = (slug: string) => {
    try {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, String(window.scrollY || document.documentElement.scrollTop || 0));
      sessionStorage.setItem(QUERY_STORAGE_KEY, debouncedQuery);
    } catch {}

    if (onNavigateMenu) {
      onNavigateMenu(slug);
    } else {
      window.history.pushState({}, '', `/m/${slug}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const isSearchActive = debouncedQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-[#101828] font-sans flex flex-col antialiased">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#E4E7EC] shadow-[0_1px_2px_rgba(16,24,40,0.03)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <div
            onClick={() => {
              handleClear();
            }}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-[#EAF8F1] border border-[#D1EEDC] flex items-center justify-center text-[#078A55] group-hover:bg-[#078A55] group-hover:text-white transition-colors">
              <Leaf className="w-4 h-4 fill-current" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold tracking-tight text-[#101828] leading-none">
                Menuestro
              </span>
              <span className="text-[10px] text-[#667085] font-medium tracking-wide">
                Food Discovery
              </span>
            </div>
          </div>

          {/* Action Links */}
          <div className="flex items-center gap-2">
            {user ? (
              <button
                type="button"
                onClick={onNavigateDashboard || (() => { window.location.href = '/'; })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#078A55] hover:bg-[#067347] text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onNavigateLogin || (() => { window.location.href = '/login'; })}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-[#344054] hover:text-[#101828] text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                <Store className="w-3.5 h-3.5 text-[#667085]" />
                <span>Restaurant Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Hero & Search Header */}
        <div className="space-y-4 text-center sm:text-left">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#101828] leading-tight">
              Find what you're craving
            </h1>
            <p className="text-xs sm:text-sm text-[#667085] mt-1.5">
              Search dishes and discover restaurants serving them.
            </p>
          </div>

          {/* Search Box Input */}
          <div className="relative w-full">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085] pointer-events-none flex items-center">
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#078A55]" />
              ) : (
                <Search className="w-4 h-4 text-[#667085]" />
              )}
            </div>

            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, food, cuisines..."
              className="w-full h-12 sm:h-13 bg-white border border-[#D0D5DD] hover:border-[#98A2B3] focus:border-[#078A55] focus:ring-2 focus:ring-[#078A55]/15 rounded-xl pl-10 pr-10 text-sm sm:text-base text-[#101828] placeholder:text-[#98A2B3] transition-all shadow-[0_1px_2px_rgba(16,24,40,0.05)] focus:outline-hidden"
              autoComplete="off"
              spellCheck="false"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#344054] p-1 rounded-md transition-colors cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Example Search Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[11px] font-semibold text-[#667085] mr-1">
              Popular:
            </span>
            {EXAMPLE_SEARCHES.map((example) => {
              const isSelected = searchQuery.toLowerCase() === example.toLowerCase();
              return (
                <button
                  key={example}
                  type="button"
                  onClick={() => handleSelectExample(example)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#078A55] text-white border-[#078A55] font-semibold shadow-xs'
                      : 'bg-white hover:bg-[#F2F4F7] text-[#344054] border-[#E4E7EC]'
                  }`}
                >
                  {example}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic State Rendering */}
        {loadingData ? (
          /* Loading Skeleton */
          <div className="space-y-4 pt-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-[#E4E7EC] rounded-2xl p-4 sm:p-5 space-y-3 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-slate-200 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 w-40 bg-slate-200 rounded-md" />
                    <div className="h-3 w-28 bg-slate-100 rounded-md" />
                  </div>
                  <div className="h-8 w-24 bg-slate-200 rounded-lg shrink-0" />
                </div>
                <div className="border-t border-[#EEF1F5] pt-3 space-y-2">
                  <div className="h-10 bg-slate-100 rounded-lg w-full" />
                  <div className="h-10 bg-slate-100 rounded-lg w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : isSearchActive ? (
          /* SEARCH RESULTS VIEW */
          <div className="space-y-4">
            {/* Search Results Summary Header */}
            <div className="flex items-center justify-between pb-1 border-b border-[#E4E7EC]">
              <div className="text-xs sm:text-sm font-semibold text-[#344054]">
                {searchResults.length > 0 ? (
                  <span>
                    Found <strong className="text-[#101828]">{totalMatchingDishes}</strong> matching{' '}
                    {totalMatchingDishes === 1 ? 'dish' : 'dishes'} in{' '}
                    <strong className="text-[#101828]">{searchResults.length}</strong>{' '}
                    {searchResults.length === 1 ? 'restaurant' : 'restaurants'}
                  </span>
                ) : (
                  <span>No results for &ldquo;{debouncedQuery}&rdquo;</span>
                )}
              </div>

              {searchResults.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-semibold text-[#078A55] hover:text-[#067347] cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Results List */}
            {searchResults.length === 0 ? (
              /* No Results Empty State */
              <div className="bg-white border border-[#E4E7EC] rounded-2xl p-8 sm:p-12 text-center shadow-xs">
                <div className="w-12 h-12 rounded-full bg-[#F2F4F7] text-[#667085] flex items-center justify-center mx-auto mb-3.5 border border-[#E4E7EC]">
                  <Search className="w-5 h-5 text-[#667085]" />
                </div>
                <h3 className="text-base font-bold text-[#101828]">
                  No matching dishes found
                </h3>
                <p className="text-xs sm:text-sm text-[#667085] mt-1 max-w-sm mx-auto">
                  Try another dish, cuisine, or keyword.
                </p>
                <div className="mt-5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-4 py-2 bg-[#101828] hover:bg-black text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            ) : (
              /* Grouped Results by Restaurant */
              <div className="space-y-4">
                {searchResults.map((result) => {
                  const { restaurant, matchingItems } = result;
                  const currencySymbol = restaurant.currencySymbol || restaurant.currency || '₹';

                  return (
                    <div
                      key={restaurant.id}
                      className="bg-white border border-[#E4E7EC] rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(16,24,40,0.04)] hover:border-[#D0D5DD] transition-all space-y-3.5"
                    >
                      {/* Restaurant Identity Bar (Visually Primary) */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {restaurant.logoUrl ? (
                            <img
                              src={restaurant.logoUrl}
                              alt={restaurant.name}
                              loading="lazy"
                              className="w-12 h-12 rounded-xl object-cover border border-[#E4E7EC] bg-[#F7F9FC] shrink-0"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-[#078A55] text-white font-bold text-lg flex items-center justify-center border border-white/20 shrink-0">
                              {restaurant.name.charAt(0) || 'R'}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-bold text-[#101828] leading-tight truncate">
                              {restaurant.name}
                            </h2>
                            {(restaurant.tagline || restaurant.description) && (
                              <p className="text-xs text-[#667085] truncate mt-0.5">
                                {restaurant.tagline || restaurant.description}
                              </p>
                            )}
                            {restaurant.address && (
                              <p className="text-[11px] text-[#98A2B3] truncate">
                                📍 {restaurant.address}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* View Menu Primary Action */}
                        <button
                          type="button"
                          onClick={() => handleViewMenu(restaurant.slug)}
                          className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 sm:px-4 rounded-xl bg-[#078A55] hover:bg-[#067347] active:scale-[0.98] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs shrink-0 cursor-pointer"
                        >
                          <span>VIEW MENU</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Matching Items Section */}
                      <div className="border-t border-[#EEF1F5] pt-3 space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                          <span>Matching items ({matchingItems.length})</span>
                          <span className="text-[#078A55] font-bold lowercase">
                            {matchingItems.length === 1 ? '1 item found' : `${matchingItems.length} items found`}
                          </span>
                        </div>

                        <div className="divide-y divide-[#F2F4F7]">
                          {matchingItems.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => handleViewMenu(restaurant.slug)}
                              className="py-2.5 first:pt-1 last:pb-1 flex items-start justify-between gap-3 group cursor-pointer hover:bg-[#F9FAFB] rounded-lg px-2 -mx-2 transition-colors"
                            >
                              <div className="space-y-0.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-sm font-semibold text-[#101828] group-hover:text-[#078A55] transition-colors">
                                    {item.name}
                                  </h3>
                                  {item.categoryName && (
                                    <span className="text-[10px] font-medium text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded-md">
                                      {item.categoryName}
                                    </span>
                                  )}
                                  {item.tags && item.tags.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      {item.tags.slice(0, 2).map((tag, idx) => (
                                        <TagBadge key={idx} tag={tag} size="xs" />
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {item.description && (
                                  <p className="text-xs text-[#667085] line-clamp-2 leading-relaxed">
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-sm font-bold text-[#101828]">
                                  {formatPrice(item.price, currencySymbol)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* DISCOVERY HOMEPAGE (Before Search) */
          <div className="space-y-8">
            {/* Category Discovery Pills (from real data) */}
            {availableCategories.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                    Browse Menu Categories
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((catName) => (
                    <button
                      key={catName}
                      type="button"
                      onClick={() => handleSelectExample(catName)}
                      className="px-3.5 py-2 rounded-xl bg-white border border-[#E4E7EC] hover:border-[#078A55] hover:text-[#078A55] text-xs font-medium text-[#344054] transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Utensils className="w-3.5 h-3.5 text-[#078A55]" />
                      <span>{catName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Explore Active Restaurants */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#101828]">
                    Explore Menuestro
                  </h2>
                  <p className="text-xs text-[#667085]">
                    Active restaurants with real-time digital menus
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#078A55] bg-[#EAF8F1] px-2.5 py-1 rounded-full border border-[#D1EEDC]">
                  {restaurants.length} {restaurants.length === 1 ? 'Restaurant' : 'Restaurants'}
                </span>
              </div>

              {restaurants.length === 0 ? (
                /* No restaurants active */
                <div className="bg-white border border-[#E4E7EC] rounded-2xl p-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-[#EAF8F1] text-[#078A55] flex items-center justify-center mx-auto mb-2.5">
                    <Store className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#101828]">
                    Search Menuestro
                  </h3>
                  <p className="text-xs text-[#667085] mt-1">
                    Find dishes and food available at Menuestro restaurants.
                  </p>
                </div>
              ) : (
                /* Active Restaurants Cards Grid */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {restaurants.map((entry) => {
                    const { restaurant, items } = entry;
                    return (
                      <div
                        key={restaurant.id}
                        onClick={() => handleViewMenu(restaurant.slug)}
                        className="bg-white border border-[#E4E7EC] hover:border-[#078A55] rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3 group cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          {restaurant.logoUrl ? (
                            <img
                              src={restaurant.logoUrl}
                              alt={restaurant.name}
                              loading="lazy"
                              className="w-11 h-11 rounded-lg object-cover border border-[#E4E7EC] bg-[#F7F9FC] shrink-0 group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-[#078A55] text-white font-bold text-base flex items-center justify-center shrink-0">
                              {restaurant.name.charAt(0) || 'R'}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold text-[#101828] leading-tight truncate group-hover:text-[#078A55] transition-colors">
                              {restaurant.name}
                            </h3>
                            <p className="text-xs text-[#667085] truncate mt-0.5">
                              {restaurant.tagline || restaurant.description || `${items.length} items on menu`}
                            </p>
                            {restaurant.address && (
                              <p className="text-[11px] text-[#98A2B3] truncate mt-0.5">
                                📍 {restaurant.address}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-[#F2F4F7] text-xs">
                          <span className="text-[#667085] font-medium text-[11px]">
                            {items.length} dishes available
                          </span>
                          <span className="font-semibold text-[#078A55] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            <span>View Menu</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#E4E7EC] bg-white py-6 mt-12 text-center text-xs text-[#98A2B3]">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <div className="inline-flex items-center gap-1.5 font-medium text-[#667085]">
            <Leaf className="w-3.5 h-3.5 text-[#078A55]" />
            <span>Powered by Menuestro</span>
          </div>
          <p className="text-[11px] text-[#98A2B3]">
            Scan. Search. See what's available. Review.
          </p>
        </div>
      </footer>
    </div>
  );
};
