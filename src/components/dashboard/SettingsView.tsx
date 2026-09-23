import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { updateBusiness } from '../../services/firestoreService';
import { uploadImageFile, validateImageFile, fileToOptimizedDataUrl } from '../../services/storageService';
import { COUNTRIES, getCountryByCode, getCountryByName } from '../../lib/countries';
import { ImageUpdateModal } from '../common/ImageUpdateModal';
import { PageHeader } from '../ui/PageHeader';
import { Tabs } from '../ui/Badge';
import { Card } from '../ui/Card';
import { Input, Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import {
  Store,
  Palette,
  Star,
  Upload,
  ExternalLink,
  Check,
  MapPin,
  Phone,
  Globe,
  Coins,
  Image as ImageIcon,
  Sparkles,
  Link as LinkIcon,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const BRAND_COLORS = [
  { label: 'Menuestro Green', hex: '#078A55' },
  { label: 'Forest Emerald', hex: '#0B7A4B' },
  { label: 'Slate Onyx', hex: '#0F172A' },
  { label: 'Royal Blue', hex: '#2563EB' },
  { label: 'Ruby Red', hex: '#9F1239' },
  { label: 'Warm Amber', hex: '#D97706' },
  { label: 'Deep Violet', hex: '#4F46E5' },
];

export const SettingsView: React.FC = () => {
  const { business, setBusiness } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('general');

  // General Profile
  const [name, setName] = useState(business?.name || '');
  const [slug, setSlug] = useState(business?.slug || '');
  const [description, setDescription] = useState(
    business?.description || business?.tagline || ''
  );

  // Country & Currency State
  const initialCountry =
    getCountryByCode(business?.countryCode) ||
    getCountryByName(business?.country) ||
    COUNTRIES[0];

  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(
    business?.countryCode || initialCountry.code
  );
  const [currencyCode, setCurrencyCode] = useState<string>(
    business?.currencyCode || initialCountry.currencyCode
  );
  const [currencySymbol, setCurrencySymbol] = useState<string>(
    business?.currencySymbol || business?.currency || initialCountry.currencySymbol
  );

  const [address, setAddress] = useState(business?.address || '');
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    business?.googleMapsUrl || ''
  );
  const [phone, setPhone] = useState(business?.phone || '');

  // Google Review
  const [googleReviewUrl, setGoogleReviewUrl] = useState(
    business?.googleReviewUrl || ''
  );

  // Appearance
  const [primaryColor, setPrimaryColor] = useState(
    business?.primaryColor || '#078A55'
  );
  const [logoUrl, setLogoUrl] = useState(business?.logoUrl || '');
  const [coverImageUrl, setCoverImageUrl] = useState(business?.coverImageUrl || '');

  const [saving, setSaving] = useState(false);
  const [quickSavingLogo, setQuickSavingLogo] = useState(false);
  const [quickSavingCover, setQuickSavingCover] = useState(false);

  // Image Modal States & File Refs
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const isLogoChanged = business?.logoUrl !== logoUrl;
  const isCoverChanged = business?.coverImageUrl !== coverImageUrl;

  // Keep state in sync whenever business data is fetched or updated from Firestore
  useEffect(() => {
    if (business) {
      if (business.name) setName(business.name);
      if (business.slug) setSlug(business.slug);
      if (business.description || business.tagline) {
        setDescription(business.description || business.tagline || '');
      }
      if (business.primaryColor) setPrimaryColor(business.primaryColor);
      if (business.logoUrl) setLogoUrl(business.logoUrl);
      if (business.coverImageUrl) setCoverImageUrl(business.coverImageUrl);
      if (business.address) setAddress(business.address);
      if (business.phone) setPhone(business.phone);
      if (business.googleReviewUrl) setGoogleReviewUrl(business.googleReviewUrl);
      if (business.googleMapsUrl) setGoogleMapsUrl(business.googleMapsUrl);
      if (business.countryCode) setSelectedCountryCode(business.countryCode);
      if (business.currencyCode) setCurrencyCode(business.currencyCode);
      if (business.currencySymbol || business.currency) {
        setCurrencySymbol(business.currencySymbol || business.currency || '₹');
      }
    }
  }, [business?.id, business?.updatedAt]);

  const handleCountryChange = (code: string) => {
    setSelectedCountryCode(code);
    const country = getCountryByCode(code);
    if (country) {
      setCurrencyCode(country.currencyCode);
      setCurrencySymbol(country.currencySymbol);
      showToast(`Currency updated to ${country.currencyName} (${country.currencySymbol})`);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      showToast(validation.error || 'Invalid image file', 'error');
      if (logoInputRef.current) logoInputRef.current.value = '';
      return;
    }

    try {
      setIsUploadingLogo(true);
      // 1. Instant local preview within 30ms
      try {
        const instantPreview = await fileToOptimizedDataUrl(file, 400, 400, 0.85);
        setLogoUrl(instantPreview);
      } catch {
        // Fallback silently
      }

      // 2. Perform upload / compression
      const finalUrl = business?.id
        ? await uploadImageFile(file, `businesses/${business.id}/logo_${Date.now()}.jpg`, business.id)
        : await fileToOptimizedDataUrl(file, 400, 400, 0.85);

      setLogoUrl(finalUrl);

      // 3. Immediately persist to Firestore so user doesn't have to search for a save button
      if (business?.id) {
        await updateBusiness(business.id, {
          logoUrl: finalUrl,
          updatedAt: new Date().toISOString(),
        });
        setBusiness({ ...business, logoUrl: finalUrl });
        showToast('Restaurant logo uploaded and saved live to your menu!', 'success');
      } else {
        showToast('Logo updated! Click Save Changes to confirm.');
      }
    } catch (err: any) {
      console.error('Logo upload error:', err);
      showToast('Could not process logo. Please try another image.', 'error');
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      showToast(validation.error || 'Invalid image file', 'error');
      if (coverInputRef.current) coverInputRef.current.value = '';
      return;
    }

    try {
      setIsUploadingCover(true);
      // 1. Instant local preview within 30ms
      try {
        const instantPreview = await fileToOptimizedDataUrl(file, 1000, 600, 0.82);
        setCoverImageUrl(instantPreview);
      } catch {
        // Fallback silently
      }

      // 2. Perform upload / compression
      const finalUrl = business?.id
        ? await uploadImageFile(file, `businesses/${business.id}/cover_${Date.now()}.jpg`, business.id)
        : await fileToOptimizedDataUrl(file, 1000, 600, 0.82);

      setCoverImageUrl(finalUrl);

      // 3. Immediately persist to Firestore
      if (business?.id) {
        await updateBusiness(business.id, {
          coverImageUrl: finalUrl,
          updatedAt: new Date().toISOString(),
        });
        setBusiness({ ...business, coverImageUrl: finalUrl });
        showToast('Cover photo uploaded and saved live to your menu!', 'success');
      } else {
        showToast('Cover photo updated! Click Save Changes to confirm.');
      }
    } catch (err: any) {
      console.error('Cover upload error:', err);
      showToast('Could not process cover photo. Please try another image.', 'error');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleQuickSaveLogo = async (newUrl?: string) => {
    if (!business?.id) return;
    const targetUrl = newUrl || logoUrl;
    try {
      setQuickSavingLogo(true);
      await updateBusiness(business.id, {
        logoUrl: targetUrl,
        updatedAt: new Date().toISOString(),
      });
      setBusiness({ ...business, logoUrl: targetUrl });
      showToast('Restaurant logo saved and live on your digital menu!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save logo', 'error');
    } finally {
      setQuickSavingLogo(false);
    }
  };

  const handleQuickSaveCover = async (newUrl?: string) => {
    if (!business?.id) return;
    const targetUrl = newUrl || coverImageUrl;
    try {
      setQuickSavingCover(true);
      await updateBusiness(business.id, {
        coverImageUrl: targetUrl,
        updatedAt: new Date().toISOString(),
      });
      setBusiness({ ...business, coverImageUrl: targetUrl });
      showToast('Header cover photo saved and live on your digital menu!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save cover photo', 'error');
    } finally {
      setQuickSavingCover(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!business?.id) {
      showToast('Settings saved successfully');
      return;
    }

    const matchedCountry = getCountryByCode(selectedCountryCode);

    try {
      setSaving(true);
      const updatedData = {
        name: name.trim(),
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
        description: description.trim(),
        tagline: description.trim(),
        country: matchedCountry?.name || 'India',
        countryCode: selectedCountryCode,
        currencyCode: currencyCode || matchedCountry?.currencyCode || 'INR',
        currency: currencySymbol.trim() || '₹',
        currencySymbol: currencySymbol.trim() || '₹',
        address: address.trim(),
        googleMapsUrl: googleMapsUrl.trim(),
        phone: phone.trim(),
        googleReviewUrl: googleReviewUrl.trim(),
        primaryColor,
        logoUrl,
        coverImageUrl,
        updatedAt: new Date().toISOString(),
      };

      await updateBusiness(business.id, updatedData);
      setBusiness({ ...business, ...updatedData });
      showToast('Settings updated successfully! Menu prices are now formatted in ' + (currencySymbol.trim() || '₹'));
    } catch (err) {
      console.error(err);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General Profile', icon: <Store className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto select-none font-sans">
      {/* 1. Page Header */}
      <PageHeader
        title="Settings"
        description="Manage your restaurant profile, country & currency, and live menu appearance."
      />

      {/* 2. Setting Navigation Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* 3. Tab Contents */}
      <div className="max-w-3xl">
        {/* Tab 1: General Profile */}
        {activeTab === 'general' && (
          <Card size="default" className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-[#101828]">Restaurant Information</h2>
              <p className="text-xs text-[#667085] mt-0.5">
                Basic details displayed on your digital menu and QR standees.
              </p>
            </div>

            <div className="space-y-4">
              <Input
                label="Restaurant Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="The Artisan Bistro"
                required
              />

              <Input
                label="Menu Slug / URL Identifier"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="the-artisan-bistro"
                helperText={`Public URL: /m/${slug}`}
                required
              />

              {/* Country & Currency Selection */}
              <div className="p-4 bg-[#F7F9FC] border border-[#E4E7EC] rounded-[14px] space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#E4E7EC]">
                  <Globe className="w-4 h-4 text-[#078A55]" />
                  <span className="text-xs font-bold text-[#101828] uppercase tracking-wider">
                    Country & Currency Settings
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                      Operating Country
                    </label>
                    <select
                      value={selectedCountryCode}
                      onChange={(e) => handleCountryChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#D0D5DD] rounded-[10px] text-sm text-[#101828] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#078A55]/20 focus:border-[#078A55] transition-all cursor-pointer"
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.flag} {c.name} ({c.currencyCode} - {c.currencySymbol})
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#667085] mt-1">
                      Sets default currency and formatting for all menus
                    </p>
                  </div>

                  <div>
                    <Input
                      label="Currency Symbol"
                      value={currencySymbol}
                      onChange={(e) => setCurrencySymbol(e.target.value)}
                      placeholder="₹, $, €, £, AED, etc."
                      helperText={`Code: ${currencyCode}`}
                      leftIcon={<Coins className="w-4 h-4 text-[#078A55]" />}
                      required
                    />
                  </div>
                </div>

                {/* Live Price Preview Badge */}
                <div className="flex items-center justify-between p-3 bg-white border border-[#E4E7EC] rounded-[10px]">
                  <span className="text-xs font-medium text-[#667085]">
                    Example Menu Price Preview:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-[#EAF8F1] text-[#078A55] border border-[#D1EEDC] rounded-full text-xs font-bold font-mono">
                      {currencySymbol.trim() || '₹'} 249
                    </span>
                    <span className="text-[11px] text-[#98A2B3]">
                      (Shown to customers across all digital menus)
                    </span>
                  </div>
                </div>
              </div>

              <Textarea
                label="Short Description / Tagline"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Farm-to-table artisanal dining and handcrafted beverage experience."
                rows={3}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Street Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="104 Orchard Avenue, Gourmet Square"
                  leftIcon={<MapPin className="w-4 h-4" />}
                />

                <Input
                  label="Phone Contact"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 234-8900"
                  leftIcon={<Phone className="w-4 h-4" />}
                />
              </div>

              {/* Google Maps Location / Directions URL */}
              <div className="space-y-1.5">
                <Input
                  label="Google Maps Location / Directions Link (Optional)"
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.app.goo.gl/... or https://goo.gl/maps/..."
                  helperText="Direct link to your restaurant location on Google Maps for customer GPS directions (e.g. 'Get Directions')."
                  leftIcon={<Globe className="w-4 h-4" />}
                />
                {googleMapsUrl && (
                  <div className="flex items-center justify-end">
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#078A55] hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Test Google Maps link</span>
                    </a>
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-[#F7F9FC] border border-[#E4E7EC] rounded-[10px] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-[#475467]">
                  <Star className="w-4 h-4 text-[#F59E0B] fill-[#F59E0B]" />
                  <span>Looking to customize your <strong>Google Review link</strong> or <strong>Review Assistant</strong>?</span>
                </div>
                <span className="font-semibold text-[#078A55]">
                  Managed in the Reviews tab →
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#EEF1F5] flex justify-end">
              <Button
                variant="primary"
                onClick={handleSaveSettings}
                isLoading={saving}
              >
                Save Changes
              </Button>
            </div>
          </Card>
        )}

        {/* Tab 2: Appearance */}
        {activeTab === 'appearance' && (
          <Card size="default" className="space-y-6">
            <div>
              <h2 className="text-base font-semibold text-[#101828]">Brand & Visual Identity</h2>
              <p className="text-xs text-[#667085] mt-0.5">
                Customize your digital menu's color palette, logo, and banner photography.
              </p>
            </div>

            {/* Primary Brand Color */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-[#344054]">
                Primary Theme Color
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {BRAND_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setPrimaryColor(c.hex)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform cursor-pointer border-2 ${
                      primaryColor.toLowerCase() === c.hex.toLowerCase()
                        ? 'scale-110 border-[#101828] shadow-sm'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  >
                    {primaryColor.toLowerCase() === c.hex.toLowerCase() && (
                      <Check className="w-4 h-4 text-white stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Image */}
            <div className="p-4 bg-[#F8F9FC] border border-[#E4E7EC] rounded-[16px] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-bold text-[#101828]">
                    Restaurant Logo
                  </label>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Displayed on your digital menu header, QR standees, and review prompt cards.
                  </p>
                </div>
                {isLogoChanged && (
                  <span className="px-2.5 py-0.5 bg-[#FEF0C7] text-[#B54708] border border-[#FEDF89] rounded-full text-[11px] font-bold animate-pulse">
                    Unsaved Logo
                  </span>
                )}
              </div>

              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative group shrink-0">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-20 h-20 rounded-[14px] object-cover border-2 border-white shadow-md bg-white"
                  />
                  {isUploadingLogo && (
                    <div className="absolute inset-0 bg-black/50 rounded-[14px] flex items-center justify-center">
                      <RefreshCw className="w-5 h-5 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      leftIcon={<Sparkles className="w-4 h-4" />}
                      onClick={() => setIsLogoModalOpen(true)}
                    >
                      Change Logo
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isUploadingLogo}
                      leftIcon={<Upload className="w-4 h-4 text-[#667085]" />}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {isUploadingLogo ? 'Uploading...' : 'Upload File'}
                    </Button>
                    {isLogoChanged && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        isLoading={quickSavingLogo}
                        onClick={() => handleQuickSaveLogo()}
                        className="text-[#078A55] border-[#078A55]/30 hover:bg-[#EAF8F1]"
                      >
                        Save Logo Only
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#667085]">
                    Supports JPG, PNG, WebP or SVG (transparent logos preserved automatically)
                  </p>

                  {/* Quick Preset Logos */}
                  <div className="pt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider mr-1">
                      Quick Pick:
                    </span>
                    {[
                      { name: 'Bistro', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=80' },
                      { name: 'Bakery', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80' },
                      { name: 'Pizza', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80' },
                      { name: 'Wine Bar', url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&auto=format&fit=crop&q=80' },
                      { name: 'Grill', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80' },
                      { name: 'Coffee', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&auto=format&fit=crop&q=80' },
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setLogoUrl(p.url);
                          handleQuickSaveLogo(p.url);
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                          logoUrl === p.url
                            ? 'bg-[#078A55] text-white border-[#078A55] font-semibold'
                            : 'bg-white text-[#344054] border-[#D0D5DD] hover:border-[#078A55]'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Cover Banner Image */}
            <div className="p-4 bg-[#F8F9FC] border border-[#E4E7EC] rounded-[16px] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-bold text-[#101828]">
                    Header Cover Photo
                  </label>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Wide hero photograph displayed at the top of your public digital menu and landing page.
                  </p>
                </div>
                {isCoverChanged && (
                  <span className="px-2.5 py-0.5 bg-[#FEF0C7] text-[#B54708] border border-[#FEDF89] rounded-full text-[11px] font-bold animate-pulse">
                    Unsaved Cover
                  </span>
                )}
              </div>

              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />

              <div className="space-y-3">
                <div className="relative w-full h-44 rounded-[14px] overflow-hidden border-2 border-white shadow-sm bg-neutral-900 group">
                  <img
                    src={coverImageUrl}
                    alt="Cover"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={logoUrl}
                        alt="Logo badge"
                        className="w-10 h-10 rounded-[10px] object-cover border border-white shadow-xs"
                      />
                      <div className="text-white">
                        <p className="text-sm font-bold drop-shadow-sm">{name || 'Restaurant Name'}</p>
                        <p className="text-[11px] text-white/80">Menu Hero Live Preview</p>
                      </div>
                    </div>
                  </div>
                  {isUploadingCover && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 text-white animate-spin" />
                      <span className="text-xs font-semibold text-white">Uploading cover...</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      leftIcon={<Sparkles className="w-4 h-4" />}
                      onClick={() => setIsCoverModalOpen(true)}
                    >
                      Change Cover Photo
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isUploadingCover}
                      leftIcon={<Upload className="w-4 h-4 text-[#667085]" />}
                      onClick={() => coverInputRef.current?.click()}
                    >
                      {isUploadingCover ? 'Uploading...' : 'Upload Wide Photo'}
                    </Button>
                    {isCoverChanged && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        isLoading={quickSavingCover}
                        onClick={() => handleQuickSaveCover()}
                        className="text-[#078A55] border-[#078A55]/30 hover:bg-[#EAF8F1]"
                      >
                        Save Cover Only
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-[#667085]">
                    Recommended 1200x500px wide image
                  </p>
                </div>

                {/* Quick Preset Covers */}
                <div className="pt-2 flex items-center gap-1.5 flex-wrap border-t border-[#E4E7EC]">
                  <span className="text-[10px] font-bold text-[#667085] uppercase tracking-wider mr-1">
                    Preset Ambiance:
                  </span>
                  {[
                    { name: 'Warm Dining', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80' },
                    { name: 'Sunset Terrace', url: 'https://images.unsplash.com/photo-1578474846511-04ba529f0b88?w=1200&auto=format&fit=crop&q=80' },
                    { name: 'Open Kitchen', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80' },
                    { name: 'Cocktail Lounge', url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200&auto=format&fit=crop&q=80' },
                    { name: 'Gourmet Feast', url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80' },
                    { name: 'Morning Cafe', url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200&auto=format&fit=crop&q=80' },
                  ].map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCoverImageUrl(p.url);
                        handleQuickSaveCover(p.url);
                      }}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                        coverImageUrl === p.url
                          ? 'bg-[#078A55] text-white border-[#078A55] font-semibold'
                          : 'bg-white text-[#344054] border-[#D0D5DD] hover:border-[#078A55]'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Unsaved Changes Banner */}
            {(isLogoChanged || isCoverChanged) && (
              <div className="p-4 bg-[#EAF8F1] border border-[#A6E1C4] rounded-[14px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-[#078A55] font-semibold">
                  <Check className="w-5 h-5 shrink-0" />
                  <span>You have new imagery ready! Click Save Changes to publish to your live menu.</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveSettings}
                  isLoading={saving}
                >
                  Save All Changes
                </Button>
              </div>
            )}

            <div className="pt-4 border-t border-[#EEF1F5] flex justify-end">
              <Button
                variant="primary"
                onClick={handleSaveSettings}
                isLoading={saving}
              >
                Save Changes
              </Button>
            </div>

            {/* Modals for Logo and Cover Image */}
            <ImageUpdateModal
              isOpen={isLogoModalOpen}
              onClose={() => setIsLogoModalOpen(false)}
              onSelectImage={(url) => {
                setLogoUrl(url);
                handleQuickSaveLogo(url);
              }}
              currentImageUrl={logoUrl}
              title="Change Restaurant Logo"
              type="logo"
              businessId={business?.id}
            />

            <ImageUpdateModal
              isOpen={isCoverModalOpen}
              onClose={() => setIsCoverModalOpen(false)}
              onSelectImage={(url) => {
                setCoverImageUrl(url);
                handleQuickSaveCover(url);
              }}
              currentImageUrl={coverImageUrl}
              title="Change Header Cover Photo"
              type="cover"
              businessId={business?.id}
            />
          </Card>
        )}
      </div>
    </div>
  );
};
