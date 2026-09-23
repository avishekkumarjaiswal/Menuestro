import React, { useState, useEffect } from 'react';
import {
  Store,
  QrCode,
  Star,
  Sparkles,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ChevronRight,
  Plus,
  ExternalLink
} from 'lucide-react';
import {
  Business,
  AdminActivityLog,
  PlatformOverviewMetrics,
  DashboardTimeFilter,
  BusinessStats
} from '../../types';
import {
  subscribeAllBusinesses,
  subscribeAdminActivityLogs,
  getPlatformOverviewMetrics,
  subscribeAllBusinessesStats,
  calculateFilteredRestaurantStats,
  getGlobalReviewLibrary,
  getReviewTemplates
} from '../../services/firestoreService';

interface AdminDashboardViewProps {
  onNavigateToRestaurants: () => void;
  onNavigateToRestaurantDetail: (businessId: string) => void;
  onNavigateToContent: () => void;
  onNavigateToActivity: () => void;
  onOpenCreateModal: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigateToRestaurants,
  onNavigateToRestaurantDetail,
  onNavigateToContent,
  onNavigateToActivity,
  onOpenCreateModal,
}) => {
  const [timeFilter, setTimeFilter] = useState<DashboardTimeFilter>('30d');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, BusinessStats>>({});
  const [activities, setActivities] = useState<AdminActivityLog[]>([]);
  const [metrics, setMetrics] = useState<PlatformOverviewMetrics>({
    totalRestaurants: 0,
    activeRestaurants: 0,
    suspendedRestaurants: 0,
    archivedRestaurants: 0,
    totalMenuItems: 0,
    totalMenuScans: 0,
    totalGoogleReviewClicks: 0,
    totalReviewAssistantSessions: 0,
    totalReviewDraftsGenerated: 0,
  });

  const [phraseCount, setPhraseCount] = useState<number>(0);
  const [templateCount, setTemplateCount] = useState<number>(0);

  useEffect(() => {
    getPlatformOverviewMetrics().then((m) => {
      setMetrics(m);
    });

    getGlobalReviewLibrary().then((phrases) => {
      setPhraseCount(phrases.filter((p) => p.active !== false).length);
    }).catch(console.warn);

    getReviewTemplates().then((tpls) => {
      setTemplateCount(tpls.filter((t) => t.active !== false).length);
    }).catch(console.warn);

    const unsubBiz = subscribeAllBusinesses((list) => {
      setBusinesses(list);
    });

    const unsubStats = subscribeAllBusinessesStats((newStatsMap) => {
      setStatsMap(newStatsMap);
    });

    const unsubAct = subscribeAdminActivityLogs((logs) => {
      setActivities(logs.slice(0, 6));
    }, undefined, 10);

    return () => {
      unsubBiz();
      unsubStats();
      unsubAct();
    };
  }, []);

  // Real-time aggregate calculation across all businesses for selected time filter
  const platformTotals = React.useMemo(() => {
    let scans = 0;
    let reviews = 0;
    let sessions = 0;
    let drafts = 0;

    for (const b of businesses) {
      const s = calculateFilteredRestaurantStats(statsMap[b.id], timeFilter);
      scans += s.scans;
      reviews += s.reviews;
      sessions += s.sessions;
      drafts += s.drafts;
    }

    return { scans, reviews, sessions, drafts };
  }, [businesses, statsMap, timeFilter]);

  const displayScans = platformTotals.scans;
  const displayReviewClicks = platformTotals.reviews;
  const displayAssistantSessions = platformTotals.sessions;
  const displayDrafts = platformTotals.drafts;

  const activeCount = businesses.filter((b) => !b.status || b.status === 'active').length;
  const suspendedCount = businesses.filter((b) => b.status === 'suspended').length;
  const totalRestaurantCount = businesses.length || metrics.totalRestaurants || 0;

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header & Time Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Platform Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor restaurant operations, menu activity, and review conversion across all registered locations.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 text-xs overflow-x-auto">
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

          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 bg-[#078A55] hover:bg-[#067347] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Restaurant</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Restaurants */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500">
              Total Restaurants
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {totalRestaurantCount}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] sm:text-xs text-slate-500 flex-wrap">
              <span className="text-emerald-700 font-medium">
                {activeCount} Active
              </span>
              {suspendedCount > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-600">{suspendedCount} Suspended</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Total Menu Scans */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500">
              Digital Menu Scans
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-[#078A55] flex items-center justify-center flex-shrink-0">
              <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {displayScans.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-[11px] sm:text-xs text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time live telemetry</span>
            </div>
          </div>
        </div>

        {/* Google Review Clicks */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-medium text-slate-500">
              Review Link Actions
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="text-xl sm:text-2xl font-bold text-slate-900">
              {displayReviewClicks.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-1 text-[11px] sm:text-xs text-slate-500">
              <ArrowUpRight className="w-3 h-3 text-amber-600" />
              <span className="font-medium text-slate-700">
                {displayScans > 0 ? Math.round((displayReviewClicks / displayScans) * 100) : 0}%
              </span>
              <span>conversion</span>
            </div>
          </div>
        </div>

        {/* Review Assistant Usage */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              Review Assistant Flows
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900">
              {displayAssistantSessions.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
              <span>{displayDrafts} reviews compiled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Engagement Breakdown & Content Studio Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Funnel Card */}
        <div className="lg:col-span-2 bg-white p-5 md:p-6 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Guest Engagement & Review Funnel
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Step-by-step guest interactions from QR scan to Google review redirect
                </p>
              </div>
            </div>

            <div className="space-y-4 my-3">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-600">1. Digital Menu Scans / Views</span>
                  <span className="text-slate-900 font-semibold">{displayScans.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-[#078A55] h-full rounded-full w-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-600">2. Review Assistant Launched</span>
                  <span className="text-slate-900 font-semibold">{displayAssistantSessions.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#078A55] h-full rounded-full transition-all duration-300 opacity-80"
                    style={{
                      width: `${displayScans > 0 ? Math.min(100, Math.round((displayAssistantSessions / displayScans) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-600">3. Review Highlights Compiled</span>
                  <span className="text-slate-900 font-semibold">{displayDrafts.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#078A55] h-full rounded-full transition-all duration-300 opacity-60"
                    style={{
                      width: `${displayScans > 0 ? Math.min(100, Math.round((displayDrafts / displayScans) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1.5">
                  <span className="text-slate-600">4. Redirected to Google Review Link</span>
                  <span className="text-slate-900 font-semibold">{displayReviewClicks.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${displayScans > 0 ? Math.min(100, Math.round((displayReviewClicks / displayScans) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span>Aggregated across all registered venues</span>
            <button
              onClick={onNavigateToRestaurants}
              className="text-[#078A55] hover:text-[#067347] font-medium flex items-center gap-1"
            >
              <span>View breakdown by venue</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Global Content Studio Card */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Global Content Studio
              </h2>
              <button
                onClick={onNavigateToContent}
                className="text-xs text-[#078A55] hover:text-[#067347] font-medium flex items-center gap-0.5"
              >
                <span>Manage</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Centrally managed review snippets, templates, and feedback prompts used by customer review assistants.
            </p>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Review Phrases</p>
                  <p className="text-[11px] text-slate-500">Food, service & ambience snippets</p>
                </div>
                <span className="text-xs font-medium text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200">
                  {phraseCount} Active
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Review Templates</p>
                  <p className="text-[11px] text-slate-500">Structure & greeting syntax</p>
                </div>
                <span className="text-xs font-medium text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200">
                  {templateCount} Active
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Feedback Prompts</p>
                  <p className="text-[11px] text-slate-500">Guest interaction steps</p>
                </div>
                <span className="text-xs font-medium text-slate-700 bg-white px-2.5 py-1 rounded border border-slate-200">
                  Active
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onNavigateToContent}
            className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-lg transition flex items-center justify-center gap-1"
          >
            <span>Open Content Studio</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Two Column Section: Managed Restaurants & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Managed Restaurants */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Managed Restaurants
              </h2>
              <p className="text-xs text-slate-500">Active restaurant profiles & digital menus</p>
            </div>
            <button
              onClick={onNavigateToRestaurants}
              className="text-xs text-[#078A55] hover:text-[#067347] font-medium flex items-center gap-0.5"
            >
              <span>View All ({businesses.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {businesses.slice(0, 5).map((biz) => (
              <div
                key={biz.id}
                onClick={() => onNavigateToRestaurantDetail(biz.id)}
                className="py-3 px-2 -mx-2 rounded-lg hover:bg-slate-50 cursor-pointer transition flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 overflow-hidden flex-shrink-0">
                    {biz.logoUrl ? (
                      <img src={biz.logoUrl} alt={biz.name} className="w-full h-full object-cover" />
                    ) : (
                      biz.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-[#078A55] transition">
                      {biz.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      /m/{biz.slug} <span aria-hidden="true">·</span> {biz.country || 'Global'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      biz.status === 'suspended'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {biz.status === 'suspended' ? 'Suspended' : 'Active'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
                </div>
              </div>
            ))}

            {businesses.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                No restaurants found. Click "Add Restaurant" to register your first venue.
              </div>
            )}
          </div>
        </div>

        {/* Recent Admin Activity Log */}
        <div className="bg-white p-5 md:p-6 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Audit Trail
              </h2>
              <p className="text-xs text-slate-500">Recent administrative modifications</p>
            </div>
            <button
              onClick={onNavigateToActivity}
              className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-0.5"
            >
              <span>Full Log</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex items-start space-x-3 text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-[#078A55] mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 font-medium">
                    <span className="font-semibold text-slate-900">{act.adminName || 'Admin'}</span>{' '}
                    {act.action}
                    {act.businessName ? ` for "${act.businessName}"` : ''}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                    <span aria-hidden="true">·</span> {new Date(act.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}

            {activities.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-xs">
                No recent activity records found.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
