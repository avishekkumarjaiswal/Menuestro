import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import {
  createBusiness,
  createCategory,
  createMenuItem,
  createQRCode,
  updateUserProfile,
  getAllBusinesses,
  updateBusiness
} from '../../services/firestoreService';
import { uploadImageFile } from '../../services/storageService';
import { COUNTRIES, getCountryByCode } from '../../lib/countries';
import { Business } from '../../types';
import {
  Building2,
  FileText,
  Upload,
  Star,
  FolderPlus,
  Utensils,
  QrCode,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Sparkles,
  Globe,
  LogOut,
  Store,
  ExternalLink
} from 'lucide-react';
import { QRCodeCanvas } from '../common/QRCodeCanvas';

export const OnboardingWizard: React.FC = () => {
  const { user, refreshBusiness, logout, setBusiness } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [linkingBizId, setLinkingBizId] = useState<string | null>(null);
  const [existingBusinesses, setExistingBusinesses] = useState<Business[]>([]);
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);

  // Load existing restaurants in the database
  useEffect(() => {
    getAllBusinesses().then((bizs) => {
      setExistingBusinesses(bizs);
    }).catch(console.warn);
  }, []);

  const handleLinkExistingBusiness = async (targetBiz: Business) => {
    if (!user) return;
    setLinkingBizId(targetBiz.id);
    try {
      await updateUserProfile(user.uid, {
        businessId: targetBiz.id,
        role: 'owner',
      });
      // Also register or update ownerEmail if not set
      if (!targetBiz.ownerEmail && user.email) {
        await updateBusiness(targetBiz.id, {
          ownerEmail: user.email,
        }).catch(console.warn);
      }
      setBusiness(targetBiz);
      showToast(`Connected to ${targetBiz.name}! Opening dashboard...`);
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('Error linking restaurant:', err);
      showToast('Failed to link restaurant profile', 'error');
    } finally {
      setLinkingBizId(null);
    }
  };

  // Step 1 & 2
  const [businessName, setBusinessName] = useState('');
  const [countryCode, setCountryCode] = useState('IN');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [currencyCode, setCurrencyCode] = useState('INR');
  const [description, setDescription] = useState('');
  
  // Step 3
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // Step 4
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');

  // Step 5
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');

  // Step 6
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemImage, setItemImage] = useState('');

  // Created IDs
  const [createdBusinessId, setCreatedBusinessId] = useState<string>('');
  const [createdSlug, setCreatedSlug] = useState<string>('');

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    const country = getCountryByCode(code);
    if (country) {
      setCurrencySymbol(country.currencySymbol);
      setCurrencyCode(country.currencyCode);
      if (country.currencySymbol === '$') {
        setItemPrice('12.50');
      } else if (country.currencySymbol === '₹') {
        setItemPrice('249');
      }
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const previewUrl = URL.createObjectURL(file);
    setLogoUrl(previewUrl);
  };

  const handleNext = async () => {
    if (step === 1 && !businessName.trim()) {
      showToast('Please enter a business name', 'error');
      return;
    }

    if (step === 5 && !categoryName.trim()) {
      showToast('Please enter a category name', 'error');
      return;
    }

    if (step === 6 && (!itemName.trim() || !itemPrice)) {
      showToast('Please enter item name and price', 'error');
      return;
    }

    if (step === 6) {
      // Create everything in Firebase at step 6 transition to step 7
      if (!user) {
        showToast('Authentication session missing. Please sign in again.', 'error');
        return;
      }
      setLoading(true);
      try {
        const slug = businessName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || `biz-${Date.now().toString(36)}`;

        let finalLogo = logoUrl;
        if (logoFile) {
          try {
            finalLogo = await uploadImageFile(logoFile, `businesses/${user.uid}/logo.jpg`);
          } catch (err) {
            console.warn('Storage upload note:', err);
          }
        }

        const matchedCountry = getCountryByCode(countryCode);
        const now = new Date().toISOString();
        const bizId = await createBusiness({
          ownerId: user.uid,
          ownerEmail: user.email || '',
          name: businessName.trim(),
          slug,
          description: description.trim(),
          country: matchedCountry?.name || 'India',
          countryCode: countryCode,
          currencyCode: currencyCode,
          currency: currencySymbol,
          currencySymbol: currencySymbol,
          logoUrl: finalLogo,
          googleReviewUrl: googleReviewUrl.trim(),
          primaryColor: '#078A55',
          createdAt: now,
          updatedAt: now,
        });

        setCreatedBusinessId(bizId);
        setCreatedSlug(slug);

        // Update user profile with businessId
        await updateUserProfile(user.uid, { businessId: bizId });

        // Step 5 & 6: Category and Menu Items
        if (categoryName.trim() && itemName.trim()) {
          const catId = await createCategory(bizId, {
            name: categoryName.trim(),
            description: categoryDesc.trim(),
            sortOrder: 1,
            isActive: true,
          });

          await createMenuItem(bizId, catId, {
            name: itemName.trim(),
            description: itemDesc.trim(),
            price: parseFloat(itemPrice) || 0,
            imageUrl: itemImage,
            isAvailable: true,
            sortOrder: 1,
            tags: [],
          });
        } else if (categoryName.trim()) {
          await createCategory(bizId, {
            name: categoryName.trim(),
            description: categoryDesc.trim(),
            sortOrder: 1,
            isActive: true,
          });
        }

        // Step 7: Create default Menu QR code
        await createQRCode(bizId, {
          type: 'menu',
          label: 'Main Dining QR',
          targetUrl: `/m/${slug}`,
          tableNumber: '1',
          color: '#16A34A',
        });

        // Also add Review QR & Combined QR
        await createQRCode(bizId, {
          type: 'review',
          label: 'Google Review Checkout QR',
          targetUrl: `/r/${slug}`,
          color: '#2563EB',
        });

        await createQRCode(bizId, {
          type: 'combined',
          label: 'Table Standee (Combined)',
          targetUrl: `/q/${slug}`,
          color: '#171717',
        });

        setStep(7);
      } catch (error: any) {
        console.error('Onboarding creation error:', error);
        let errorMsg = 'Error saving business data. Please try again.';
        if (error?.message) {
          try {
            const parsed = JSON.parse(error.message);
            if (parsed?.error) errorMsg = parsed.error;
          } catch {
            errorMsg = error.message;
          }
        }
        showToast(errorMsg, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (step < 8) {
      setStep((prev) => prev + 1);
    }
  };

  const handleFinish = async () => {
    await refreshBusiness();
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 flex flex-col items-center justify-center">
      {/* Top Navigation & Account Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#078A55] flex items-center justify-center text-white shadow-xs">
            <Store className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-800 text-base tracking-tight">Menuestro</span>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">
              Signed in as <span className="font-semibold text-slate-700">{user.email}</span>
            </span>
            <button
              type="button"
              onClick={async () => {
                await logout();
                window.location.href = '/';
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch Account</span>
            </button>
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 md:p-10">
        {/* Existing Restaurants Detected Banner */}
        {existingBusinesses.length > 0 && step === 1 && (
          <div className="mb-6 p-4.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/70 border border-emerald-200 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-1.5">
              <div className="flex items-center gap-2">
                <Store className="w-4.5 h-4.5 text-emerald-700 shrink-0" />
                <h3 className="text-sm font-bold text-slate-900">Already have a restaurant in Menuestro?</h3>
              </div>
              <span className="text-[11px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                Quick Link
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              We found existing restaurant{existingBusinesses.length > 1 ? 's' : ''} in your database. Click below to connect this account directly to your dashboard:
            </p>
            <div className="flex flex-wrap gap-2">
              {existingBusinesses.map((biz) => (
                <button
                  key={biz.id}
                  type="button"
                  onClick={() => handleLinkExistingBusiness(biz)}
                  disabled={linkingBizId === biz.id}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-600 border border-emerald-300 text-emerald-800 hover:text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {linkingBizId === biz.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                  <span>Open &ldquo;{biz.name}&rdquo; Dashboard</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-3">
            <span>Step {step} of 8</span>
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
              5-Minute Restaurant Setup
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
              style={{ width: `${(step / 8) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[340px] flex flex-col justify-center">
          {step === 1 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">What is your business name?</h2>
              <p className="text-sm text-slate-500">
                This will be displayed on your digital menu, QR standees, and review landing pages.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Restaurant or Cafe Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. The Green Plate"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 placeholder:text-slate-400"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    Operating Country & Currency
                  </label>
                  <select
                    value={countryCode}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 bg-white cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.currencyCode} - {c.currencySymbol})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    Menu prices will default to <span className="font-semibold text-slate-700">{currencySymbol} ({currencyCode})</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Tell customers about your kitchen</h2>
              <p className="text-sm text-slate-500">
                A brief description or tagline shown at the top of your mobile digital menu.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Business Tagline / Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Good Food. Better Company. Artisanal Italian wood-fired specialties."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <Upload className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Upload your restaurant logo</h2>
              <p className="text-sm text-slate-500">
                Your logo will appear on the customer menu and in the center of your table QR codes.
              </p>
              <div className="flex items-center gap-6 pt-2">
                <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden bg-slate-50">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Image</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Recommended: Square PNG or JPG, max 5MB.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                <Star className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Add your Google Review link</h2>
              <p className="text-sm text-slate-500">
                When customers complete their review draft, they will be directed straight to your Google Business listing to paste and submit.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Google Review Link / Place URL
                </label>
                <input
                  type="url"
                  value={googleReviewUrl}
                  onChange={(e) => setGoogleReviewUrl(e.target.value)}
                  placeholder="https://g.page/r/.../review or https://maps.google.com/..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 placeholder:text-slate-400"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  You can update or customize this link anytime in your business settings.
                </p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <FolderPlus className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Create your first menu category</h2>
              <p className="text-sm text-slate-500">
                Categories organize your menu items (e.g., Starters, Main Course, Beverages, Pizzas).
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category Name</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Starters or Wood-Fired Pizzas"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 mb-3 text-slate-900 placeholder:text-slate-400"
                />
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Short Category Description (Optional)</label>
                <input
                  type="text"
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  placeholder="e.g. Crispy appetizers and finger food"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
                <Utensils className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Add your first menu item</h2>
              <p className="text-sm text-slate-500">
                Add a signature dish to your category. You can add more dishes later in the dashboard.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Item Name</label>
                  <input
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Pasta Alfredo"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Price ({currencySymbol})</label>
                  <input
                    type="number"
                    step="any"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="249"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Item Description</label>
                <textarea
                  rows={2}
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="Ingredients and culinary preparation details"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 resize-none text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                <QrCode className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Your Menu QR is ready!</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Scan with your smartphone camera right now or download the high-resolution files.
              </p>

              <div className="py-2 flex justify-center">
                <QRCodeCanvas
                  value={`/m/${createdSlug}`}
                  restaurantName={businessName}
                  logoUrl={logoUrl}
                  label="Scan to View Our Menu"
                  tableNumber="1"
                  color="#16A34A"
                />
              </div>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> Setup Complete
                </span>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Your menu is now live!</h2>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
                  {businessName} is ready for real customers. Your menu updates instantaneously in real-time.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left max-w-md mx-auto space-y-2 text-xs text-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-500">Digital Menu:</span>
                  <a
                    href={`/m/${createdSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-emerald-600 hover:underline"
                  >
                    /m/{createdSlug}
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-500">Google Review Page:</span>
                  <a
                    href={`/r/${createdSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    /r/{createdSlug}
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-500">Combined Table Landing:</span>
                  <a
                    href={`/q/${createdSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-slate-800 hover:underline"
                  >
                    /q/{createdSlug}
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
          {step > 1 && step < 7 ? (
            <button
              type="button"
              onClick={() => setStep((prev) => prev - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 8 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ml-auto"
            >
              <span>Go to Admin Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
