import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ReviewPhrase, ReviewPhraseCategory, Business } from '../../types';
import { getCombinedReviewPhrases, logAnalyticsEvent, submitPrivateFeedback } from '../../services/firestoreService';
import { generateDeterministicReview } from '../../utils/reviewGenerator';
import { copyToClipboard } from '../../utils/clipboard';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Star,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  MessageSquare,
  Utensils,
  Heart,
  Smile,
  DollarSign,
  Layers,
  AlertCircle,
  Send,
  CheckCircle2,
} from 'lucide-react';

interface ReviewAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  tableNumber?: string;
}

type Step = 'select_experience' | 'review_draft' | 'private_feedback' | 'feedback_success';

const CATEGORY_TABS: { id: 'all' | ReviewPhraseCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'all', label: 'All', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'food', label: 'Food & Taste', icon: <Utensils className="w-3.5 h-3.5" /> },
  { id: 'service', label: 'Staff & Service', icon: <Smile className="w-3.5 h-3.5" /> },
  { id: 'ambience', label: 'Ambience & Vibes', icon: <Heart className="w-3.5 h-3.5" /> },
  { id: 'value', label: 'Price & Value', icon: <DollarSign className="w-3.5 h-3.5" /> },
  { id: 'overall', label: 'Overall', icon: <Sparkles className="w-3.5 h-3.5" /> },
];

export const ReviewAssistantModal: React.FC<ReviewAssistantModalProps> = ({
  isOpen,
  onClose,
  business,
  tableNumber,
}) => {
  const [step, setStep] = useState<Step>('select_experience');
  const [rating, setRating] = useState<number>(5);
  const [selectedCategory, setSelectedCategory] = useState<'all' | ReviewPhraseCategory>('all');
  const [allPhrases, setAllPhrases] = useState<ReviewPhrase[]>([]);
  const [selectedPhraseIds, setSelectedPhraseIds] = useState<Set<string>>(new Set());
  const [customNotes, setCustomNotes] = useState('');
  const [generatedReview, setGeneratedReview] = useState('');
  const [hasCopied, setHasCopied] = useState(false);
  const [showCopyNotice, setShowCopyNotice] = useState(false);
  const [loadingPhrases, setLoadingPhrases] = useState(true);
  const [hasEdited, setHasEdited] = useState(false);

  // Private feedback form state
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const maxSelections = business.reviewAssistantSettings?.maximumPhraseSelections || 5;

  const googleReviewUrl =
    business.googleReviewUrl ||
    business.reviewAssistantSettings?.googleReviewUrl ||
    `https://www.google.com/search?q=${encodeURIComponent(business.name)}+reviews`;

  // Fetch combined phrases on open
  useEffect(() => {
    if (!isOpen || !business?.id) return;

    // Reset state on open
    setStep('select_experience');
    setRating(5);
    setSelectedPhraseIds(new Set());
    setCustomNotes('');
    setGeneratedReview('');
    setHasCopied(false);
    setShowCopyNotice(false);
    setHasEdited(false);
    setFeedbackMessage('');
    setCustomerName('');
    setCustomerContact('');
    setFeedbackError(null);

    // Track modal opened
    logAnalyticsEvent(business.id, {
      type: 'review_assistant_opened',
      deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      tableNumber,
    }).catch(console.warn);

    const loadPhrases = async () => {
      try {
        setLoadingPhrases(true);
        const phrases = await getCombinedReviewPhrases(business.id);
        setAllPhrases(phrases);

        // Pre-select 2 default relevant positive phrases for quick 1-tap UX
        const defaultSelected = new Set<string>();
        const foodP = phrases.find((p) => p.category === 'food' && p.active !== false);
        const serviceP = phrases.find((p) => p.category === 'service' && p.active !== false);
        if (foodP) defaultSelected.add(foodP.id);
        if (serviceP) defaultSelected.add(serviceP.id);
        setSelectedPhraseIds(defaultSelected);
      } catch (err) {
        console.error('Failed to load phrases:', err);
      } finally {
        setLoadingPhrases(false);
      }
    };

    loadPhrases();
  }, [isOpen, business.id, tableNumber]);

  // Filter phrases by active tab & deduplicate by text
  const filteredPhrases = useMemo(() => {
    const list = selectedCategory === 'all'
      ? allPhrases.filter((p) => p.active !== false)
      : allPhrases.filter((p) => p.category === selectedCategory && p.active !== false);

    // Deduplicate by text (case-insensitive) so phrase chips like "Good" never repeat
    const seen = new Set<string>();
    return list.filter((item) => {
      const textKey = item.text.trim().toLowerCase();
      if (seen.has(textKey)) return false;
      seen.add(textKey);
      return true;
    });
  }, [allPhrases, selectedCategory]);

  const togglePhrase = (phrase: ReviewPhrase) => {
    const next = new Set(selectedPhraseIds);
    if (next.has(phrase.id)) {
      next.delete(phrase.id);
    } else {
      if (next.size >= maxSelections) {
        return; // Exceeded limit
      }
      next.add(phrase.id);
    }
    setSelectedPhraseIds(next);

    // Log feedback started
    logAnalyticsEvent(business.id, {
      type: 'review_feedback_started',
      deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      tableNumber,
      metadata: { phraseId: phrase.id, category: phrase.category },
    }).catch(console.warn);
  };

  const performAutoCopy = async (text: string) => {
    if (!text) return false;
    let copied = false;

    // 1. Try selecting active textarea element directly if mounted
    if (textareaRef.current) {
      try {
        textareaRef.current.focus();
        textareaRef.current.select();
        textareaRef.current.setSelectionRange(0, 999999);
        copied = document.execCommand('copy');
      } catch (err) {
        console.warn('Textarea selection copy warning:', err);
      }
    }

    // 2. Fallback to copyToClipboard engine
    if (!copied) {
      copied = await copyToClipboard(text);
    }

    if (copied) {
      setHasCopied(true);
      setShowCopyNotice(true);
      setTimeout(() => setHasCopied(false), 3500);
    }
    return copied;
  };

  // Auto-copy when landing on review_draft screen
  useEffect(() => {
    if (step === 'review_draft' && generatedReview) {
      const timer = setTimeout(() => {
        performAutoCopy(generatedReview);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [step, generatedReview]);

  const handleGenerateDraft = () => {
    const selectedList = allPhrases.filter((p) => selectedPhraseIds.has(p.id));
    const draftText = generateDeterministicReview({
      rating,
      selectedPhrases: selectedList,
      restaurantName: business.name,
      customNotes,
    });

    setGeneratedReview(draftText);
    setStep('review_draft');

    logAnalyticsEvent(business.id, {
      type: 'review_draft_generated',
      deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      tableNumber,
      metadata: {
        rating,
        selectedPhraseCount: selectedList.length,
        hasCustomNotes: !!customNotes,
      },
    }).catch(console.warn);
  };

  const handleCopyReview = async () => {
    const copied = await performAutoCopy(generatedReview);
    if (copied) {
      logAnalyticsEvent(business.id, {
        type: 'review_copy_clicked',
        deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        tableNumber,
      }).catch(console.warn);
    }
  };

  const handleContinueToGoogle = async () => {
    // 1. Copy review text to clipboard synchronously
    await performAutoCopy(generatedReview);

    // 2. Track analytics
    logAnalyticsEvent(business.id, {
      type: 'google_review_clicked',
      deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      tableNumber,
      metadata: { rating, charCount: generatedReview.length },
    }).catch(console.warn);

    // 3. Open Google Review URL safely
    window.open(googleReviewUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSubmitPrivateFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) {
      setFeedbackError('Please enter your feedback comments.');
      return;
    }

    try {
      setSubmittingFeedback(true);
      setFeedbackError(null);
      await submitPrivateFeedback(business.id, {
        rating,
        message: feedbackMessage.trim(),
        customerName: customerName.trim() || undefined,
        customerContact: customerContact.trim() || undefined,
      });
      setStep('feedback_success');
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setFeedbackError('Failed to send feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const renderFooter = () => {
    if (step === 'select_experience') {
      return (
        <div className="w-full flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <Button
            variant="primary"
            onClick={handleGenerateDraft}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="flex-1 sm:flex-initial shadow-md"
          >
            Generate Review Draft
          </Button>
        </div>
      );
    }

    if (step === 'review_draft') {
      return (
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep('select_experience')}
              className="inline-flex items-center justify-center gap-1.5 px-3 h-8 rounded-[8px] bg-white border border-[#E4E7EC] hover:bg-[#F7F9FC] text-xs font-semibold text-[#344054] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopyReview}
              leftIcon={
                hasCopied ? (
                  <Check className="w-3.5 h-3.5 text-[#078A55]" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#667085]" />
                )
              }
            >
              {hasCopied ? 'Copied!' : 'Copy Review'}
            </Button>
          </div>

          <Button
            type="button"
            variant="primary"
            size="default"
            onClick={handleContinueToGoogle}
            rightIcon={<ExternalLink className="w-4 h-4" />}
            className="w-full h-11 text-xs sm:text-sm font-bold shadow-md whitespace-nowrap"
          >
            Continue to Google
          </Button>
        </div>
      );
    }

    if (step === 'private_feedback') {
      return (
        <div className="w-full flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep('select_experience')}
            className="px-3.5 py-2 text-xs font-semibold text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <Button
            type="submit"
            form="private-feedback-form"
            variant="primary"
            disabled={submittingFeedback}
            leftIcon={<Send className="w-4 h-4" />}
            className="flex-1 sm:flex-initial shadow-md"
          >
            {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </div>
      );
    }

    if (step === 'feedback_success') {
      return (
        <div className="w-full flex justify-end">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 'select_experience'
          ? 'Review Assistant'
          : step === 'review_draft'
          ? 'Your Review'
          : step === 'private_feedback'
          ? 'Direct Feedback'
          : 'Thank You!'
      }
      description={
        step === 'select_experience'
          ? 'Select your rating and highlights to craft an editable Google review draft.'
          : step === 'review_draft'
          ? 'Feel free to tweak or personalize your review before posting to Google.'
          : step === 'private_feedback'
          ? 'Your feedback will be sent directly and privately to our restaurant management.'
          : 'Your feedback has been received.'
      }
      footer={renderFooter()}
      maxWidth="md"
    >
      <div className="space-y-5 font-sans">
        {step === 'select_experience' && (
          /* ========================================================= */
          /* STEP 1: RATING & EXPERIENCE SELECTION                      */
          /* ========================================================= */
          <div className="space-y-4">
            {/* 1. Overall Rating (1–5 Stars) */}
            <div className="bg-[#FFF7DB] border border-[#FDE68A] rounded-[16px] p-4 text-center space-y-2">
              <span className="text-xs font-bold text-[#92400E] uppercase tracking-wider">
                Overall Experience
              </span>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((starVal) => {
                  const isFilled = starVal <= rating;
                  return (
                    <button
                      key={starVal}
                      type="button"
                      onClick={() => setRating(starVal)}
                      className="p-1.5 transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                      aria-label={`${starVal} star rating`}
                    >
                      <Star
                        className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                          isFilled
                            ? 'text-[#F59E0B] fill-[#F59E0B] drop-shadow-xs'
                            : 'text-[#D0D5DD] fill-transparent hover:text-[#FDE68A]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-semibold text-[#78350F]">
                {rating === 5 && 'Outstanding! 5-star experience'}
                {rating === 4 && 'Great! 4-star experience'}
                {rating === 3 && 'Good / Decent experience'}
                {rating === 2 && 'Needs improvement'}
                {rating === 1 && 'Disappointing visit'}
              </p>
            </div>

            {/* If rating <= 3, offer private management feedback route */}
            {rating <= 3 && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-[12px] flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-semibold">
                    We're sorry your experience wasn't 5 stars.
                  </p>
                  <p className="text-[11px] text-amber-700">
                    Send private feedback directly to our manager so we can resolve any issues and improve.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStep('private_feedback')}
                    className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Send Private Feedback to Manager</span>
                  </button>
                </div>
              </div>
            )}

            {/* 2. Category Filter Chips */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#344054] uppercase tracking-wide">
                  What made your visit special?
                </span>
                <span className="text-[11px] font-semibold text-[#078A55] bg-[#EAF8F1] px-2 py-0.5 rounded-full border border-[#D1EEDC]">
                  {selectedPhraseIds.size} / {maxSelections} selected
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
                {CATEGORY_TABS.map((cat) => {
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-[#101828] text-white border-[#101828] shadow-xs'
                          : 'bg-white text-[#475467] border-[#E4E7EC] hover:border-[#D0D5DD] hover:bg-[#F7F9FC]'
                      }`}
                    >
                      {cat.icon}
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Phrase Options Pills Grid */}
            <div className="space-y-1.5">
              {loadingPhrases ? (
                <div className="py-8 text-center text-xs text-[#98A2B3] animate-pulse">
                  Loading review highlights...
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 py-1">
                  {filteredPhrases.map((phrase) => {
                    const isSelected = selectedPhraseIds.has(phrase.id);
                    return (
                      <button
                        key={phrase.id}
                        type="button"
                        onClick={() => togglePhrase(phrase)}
                        className={`group inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[12px] text-xs font-medium transition-all text-left cursor-pointer border ${
                          isSelected
                            ? 'bg-[#EAF8F1] text-[#078A55] border-[#078A55] shadow-xs font-semibold ring-1 ring-[#078A55]/30'
                            : 'bg-white text-[#344054] border-[#E4E7EC] hover:border-[#078A55]/50 hover:bg-[#F7F9FC]'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-[10px] transition-colors ${
                            isSelected
                              ? 'bg-[#078A55] text-white'
                              : 'border border-[#D0D5DD] group-hover:border-[#078A55]'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <span>{phrase.text}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Optional Custom Notes / Dish Details */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#475467]">
                Add specific dishes or notes (optional)
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Loved the Truffle Pasta and Masala Chai!"
                maxLength={150}
                className="w-full px-3.5 py-2.5 bg-white border border-[#D0D5DD] rounded-[10px] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-hidden focus:ring-2 focus:ring-[#078A55]/20 focus:border-[#078A55] transition-all"
              />
            </div>

            {/* Link to Private Feedback */}
            <div className="text-center pt-1 pb-2">
              <button
                type="button"
                onClick={() => setStep('private_feedback')}
                className="text-xs text-[#078A55] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Prefer to send private feedback to our team? Click here</span>
              </button>
            </div>
          </div>
        )}

        {step === 'review_draft' && (
          /* ========================================================= */
          /* STEP 2: EDITABLE DRAFT & GOOGLE REDIRECT                  */
          /* ========================================================= */
          <div className="space-y-4">
            {/* Rating summary badge */}
            <div className="flex items-center justify-between p-3 bg-[#F7F9FC] border border-[#E4E7EC] rounded-[12px]">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center text-[#F59E0B]">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${
                        i < rating ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-[#D0D5DD]'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-[#101828] ml-1">
                  {rating}.0 Rating
                </span>
              </div>

              <button
                type="button"
                onClick={() => setStep('select_experience')}
                className="text-xs font-semibold text-[#078A55] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Change Selections</span>
              </button>
            </div>

            {/* Editable Review Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#344054]">
                  Generated Review Text
                </label>
                <span className="text-[11px] text-[#98A2B3]">
                  Tap to edit anytime
                </span>
              </div>

              <textarea
                ref={textareaRef}
                value={generatedReview}
                onChange={(e) => {
                  setGeneratedReview(e.target.value);
                  if (!hasEdited) {
                    setHasEdited(true);
                    logAnalyticsEvent(business.id, {
                      type: 'review_draft_edited',
                      deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
                      tableNumber,
                    }).catch(console.warn);
                  }
                }}
                rows={4}
                className="w-full p-3.5 bg-white border border-[#D0D5DD] rounded-[12px] text-sm text-[#101828] font-normal leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-[#078A55]/20 focus:border-[#078A55] transition-all resize-none shadow-xs"
                placeholder="Write your review..."
              />
            </div>

            {/* Instructions Banner */}
            <div className="p-3.5 bg-[#EAF8F1] border border-[#D1EEDC] rounded-[12px] flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#078A55] shrink-0 mt-0.5" />
              <div className="text-xs text-[#065F38] space-y-0.5">
                <p className="font-semibold">
                  Review will be copied to your clipboard.
                </p>
                <p className="text-[11px] text-[#078A55] leading-relaxed">
                  Paste it into Google and make any final personal adjustments before posting.
                </p>
              </div>
            </div>

            {/* Copy Notification Toast */}
            {showCopyNotice && (
              <div className="p-3 bg-[#101828] text-white rounded-[10px] text-xs flex items-center justify-between animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#34D399]" />
                  <span>Review copied! Paste it on Google.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCopyNotice(false)}
                  className="text-[#98A2B3] hover:text-white text-xs font-semibold"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'private_feedback' && (
          <form id="private-feedback-form" onSubmit={handleSubmitPrivateFeedback} className="space-y-4">
            <div className="bg-[#F7F9FC] border border-[#E4E7EC] rounded-[14px] p-3 text-center space-y-1.5">
              <span className="text-[11px] font-bold text-[#667085] uppercase tracking-wider">
                Rating
              </span>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((starVal) => (
                  <button
                    key={starVal}
                    type="button"
                    onClick={() => setRating(starVal)}
                    className="p-1 transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        starVal <= rating
                          ? 'text-[#F59E0B] fill-[#F59E0B]'
                          : 'text-[#D0D5DD]'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {feedbackError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{feedbackError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-[#344054]">
                Your Feedback or Suggestions <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Tell us what you liked or what we could do better..."
                className="w-full p-3 bg-white border border-[#D0D5DD] rounded-[10px] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-hidden focus:ring-2 focus:ring-[#078A55]/20 focus:border-[#078A55] transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#344054]">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-[10px] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-hidden focus:ring-2 focus:ring-[#078A55]/20 focus:border-[#078A55]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-[#344054]">
                  Contact (Email or Phone, Optional)
                </label>
                <input
                  type="text"
                  value={customerContact}
                  onChange={(e) => setCustomerContact(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-[10px] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-hidden focus:ring-2 focus:ring-[#078A55]/20 focus:border-[#078A55]"
                />
              </div>
            </div>
          </form>
        )}

        {step === 'feedback_success' && (
          /* ========================================================= */
          /* STEP 4: FEEDBACK SUCCESS CONFIRMATION                     */
          /* ========================================================= */
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#EAF8F1] text-[#078A55] flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[#101828]">
                Thank You for Your Feedback!
              </h3>
              <p className="text-xs text-[#667085] max-w-sm mx-auto leading-relaxed">
                Your comments have been delivered directly to {business.name}'s management team. We appreciate you helping us improve!
              </p>
            </div>

            <div className="pt-3">
              <Button variant="primary" onClick={onClose} className="w-full max-w-xs mx-auto">
                Close & Return to Menu
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
