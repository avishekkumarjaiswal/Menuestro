import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { copyToClipboard } from '../../utils/clipboard';
import {
  updateBusiness,
  subscribePrivateFeedback,
  deletePrivateFeedback,
  getGlobalReviewLibrary,
  subscribeGlobalReviewLibrary,
  createGlobalReviewPhrase,
  updateGlobalReviewPhrase,
  deleteGlobalReviewPhrase,
  subscribeBusinessReviewPhrases,
  createBusinessReviewPhrase,
  updateBusinessReviewPhrase,
  deleteBusinessReviewPhrase,
} from '../../services/firestoreService';
import { ReviewPhrase, ReviewPhraseCategory, PrivateFeedback } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Input, Textarea } from '../ui/Input';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Badge';
import {
  Star,
  ExternalLink,
  Save,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Sliders,
  BookOpen,
  MessageSquare,
  TrendingUp,
  Globe,
  Utensils,
  Smile,
  Heart,
  DollarSign,
  Layers,
  ArrowUpRight,
  HelpCircle,
} from 'lucide-react';

const CATEGORY_META: Record<
  ReviewPhraseCategory,
  { label: string; icon: React.ReactNode; bg: string; text: string }
> = {
  overall: { label: 'Overall', icon: <Sparkles className="w-3.5 h-3.5" />, bg: 'bg-[#FFF7DB]', text: 'text-[#B45309]' },
  food: { label: 'Food', icon: <Utensils className="w-3.5 h-3.5" />, bg: 'bg-[#EAF8F1]', text: 'text-[#078A55]' },
  service: { label: 'Service', icon: <Smile className="w-3.5 h-3.5" />, bg: 'bg-[#EFF8FF]', text: 'text-[#175CD3]' },
  ambience: { label: 'Ambience', icon: <Heart className="w-3.5 h-3.5" />, bg: 'bg-[#FDF2FA]', text: 'text-[#C11574]' },
  value: { label: 'Value', icon: <DollarSign className="w-3.5 h-3.5" />, bg: 'bg-[#F8F9FC]', text: 'text-[#363F72]' },
  general: { label: 'General', icon: <Layers className="w-3.5 h-3.5" />, bg: 'bg-[#F2F4F7]', text: 'text-[#344054]' },
};

export const ReviewsView: React.FC = () => {
  const { business, setBusiness } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('assistant');

  // Settings state
  const [assistantEnabled, setAssistantEnabled] = useState<boolean>(
    business?.reviewAssistantSettings?.enabled ?? true
  );
  const [maxSelections, setMaxSelections] = useState<number>(
    business?.reviewAssistantSettings?.maximumPhraseSelections ?? 5
  );
  const [googleReviewUrl, setGoogleReviewUrl] = useState<string>(
    business?.googleReviewUrl ||
      business?.reviewAssistantSettings?.googleReviewUrl ||
      'https://www.google.com/maps/place/The+Artisan+Bistro/@28.70254'
  );
  const [savingSettings, setSavingSettings] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Global Super Admin library state
  const [globalPhrases, setGlobalPhrases] = useState<ReviewPhrase[]>([]);
  const [selectedGlobalCat, setSelectedGlobalCat] = useState<'all' | ReviewPhraseCategory>('all');

  // Restaurant-specific phrases state
  const [customPhrases, setCustomPhrases] = useState<ReviewPhrase[]>([]);
  const [selectedCustomCat, setSelectedCustomCat] = useState<'all' | ReviewPhraseCategory>('all');

  // Modal phrase edit/create
  const [isPhraseModalOpen, setIsPhraseModalOpen] = useState(false);
  const [modalTargetType, setModalTargetType] = useState<'global' | 'custom'>('custom');
  const [editingPhrase, setEditingPhrase] = useState<ReviewPhrase | null>(null);
  const [phraseText, setPhraseText] = useState('');
  const [phraseCategory, setPhraseCategory] = useState<ReviewPhraseCategory>('food');
  const [phraseActive, setPhraseActive] = useState(true);
  const [phraseSaving, setPhraseSaving] = useState(false);

  // Customer private feedback state
  const [feedbackList, setFeedbackList] = useState<PrivateFeedback[]>([]);
  const [deletingFeedbackId, setDeletingFeedbackId] = useState<string | null>(null);
  const [deletingPhraseId, setDeletingPhraseId] = useState<string | null>(null);

  // Subscriptions
  useEffect(() => {
    if (!business?.id) return;

    const unsubGlobal = subscribeGlobalReviewLibrary((loaded) => {
      setGlobalPhrases(loaded);
    });

    const unsubCustom = subscribeBusinessReviewPhrases(business.id, (loaded) => {
      setCustomPhrases(loaded);
    });

    const unsubFeedback = subscribePrivateFeedback(business.id, (loaded) => {
      setFeedbackList(loaded);
    });

    return () => {
      unsubGlobal();
      unsubCustom();
      unsubFeedback();
    };
  }, [business?.id]);

  // Save Review Assistant settings
  const handleSaveSettings = async () => {
    if (!business?.id) return;
    try {
      setSavingSettings(true);
      const cleanUrl = googleReviewUrl.trim();
      const updatedSettings = {
        enabled: assistantEnabled,
        googleReviewUrl: cleanUrl,
        maximumPhraseSelections: Number(maxSelections) || 5,
      };

      await updateBusiness(business.id, {
        googleReviewUrl: cleanUrl,
        reviewAssistantSettings: updatedSettings,
        updatedAt: new Date().toISOString(),
      });

      setBusiness({
        ...business,
        googleReviewUrl: cleanUrl,
        reviewAssistantSettings: updatedSettings,
      });

      showToast('Review Assistant settings updated successfully!');
    } catch (err) {
      console.error(err);
      showToast('Failed to save settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCopyPublicReviewLink = async () => {
    const slug = business?.slug || 'menu';
    const url = `${window.location.origin}/r/${slug}`;
    await copyToClipboard(url);
    setCopiedLink(true);
    showToast('Direct review link copied to clipboard!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Open Custom Phrase Create/Edit Modal
  const openAddPhraseModal = () => {
    setModalTargetType('custom');
    setEditingPhrase(null);
    setPhraseText('');
    setPhraseCategory('food');
    setPhraseActive(true);
    setIsPhraseModalOpen(true);
  };

  const openEditPhraseModal = (phrase: ReviewPhrase) => {
    setModalTargetType('custom');
    setEditingPhrase(phrase);
    setPhraseText(phrase.text);
    setPhraseCategory(phrase.category);
    setPhraseActive(phrase.active !== false);
    setIsPhraseModalOpen(true);
  };

  const handleSavePhraseModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phraseText.trim() || !business?.id) return;

    try {
      setPhraseSaving(true);
      const trimmedText = phraseText.trim();

      if (editingPhrase) {
        await updateBusinessReviewPhrase(business.id, editingPhrase.id, {
          text: trimmedText,
          category: phraseCategory,
          active: phraseActive,
        });
        showToast('Custom phrase updated!');
      } else {
        await createBusinessReviewPhrase(business.id, {
          text: trimmedText,
          category: phraseCategory,
          active: phraseActive,
          sortOrder: customPhrases.length + 1,
        });
        showToast('New custom phrase created!');
      }

      setIsPhraseModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to save phrase', 'error');
    } finally {
      setPhraseSaving(false);
    }
  };

  const handleDeletePhrase = async (phrase: ReviewPhrase) => {
    if (!business?.id) return;

    try {
      setDeletingPhraseId(phrase.id);
      // Optimistically remove from state immediately
      setCustomPhrases((prev) => prev.filter((p) => p.id !== phrase.id));
      await deleteBusinessReviewPhrase(business.id, phrase.id);
      showToast('Custom phrase deleted successfully');
    } catch (err) {
      console.error(err);
      // Revert if error
      setCustomPhrases((prev) => [...prev, phrase]);
      showToast('Failed to delete phrase', 'error');
    } finally {
      setDeletingPhraseId(null);
    }
  };

  const handleTogglePhraseActive = async (phrase: ReviewPhrase, type: 'global' | 'custom') => {
    try {
      const nextState = !phrase.active;
      if (type === 'global') {
        await updateGlobalReviewPhrase(phrase.id, { active: nextState });
      } else {
        if (!business?.id) return;
        await updateBusinessReviewPhrase(business.id, phrase.id, { active: nextState });
      }
      showToast(nextState ? 'Phrase activated' : 'Phrase deactivated');
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    }
  };

  // Filtered views
  const filteredGlobals =
    selectedGlobalCat === 'all'
      ? globalPhrases
      : globalPhrases.filter((p) => p.category === selectedGlobalCat);

  const filteredCustoms =
    selectedCustomCat === 'all'
      ? customPhrases
      : customPhrases.filter((p) => p.category === selectedCustomCat);

  const tabs = [
    { id: 'assistant', label: 'Assistant Settings', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'custom-phrases', label: `Custom Phrases (${customPhrases.length})`, icon: <Edit2 className="w-4 h-4" /> },
    { id: 'global-library', label: `Global Library (${globalPhrases.length})`, icon: <BookOpen className="w-4 h-4" /> },
    { id: 'feedback', label: `Customer Feedback (${feedbackList.length})`, icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto select-none font-sans">
      {/* 1. Page Header */}
      <PageHeader
        title="Review Assistant & Content Library"
        description="Empower diners with a rule-based review drafting flow to craft authentic Google reviews in seconds."
        action={
          <a
            href={googleReviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-white border border-[#E4E7EC] hover:bg-[#F7F9FC] text-xs font-semibold text-[#344054] transition-colors cursor-pointer shadow-xs"
          >
            <span>Google Review Form</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#667085]" />
          </a>
        }
      />

      {/* 2. Navigation Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* 3. Tab Contents */}
      <div className="space-y-6">
        {/* ========================================================= */}
        {/* TAB 1: RESTAURANT REVIEW ASSISTANT SETTINGS               */}
        {/* ========================================================= */}
        {activeTab === 'assistant' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <Card size="default" className="lg:col-span-8 space-y-6">
              <div>
                <h2 className="text-base font-semibold text-[#101828]">
                  Review Assistant Configuration
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Configure review behavior and Google destination link for {business?.name}.
                </p>
              </div>

              {/* Enable / Disable Toggle Card */}
              <div className="p-4 bg-[#F7F9FC] border border-[#E4E7EC] rounded-[14px] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#101828]">
                    Enable Rule-Based Review Assistant
                  </h3>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Shows the interactive review drafting flow to diners on the public menu.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assistantEnabled}
                    onChange={(e) => setAssistantEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#D0D5DD] peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D0D5DD] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#078A55]" />
                </label>
              </div>

              {/* Google Review Place URL */}
              <div className="space-y-1.5">
                <Input
                  label="Google Business Review URL"
                  value={googleReviewUrl}
                  onChange={(e) => setGoogleReviewUrl(e.target.value)}
                  placeholder="https://g.page/r/your-restaurant/review"
                  helperText="The destination URL opened when the customer taps 'Continue to Google'."
                  leftIcon={<Star className="w-4 h-4 text-[#F59E0B]" />}
                  required
                />
              </div>

              {/* Maximum Phrase Selections */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#344054]">
                  Maximum Highlight Selections Allowed
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={2}
                    max={10}
                    value={maxSelections}
                    onChange={(e) => setMaxSelections(Number(e.target.value))}
                    className="w-32 px-3.5 py-2.5 bg-white border border-[#D0D5DD] rounded-[10px] text-sm text-[#101828] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#078A55]/20 focus:border-[#078A55]"
                  />
                  <span className="text-xs text-[#667085]">
                    Recommended: 4 to 6 phrases for concise natural reviews.
                  </span>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-[#EEF1F5] flex items-center justify-between">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyPublicReviewLink}
                  leftIcon={
                    copiedLink ? (
                      <Check className="w-3.5 h-3.5 text-[#078A55]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#667085]" />
                    )
                  }
                >
                  {copiedLink ? 'Copied Review URL' : 'Copy Public Review Link'}
                </Button>

                <Button
                  variant="primary"
                  onClick={handleSaveSettings}
                  isLoading={savingSettings}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Settings
                </Button>
              </div>
            </Card>

            {/* Quick Preview & Help Column */}
            <div className="lg:col-span-4 space-y-4">
              <Card size="default" className="bg-[#FFF7DB] border-[#FDE68A] space-y-3">
                <div className="flex items-center gap-2 text-[#92400E]">
                  <Sparkles className="w-5 h-5" />
                  <h3 className="text-sm font-bold">How the Assistant Works</h3>
                </div>
                <ul className="text-xs text-[#78350F] space-y-2 leading-relaxed">
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold">•</span>
                    <span><strong>Curated Highlights:</strong> Diners easily select authentic dishes and dining experiences.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold">•</span>
                    <span><strong>Zero Gating:</strong> All diners (1–5 stars) receive the same direct review flow.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold">•</span>
                    <span><strong>1-Tap Clipboard Copy:</strong> Copies compiled review text so guests can easily paste into Google.</span>
                  </li>
                </ul>
              </Card>

              <Card size="default" className="space-y-3">
                <h3 className="text-sm font-bold text-[#101828]">Phrases Summary</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1.5 border-b border-[#EEF1F5]">
                    <span className="text-[#667085]">Global Library Phrases:</span>
                    <span className="font-bold text-[#101828]">{globalPhrases.length}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5 border-b border-[#EEF1F5]">
                    <span className="text-[#667085]">Custom Restaurant Phrases:</span>
                    <span className="font-bold text-[#078A55]">{customPhrases.length}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-[#667085]">Total Available to Guests:</span>
                    <span className="font-bold text-[#101828]">
                      {globalPhrases.filter((p) => p.active !== false).length +
                        customPhrases.filter((p) => p.active !== false).length}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: CUSTOM RESTAURANT PHRASES                          */}
        {/* ========================================================= */}
        {activeTab === 'custom-phrases' && (
          <Card size="default" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EEF1F5]">
              <div>
                <h2 className="text-base font-semibold text-[#101828]">
                  Custom Restaurant Phrases
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Phrases created specifically for {business?.name} (e.g. signature dishes or unique vibe).
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={openAddPhraseModal}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add Custom Phrase
              </Button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {(['all', 'food', 'service', 'ambience', 'value', 'overall', 'general'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCustomCat(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer border ${
                    selectedCustomCat === cat
                      ? 'bg-[#101828] text-white border-[#101828]'
                      : 'bg-white text-[#475467] border-[#E4E7EC] hover:bg-[#F7F9FC]'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : CATEGORY_META[cat]?.label || cat}
                </button>
              ))}
            </div>

            {/* Custom Phrases List */}
            {filteredCustoms.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#98A2B3] bg-[#F7F9FC] rounded-[16px] border border-dashed border-[#D0D5DD] p-6">
                <Utensils className="w-8 h-8 text-[#D0D5DD] mx-auto mb-2" />
                <p className="font-semibold text-[#344054]">No custom phrases added yet</p>
                <p className="text-[11px] text-[#98A2B3] mt-1 max-w-sm mx-auto">
                  Your restaurant will use the Super Admin global library. You can also add custom highlights like your signature dishes!
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={openAddPhraseModal}
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="mt-4"
                >
                  Create First Custom Phrase
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[#EEF1F5] border border-[#E4E7EC] rounded-[14px] overflow-hidden">
                {filteredCustoms.map((phrase) => {
                  const meta = CATEGORY_META[phrase.category] || CATEGORY_META.general;
                  return (
                    <div
                      key={phrase.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-[#F7F9FC] transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${meta.bg} ${meta.text}`}
                          >
                            {meta.icon}
                            <span>{meta.label}</span>
                          </span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                              phrase.active !== false
                                ? 'bg-[#EAF8F1] text-[#078A55]'
                                : 'bg-[#F2F4F7] text-[#667085]'
                            }`}
                          >
                            {phrase.active !== false ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#101828]">
                          "{phrase.text}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleTogglePhraseActive(phrase, 'custom')}
                          className="px-2.5 py-1 rounded-[8px] bg-white border border-[#E4E7EC] hover:bg-[#F7F9FC] text-xs font-semibold text-[#344054] transition-colors cursor-pointer"
                        >
                          {phrase.active !== false ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditPhraseModal(phrase)}
                          className="p-1.5 text-[#667085] hover:text-[#101828] hover:bg-slate-100 rounded-[8px] transition-colors cursor-pointer"
                          aria-label="Edit phrase"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={deletingPhraseId === phrase.id}
                          onClick={() => handleDeletePhrase(phrase)}
                          className={`p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-[8px] transition-colors cursor-pointer ${
                            deletingPhraseId === phrase.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          aria-label="Delete phrase"
                          title="Delete phrase"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SUPER ADMIN GLOBAL REVIEW LIBRARY                  */}
        {/* ========================================================= */}
        {activeTab === 'global-library' && (
          <Card size="default" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EEF1F5]">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-[#101828]">
                    Super Admin Global Review Library
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#101828] text-white">
                    Master Library
                  </span>
                </div>
                <p className="text-xs text-[#667085] mt-0.5">
                  Standardized master library managed centrally by Super Admin. You can enable or disable phrases for your restaurant.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-[#F7F9FC] text-[#344054] text-xs font-bold border border-[#E4E7EC]">
                {globalPhrases.length} Master Phrases
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {(['all', 'food', 'service', 'ambience', 'value', 'overall', 'general'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedGlobalCat(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all cursor-pointer border ${
                    selectedGlobalCat === cat
                      ? 'bg-[#101828] text-white border-[#101828]'
                      : 'bg-white text-[#475467] border-[#E4E7EC] hover:bg-[#F7F9FC]'
                  }`}
                >
                  {cat === 'all' ? 'All Categories' : CATEGORY_META[cat]?.label || cat}
                </button>
              ))}
            </div>

            {/* Global Phrases Grid/List */}
            <div className="divide-y divide-[#EEF1F5] border border-[#E4E7EC] rounded-[14px] overflow-hidden">
              {filteredGlobals.map((phrase) => {
                const meta = CATEGORY_META[phrase.category] || CATEGORY_META.general;
                return (
                  <div
                    key={phrase.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-[#F7F9FC] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${meta.bg} ${meta.text}`}
                        >
                          {meta.icon}
                          <span>{meta.label}</span>
                        </span>
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                            phrase.active !== false
                              ? 'bg-[#EAF8F1] text-[#078A55]'
                              : 'bg-[#F2F4F7] text-[#667085]'
                          }`}
                        >
                          {phrase.active !== false ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#101828]">
                        "{phrase.text}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleTogglePhraseActive(phrase, 'global')}
                        className={`px-2.5 py-1 rounded-[8px] border text-xs font-semibold transition-colors cursor-pointer ${
                          phrase.active !== false
                            ? 'bg-white border-[#E4E7EC] hover:bg-[#FEE4E2] text-[#344054] hover:text-[#D92D20] hover:border-[#FECDCA]'
                            : 'bg-[#EAF8F1] border-[#D1EEDC] text-[#078A55] hover:bg-[#D1EEDC]'
                        }`}
                      >
                        {phrase.active !== false ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PRIVATE CUSTOMER FEEDBACK LOG                      */}
        {/* ========================================================= */}
        {activeTab === 'feedback' && (
          <Card size="default" className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#EEF1F5]">
              <div>
                <h2 className="text-base font-semibold text-[#101828]">
                  Customer Ratings & Feedback
                </h2>
                <p className="text-xs text-[#667085] mt-0.5">
                  Direct customer feedback received through the digital menu.
                </p>
              </div>

              <span className="px-3 py-1 rounded-full bg-[#EAF8F1] text-[#078A55] text-xs font-bold border border-[#D1EEDC]">
                {feedbackList.length} reviews
              </span>
            </div>

            {feedbackList.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#98A2B3]">
                <MessageSquare className="w-8 h-8 text-[#D0D5DD] mx-auto mb-2" />
                <p className="font-semibold text-[#344054]">No private feedback submissions yet</p>
                <p className="text-[11px] text-[#98A2B3] mt-1">
                  Customer feedback submitted through the Review Assistant will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#EEF1F5]">
                {feedbackList.map((item) => (
                  <div key={item.id} className="py-4 first:pt-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center text-[#F59E0B]">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < item.rating ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-[#D0D5DD]'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-bold text-[#101828]">
                          {item.customerName || 'Anonymous Diner'}
                        </span>
                        {item.customerContact && (
                          <span className="text-[11px] text-[#667085]">
                            • {item.customerContact}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-[#98A2B3]">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          type="button"
                          title="Delete feedback"
                          disabled={deletingFeedbackId === item.id}
                          onClick={async () => {
                            if (!business?.id) return;
                            try {
                              setDeletingFeedbackId(item.id);
                              await deletePrivateFeedback(business.id, item.id);
                              showToast('Feedback removed');
                            } catch (err) {
                              console.error(err);
                              showToast('Failed to delete feedback', 'error');
                            } finally {
                              setDeletingFeedbackId(null);
                            }
                          }}
                          className="p-1 text-[#98A2B3] hover:text-rose-600 hover:bg-rose-50 rounded-[6px] transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-[#475467] leading-relaxed">
                      "{item.message}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: ADD / EDIT CUSTOM RESTAURANT PHRASE                */}
      {/* ========================================================= */}
      <Modal
        isOpen={isPhraseModalOpen}
        onClose={() => setIsPhraseModalOpen(false)}
        title={editingPhrase ? 'Edit Custom Phrase' : 'Add Custom Phrase'}
        description="Craft custom feedback phrases specific to your dishes, service, or atmosphere."
        maxWidth="md"
      >
        <form onSubmit={handleSavePhraseModal} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1.5">
              Phrase Text *
            </label>
            <input
              type="text"
              value={phraseText}
              onChange={(e) => setPhraseText(e.target.value)}
              placeholder="e.g. The Truffle Pasta was out of this world"
              maxLength={200}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-[#D0D5DD] rounded-[10px] text-sm text-[#101828] focus:outline-hidden focus:ring-2 focus:ring-[#078A55]/20 focus:border-[#078A55]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                Aspect Category
              </label>
              <select
                value={phraseCategory}
                onChange={(e) => setPhraseCategory(e.target.value as ReviewPhraseCategory)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#D0D5DD] rounded-[10px] text-sm text-[#101828] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#078A55]/20 focus:border-[#078A55]"
              >
                <option value="food">Food & Taste</option>
                <option value="service">Service & Staff</option>
                <option value="ambience">Ambience & Decor</option>
                <option value="value">Price & Value</option>
                <option value="overall">Overall Experience</option>
                <option value="general">General Recommendation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                Visibility Status
              </label>
              <select
                value={phraseActive ? 'active' : 'inactive'}
                onChange={(e) => setPhraseActive(e.target.value === 'active')}
                className="w-full px-3.5 py-2.5 bg-white border border-[#D0D5DD] rounded-[10px] text-sm text-[#101828] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#078A55]/20 focus:border-[#078A55]"
              >
                <option value="active">Active (Shown to Diners)</option>
                <option value="inactive">Disabled (Hidden)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-[#EEF1F5] flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsPhraseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={phraseSaving}
            >
              {editingPhrase ? 'Save Phrase' : 'Add Phrase'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
