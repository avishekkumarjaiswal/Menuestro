import React, { useState, useEffect, useRef } from 'react';
import {
  Store,
  Search,
  Plus,
  ExternalLink,
  MoreVertical,
  CheckCircle,
  AlertTriangle,
  Archive,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  Check,
  Building2,
  ShieldAlert,
  Layers
} from 'lucide-react';
import { Business, BusinessStatus, BusinessStats } from '../../types';
import {
  subscribeAllBusinesses,
  subscribeAllBusinessesStats,
  updateBusinessStatus,
  deleteBusiness,
  checkSlugAvailable,
  createBusiness
} from '../../services/firestoreService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

interface AdminRestaurantsViewProps {
  onSelectRestaurant: (businessId: string) => void;
  onPreviewPublicMenu?: (slug: string) => void;
  isCreateModalOpen?: boolean;
  onCloseCreateModal?: () => void;
  onOpenCreateModal?: () => void;
}

export const AdminRestaurantsView: React.FC<AdminRestaurantsViewProps> = ({
  onSelectRestaurant,
  onPreviewPublicMenu,
  isCreateModalOpen: externalCreateOpen,
  onCloseCreateModal: externalCloseCreate,
  onOpenCreateModal: externalOpenCreate,
}) => {
  const { user, profile } = useAuth();
  const { addToast } = useToast();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, BusinessStats>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | BusinessStatus>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const unsub = subscribeAllBusinessesStats(setStatsMap);
    return () => unsub();
  }, []);

  // Local Create Modal state
  const [internalCreateOpen, setInternalCreateOpen] = useState(false);
  const showCreateModal = externalCreateOpen !== undefined ? externalCreateOpen : internalCreateOpen;
  const setShowCreateModal = (open: boolean) => {
    if (externalCloseCreate && !open) externalCloseCreate();
    if (externalOpenCreate && open) externalOpenCreate();
    setInternalCreateOpen(open);
  };

  // Active dropdown action menu
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  // Close active dropdown menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Initial Form Template
  const defaultFormData = {
    name: '',
    slug: '',
    ownerEmail: '',
    tagline: '',
    description: '',
    country: 'India',
    currency: '₹',
    currencyCode: 'INR',
    phone: '',
    address: '',
    googleReviewUrl: '',
    primaryColor: '#078A55',
    logoUrl: '',
    coverImageUrl: '',
    status: 'active' as BusinessStatus,
  };

  // Form State for creating new restaurant
  const [formData, setFormData] = useState(defaultFormData);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = subscribeAllBusinesses((list) => {
      setBusinesses(list);
    });
    return () => unsub();
  }, []);

  // Live slug auto-generation from name
  const handleNameChange = (name: string) => {
    const autoSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    setFormData((prev) => ({ ...prev, name, slug: autoSlug }));
    if (autoSlug) {
      checkSlugDebounced(autoSlug);
    }
  };

  const handleSlugChange = (slug: string) => {
    const clean = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-');
    setFormData((prev) => ({ ...prev, slug: clean }));
    if (clean) {
      checkSlugDebounced(clean);
    }
  };

  const checkSlugDebounced = async (slugToTest: string) => {
    setSlugChecking(true);
    const available = await checkSlugAvailable(slugToTest);
    setSlugAvailable(available);
    setSlugChecking(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim()) {
      addToast('Please enter both restaurant name and unique slug', 'error');
      return;
    }
    if (slugAvailable === false) {
      addToast('This URL slug is already in use. Please choose another.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const adminInfo = {
        id: user?.uid || 'super_admin',
        email: user?.email || 'admin@menuestro.com',
        name: profile?.name || 'Administrator',
      };

      const newId = await createBusiness(
        {
          ownerId: user?.uid || 'super_admin',
          ownerEmail: formData.ownerEmail.trim().toLowerCase(),
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          tagline: formData.tagline,
          description: formData.description,
          country: formData.country,
          currency: formData.currency,
          currencyCode: formData.currencyCode,
          phone: formData.phone,
          address: formData.address,
          googleReviewUrl: formData.googleReviewUrl,
          primaryColor: formData.primaryColor,
          logoUrl: formData.logoUrl,
          coverImageUrl: formData.coverImageUrl,
          status: formData.status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          reviewAssistantSettings: {
            enabled: true,
            maximumPhraseSelections: 5,
            googleReviewUrl: formData.googleReviewUrl,
          },
        },
        undefined,
        adminInfo
      );

      addToast(`Restaurant "${formData.name}" created successfully!`, 'success');
      setFormData(defaultFormData);
      setShowCreateModal(false);
      onSelectRestaurant(newId);
    } catch (err: any) {
      console.error('Error creating restaurant:', err);
      addToast(err?.message ? `Failed: ${err.message}` : 'Failed to create restaurant.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (bizId: string, newStatus: BusinessStatus) => {
    try {
      await updateBusinessStatus(bizId, newStatus, {
        id: user?.uid || 'super_admin',
        email: user?.email || 'admin@menuestro.com',
        name: profile?.name || 'Administrator',
      });
      addToast(`Restaurant status changed to ${newStatus}`, 'success');
      setActiveMenuId(null);
    } catch (err) {
      addToast('Failed to update status', 'error');
    }
  };

  const handleDelete = async (bizId: string, bizName: string) => {
    if (!confirm(`Are you sure you want to delete "${bizName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteBusiness(bizId, {
        id: user?.uid || 'super_admin',
        email: user?.email || 'admin@menuestro.com',
        name: profile?.name || 'Administrator',
      });
      addToast(`Restaurant "${bizName}" deleted`, 'info');
      setActiveMenuId(null);
    } catch (err) {
      addToast('Failed to delete restaurant', 'error');
    }
  };

  // Metrics
  const totalCount = businesses.length;
  const activeCount = businesses.filter((b) => (b.status || 'active') === 'active').length;
  const suspendedCount = businesses.filter((b) => b.status === 'suspended').length;
  const archivedCount = businesses.filter((b) => b.status === 'archived').length;

  // Filter and sort businesses
  const filtered = businesses.filter((b) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      b.name.toLowerCase().includes(q) ||
      b.slug.toLowerCase().includes(q) ||
      (b.ownerEmail && b.ownerEmail.toLowerCase().includes(q)) ||
      (b.phone && b.phone.toLowerCase().includes(q)) ||
      (b.address && b.address.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'all' || (b.status || 'active') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    }
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    return 0;
  });

  const totalPages = Math.ceil(sorted.length / itemsPerPage) || 1;
  const paginatedBusinesses = sorted.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#078A55]">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Restaurant Directory
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Manage all registered restaurants, owner logins, and tenant states.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setFormData(defaultFormData);
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#078A55] hover:bg-[#067347] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Restaurant</span>
        </button>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Total Restaurants
          </span>
          <span className="text-2xl font-bold text-slate-900 mt-1 block">
            {totalCount}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider block">
            Active Online
          </span>
          <span className="text-2xl font-bold text-emerald-700 mt-1 block">
            {activeCount}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-medium text-amber-600 uppercase tracking-wider block">
            Suspended
          </span>
          <span className="text-2xl font-bold text-amber-700 mt-1 block">
            {suspendedCount}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
            Archived
          </span>
          <span className="text-2xl font-bold text-slate-700 mt-1 block">
            {archivedCount}
          </span>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search restaurants, slug, or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#078A55] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 justify-between sm:justify-end">
          {/* Status Tabs */}
          <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1 text-xs overflow-x-auto">
            {(['all', 'active', 'suspended', 'archived'] as const).map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`px-2.5 sm:px-3 py-1.5 rounded-md font-medium capitalize whitespace-nowrap transition ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-2.5 sm:px-3 py-2 font-medium focus:outline-none focus:border-[#078A55] flex-shrink-0"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="name">A - Z</option>
          </select>
        </div>
      </div>

      {/* DESKTOP TABLE VIEW (Screens >= 768px) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200/80 shadow-xs">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-200">
            <thead className="bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Restaurant Details</th>
                <th className="py-3.5 px-4 font-semibold">Manager Login Email</th>
                <th className="py-3.5 px-4 font-semibold">Menu URL</th>
                <th className="py-3.5 px-4 font-semibold">Live Analytics</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedBusinesses.map((biz) => {
                const status = biz.status || 'active';
                return (
                  <tr
                    key={biz.id}
                    className="hover:bg-slate-50/90 transition group cursor-pointer"
                    onClick={() => onSelectRestaurant(biz.id)}
                  >
                    {/* Restaurant Brand Info */}
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 overflow-hidden flex-shrink-0 shadow-xs">
                          {biz.logoUrl ? (
                            <img
                              src={biz.logoUrl}
                              alt={biz.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-base text-emerald-800 font-bold">
                              {biz.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 text-sm group-hover:text-[#078A55] transition truncate">
                            {biz.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
                            <span>{biz.country || 'India'}</span>
                            <span aria-hidden="true">·</span>
                            <span>{biz.phone || 'No phone'}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Assigned Manager Email */}
                    <td className="py-4 px-4">
                      {biz.ownerEmail ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-mono font-medium">
                          <Mail className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{biz.ownerEmail}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          No manager email assigned
                        </span>
                      )}
                    </td>

                    {/* Slug Link */}
                    <td className="py-4 px-4">
                      <a
                        href={`/m/${biz.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-mono text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 px-2 py-1 rounded-md transition"
                      >
                        <span>/m/{biz.slug}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                      </a>
                    </td>

                    {/* Live Analytics */}
                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="font-bold text-slate-900">
                          {statsMap[biz.id]?.totalScans || 0}
                        </span>
                        <span className="text-[11px] text-slate-400">scans</span>
                        <span className="text-slate-300">·</span>
                        <span className="font-bold text-amber-600">
                          {statsMap[biz.id]?.totalReviews || 0}
                        </span>
                        <span className="text-[11px] text-slate-400">reviews</span>
                      </div>
                    </td>

                    {/* Status Badge & Inline Switcher */}
                    <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : status === 'suspended'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            status === 'active'
                              ? 'bg-emerald-500'
                              : status === 'suspended'
                              ? 'bg-amber-500'
                              : 'bg-slate-400'
                          }`}
                        />
                        {status === 'active' ? 'Active' : status === 'suspended' ? 'Suspended' : 'Archived'}
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td
                      className="py-4 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onSelectRestaurant(biz.id)}
                          className="px-3 py-1.5 bg-[#078A55] hover:bg-[#067347] text-white rounded-lg text-xs font-semibold transition shadow-xs flex items-center gap-1"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={`/m/${biz.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Customer Menu"
                          className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        {/* More Menu Dropdown */}
                        <div className="relative inline-block text-left" ref={activeMenuId === biz.id ? actionMenuRef : undefined}>
                          <button
                            onClick={() =>
                              setActiveMenuId(activeMenuId === biz.id ? null : biz.id)
                            }
                            className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === biz.id && (
                            <div className="absolute right-0 bottom-full mb-1 sm:bottom-auto sm:top-full sm:mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs">
                              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                                Tenant Status
                              </div>
                              {status !== 'active' && (
                                <button
                                  onClick={() => handleStatusChange(biz.id, 'active')}
                                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-emerald-700 flex items-center gap-2 font-medium"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  <span>Set Active (Online)</span>
                                </button>
                              )}
                              {status !== 'suspended' && (
                                <button
                                  onClick={() => handleStatusChange(biz.id, 'suspended')}
                                  className="w-full text-left px-3 py-2 hover:bg-amber-50 text-amber-700 flex items-center gap-2 font-medium"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                  <span>Suspend Access</span>
                                </button>
                              )}
                              {status !== 'archived' && (
                                <button
                                  onClick={() => handleStatusChange(biz.id, 'archived')}
                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                                >
                                  <Archive className="w-4 h-4" />
                                  <span>Archive Restaurant</span>
                                </button>
                              )}
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                onClick={() => handleDelete(biz.id, biz.name)}
                                className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-medium"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete Restaurant</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedBusinesses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-500 text-sm">
                    <Store className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No restaurants found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery
                        ? `No match for "${searchQuery}" in ${statusFilter} list.`
                        : 'Click "Add Restaurant" to provision your first location.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Desktop Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-150 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, sorted.length)} of {sorted.length} restaurants
            </span>
            <div className="flex items-center space-x-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 font-medium text-slate-900 bg-slate-100 rounded-md">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE / TABLET CARDS VIEW (Screens < 768px) */}
      <div className="block md:hidden space-y-3">
        {paginatedBusinesses.map((biz) => {
          const status = biz.status || 'active';
          return (
            <div
              key={biz.id}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 overflow-hidden flex-shrink-0">
                    {biz.logoUrl ? (
                      <img src={biz.logoUrl} alt={biz.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg text-emerald-800 font-bold">{biz.name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{biz.name}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">/m/{biz.slug}</p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${
                    status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : status === 'suspended'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {status === 'active' ? 'Active' : status === 'suspended' ? 'Suspended' : 'Archived'}
                </span>
              </div>

              {/* Owner Email & Address */}
              <div className="text-xs space-y-1 pt-1 border-t border-slate-100">
                {biz.ownerEmail && (
                  <div className="flex items-center gap-1.5 text-emerald-800 font-mono bg-emerald-50 px-2 py-1 rounded-md">
                    <Mail className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="truncate">{biz.ownerEmail}</span>
                  </div>
                )}
                <div className="text-slate-500 flex items-center gap-1 text-[11px]">
                  <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{biz.address || biz.country || 'India'}</span>
                </div>
              </div>

              {/* Live Analytics Row */}
              <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[11px] font-medium text-slate-500">Live Analytics</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-900">{statsMap[biz.id]?.totalScans || 0} scans</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-bold text-amber-600">{statsMap[biz.id]?.totalReviews || 0} reviews</span>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => onSelectRestaurant(biz.id)}
                  className="flex-1 py-2.5 bg-[#078A55] hover:bg-[#067347] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <span>Manage Restaurant</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <a
                  href={`/m/${biz.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs flex items-center justify-center"
                  title="View Menu"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                {/* Mobile More Options Dropdown */}
                <div className="relative inline-block text-left" ref={activeMenuId === `mob-${biz.id}` ? actionMenuRef : undefined}>
                  <button
                    onClick={() =>
                      setActiveMenuId(activeMenuId === `mob-${biz.id}` ? null : `mob-${biz.id}`)
                    }
                    className="p-2.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                    title="More actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {activeMenuId === `mob-${biz.id}` && (
                    <div className="absolute right-0 bottom-full mb-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 text-xs">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                        Change Status
                      </div>
                      {status !== 'active' && (
                        <button
                          onClick={() => {
                            handleStatusChange(biz.id, 'active');
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-emerald-50 text-emerald-700 flex items-center gap-2 font-medium"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Set Active (Online)</span>
                        </button>
                      )}
                      {status !== 'suspended' && (
                        <button
                          onClick={() => {
                            handleStatusChange(biz.id, 'suspended');
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-amber-50 text-amber-700 flex items-center gap-2 font-medium"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span>Suspend Access</span>
                        </button>
                      )}
                      {status !== 'archived' && (
                        <button
                          onClick={() => {
                            handleStatusChange(biz.id, 'archived');
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-700 flex items-center gap-2 font-medium"
                        >
                          <Archive className="w-4 h-4" />
                          <span>Archive Restaurant</span>
                        </button>
                      )}
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        onClick={() => {
                          handleDelete(biz.id, biz.name);
                          setActiveMenuId(null);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2 font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete Restaurant</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-500 shadow-xs">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center space-x-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {paginatedBusinesses.length === 0 && (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            <Store className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No restaurants found</p>
          </div>
        )}
      </div>

      {/* CREATE NEW RESTAURANT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[#078A55]">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Add New Restaurant
                  </h3>
                  <p className="text-xs text-slate-500">
                    Creates database profile, unique public menu link, and manager credentials
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Restaurant Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Restaurant Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Spice Symphony"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                  />
                </div>

                {/* Unique Slug */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Menu URL Slug * (/m/:slug)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="spice-symphony"
                      value={formData.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none ${
                        slugAvailable === true
                          ? 'border-emerald-500 pr-8'
                          : slugAvailable === false
                          ? 'border-rose-500 pr-8'
                          : 'border-slate-200'
                      }`}
                    />
                    {slugChecking && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                        checking...
                      </span>
                    )}
                    {slugAvailable === true && (
                      <CheckCircle className="w-4 h-4 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    )}
                    {slugAvailable === false && (
                      <AlertTriangle className="w-4 h-4 text-rose-500 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  {slugAvailable === false && (
                    <p className="text-[10px] text-rose-500 mt-1">Slug is already taken.</p>
                  )}
                </div>
              </div>

              {/* Owner / Manager Login Email */}
              <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-emerald-950">
                    Restaurant Owner / Manager Email
                  </label>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                    Direct Login Access
                  </span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="e.g. owner@restaurant.com"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs text-slate-900 focus:border-[#078A55] focus:ring-1 focus:ring-[#078A55] focus:outline-none"
                  />
                </div>
                <p className="text-[11px] text-emerald-800 leading-tight">
                  When a user logs in with this email, Menuestro will automatically map them to manage this restaurant's dashboard and menus.
                </p>
              </div>

              {/* Tagline */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tagline / Description
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g. Handcrafted Flavours & Fresh Dining"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Country */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                  />
                </div>

                {/* Currency Symbol */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Currency Symbol</label>
                  <input
                    type="text"
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                />
              </div>

              {/* Google Review URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Google Review Link (or Google Place Review URL)
                </label>
                <input
                  type="url"
                  value={formData.googleReviewUrl}
                  onChange={(e) => setFormData({ ...formData, googleReviewUrl: e.target.value })}
                  placeholder="https://g.page/r/your-place/review"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                />
              </div>

              {/* Logo & Cover Image URLs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Logo Image URL</label>
                  <input
                    type="url"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cover Image URL</label>
                  <input
                    type="url"
                    value={formData.coverImageUrl}
                    onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as BusinessStatus })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                >
                  <option value="active">Active (Publicly Accessible)</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || slugAvailable === false}
                  className="px-5 py-2 bg-[#078A55] hover:bg-[#067347] disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-2 transition"
                >
                  {submitting ? 'Creating...' : 'Create Restaurant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
