import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeBusinessStats,
  subscribeQRCodes,
  getAnalyticsEvents,
  subscribeAnalyticsEvents,
} from '../../services/firestoreService';
import { AnalyticsEvent, BusinessStats, QRCodeItem } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Card, MetricCard } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Smartphone,
  Star,
  ChevronDown,
  Calendar,
  Activity,
  QrCode,
} from 'lucide-react';
import { NavTab } from './DashboardLayout';

interface DashboardViewProps {
  onNavigate?: (tab: NavTab) => void;
  onOpenUpgrade?: () => void;
}

type TimeRangeKey = 'today' | '7d' | '30d' | '90d';

interface ChartDataPoint {
  label: string;
  fullDate: string;
  scans: number;
  x: number;
  y: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const { business } = useAuth();
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<AnalyticsEvent[]>([]);
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRangeKey>('7d');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);

  const [activePointIndex, setActivePointIndex] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Subscribe to O(1) Pre-Aggregated Stats and QR Codes
  useEffect(() => {
    if (!business?.id) return;

    const unsubStats = subscribeBusinessStats(business.id, (loadedStats) => {
      setStats(loadedStats);
    });

    const unsubQrs = subscribeQRCodes(business.id, (loadedQrs) => {
      setQrCodes(loadedQrs);
    });

    const unsubEvents = subscribeAnalyticsEvents(business.id, (events) => {
      setRecentEvents(events);
    });

    return () => {
      unsubStats();
      unsubQrs();
      unsubEvents();
    };
  }, [business?.id]);

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Compute metric cards from aggregated stats
  const { totalScansCount, totalReviewsCount, todayScansCount, todayReviewsCount } = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const qrScansTotal = qrCodes.reduce((acc, q) => acc + (q.scans || 0), 0);

    const statsScans = stats?.totalScans || 0;
    const statsReviews = stats?.totalReviews || 0;

    const todayScans = stats?.dailyScans?.[todayStr] ?? stats?.todayScans ?? 0;
    const todayReviews = stats?.dailyReviews?.[todayStr] ?? stats?.todayReviews ?? 0;

    return {
      totalScansCount: Math.max(statsScans, qrScansTotal),
      totalReviewsCount: statsReviews,
      todayScansCount: todayScans,
      todayReviewsCount: todayReviews,
    };
  }, [stats, qrCodes]);

  // Generate chart spline using pre-aggregated daily scans map
  const { points, pathD, areaD, xAxisLabels, hasChartData } = useMemo(() => {
    const now = new Date();
    const dailyScansMap = stats?.dailyScans || {};

    let buckets: { label: string; fullDate: string; scans: number }[] = [];

    if (timeRange === 'today') {
      // 8 time intervals for today (3-hour slots) strictly calculated from real activity events
      const intervals = ['12 AM', '3 AM', '6 AM', '9 AM', '12 PM', '3 PM', '6 PM', '9 PM'];
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
      buckets = intervals.map((label, idx) => {
        const h = idx * 3;
        const bStart = startOfDay + h * 3600 * 1000;
        const bEnd = startOfDay + (h + 3) * 3600 * 1000;
        const count = recentEvents.filter((ev) => {
          const isScan = ev.type === 'menu_scan' || ev.type === 'menu_view';
          const t = new Date(ev.timestamp).getTime();
          return isScan && t >= bStart && t < bEnd;
        }).length;
        return {
          label,
          fullDate: `Today ${label}`,
          scans: count,
        };
      });
    } else if (timeRange === '7d') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        const scans = dailyScansMap[dateKey] || 0;
        buckets.push({
          label: weekday,
          fullDate: `${weekday}, ${dateStr}`,
          scans,
        });
      }
    } else if (timeRange === '30d') {
      for (let i = 29; i >= 0; i -= 4) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        let scans = 0;
        for (let j = 0; j < 4; j++) {
          const subD = new Date(d);
          subD.setDate(d.getDate() + j);
          const subKey = subD.toISOString().split('T')[0];
          scans += dailyScansMap[subKey] || 0;
        }
        buckets.push({
          label: dateStr,
          fullDate: dateStr,
          scans,
        });
      }
    } else {
      // 90 days
      for (let i = 89; i >= 0; i -= 15) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        let scans = 0;
        for (let j = 0; j < 15; j++) {
          const subD = new Date(d);
          subD.setDate(d.getDate() + j);
          const subKey = subD.toISOString().split('T')[0];
          scans += dailyScansMap[subKey] || 0;
        }
        buckets.push({
          label: dateStr,
          fullDate: dateStr,
          scans,
        });
      }
    }

    const totalScansInBuckets = buckets.reduce((acc, b) => acc + b.scans, 0);
    const maxCount = Math.max(...buckets.map((b) => b.scans), 5);
    const minVal = 0;
    const topMargin = 20;
    const bottomMargin = 180;
    const leftMargin = 20;
    const rightMargin = 480;

    const computedPoints: ChartDataPoint[] = buckets.map((item, idx) => {
      const x =
        leftMargin +
        (idx / Math.max(1, buckets.length - 1)) * (rightMargin - leftMargin);
      const clampedScans = Math.min(Math.max(item.scans, minVal), maxCount);
      const y =
        bottomMargin -
        (clampedScans / (maxCount - minVal)) * (bottomMargin - topMargin);
      return {
        label: item.label,
        fullDate: item.fullDate,
        scans: item.scans,
        x,
        y,
      };
    });

    let path = `M ${computedPoints[0].x} ${computedPoints[0].y}`;
    for (let i = 0; i < computedPoints.length - 1; i++) {
      const p0 = computedPoints[i === 0 ? i : i - 1];
      const p1 = computedPoints[i];
      const p2 = computedPoints[i + 1];
      const p3 = computedPoints[i + 2 < computedPoints.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }

    const area = `${path} L ${rightMargin} ${bottomMargin} L ${leftMargin} ${bottomMargin} Z`;
    const labels = computedPoints.filter((p) => p.label !== '');

    return {
      points: computedPoints,
      pathD: path,
      areaD: area,
      xAxisLabels: labels,
      hasChartData: totalScansInBuckets > 0,
    };
  }, [timeRange, stats, recentEvents]);

  const activePoint =
    points[activePointIndex] || points[points.length - 1] || points[0];

  // Helper formatting for time ago
  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / (60 * 1000));
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const recentActivities = useMemo(() => {
    return recentEvents.slice(0, 15).map((ev) => {
      const isScan = ev.type === 'menu_scan' || ev.type === 'menu_view';
      const isReview = ev.type === 'google_review_click' || ev.type === 'review_page_visit';
      const tableInfo = ev.metadata?.tableNumber ? ` (Table #${ev.metadata.tableNumber})` : '';

      return {
        id: ev.id,
        type: ev.type,
        title: isScan
          ? `Menu scanned${tableInfo}`
          : isReview
          ? 'Google Review link clicked'
          : 'Menu viewed',
        timeAgo: formatTimeAgo(ev.timestamp),
        timestamp: ev.timestamp,
      };
    });
  }, [recentEvents]);

  const timeRangeLabels: Record<TimeRangeKey, string> = {
    today: 'Today',
    '7d': 'Last 7 Days',
    '30d': 'Last 30 Days',
    '90d': 'Last 90 Days',
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto select-none font-sans">
      {/* 1. Page Header */}
      <PageHeader
        title={`${greeting}, ${business?.name || 'Manager'}`}
        description="Real-time menu scans and Google Review traffic overview."
      />

      {/* 2. Top Metric Cards (Equal Height, Clean Spacing) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Metric 1: Menu Scans */}
        <MetricCard
          label="Total Menu Scans"
          value={totalScansCount.toLocaleString()}
          icon={<Smartphone className="w-5 h-5 text-[#078A55]" />}
          iconBgColor="bg-[#EAF8F1]"
          trend={todayScansCount > 0 ? `+${todayScansCount} today` : undefined}
        />

        {/* Metric 2: Review Link Clicks */}
        <MetricCard
          label="Google Review Clicks"
          value={totalReviewsCount.toLocaleString()}
          icon={<Star className="w-5 h-5 fill-[#F59E0B] text-[#F59E0B]" />}
          iconBgColor="bg-[#FFF7DB]"
          trend={todayReviewsCount > 0 ? `+${todayReviewsCount} today` : undefined}
        />
      </div>

      {/* 3. Main Content: Chart (Left) + Activity Feed (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Menu Scans Trend Chart */}
        <Card size="default" className="lg:col-span-8 flex flex-col justify-between">
          <div className="space-y-6">
            {/* Chart Card Header & Time Range Filter Dropdown */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#EEF1F5]">
              <div>
                <h2 className="text-base font-semibold text-[#101828]">
                  Menu Scans Over Time
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Real-time scan trends across all tables and devices
                </p>
              </div>

              {/* Time Range Selector Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E4E7EC] hover:border-[#D0D5DD] rounded-[10px] text-xs font-semibold text-[#344054] shadow-xs transition-colors cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5 text-[#667085]" />
                  <span>{timeRangeLabels[timeRange]}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#667085]" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-[12px] border border-[#E4E7EC] shadow-[0_4px_12px_rgba(16,24,40,0.08)] py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                    {(['today', '7d', '30d', '90d'] as TimeRangeKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setTimeRange(key);
                          setIsDropdownOpen(false);
                          setActivePointIndex(0);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                          timeRange === key
                            ? 'bg-[#EAF8F1] text-[#078A55] font-semibold'
                            : 'text-[#344054] hover:bg-[#F7F9FC]'
                        }`}
                      >
                        {timeRangeLabels[key]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SVG Spline Chart */}
            <div className="relative w-full h-[220px] pt-4 select-none">
              <svg
                viewBox="0 0 500 200"
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="scansAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#078A55" stopOpacity="0.22" />
                    <stop offset="60%" stopColor="#078A55" stopOpacity="0.04" />
                    <stop offset="100%" stopColor="#078A55" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Baseline */}
                <line
                  x1="20"
                  y1="180"
                  x2="480"
                  y2="180"
                  stroke="#EEF1F5"
                  strokeWidth="1"
                />
                <line
                  x1="20"
                  y1="100"
                  x2="480"
                  y2="100"
                  stroke="#EEF1F5"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />

                {/* Area Fill */}
                <path d={areaD} fill="url(#scansAreaGradient)" />

                {/* Primary Spline Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#078A55"
                  strokeWidth="2.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Interactive Points on Line */}
                {points.map((pt, idx) => (
                  <g
                    key={idx}
                    className="cursor-pointer group"
                    onClick={() => setActivePointIndex(idx)}
                  >
                    <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                    {activePointIndex === idx && (
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="7"
                        fill="#078A55"
                        fillOpacity="0.2"
                      />
                    )}

                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={activePointIndex === idx ? '4.5' : '3'}
                      fill="#FFFFFF"
                      stroke="#078A55"
                      strokeWidth={activePointIndex === idx ? '2.5' : '1.75'}
                      className="transition-all duration-150"
                    />
                  </g>
                ))}
              </svg>

              {/* Tooltip Overlay */}
              {activePoint && (
                <div
                  className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-[#101828] text-white px-2.5 py-1 rounded-[8px] text-[11px] font-semibold shadow-md whitespace-nowrap z-20"
                  style={{
                    left: `${(activePoint.x / 500) * 100}%`,
                    top: `${(activePoint.y / 200) * 100}%`,
                  }}
                >
                  <div className="text-[10px] text-[#98A2B3] font-normal leading-none mb-0.5">
                    {activePoint.fullDate}
                  </div>
                  <div className="leading-tight">
                    {activePoint.scans} scans
                  </div>
                </div>
              )}
            </div>

            {/* X-Axis Date Labels */}
            <div className="flex items-center justify-between text-[11px] font-medium text-[#98A2B3] px-2 pt-1 border-t border-[#EEF1F5]">
              {xAxisLabels.map((lbl, i) => (
                <span key={i}>{lbl.label}</span>
              ))}
            </div>
          </div>
        </Card>

        {/* Right Column: Live Activity Feed */}
        <Card size="default" className="lg:col-span-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#EEF1F5]">
              <div>
                <h2 className="text-base font-semibold text-[#101828]">Recent Activity</h2>
                <p className="text-xs text-[#667085] mt-0.5">Live restaurant activity feed</p>
              </div>
              <Activity className="w-4 h-4 text-[#078A55]" />
            </div>

            {/* Activity Items List */}
            {recentActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#98A2B3]">
                <QrCode className="w-8 h-8 text-[#D0D5DD] mx-auto mb-2" />
                <p className="font-semibold text-[#344054]">No recent scans yet</p>
                <p className="text-[11px] text-[#98A2B3] mt-0.5">
                  Events will appear here instantly when guests scan QR codes.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F2F4F7]">
                {recentActivities.slice(0, 5).map((act) => {
                  const isReview = act.type === 'google_review_click' || act.type === 'review_page_visit';
                  return (
                    <div
                      key={act.id}
                      className="py-3 flex items-start gap-3 first:pt-0 last:pb-0 hover:bg-[#F7F9FC] -mx-2 px-2 rounded-[8px] transition-colors"
                    >
                      <div
                        className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 ${
                          isReview ? 'bg-[#FFF7DB] text-[#D97706]' : 'bg-[#EAF8F1] text-[#078A55]'
                        }`}
                      >
                        {isReview ? (
                          <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                        ) : (
                          <Smartphone className="w-4 h-4 text-[#078A55]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[#101828] truncate">
                          {act.title}
                        </p>
                        <p className="text-[11px] text-[#667085] mt-0.5">
                          {act.timeAgo}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {recentActivities.length > 5 && (
            <div className="pt-4 border-t border-[#EEF1F5] mt-4">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setIsActivityModalOpen(true)}
              >
                View Full Activity Log ({recentActivities.length})
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Full Activity Log Modal */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="Recent Customer Activity Log"
        description="Chronological stream of tenant menu scans and Google Review interactions."
        maxWidth="md"
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
          {recentActivities.map((act) => {
            const isReview = act.type === 'google_review_click' || act.type === 'review_page_visit';
            return (
              <div
                key={act.id}
                className="p-3 bg-[#F7F9FC] border border-[#E4E7EC] rounded-[12px] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 ${
                      isReview ? 'bg-[#FFF7DB] text-[#D97706]' : 'bg-[#EAF8F1] text-[#078A55]'
                    }`}
                  >
                    {isReview ? (
                      <Star className="w-4 h-4 fill-[#F59E0B] text-[#F59E0B]" />
                    ) : (
                      <Smartphone className="w-4 h-4 text-[#078A55]" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#101828]">{act.title}</h4>
                    <p className="text-[11px] text-[#667085]">
                      {new Date(act.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-[#98A2B3] shrink-0">
                  {act.timeAgo}
                </span>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
};
