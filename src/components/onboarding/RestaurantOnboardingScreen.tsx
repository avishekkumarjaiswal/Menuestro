import React, { useState, useRef } from 'react';
import {
  Store,
  MapPin,
  Phone,
  Mail,
  Link as LinkIcon,
  ArrowRight,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  Leaf,
  Upload,
  ExternalLink,
  LayoutDashboard,
  Building,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createBusiness, updateUserProfile } from '../../services/firestoreService';
import { uploadImageFile } from '../../services/storageService';

// ─── Clean Centered Container ────────────────────────────────────────────────
function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between p-4 sm:p-6 lg:p-8 antialiased font-sans text-slate-900">
      {/* Top Simple Brand Header */}
      <header className="w-full max-w-xl mx-auto flex items-center justify-between pb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#078A55]/10 flex items-center justify-center text-[#078A55] border border-[#078A55]/20">
            <Leaf className="w-4 h-4 fill-[#078A55] text-[#078A55]" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">Menuestro</span>
        </div>
        <span className="text-xs text-slate-500 font-medium">Hospitality Platform</span>
      </header>

      {/* Centered Main Content */}
      <main className="w-full max-w-xl mx-auto my-auto py-2">
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 sm:p-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-xl mx-auto pt-6 text-center text-xs text-slate-500">
        <span>Need assistance? </span>
        <a href="mailto:support@menuestro.com" className="text-[#078A55] font-medium hover:underline">
          support@menuestro.com
        </a>
      </footer>
    </div>
  );
}

// ─── Landing Screen ─────────────────────────────────────────────────────────
interface LandingProps {
  onCreateNew: () => void;
  onAlreadyHave: () => void;
}

function LandingScreen({ onCreateNew, onAlreadyHave }: LandingProps) {
  const { user, logout } = useAuth();

  return (
    <OnboardingLayout>
      <div className="text-left">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Welcome to Menuestro
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Your account isn't connected to a restaurant yet.
        </p>

        {/* Authenticated email indicator */}
        <div className="mt-5 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Signed In As
            </span>
            <span className="text-xs font-mono font-medium text-slate-800 truncate block mt-0.5">
              {user?.email}
            </span>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Authenticated
          </span>
        </div>

        {/* Action Controls */}
        <div className="mt-6 space-y-2.5">
          <button
            onClick={onCreateNew}
            className="w-full py-2.5 px-4 bg-[#078A55] hover:bg-[#067347] text-white font-medium text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition"
          >
            <span>Create Your Restaurant</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onAlreadyHave}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-lg border border-slate-200 flex items-center justify-center gap-2 transition"
          >
            <Building className="w-4 h-4 text-slate-400" />
            <span>I Already Have a Restaurant</span>
          </button>
        </div>

        {/* Sign out separator */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
          <span className="text-slate-400 text-[11px]">Instant Setup</span>
        </div>
      </div>
    </OnboardingLayout>
  );
}

// ─── Creation Form Screen ────────────────────────────────────────────────────
interface CreationFormProps {
  onBack: () => void;
  onCreated: (bizId: string, slug: string, name: string) => void;
}

function CreationForm({ onBack, onCreated }: CreationFormProps) {
  const { user, refreshBusiness } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    restaurantName: '',
    address: '',
    phone: '',
    restaurantEmail: '',
    googleReviewUrl: '',
    logoUrl: '',
    coverImageUrl: '',
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.restaurantName.trim()) {
      setError('Restaurant name is required.');
      return;
    }
    if (!form.address.trim()) {
      setError('Restaurant address is required.');
      return;
    }
    if (!user || !user.email) return;

    setError(null);
    setSubmitting(true);
    try {
      let finalLogoUrl = form.logoUrl.trim();
      let finalCoverUrl = form.coverImageUrl.trim();

      if (logoFile) {
        try {
          finalLogoUrl = await uploadImageFile(logoFile, `businesses/${user.uid}/logo_${Date.now()}.jpg`);
        } catch (err: any) {
          console.warn('Logo upload skipped:', err);
        }
      }

      if (coverFile) {
        try {
          finalCoverUrl = await uploadImageFile(coverFile, `businesses/${user.uid}/cover_${Date.now()}.jpg`);
        } catch (err: any) {
          console.warn('Cover upload skipped:', err);
        }
      }

      const now = new Date().toISOString();
      const rawSlug = form.restaurantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const uniqueSuffix = Date.now().toString(36).slice(-4);
      const cleanSlug = `${rawSlug}-${uniqueSuffix}`;
      const cleanEmail = user.email.trim().toLowerCase();

      // Create business directly with active status
      const newBizId = await createBusiness({
        ownerId: user.uid,
        ownerEmail: cleanEmail,
        name: form.restaurantName.trim(),
        slug: cleanSlug,
        address: form.address.trim(),
        phone: form.phone.trim(),
        restaurantEmail: form.restaurantEmail.trim().toLowerCase() || cleanEmail,
        googleReviewUrl: form.googleReviewUrl.trim(),
        logoUrl: finalLogoUrl,
        coverImageUrl: finalCoverUrl,
        status: 'active',
        currency: '₹',
        currencyCode: 'INR',
        country: 'India',
        primaryColor: '#078A55',
        createdAt: now,
        updatedAt: now,
        reviewAssistantSettings: {
          enabled: true,
          maximumPhraseSelections: 5,
          googleReviewUrl: form.googleReviewUrl.trim(),
        },
      });

      // Update user profile link
      await updateUserProfile(user.uid, {
        businessId: newBizId,
        role: 'owner',
      }).catch(() => {});

      await refreshBusiness();

      onCreated(newBizId, cleanSlug, form.restaurantName.trim());
    } catch (err: any) {
      setError(err.message || 'Failed to create restaurant. Please try again.');
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#078A55] focus:ring-1 focus:ring-[#078A55] transition';
  const labelClass = 'block text-xs font-medium text-slate-700 mb-1';

  return (
    <OnboardingLayout>
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition font-medium mb-4"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </button>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Create your restaurant
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Set up your restaurant on Menuestro
        </p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Restaurant information */}
        <div>
          <div className="pb-2 mb-3 border-b border-slate-100 flex items-center gap-2">
            <Store className="w-3.5 h-3.5 text-slate-400" />
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Restaurant information
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelClass}>
                Restaurant Name <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="e.g. Spezia Bistro"
                value={form.restaurantName}
                onChange={set('restaurantName')}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Restaurant Address <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="e.g. 123 Main Street, New Delhi"
                value={form.address}
                onChange={set('address')}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* 2. Contact information */}
        <div>
          <div className="pb-2 mb-3 border-b border-slate-100 flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-slate-400" />
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Contact information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>
                Phone
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={set('phone')}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Restaurant Email
              </label>
              <input
                type="email"
                placeholder="hello@speziabistro.com"
                value={form.restaurantEmail}
                onChange={set('restaurantEmail')}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* 3. Google presence */}
        <div>
          <div className="pb-2 mb-3 border-b border-slate-100 flex items-center gap-2">
            <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Google presence
            </h2>
          </div>

          <div>
            <label className={labelClass}>
              Google Review Link
            </label>
            <input
              type="url"
              placeholder="https://g.page/r/..."
              value={form.googleReviewUrl}
              onChange={set('googleReviewUrl')}
              className={inputClass}
            />
          </div>
        </div>

        {/* 4. Branding */}
        <div>
          <div className="pb-2 mb-3 border-b border-slate-100 flex items-center gap-2">
            <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Branding
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Logo</label>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700 flex items-center justify-center gap-2 transition"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-4 h-4 rounded object-cover" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className="truncate">{logoFile ? logoFile.name : 'Upload Logo'}</span>
              </button>
            </div>

            <div>
              <label className={labelClass}>Cover Image</label>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="w-full py-2 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-xs text-slate-700 flex items-center justify-center gap-2 transition"
              >
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover" className="w-4 h-4 rounded object-cover" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className="truncate">{coverFile ? coverFile.name : 'Upload Cover'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5. Account */}
        <div>
          <div className="pb-2 mb-3 border-b border-slate-100 flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Account
            </h2>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <label className="block text-[11px] font-medium text-slate-500 mb-0.5">
              Manager Login Email
            </label>
            <p className="text-xs font-mono font-medium text-slate-900">
              {user?.email}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Your account is locked to this manager identifier.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 bg-[#078A55] hover:bg-[#067347] disabled:opacity-50 text-white font-medium text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Restaurant…</span>
              </>
            ) : (
              <span>Create Restaurant</span>
            )}
          </button>
        </div>
      </form>
    </OnboardingLayout>
  );
}

// ─── Success Confirmation Screen ─────────────────────────────────────────────
interface CreatedSuccessProps {
  businessId: string;
  slug: string;
  restaurantName: string;
}

function CreatedSuccessScreen({ slug, restaurantName }: CreatedSuccessProps) {
  const { refreshBusiness } = useAuth();

  const handleGoToDashboard = async () => {
    await refreshBusiness();
    window.location.href = '/';
  };

  const handleViewLiveMenu = () => {
    window.open(`/m/${slug}`, '_blank');
  };

  return (
    <OnboardingLayout>
      <div className="text-center py-2">
        {/* Checkmark icon */}
        <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-[#078A55] flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-5 h-5" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Restaurant Created!
        </h1>
        <p className="text-xs text-slate-500 mt-1 mb-5">
          Your Menuestro restaurant is ready.
        </p>

        {/* Restaurant summary box */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-5 text-left">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Restaurant
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-0.5">{restaurantName}</p>
          <div className="mt-2.5 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500">Live Menu:</span>
            <span className="font-mono text-[#078A55] font-medium">/m/{slug}</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleGoToDashboard}
            className="w-full py-2.5 px-4 bg-[#078A55] hover:bg-[#067347] text-white font-medium text-sm rounded-lg shadow-xs flex items-center justify-center gap-2 transition"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </button>

          <button
            onClick={handleViewLiveMenu}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-lg border border-slate-200 flex items-center justify-center gap-2 transition"
          >
            <ExternalLink className="w-4 h-4 text-slate-400" />
            <span>View Live Menu</span>
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}

// ─── "Already have a restaurant" Screen ───────────────────────────────────────
function AlreadyHaveScreen({ onBack }: { onBack: () => void }) {
  const { user, logout } = useAuth();
  return (
    <OnboardingLayout>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition font-medium mb-4"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </button>

      <div className="text-left">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
          Restaurant Assignment
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed mb-4">
          No active restaurant is currently assigned to this login email:
        </p>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-medium text-slate-800 mb-4">
          {user?.email}
        </div>

        <p className="text-xs text-slate-500 leading-relaxed mb-6">
          If your restaurant was already registered by an administrator, please request that they add this email address as your Manager Login Email in the Restaurant Directory.
        </p>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition font-medium"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
          <span className="text-xs text-slate-400">Menuestro Auth</span>
        </div>
      </div>
    </OnboardingLayout>
  );
}

// ─── Master Orchestrator ─────────────────────────────────────────────────────
type Screen = 'landing' | 'form' | 'created' | 'already-have';

export const RestaurantOnboardingScreen: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('landing');
  const [createdInfo, setCreatedInfo] = useState<{
    businessId: string;
    slug: string;
    name: string;
  } | null>(null);

  if (screen === 'created' && createdInfo) {
    return (
      <CreatedSuccessScreen
        businessId={createdInfo.businessId}
        slug={createdInfo.slug}
        restaurantName={createdInfo.name}
      />
    );
  }

  if (screen === 'form') {
    return (
      <CreationForm
        onBack={() => setScreen('landing')}
        onCreated={(businessId, slug, name) => {
          setCreatedInfo({ businessId, slug, name });
          setScreen('created');
        }}
      />
    );
  }

  if (screen === 'already-have') {
    return <AlreadyHaveScreen onBack={() => setScreen('landing')} />;
  }

  return (
    <LandingScreen
      onCreateNew={() => setScreen('form')}
      onAlreadyHave={() => setScreen('already-have')}
    />
  );
};
