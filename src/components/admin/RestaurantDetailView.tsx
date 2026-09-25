import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Store,
  QrCode,
  Star,
  Sparkles,
  BarChart3,
  Settings,
  Utensils,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  CheckCircle,
  Copy,
  Download,
  Printer,
  Smartphone,
  Check,
  ChevronDown,
  Mail,
  UploadCloud,
  FileText,
  AlertCircle
} from 'lucide-react';
import { MenuCsvImportModal } from '../common/MenuCsvImportModal';
import { TagBadge } from '../ui/TagBadge';
import {
  Business,
  BusinessStatus,
  Category,
  MenuItem,
  QRCodeItem,
  ReviewPhrase
} from '../../types';
import {
  getBusiness,
  updateBusiness,
  updateBusinessStatus,
  getCategories,
  subscribeCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getItemsByCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getQRCodes,
  createQRCode,
  deleteQRCode,
  getBusinessStats,
  subscribeBusinessStats,
  getGlobalReviewLibrary,
  getReviewTemplates
} from '../../services/firestoreService';
import { generateDeterministicReview } from '../../utils/reviewGenerator';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

interface RestaurantDetailViewProps {
  businessId: string;
  onBack: () => void;
  onPreviewPublicMenu?: (slug: string) => void;
}

export type RestaurantDetailTab =
  | 'overview'
  | 'profile'
  | 'menu'
  | 'qr'
  | 'reviews'
  | 'settings';

export const RestaurantDetailView: React.FC<RestaurantDetailViewProps> = ({
  businessId,
  onBack,
  onPreviewPublicMenu,
}) => {
  const { user, profile } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<RestaurantDetailTab>('overview');
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ totalScans: number; totalReviews: number } | null>(null);

  // Profile Form state
  const [profileForm, setProfileForm] = useState<Partial<Business>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  // Menu Categories & Items
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catFormData, setCatFormData] = useState({ name: '', sortOrder: 1, isActive: true });

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemFormData, setItemFormData] = useState({
    name: '',
    description: '',
    price: 0,
    imageUrl: '',
    isAvailable: true,
    sortOrder: 1,
    tags: [] as string[],
    categoryId: '',
  });

  // QR Codes State
  const [qrCodes, setQrCodes] = useState<QRCodeItem[]>([]);
  const [newQrTableNumber, setNewQrTableNumber] = useState('');
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Review Simulator state
  const [globalPhrases, setGlobalPhrases] = useState<ReviewPhrase[]>([]);
  const [simRating, setSimRating] = useState<number>(5);
  const [simSelectedPhrases, setSimSelectedPhrases] = useState<ReviewPhrase[]>([]);
  const [generatedDraft, setGeneratedDraft] = useState<string>('');

  // Mobile preview modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // CSV Import modal
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);

  // Fetch initial business data and subscribe to live stats
  useEffect(() => {
    setLoading(true);
    getBusiness(businessId).then((biz) => {
      if (biz) {
        setBusiness(biz);
        setProfileForm(biz);
      }
      setLoading(false);
    });

    const unsubStats = subscribeBusinessStats(businessId, (liveStats) => {
      setStats(liveStats);
    });
    getGlobalReviewLibrary().then(setGlobalPhrases);

    return () => {
      unsubStats();
    };
  }, [businessId]);

  // Subscribe to Categories
  useEffect(() => {
    if (!businessId) return;
    const unsub = subscribeCategories(businessId, (cats) => {
      setCategories(cats);
      if (cats.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(cats[0].id);
      }
    });
    return () => unsub();
  }, [businessId, selectedCategoryId]);

  // Fetch items whenever category changes
  useEffect(() => {
    if (!businessId || !selectedCategoryId) {
      setMenuItems([]);
      return;
    }
    getItemsByCategory(businessId, selectedCategoryId).then(setMenuItems);
  }, [businessId, selectedCategoryId]);

  // Fetch QRs
  useEffect(() => {
    if (!businessId) return;
    getQRCodes(businessId).then(setQrCodes);
  }, [businessId]);

  // Recalculate simulation draft
  useEffect(() => {
    if (business) {
      getReviewTemplates().then((templates) => {
        const result = generateDeterministicReview({
          rating: simRating,
          selectedPhrases: simSelectedPhrases,
          restaurantName: business.name,
          templates,
        });
        setGeneratedDraft(result);
      });
    }
  }, [simRating, simSelectedPhrases, business]);

  // Save Profile Handler
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setSavingProfile(true);
    try {
      await updateBusiness(business.id, profileForm, {
        id: user?.uid || 'super_admin',
        email: user?.email || 'admin@menuestro.com',
        name: profile?.name || 'Administrator',
      });
      setBusiness((prev) => (prev ? { ...prev, ...profileForm } : null));
      addToast('Restaurant profile updated successfully!', 'success');
    } catch {
      addToast('Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  // Status toggle
  const handleStatusChange = async (newStatus: BusinessStatus) => {
    if (!business) return;
    try {
      await updateBusinessStatus(business.id, newStatus, {
        id: user?.uid || 'super_admin',
        email: user?.email || 'admin@menuestro.com',
        name: profile?.name || 'Administrator',
      });
      setBusiness({ ...business, status: newStatus });
      addToast(`Restaurant status changed to ${newStatus}`, 'success');
    } catch {
      addToast('Failed to update status', 'error');
    }
  };

  // Menu item save
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !itemFormData.categoryId) return;
    try {
      const adminInfo = {
        id: user?.uid || 'super_admin',
        email: user?.email || 'admin@menuestro.com',
        name: profile?.name || 'Administrator',
      };

      if (editingItem) {
        await updateMenuItem(
          business.id,
          editingItem.categoryId,
          editingItem.id,
          {
            ...itemFormData,
            tags: itemFormData.tags as any,
          },
          adminInfo
        );
        addToast('Menu item updated', 'success');
      } else {
        await createMenuItem(
          business.id,
          itemFormData.categoryId,
          {
            name: itemFormData.name,
            description: itemFormData.description,
            price: Number(itemFormData.price),
            imageUrl: itemFormData.imageUrl,
            isAvailable: itemFormData.isAvailable,
            sortOrder: Number(itemFormData.sortOrder) || 1,
            tags: itemFormData.tags as any,
          },
          undefined,
          adminInfo
        );
        addToast('Menu item created', 'success');
      }

      setItemModalOpen(false);
      setEditingItem(null);
      getItemsByCategory(business.id, itemFormData.categoryId).then(setMenuItems);
    } catch {
      addToast('Failed to save menu item', 'error');
    }
  };

  const handleDeleteItem = async (catId: string, itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await deleteMenuItem(businessId, catId, itemId, {
        id: user?.uid || 'super_admin',
        email: user?.email || 'admin@menuestro.com',
        name: profile?.name || 'Administrator',
      });
      setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
      addToast('Menu item deleted', 'info');
    } catch {
      addToast('Failed to delete item', 'error');
    }
  };

  // Category save
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    try {
      const adminInfo = {
        id: user?.uid || 'super_admin',
        email: user?.email || 'admin@menuestro.com',
        name: profile?.name || 'Administrator',
      };

      if (editingCat) {
        await updateCategory(business.id, editingCat.id, catFormData, adminInfo);
        addToast('Category updated', 'success');
      } else {
        const newCatId = await createCategory(
          business.id,
          {
            name: catFormData.name,
            sortOrder: Number(catFormData.sortOrder) || 1,
            isActive: catFormData.isActive,
          },
          undefined,
          adminInfo
        );
        setSelectedCategoryId(newCatId);
        addToast('Category created', 'success');
      }
      setCatModalOpen(false);
      setEditingCat(null);
    } catch {
      addToast('Failed to save category', 'error');
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`Delete category "${catName}" and all associated items?`)) return;
    try {
      await deleteCategory(businessId, catId, {
        id: user?.uid || 'super_admin',
        email: user?.email || 'admin@menuestro.com',
        name: profile?.name || 'Administrator',
      });
      addToast(`Category "${catName}" deleted`, 'info');
      if (selectedCategoryId === catId) {
        setSelectedCategoryId(categories.find((c) => c.id !== catId)?.id || null);
      }
    } catch {
      addToast('Failed to delete category', 'error');
    }
  };

  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);

  // Detect duplicate dishes in the current category
  const duplicateCategoryItems = useMemo(() => {
    const seen = new Map<string, MenuItem[]>();
    menuItems.forEach((item) => {
      const key = `${item.categoryId}___${item.name.toLowerCase().trim()}`;
      const list = seen.get(key) || [];
      list.push(item);
      seen.set(key, list);
    });

    const duplicatesToDelete: MenuItem[] = [];
    seen.forEach((list) => {
      if (list.length > 1) {
        // Keep the first, mark remaining as duplicates
        duplicatesToDelete.push(...list.slice(1));
      }
    });

    return duplicatesToDelete;
  }, [menuItems]);

  const handleCleanDuplicates = async () => {
    if (duplicateCategoryItems.length === 0 || !businessId) return;
    setIsCleaningDuplicates(true);
    try {
      const adminInfo = {
        id: user?.uid || 'super_admin',
        email: user?.email || 'admin@menuestro.com',
        name: profile?.name || 'Administrator',
      };
      for (const dup of duplicateCategoryItems) {
        await deleteMenuItem(businessId, dup.categoryId, dup.id, adminInfo);
      }
      setMenuItems((prev) => {
        const deletedIds = new Set(duplicateCategoryItems.map((d) => d.id));
        return prev.filter((i) => !deletedIds.has(i.id));
      });
      addToast(`Successfully removed ${duplicateCategoryItems.length} duplicate dish${duplicateCategoryItems.length > 1 ? 'es' : ''}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to clean duplicates', 'error');
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const handleCsvImportComplete = () => {
    addToast('Menu items and categories imported successfully!', 'success');
    if (businessId) {
      subscribeCategories(businessId, (cats) => {
        setCategories(cats);
        if (cats.length > 0) {
          const targetId = selectedCategoryId || cats[0].id;
          setSelectedCategoryId(targetId);
          getItemsByCategory(businessId, targetId).then(setMenuItems);
        }
      });
    }
  };

  // Add QR table code
  const handleCreateQR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    try {
      const tableLabel = newQrTableNumber.trim() ? `Table ${newQrTableNumber.trim()}` : 'General Standee';
      const fullUrl = `${window.location.origin}/m/${business.slug}${newQrTableNumber.trim() ? `?table=${encodeURIComponent(newQrTableNumber.trim())}` : ''}`;

      await createQRCode(
        business.id,
        {
          type: 'menu',
          targetUrl: fullUrl,
          tableNumber: newQrTableNumber.trim() || undefined,
          label: tableLabel,
        },
        undefined,
        {
          id: user?.uid || 'super_admin',
          email: user?.email || 'admin@menuestro.com',
          name: profile?.name || 'Administrator',
        }
      );

      setNewQrTableNumber('');
      getQRCodes(business.id).then(setQrCodes);
      addToast(`QR code generated for ${tableLabel}`, 'success');
    } catch {
      addToast('Failed to generate QR code', 'error');
    }
  };

  const handleDeleteQR = async (qrId: string) => {
    if (!confirm('Are you sure you want to delete this QR code?')) return;
    try {
      await deleteQRCode(businessId, qrId, {
        id: user?.uid || 'super_admin',
        email: user?.email || 'admin@menuestro.com',
        name: profile?.name || 'Administrator',
      });
      setQrCodes((prev) => prev.filter((q) => q.id !== qrId));
      addToast('QR code deleted', 'info');
    } catch {
      addToast('Failed to delete QR code', 'error');
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    addToast('Link copied to clipboard', 'info');
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-xs">
        Loading restaurant profile...
      </div>
    );
  }

  if (!business) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-800 text-sm font-semibold">Restaurant not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#078A55] text-white text-xs font-semibold rounded-lg"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  const tabList: { id: RestaurantDetailTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'menu', label: 'Menu & Categories', icon: Utensils },
    { id: 'profile', label: 'Restaurant Profile', icon: Store },
    { id: 'qr', label: 'QR Standees', icon: QrCode },
    { id: 'reviews', label: 'Review Assistant', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition shadow-xs"
            title="Back to Directory"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 overflow-hidden flex-shrink-0">
            {business.logoUrl ? (
              <img src={business.logoUrl} alt={business.name} className="w-full h-full object-cover" />
            ) : (
              business.name.charAt(0)
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-slate-900">{business.name}</h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                  business.status === 'active'
                    ? 'bg-emerald-50 text-emerald-700'
                    : business.status === 'suspended'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {business.status || 'active'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              /m/{business.slug}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCsvImportModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#078A55] border border-emerald-200 font-semibold text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Import menu dishes from CSV"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={() => {
              setPreviewModalOpen(true);
            }}
            className="px-3.5 py-2 bg-[#078A55] hover:bg-[#067347] text-white font-medium text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition"
          >
            <Smartphone className="w-4 h-4" />
            <span>Preview Menu</span>
          </button>

          <a
            href={`/m/${business.slug}`}
            target="_blank"
            rel="noreferrer"
            className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition shadow-xs"
            title="Open Live Menu in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto text-xs">
        {tabList.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2.5 font-medium whitespace-nowrap border-b-2 transition ${
                isActive
                  ? 'border-[#078A55] text-[#078A55] font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">
                Total Digital Scans
              </span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">
                {stats?.totalScans ?? 0}
              </span>
              <p className="text-[11px] text-[#078A55] mt-1 flex items-center gap-1 font-medium">
                <CheckCircle className="w-3 h-3" /> Live real-time
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">
                Google Review Clicks
              </span>
              <span className="text-2xl font-bold text-amber-600 mt-1 block">
                {stats?.totalReviews ?? 0}
              </span>
              <p className="text-[11px] text-slate-500 mt-1">Review button activations</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-medium text-slate-500 block">
                Restaurant Status
              </span>
              <div className="flex items-center gap-2 mt-2">
                <select
                  value={business.status || 'active'}
                  onChange={(e) => handleStatusChange(e.target.value as BusinessStatus)}
                  className="bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 rounded-lg px-3 py-1.5 focus:border-[#078A55] focus:outline-none"
                >
                  <option value="active">Active (Online)</option>
                  <option value="suspended">Suspended</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick Access Links */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Public Routes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">Digital Menu</span>
                  <span className="text-[11px] text-slate-500 font-mono">/m/{business.slug}</span>
                </div>
                <a
                  href={`/m/${business.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-md border border-slate-200"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">Review Assistant</span>
                  <span className="text-[11px] text-slate-500 font-mono">/r/{business.slug}</span>
                </div>
                <a
                  href={`/r/${business.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-md border border-slate-200"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">Table Standee QR</span>
                  <span className="text-[11px] text-slate-500 font-mono">/q/{business.slug}</span>
                </div>
                <a
                  href={`/q/${business.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-md border border-slate-200"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Assigned Manager Account */}
          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 flex-shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Assigned Restaurant Manager Login</h3>
                <p className="text-xs font-mono text-emerald-700 font-medium mt-0.5">
                  {business.ownerEmail || 'No email assigned yet'}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Users signing into Menuestro with this email address immediately access this restaurant's management console.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('profile')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium rounded-lg transition self-start md:self-auto"
            >
              Update Login Email →
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: PROFILE */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Restaurant Profile & Brand Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Restaurant Name</label>
              <input
                type="text"
                value={profileForm.name || ''}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Slug (/m/:slug)</label>
              <input
                type="text"
                value={profileForm.slug || ''}
                onChange={(e) => setProfileForm({ ...profileForm, slug: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
              />
            </div>
          </div>

          {/* Owner / Manager Access Email */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-emerald-950">
                Owner / Manager Login Email
              </label>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                Direct Login Access
              </span>
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="e.g. owner@restaurant.com"
                value={profileForm.ownerEmail || ''}
                onChange={(e) => setProfileForm({ ...profileForm, ownerEmail: e.target.value })}
                className="w-full pl-9 pr-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs text-slate-900 focus:border-[#078A55] focus:outline-none"
              />
            </div>
            <p className="text-[11px] text-emerald-800">
              Users signing in with this email address will automatically have manager access to this restaurant's dashboard.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Tagline</label>
            <input
              type="text"
              value={profileForm.tagline || ''}
              onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
              <input
                type="text"
                value={profileForm.phone || ''}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={profileForm.currency || ''}
                onChange={(e) => setProfileForm({ ...profileForm, currency: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Country</label>
              <input
                type="text"
                value={profileForm.country || ''}
                onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Physical Address</label>
            <input
              type="text"
              value={profileForm.address || ''}
              onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Logo Image URL</label>
              <div className="flex items-center gap-3">
                {profileForm.logoUrl && (
                  <img
                    src={profileForm.logoUrl}
                    alt="Logo"
                    className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                  />
                )}
                <input
                  type="url"
                  value={profileForm.logoUrl || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, logoUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Cover Photo URL</label>
              <div className="flex items-center gap-3">
                {profileForm.coverImageUrl && (
                  <img
                    src={profileForm.coverImageUrl}
                    alt="Cover"
                    className="w-14 h-10 rounded-lg object-cover border border-slate-200"
                  />
                )}
                <input
                  type="url"
                  value={profileForm.coverImageUrl || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, coverImageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Google Review Link</label>
            <input
              type="url"
              value={profileForm.googleReviewUrl || ''}
              onChange={(e) => setProfileForm({ ...profileForm, googleReviewUrl: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-150 flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 bg-[#078A55] hover:bg-[#067347] text-white text-xs font-medium rounded-lg shadow-xs"
            >
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: MENU & CATEGORIES */}
      {activeTab === 'menu' && (
        <div className="space-y-4">
          {/* Top Menu Catalog Toolbar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-slate-900">Menu & Category Catalog</span>
              <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                {categories.length} Categories • {menuItems.length} Dishes
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCsvImportModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#078A55] border border-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Upload spreadsheet with dishes and categories"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Import from CSV</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingCat(null);
                  setCatFormData({ name: '', sortOrder: categories.length + 1, isActive: true });
                  setCatModalOpen(true);
                }}
                className="px-3 py-1.5 bg-[#078A55] hover:bg-[#067347] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </div>
          </div>

          {/* Duplicate Items Alert & Cleanup */}
          {duplicateCategoryItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start sm:items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <p className="font-semibold text-amber-900">
                    Duplicate Dishes Detected ({duplicateCategoryItems.length} duplicate entries)
                  </p>
                  <p className="text-amber-700 text-[11px] mt-0.5">
                    Found multiple dishes with identical names in this category (e.g. &quot;{duplicateCategoryItems[0]?.name}&quot;). Click clean to keep only 1 of each dish.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCleanDuplicates}
                disabled={isCleaningDuplicates}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xs transition cursor-pointer flex-shrink-0 text-center"
              >
                {isCleaningDuplicates ? 'Cleaning...' : 'Remove Duplicates (Keep 1)'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Categories Sidebar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Categories</h2>
                <button
                  onClick={() => {
                    setEditingCat(null);
                    setCatFormData({ name: '', sortOrder: categories.length + 1, isActive: true });
                    setCatModalOpen(true);
                  }}
                  className="p-1 bg-[#078A55] text-white rounded hover:bg-[#067347] cursor-pointer"
                  title="Add Category"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`p-2 rounded-lg text-xs font-medium flex items-center justify-between cursor-pointer transition ${
                      selectedCategoryId === cat.id
                        ? 'bg-emerald-50 text-[#078A55] font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setEditingCat(cat);
                          setCatFormData({
                            name: cat.name,
                            sortOrder: cat.sortOrder || 1,
                            isActive: cat.isActive !== false,
                          });
                          setCatModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {categories.length === 0 && (
                  <div className="text-center py-6 px-2 space-y-2">
                    <p className="text-xs text-slate-400">No categories created yet.</p>
                    <button
                      type="button"
                      onClick={() => setCsvImportModalOpen(true)}
                      className="text-xs font-semibold text-[#078A55] hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Import from CSV</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Menu Items List */}
            <div className="md:col-span-3 space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {categories.find((c) => c.id === selectedCategoryId)?.name || 'Menu Items'}
                  </h2>
                  <p className="text-xs text-slate-500">{menuItems.length} dishes in this category</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCsvImportModalOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Import CSV"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
                    <span>Import CSV</span>
                  </button>

                  {selectedCategoryId && (
                    <button
                      onClick={() => {
                        setEditingItem(null);
                        setItemFormData({
                          name: '',
                          description: '',
                          price: 199,
                          imageUrl: '',
                          isAvailable: true,
                          sortOrder: menuItems.length + 1,
                          tags: [],
                          categoryId: selectedCategoryId,
                        });
                        setItemModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-[#078A55] hover:bg-[#067347] text-white text-xs font-medium rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Dish</span>
                    </button>
                  )}
                </div>
              </div>

              {menuItems.length === 0 && (
                <div className="bg-white p-8 rounded-xl border border-slate-200/90 text-center space-y-3">
                  <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">No dishes in this category yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Add dishes individually or upload your full menu using CSV import.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCsvImportModalOpen(true)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#078A55] border border-emerald-200 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Import CSV</span>
                    </button>
                    {selectedCategoryId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(null);
                          setItemFormData({
                            name: '',
                            description: '',
                            price: 199,
                            imageUrl: '',
                            isAvailable: true,
                            sortOrder: 1,
                            tags: [],
                            categoryId: selectedCategoryId,
                          });
                          setItemModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-[#078A55] hover:bg-[#067347] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Dish</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs flex space-x-3 items-center"
                >
                  <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        <Utensils className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-900 truncate">{item.name}</p>
                      <span className="text-xs font-bold text-slate-900">
                        {business.currency || '₹'}{item.price}
                      </span>
                    </div>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 my-1">
                        {item.tags.map((tag, idx) => (
                          <TagBadge key={idx} tag={tag} size="xs" />
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.description}</p>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
                      <span
                        className={`text-[10px] font-medium ${
                          item.isAvailable ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {item.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setItemFormData({
                              name: item.name,
                              description: item.description || '',
                              price: item.price,
                              imageUrl: item.imageUrl || '',
                              isAvailable: item.isAvailable !== false,
                              sortOrder: item.sortOrder || 1,
                              tags: item.tags || [],
                              categoryId: item.categoryId,
                            });
                            setItemModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-slate-900"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.categoryId, item.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {menuItems.length === 0 && (
                <div className="col-span-2 text-center py-8 text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                  No items in this category yet. Click "Add Dish" to add items.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* TAB 4: QR STANDEES */}
      {activeTab === 'qr' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Generate Table QR Code</h2>
            <form onSubmit={handleCreateQR} className="flex gap-3 max-w-md">
              <input
                type="text"
                placeholder="Table Number (e.g. 12)"
                value={newQrTableNumber}
                onChange={(e) => setNewQrTableNumber(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-[#078A55] hover:bg-[#067347] text-white text-xs font-medium rounded-lg shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Generate QR</span>
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {qrCodes.map((qr) => {
              const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                qr.targetUrl
              )}&color=000000`;

              return (
                <div key={qr.id} className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="w-32 h-32 mx-auto bg-white p-2 rounded-lg shadow-xs mb-3 flex items-center justify-center border border-slate-200">
                      <img src={qrImg} alt={qr.label} className="w-full h-full object-contain" />
                    </div>
                    <h3 className="text-xs font-semibold text-slate-900">{qr.label || 'Table Standee'}</h3>
                    <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">{qr.targetUrl}</p>
                  </div>

                  <div className="flex items-center justify-center space-x-2 mt-4 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleCopyLink(qr.targetUrl)}
                      className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs border border-slate-200"
                      title="Copy URL"
                    >
                      {copiedLink === qr.targetUrl ? <Check className="w-3.5 h-3.5 text-[#078A55]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={qrImg}
                      download={`${business.slug}-table-qr.png`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-medium rounded-md flex items-center gap-1 border border-slate-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                    <button
                      onClick={() => handleDeleteQR(qr.id)}
                      className="p-1.5 bg-slate-50 hover:bg-rose-50 text-rose-600 rounded-md text-xs border border-slate-200"
                      title="Delete QR"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">Review Assistant Simulator</h2>
            <p className="text-xs text-slate-500">
              Select sample phrases to simulate what diners will see when they build their review.
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700">Sample Phrases:</label>
              <div className="max-h-52 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                {globalPhrases.slice(0, 10).map((p) => {
                  const isSelected = simSelectedPhrases.some((item) => item.id === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          setSimSelectedPhrases((prev) => prev.filter((i) => i.id !== p.id));
                        } else {
                          setSimSelectedPhrases((prev) => [...prev, p]);
                        }
                      }}
                      className={`w-full text-left p-2 rounded-md text-xs transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{p.text}</span>
                      <span className="text-[10px] text-slate-400 capitalize">{p.category}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 mb-2">Simulated Review Output</h2>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 min-h-36 font-sans leading-relaxed">
                {generatedDraft ? `"${generatedDraft}"` : 'Select phrases on the left to see the compiled review.'}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <a
                href={`/r/${business.slug}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-[#078A55] text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs"
              >
                <span>Test Live Assistant</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Tenant Account Controls</h2>
          <p className="text-xs text-slate-500">Manage accessibility and maintenance state for {business.name}.</p>

          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800">Operational Status</p>
              <p className="text-[11px] text-slate-500">Control public menu and review access</p>
            </div>
            <select
              value={business.status || 'active'}
              onChange={(e) => handleStatusChange(e.target.value as BusinessStatus)}
              className="bg-white border border-slate-200 text-xs font-medium text-slate-900 rounded-lg px-3 py-1.5 focus:border-[#078A55] focus:outline-none"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-sm shadow-xl p-5 space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-slate-900">
              {editingCat ? 'Edit Category' : 'New Category'}
            </h3>
            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catFormData.name}
                  onChange={(e) => setCatFormData({ ...catFormData, name: e.target.value })}
                  placeholder="e.g. Starters, Main Course"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCatModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#078A55] hover:bg-[#067347] text-white rounded-lg font-medium shadow-xs"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ITEM MODAL */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-md shadow-xl p-5 space-y-4 text-xs">
            <h3 className="text-sm font-semibold text-slate-900">
              {editingItem ? 'Edit Menu Item' : 'New Menu Item'}
            </h3>
            <form onSubmit={handleSaveItem} className="space-y-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Dish Name *</label>
                <input
                  type="text"
                  required
                  value={itemFormData.name}
                  onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
                  placeholder="e.g. Paneer Butter Masala"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  placeholder="Fresh cottage cheese cooked in creamy tomato butter gravy..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Price *</label>
                  <input
                    type="number"
                    required
                    value={itemFormData.price}
                    onChange={(e) => setItemFormData({ ...itemFormData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={itemFormData.categoryId}
                    onChange={(e) => setItemFormData({ ...itemFormData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Dish Image URL</label>
                <div className="flex items-center gap-3">
                  {itemFormData.imageUrl && (
                    <img
                      src={itemFormData.imageUrl}
                      alt="Dish preview"
                      className="w-10 h-10 rounded-lg object-cover border border-slate-200"
                    />
                  )}
                  <input
                    type="url"
                    value={itemFormData.imageUrl}
                    onChange={(e) => setItemFormData({ ...itemFormData, imageUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="itemAvail"
                  checked={itemFormData.isAvailable}
                  onChange={(e) => setItemFormData({ ...itemFormData, isAvailable: e.target.checked })}
                  className="rounded text-[#078A55] focus:ring-[#078A55]"
                />
                <label htmlFor="itemAvail" className="text-slate-700 font-medium">Available to order</label>
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#078A55] hover:bg-[#067347] text-white rounded-lg font-medium shadow-xs"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE PREVIEW MODAL */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm overflow-hidden shadow-2xl flex flex-col h-[85vh]">
            <div className="p-3 border-b border-slate-150 flex items-center justify-between bg-slate-50">
              <span className="text-xs font-semibold text-slate-800">Mobile Menu Preview</span>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-2 overflow-hidden">
              <iframe
                src={`/m/${business.slug}`}
                title="Menu Preview"
                className="w-full h-full rounded-xl bg-white border border-slate-200 shadow-inner"
              />
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      <MenuCsvImportModal
        isOpen={csvImportModalOpen}
        onClose={() => setCsvImportModalOpen(false)}
        businessId={businessId}
        existingCategories={categories}
        currencySymbol={business.currency || '₹'}
        adminUser={{
          id: user?.uid || 'super_admin',
          email: user?.email || 'admin@menuestro.com',
          name: profile?.name || 'Administrator',
        }}
        onImportComplete={handleCsvImportComplete}
      />
    </div>
  );
};
