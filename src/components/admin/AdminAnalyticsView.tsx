import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Store,
  QrCode,
  Star,
  Sparkles
} from 'lucide-react';
import { Business, DashboardTimeFilter, BusinessStats } from '../../types';
import {
  subscribeAllBusinesses,
  subscribeAllBusinessesStats,
  calculateFilteredRestaurantStats
} from '../../services/firestoreService';

export const AdminAnalyticsView: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<DashboardTimeFilter>('30d');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, BusinessStats>>({});

  useEffect(() => {
    const unsubBiz = subscribeAllBusinesses(setBusinesses);
    const unsubStats = subscribeAllBusinessesStats((newStatsMap) => {
      setStatsMap(newStatsMap);
    });

    return () => {
      unsubBiz();
      unsubStats();
    };
  }, []);

  // Compute real restaurant stats mapped by businessId
  const businessStatsList = useMemo(() => {
    return businesses.map((biz) => {
      const filtered = calculateFilteredRestaurantStats(statsMap[biz.id], timeFilter);
      return {
        business: biz,
        scans: filtered.scans,
        reviews: filtered.reviews,
        sessions: filtered.sessions,
        drafts: filtered.drafts,
        conversionRate: filtered.scans > 0 ? Math.round((filtered.reviews / filtered.scans) * 100) : 0,
      };
    }).sort((a, b) => b.scans - a.scans || b.reviews - a.reviews);
  }, [businesses, statsMap, timeFilter]);

  // Aggregate totals across all restaurants
  const totals = useMemo(() => {
    let scans = 0;
    let reviews = 0;
    let drafts = 0;

    for (const item of businessStatsList) {
      scans += item.scans;
      reviews += item.reviews;
      drafts += item.drafts;
    }

    return {
      scans,
      reviews,
      drafts,
      ctr: scans > 0 ? Math.round((reviews / scans) * 100) : 0,
    };
  }, [businessStatsList]);

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-[#078A55]" />
            <span>Platform Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Aggregated live metrics across all registered venues and guest interactions.
          </p>
        </div>

        <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 text-xs overflow-x-auto w-full md:w-auto">
          {(['today', '7d', '30d', '90d', 'all'] as DashboardTimeFilter[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeFilter(tf)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition flex-1 sm:flex-initial text-center ${
                timeFilter === tf
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tf === 'today' ? 'Today' : tf === '7d' ? '7D' : tf === '30d' ? '30D' : tf === '90d' ? '90D' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Total Menu Scans</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 block">
            {totals.scans.toLocaleString()}
          </span>
          <span className="text-xs text-[#078A55] mt-2 flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live real-time telemetry
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Google Review Clicks</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 block">
            {totals.reviews.toLocaleString()}
          </span>
          <span className="text-xs text-amber-600 mt-2 block font-medium">
            {totals.ctr}% Click-through Rate
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Review Drafts Generated</span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 block">
            {totals.drafts.toLocaleString()}
          </span>
          <span className="text-xs text-slate-500 mt-2 block font-medium">
            Active Review Assistant
          </span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-xs sm:text-sm font-semibold text-slate-900">
            Restaurant Scan Activity Breakdown
          </h2>
          <span className="text-xs text-slate-500 font-medium">{businesses.length} Venues</span>
        </div>

        <div className="divide-y divide-slate-100">
          {businessStatsList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No registered restaurants found.
            </div>
          ) : (
            businessStatsList.map((item, idx) => (
              <div
                key={item.business.id}
                className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/60 transition text-xs gap-2"
              >
                <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
                  <span className="w-5 text-center font-bold text-slate-400 text-xs">#{idx + 1}</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 overflow-hidden flex-shrink-0">
                    {item.business.logoUrl ? (
                      <img src={item.business.logoUrl} alt={item.business.name} className="w-full h-full object-cover" />
                    ) : (
                      item.business.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 truncate text-xs">{item.business.name}</p>
                    <p className="text-[11px] text-slate-500 truncate font-mono">/m/{item.business.slug}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 sm:space-x-8 flex-shrink-0">
                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-xs sm:text-sm">{item.scans.toLocaleString()}</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">Scans</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-600 text-xs sm:text-sm">{item.reviews.toLocaleString()}</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">Reviews</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="font-bold text-[#078A55] text-xs sm:text-sm">{item.conversionRate}%</p>
                    <p className="text-[10px] sm:text-[11px] text-slate-500">Conv.</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
