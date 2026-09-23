import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Layers,
  FileText,
  HelpCircle,
  Megaphone,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Search,
  Copy,
  Check,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import {
  ReviewPhrase,
  ReviewPhraseCategory,
  ReviewTemplate,
  FeedbackQuestion,
  CTAMessage
} from '../../types';
import {
  subscribeGlobalReviewLibrary,
  createGlobalReviewPhrase,
  updateGlobalReviewPhrase,
  deleteGlobalReviewPhrase,
  subscribeReviewTemplates,
  createReviewTemplate,
  updateReviewTemplate,
  deleteReviewTemplate,
  subscribeFeedbackQuestions,
  createFeedbackQuestion,
  updateFeedbackQuestion,
  deleteFeedbackQuestion,
  subscribeCTAMessages,
  createCTAMessage,
  updateCTAMessage,
  deleteCTAMessage
} from '../../services/firestoreService';
import { generateDeterministicReview } from '../../utils/reviewGenerator';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';

export type ContentStudioTab = 'phrases' | 'templates' | 'questions' | 'cta' | 'preview';

export const ContentStudioView: React.FC = () => {
  const { user, profile } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<ContentStudioTab>('phrases');

  // Phrases state
  const [phrases, setPhrases] = useState<ReviewPhrase[]>([]);
  const [phraseCategoryFilter, setPhraseCategoryFilter] = useState<string>('all');
  const [phraseSearch, setPhraseSearch] = useState('');
  const [phraseModalOpen, setPhraseModalOpen] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState<ReviewPhrase | null>(null);
  const [phraseForm, setPhraseForm] = useState({
    text: '',
    category: 'food' as ReviewPhraseCategory,
    active: true,
    sortOrder: 1,
    sentiment: 'positive' as 'positive' | 'neutral' | 'constructive',
  });

  // Templates state
  const [templates, setTemplates] = useState<ReviewTemplate[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReviewTemplate | null>(null);
  const [templateForm, setTemplateForm] = useState({
    title: '',
    templateText: '{food}. {service}. {ambience}. Would definitely recommend!',
    placeholders: ['{food}', '{service}', '{ambience}'],
    active: true,
    sortOrder: 1,
  });

  // Questions state
  const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<FeedbackQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState({
    text: '',
    category: 'overall' as ReviewPhraseCategory,
    active: true,
    sortOrder: 1,
  });

  // CTA Messages state
  const [ctaMessages, setCtaMessages] = useState<CTAMessage[]>([]);
  const [ctaModalOpen, setCtaModalOpen] = useState(false);
  const [editingCta, setEditingCta] = useState<CTAMessage | null>(null);
  const [ctaForm, setCtaForm] = useState({
    text: '',
    placement: 'menu_bottom' as CTAMessage['placement'],
    active: true,
    version: 1,
  });

  // Sandbox State
  const [sandboxSelectedPhrases, setSandboxSelectedPhrases] = useState<string[]>([]);
  const [sandboxRating, setSandboxRating] = useState<number>(5);
  const [sandboxGeneratedText, setSandboxGeneratedText] = useState<string>('');
  const [copiedSandbox, setCopiedSandbox] = useState(false);

  // Subscriptions
  useEffect(() => {
    const unsubP = subscribeGlobalReviewLibrary(setPhrases);
    const unsubT = subscribeReviewTemplates(setTemplates);
    const unsubQ = subscribeFeedbackQuestions(setQuestions);
    const unsubC = subscribeCTAMessages(setCtaMessages);
    return () => {
      unsubP();
      unsubT();
      unsubQ();
      unsubC();
    };
  }, []);

  // Admin audit info helper
  const adminInfo = {
    id: user?.uid || 'super_admin',
    email: user?.email || 'admin@menuestro.com',
    name: profile?.name || 'Administrator',
  };

  // PHRASE HANDLERS
  const handleSavePhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPhrase) {
        await updateGlobalReviewPhrase(editingPhrase.id, phraseForm, adminInfo);
        addToast('Review phrase updated', 'success');
      } else {
        await createGlobalReviewPhrase(phraseForm, adminInfo);
        addToast('Review phrase added to global library', 'success');
      }
      setPhraseModalOpen(false);
      setEditingPhrase(null);
    } catch {
      addToast('Failed to save phrase', 'error');
    }
  };

  const handleDeletePhrase = async (phraseId: string) => {
    if (!confirm('Are you sure you want to delete this global review phrase?')) return;
    try {
      await deleteGlobalReviewPhrase(phraseId, adminInfo);
      addToast('Review phrase deleted', 'info');
    } catch {
      addToast('Failed to delete phrase', 'error');
    }
  };

  // TEMPLATE HANDLERS
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const matches = templateForm.templateText.match(/\{[a-zA-Z0-9_]+\}/g) || [];
      const distinctPlaceholders = Array.from(new Set(matches));

      const payload = {
        ...templateForm,
        placeholders: distinctPlaceholders,
        status: (templateForm.active ? 'active' : 'disabled') as any,
        version: editingTemplate?.version ? editingTemplate.version + 1 : 1,
      };

      if (editingTemplate) {
        await updateReviewTemplate(editingTemplate.id, payload, adminInfo);
        addToast('Review template updated', 'success');
      } else {
        await createReviewTemplate(payload, adminInfo);
        addToast('Review template created', 'success');
      }
      setTemplateModalOpen(false);
      setEditingTemplate(null);
    } catch {
      addToast('Failed to save template', 'error');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteReviewTemplate(templateId, adminInfo);
      addToast('Template deleted', 'info');
    } catch {
      addToast('Failed to delete template', 'error');
    }
  };

  // QUESTION HANDLERS
  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingQuestion) {
        await updateFeedbackQuestion(editingQuestion.id, questionForm, adminInfo);
        addToast('Question updated', 'success');
      } else {
        await createFeedbackQuestion(questionForm, adminInfo);
        addToast('Feedback question added', 'success');
      }
      setQuestionModalOpen(false);
      setEditingQuestion(null);
    } catch {
      addToast('Failed to save question', 'error');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await deleteFeedbackQuestion(questionId, adminInfo);
      addToast('Question deleted', 'info');
    } catch {
      addToast('Failed to delete question', 'error');
    }
  };

  // CTA HANDLERS
  const handleSaveCta = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCta) {
        await updateCTAMessage(editingCta.id, ctaForm, adminInfo);
        addToast('CTA banner updated', 'success');
      } else {
        await createCTAMessage(ctaForm, adminInfo);
        addToast('CTA banner created', 'success');
      }
      setCtaModalOpen(false);
      setEditingCta(null);
    } catch {
      addToast('Failed to save CTA banner', 'error');
    }
  };

  const handleDeleteCta = async (ctaId: string) => {
    if (!confirm('Are you sure you want to delete this CTA message?')) return;
    try {
      await deleteCTAMessage(ctaId, adminInfo);
      addToast('CTA deleted', 'info');
    } catch {
      addToast('Failed to delete CTA', 'error');
    }
  };

  // Sandbox trigger
  const runSandboxGeneration = () => {
    const selectedObjects = phrases.filter((p) => sandboxSelectedPhrases.includes(p.id));
    const result = generateDeterministicReview({
      rating: sandboxRating,
      selectedPhrases: selectedObjects,
      restaurantName: 'The Artisan Bistro',
      templates,
    });
    setSandboxGeneratedText(result);
  };

  const filteredPhrases = phrases.filter((p) => {
    const matchesCategory = phraseCategoryFilter === 'all' || p.category === phraseCategoryFilter;
    const matchesSearch = p.text.toLowerCase().includes(phraseSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#078A55]" />
            Content Studio
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Manage global review phrases, templates, and feedback prompts used by customer review assistants.
          </p>
        </div>
      </div>

      {/* Main Tabs Header */}
      <div className="flex items-center space-x-1 border-b border-slate-200 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('phrases')}
          className={`flex items-center space-x-2 px-4 py-2.5 font-medium whitespace-nowrap border-b-2 transition ${
            activeTab === 'phrases'
              ? 'border-[#078A55] text-[#078A55] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Review Phrases ({phrases.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center space-x-2 px-4 py-2.5 font-medium whitespace-nowrap border-b-2 transition ${
            activeTab === 'templates'
              ? 'border-[#078A55] text-[#078A55] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Review Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center space-x-2 px-4 py-2.5 font-medium whitespace-nowrap border-b-2 transition ${
            activeTab === 'questions'
              ? 'border-[#078A55] text-[#078A55] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Feedback Prompts ({questions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('cta')}
          className={`flex items-center space-x-2 px-4 py-2.5 font-medium whitespace-nowrap border-b-2 transition ${
            activeTab === 'cta'
              ? 'border-[#078A55] text-[#078A55] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>CTA Banners ({ctaMessages.length})</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('preview');
            runSandboxGeneration();
          }}
          className={`flex items-center space-x-2 px-4 py-2.5 font-medium whitespace-nowrap border-b-2 transition ${
            activeTab === 'preview'
              ? 'border-[#078A55] text-[#078A55] font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Review Engine Preview</span>
        </button>
      </div>

      {/* 1. REVIEW PHRASES TAB */}
      {activeTab === 'phrases' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search phrases..."
                  value={phraseSearch}
                  onChange={(e) => setPhraseSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#078A55]"
                />
              </div>

              <button
                onClick={() => {
                  setEditingPhrase(null);
                  setPhraseForm({
                    text: '',
                    category: 'food',
                    active: true,
                    sortOrder: phrases.length + 1,
                    sentiment: 'positive',
                  });
                  setPhraseModalOpen(true);
                }}
                className="px-3.5 py-2 bg-[#078A55] hover:bg-[#067347] text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-xs transition self-stretch sm:self-auto flex-shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Phrase</span>
              </button>
            </div>

            {/* Category pills row with horizontal scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-slate-100 pt-2.5">
              {['all', 'overall', 'food', 'service', 'ambience', 'value', 'general'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPhraseCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize whitespace-nowrap transition flex-shrink-0 ${
                    phraseCategoryFilter === cat
                      ? 'bg-[#078A55] text-white shadow-xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredPhrases.map((phrase) => (
              <div
                key={phrase.id}
                className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase text-slate-500">
                      {phrase.category}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        phrase.active !== false && phrase.status !== 'disabled'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {phrase.active !== false && phrase.status !== 'disabled' ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-800">"{phrase.text}"</p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
                  <span className="text-[11px]">Order #{phrase.sortOrder || 1}</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingPhrase(phrase);
                        setPhraseForm({
                          text: phrase.text,
                          category: phrase.category,
                          active: phrase.active !== false,
                          sortOrder: phrase.sortOrder || 1,
                          sentiment: phrase.sentiment || 'positive',
                        });
                        setPhraseModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-md"
                      title="Edit Phrase"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePhrase(phrase.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-md"
                      title="Delete Phrase"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. REVIEW TEMPLATES TAB */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Review Construction Templates</h3>
              <p className="text-xs text-slate-500">
                Templates assemble diner-selected phrases into natural review paragraphs.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingTemplate(null);
                setTemplateForm({
                  title: '',
                  templateText: '{food}. {service}. {ambience}. Would definitely recommend!',
                  placeholders: ['{food}', '{service}', '{ambience}'],
                  active: true,
                  sortOrder: templates.length + 1,
                });
                setTemplateModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#078A55] hover:bg-[#067347] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-900">{tpl.title || 'Untitled Template'}</h4>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        tpl.active !== false && tpl.status !== 'disabled'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {tpl.active !== false && tpl.status !== 'disabled' ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono leading-relaxed">
                    {tpl.templateText}
                  </p>
                  <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                    {tpl.placeholders?.map((p) => (
                      <span key={p} className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
                  <span className="text-[11px]">Order #{tpl.sortOrder || 1}</span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => {
                        setEditingTemplate(tpl);
                        setTemplateForm({
                          title: tpl.title || '',
                          templateText: tpl.templateText,
                          placeholders: tpl.placeholders || [],
                          active: tpl.active !== false && tpl.status !== 'disabled',
                          sortOrder: tpl.sortOrder || 1,
                        });
                        setTemplateModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-md"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-md"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. FEEDBACK QUESTIONS TAB */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Feedback Prompts</h3>
              <p className="text-xs text-slate-500">
                Step-by-step questions presented to diners in the Review Assistant.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingQuestion(null);
                setQuestionForm({
                  text: '',
                  category: 'overall',
                  active: true,
                  sortOrder: questions.length + 1,
                });
                setQuestionModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#078A55] hover:bg-[#067347] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs divide-y divide-slate-100">
            {questions.map((q) => (
              <div key={q.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                    {q.sortOrder || 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{q.text}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{q.category} category</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      q.active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {q.active !== false ? 'Active' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => {
                      setEditingQuestion(q);
                      setQuestionForm({
                        text: q.text,
                        category: q.category,
                        active: q.active !== false,
                        sortOrder: q.sortOrder || 1,
                      });
                      setQuestionModalOpen(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-md"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. CTA MESSAGES TAB */}
      {activeTab === 'cta' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Review CTA Banners</h3>
              <p className="text-xs text-slate-500">
                Call-to-action messages shown on the digital menu to invite guests to review.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCta(null);
                setCtaForm({
                  text: '',
                  placement: 'menu_bottom',
                  active: true,
                  version: 1,
                });
                setCtaModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-[#078A55] hover:bg-[#067347] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add CTA Banner</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs divide-y divide-slate-100">
            {ctaMessages.map((cta) => (
              <div key={cta.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition">
                <div className="flex items-center space-x-3">
                  <Megaphone className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{cta.text}</p>
                    <p className="text-[11px] text-slate-500">Placement: {cta.placement}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      cta.active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {cta.active !== false ? 'Active' : 'Disabled'}
                  </span>
                  <button
                    onClick={() => {
                      setEditingCta(cta);
                      setCtaForm({
                        text: cta.text,
                        placement: cta.placement,
                        active: cta.active !== false,
                        version: cta.version || 1,
                      });
                      setCtaModalOpen(true);
                    }}
                    className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-md"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCta(cta.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. REVIEW ENGINE PREVIEW TAB */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200/90 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Review Generation Sandbox
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Test how selected phrases combine with templates to generate realistic, authentic reviews.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Select Phrases for Test:
                </label>
                <div className="max-h-60 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  {phrases.map((p) => {
                    const isSelected = sandboxSelectedPhrases.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSandboxSelectedPhrases((prev) => prev.filter((id) => id !== p.id));
                          } else {
                            setSandboxSelectedPhrases((prev) => [...prev, p.id]);
                          }
                        }}
                        className={`w-full text-left p-2 rounded-md text-xs transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="truncate">{p.text}</span>
                        <span className="text-[10px] text-slate-400 capitalize ml-2">{p.category}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-600 font-medium">Rating:</span>
                    <select
                      value={sandboxRating}
                      onChange={(e) => setSandboxRating(Number(e.target.value))}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1"
                    >
                      <option value={5}>5 Stars ★★★★★</option>
                      <option value={4}>4 Stars ★★★★☆</option>
                      <option value={3}>3 Stars ★★★☆☆</option>
                    </select>
                  </div>

                  <button
                    onClick={runSandboxGeneration}
                    className="px-3.5 py-1.5 bg-[#078A55] hover:bg-[#067347] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Generate Review</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Generated Output:
                </label>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 min-h-36 text-xs text-slate-800 leading-relaxed font-sans flex flex-col justify-between">
                  <div>
                    {sandboxGeneratedText ? (
                      <p>"{sandboxGeneratedText}"</p>
                    ) : (
                      <p className="text-slate-400 italic">Select phrases on the left and click Generate Review.</p>
                    )}
                  </div>

                  {sandboxGeneratedText && (
                    <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(sandboxGeneratedText);
                          setCopiedSandbox(true);
                          setTimeout(() => setCopiedSandbox(false), 2000);
                        }}
                        className="text-xs text-[#078A55] hover:text-[#067347] font-medium flex items-center gap-1"
                      >
                        {copiedSandbox ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSandbox ? 'Copied' : 'Copy Output'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PHRASE MODAL */}
      {phraseModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingPhrase ? 'Edit Review Phrase' : 'Add Review Phrase'}
              </h3>
              <button
                onClick={() => setPhraseModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSavePhrase} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Phrase Text *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The crispy butter naan was fresh and piping hot."
                  value={phraseForm.text}
                  onChange={(e) => setPhraseForm({ ...phraseForm, text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={phraseForm.category}
                    onChange={(e) => setPhraseForm({ ...phraseForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none capitalize"
                  >
                    {['food', 'service', 'ambience', 'value', 'overall', 'general'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={phraseForm.sortOrder}
                    onChange={(e) => setPhraseForm({ ...phraseForm, sortOrder: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="phraseActive"
                  checked={phraseForm.active}
                  onChange={(e) => setPhraseForm({ ...phraseForm, active: e.target.checked })}
                  className="rounded text-[#078A55] focus:ring-[#078A55]"
                />
                <label htmlFor="phraseActive" className="text-slate-700 font-medium">
                  Active in diner selection lists
                </label>
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setPhraseModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#078A55] hover:bg-[#067347] text-white rounded-lg font-medium shadow-xs"
                >
                  Save Phrase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEMPLATE MODAL */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingTemplate ? 'Edit Review Template' : 'Add Review Template'}
              </h3>
              <button
                onClick={() => setTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveTemplate} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Template Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Standard 3-Point Dining Experience"
                  value={templateForm.title}
                  onChange={(e) => setTemplateForm({ ...templateForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Template Text (Use {'{food}'}, {'{service}'}, {'{ambience}'}, {'{value}'})
                </label>
                <textarea
                  rows={3}
                  required
                  value={templateForm.templateText}
                  onChange={(e) => setTemplateForm({ ...templateForm, templateText: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="templateActive"
                  checked={templateForm.active}
                  onChange={(e) => setTemplateForm({ ...templateForm, active: e.target.checked })}
                  className="rounded text-[#078A55] focus:ring-[#078A55]"
                />
                <label htmlFor="templateActive" className="text-slate-700 font-medium">
                  Active for compilation
                </label>
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setTemplateModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#078A55] hover:bg-[#067347] text-white rounded-lg font-medium shadow-xs"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUESTION MODAL */}
      {questionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingQuestion ? 'Edit Question' : 'Add Feedback Question'}
              </h3>
              <button
                onClick={() => setQuestionModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveQuestion} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Question Text</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How was the food and flavour?"
                  value={questionForm.text}
                  onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={questionForm.category}
                  onChange={(e) => setQuestionForm({ ...questionForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none capitalize"
                >
                  {['overall', 'food', 'service', 'ambience', 'value', 'general'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setQuestionModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#078A55] hover:bg-[#067347] text-white rounded-lg font-medium shadow-xs"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CTA MODAL */}
      {ctaModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingCta ? 'Edit CTA Banner' : 'Add CTA Banner'}
              </h3>
              <button
                onClick={() => setCtaModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveCta} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Banner Text</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Enjoying your meal? Share your experience on Google!"
                  value={ctaForm.text}
                  onChange={(e) => setCtaForm({ ...ctaForm, text: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:border-[#078A55] focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setCtaModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#078A55] hover:bg-[#067347] text-white rounded-lg font-medium shadow-xs"
                >
                  Save CTA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
