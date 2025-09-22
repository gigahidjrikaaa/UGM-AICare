'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useModalA11y } from '@/hooks/useModalA11y';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiToggleLeft, FiToggleRight, FiExternalLink, FiBarChart2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { surveyApi, Survey, SurveyResponse, SurveyQuestionDraft as ServiceQuestionDraft } from '@/services/surveyApi';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
// Select component no longer used after extracting QuestionListEditor
import { Textarea } from '@/components/ui/TextArea';
import Tooltip from '@/components/ui/Tooltip';
import { QuestionListEditor } from '@/components/surveys/QuestionListEditor';
import { TextQuestionDraft, MultipleChoiceQuestionDraft, RatingQuestionDraft, QuestionDraft, createEmptyQuestion } from '@/types/surveys';

// Draft & response types now come from surveyApi service (transformed to union locally)

interface NewSurveyState { title: string; description: string; questions: QuestionDraft[] }
type QuestionErrorMap = Record<number, string | undefined>;

const toServiceDraft = (q: QuestionDraft): ServiceQuestionDraft => {
  if (q.question_type === 'rating') return { id: q.id, question_text: q.question_text, question_type: 'rating', options: { scale: { ...q.options.scale } } };
  if (q.question_type === 'multiple-choice') return { id: q.id, question_text: q.question_text, question_type: 'multiple-choice', options: [...q.options] };
  return { id: q.id, question_text: q.question_text, question_type: 'text', options: [] };
};

export default function SurveyManagementPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [surveyResults, setSurveyResults] = useState<SurveyResponse[]>([]);
  const [newSurvey, setNewSurvey] = useState<NewSurveyState>({
    title: '',
    description: '',
    questions: [createEmptyQuestion()]
  });
  const [optionInputs, setOptionInputs] = useState<string[]>(['']);
  const [createErrors, setCreateErrors] = useState<QuestionErrorMap>({});
  // Edit modal question state
  const [editQuestions, setEditQuestions] = useState<QuestionDraft[]>([]);
  const [editOptionInputs, setEditOptionInputs] = useState<string[]>([]);
  const [editErrors, setEditErrors] = useState<QuestionErrorMap>({});
  // Search + pagination
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  // Modal a11y refs (generic HTMLElement for hook compatibility)
  const createModalRef = useRef<HTMLDivElement>(null);
  const editModalRef = useRef<HTMLDivElement>(null);
  const resultsModalRef = useRef<HTMLDivElement>(null);

  const fetchSurveys = useCallback(async () => {
    try {
      const data = await surveyApi.list();
      setSurveys(data);
    } catch (error) {
      const err = surveyApi.normalizeError(error, 'Failed to load surveys');
      console.error('Error fetching surveys:', error);
      toast.error(`Load failed: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);

  const handleCreateModalOpen = () => setIsCreateModalOpen(true);
  const handleCreateModalClose = () => setIsCreateModalOpen(false);

  const handleEditModalOpen = (survey: Survey) => {
    setSelectedSurvey(survey);
    setIsEditModalOpen(true);
    const cloned: QuestionDraft[] = survey.questions.map(q => {
      if (q.question_type === 'text') {
        return { id: q.id, question_text: q.question_text, question_type: 'text', options: [] };
      }
      if (q.question_type === 'multiple-choice') {
        return { id: q.id, question_text: q.question_text, question_type: 'multiple-choice', options: Array.isArray(q.options) ? [...q.options] : [] };
      }
      const raw = q.options as { scale?: { min?: number; max?: number } } | undefined;
      const min = raw?.scale?.min ?? 1;
      const max = raw?.scale?.max ?? 5;
      return { id: q.id, question_text: q.question_text, question_type: 'rating', options: { scale: { min, max } } };
    });
    setEditQuestions(cloned);
    setEditOptionInputs(new Array(cloned.length).fill(''));
  };
  const handleEditModalClose = () => {
    setSelectedSurvey(null);
    setIsEditModalOpen(false);
  };

  const handleResultsModalOpen = async (surveyId: number) => {
    try {
      const data = await surveyApi.responses(surveyId);
      setSurveyResults(data);
      setIsResultsModalOpen(true);
    } catch (error) {
      const err = surveyApi.normalizeError(error, 'Failed to load survey results');
      console.error('Error fetching survey results:', error);
      toast.error(`Results failed: ${err.message}`);
    }
  };
  const handleResultsModalClose = () => setIsResultsModalOpen(false);

  // Invoke modal accessibility hook AFTER handlers are defined
  useModalA11y(isCreateModalOpen, createModalRef, handleCreateModalClose);
  useModalA11y(isEditModalOpen, editModalRef, handleEditModalClose);
  useModalA11y(isResultsModalOpen, resultsModalRef, handleResultsModalClose);

  const handleNewSurveyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewSurvey((prev) => ({ ...prev, [name]: value }));
  };

  // handleNewQuestionChange removed; handled via <QuestionListEditor />

  const handleAddQuestion = () => {
    setNewSurvey((prev) => ({
      ...prev,
      questions: [...prev.questions, { question_text: '', question_type: 'text', options: [] }]
    }));
    setOptionInputs((prev) => [...prev, '']);
    setCreateErrors(prev => ({ ...prev, [newSurvey.questions.length]: 'Question text is required' }));
  };

  const handleRemoveQuestion = (index: number) => {
    const questions = [...newSurvey.questions];
    questions.splice(index, 1);
    setNewSurvey((prev) => ({ ...prev, questions }));
    setOptionInputs(prev => prev.filter((_, i) => i !== index));
    setCreateErrors(prev => {
      const clone = { ...prev }; delete clone[index];
      const remapped: QuestionErrorMap = {};
      questions.forEach((_, i) => { if (clone[i]) remapped[i] = clone[i]; });
      return remapped;
    });
  };

  // Create modal: option handlers
  const handleOptionInputChange = (index: number, value: string) => {
    setOptionInputs(prev => prev.map((v, i) => (i === index ? value : v)));
  };

  const handleAddOption = (index: number) => {
    const value = (optionInputs[index] || '').trim();
    if (!value) return;
    const questions = [...newSurvey.questions];
    const opts = Array.isArray(questions[index].options) ? [...(questions[index].options as string[])] : [];
    if (!opts.includes(value)) opts.push(value);
    questions[index].options = opts;
    setNewSurvey(prev => ({ ...prev, questions }));
    handleOptionInputChange(index, '');
  };

  const handleRemoveOption = (qIdx: number, optValue: string) => {
    const questions = [...newSurvey.questions];
    const opts = Array.isArray(questions[qIdx].options) ? (questions[qIdx].options as string[]).filter(o => o !== optValue) : [];
    questions[qIdx].options = opts;
    setNewSurvey(prev => ({ ...prev, questions }));
  };

  // Rating scale handled inside QuestionListEditor component

  const validateQuestion = (q: QuestionDraft): string | undefined => {
    if (!q.question_text.trim()) return 'Question text is required';
    if (q.question_type === 'multiple-choice' && q.options.length < 2) return 'At least 2 options required';
    if (q.question_type === 'rating') {
      const { min, max } = q.options.scale;
      if (!(Number.isFinite(min) && Number.isFinite(max) && min < max)) return 'Rating scale invalid';
    }
    return undefined;
  };

  const handleCreateSurvey = async () => {
    const errors: QuestionErrorMap = {};
    newSurvey.questions.forEach((q, i) => { const err = validateQuestion(q); if (err) errors[i] = err; });
    setCreateErrors(errors);
    if (Object.values(errors).some(Boolean)) { toast.error('Fix validation errors'); return; }
    const tempId = Math.random();
    const optimistic: Survey = { id: tempId, title: newSurvey.title, description: newSurvey.description, is_active: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), questions: [] };
    setSurveys(prev => [optimistic, ...prev]);
    try {
      const created = await surveyApi.create({ title: newSurvey.title, description: newSurvey.description, questions: newSurvey.questions.map(toServiceDraft) });
      setSurveys(prev => prev.map(s => s.id === tempId ? created : s));
      toast.success('Survey created');
      handleCreateModalClose();
      setNewSurvey({ title: '', description: '', questions: [createEmptyQuestion()] });
      setOptionInputs(['']);
      setCreateErrors({});
    } catch (error) {
      setSurveys(prev => prev.filter(s => s.id !== tempId));
      console.error('Error creating survey:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create survey');
    }
  };

  const handleUpdateSurvey = async () => {
    if (!selectedSurvey) return;
    const errors: QuestionErrorMap = {};
    editQuestions.forEach((q, i) => { const err = validateQuestion(q); if (err) errors[i] = err; });
    setEditErrors(errors);
    if (Object.values(errors).some(Boolean)) { toast.error('Fix validation errors'); return; }
    const original = selectedSurvey;
    setSurveys(prev => prev.map(s => s.id === original.id ? { ...s, title: original.title, description: original.description, updated_at: new Date().toISOString() } : s));
    try {
      await surveyApi.updateMeta(original.id, { title: original.title, description: original.description, is_active: original.is_active });
      await surveyApi.bulkUpsertQuestions(original.id, editQuestions.map(toServiceDraft));
      toast.success('Survey updated');
      handleEditModalClose();
      setEditErrors({});
    } catch (error) {
      console.error('Error updating survey:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update survey');
      fetchSurveys();
    }
  };

  // Edit modal question handlers
  // handleEditQuestionChange removed; handled via <QuestionListEditor />

  const handleEditAddQuestion = () => {
    setEditQuestions(prev => [...prev, { question_text: '', question_type: 'text', options: [] }]);
    setEditOptionInputs(prev => [...prev, '']);
    setEditErrors(prev => ({ ...prev, [editQuestions.length]: 'Question text is required' }));
  };

  const handleEditRemoveQuestion = (index: number) => {
    setEditQuestions(prev => prev.filter((_, i) => i !== index));
    setEditOptionInputs(prev => prev.filter((_, i) => i !== index));
    setEditErrors(prev => {
      const clone = { ...prev }; delete clone[index];
      const remapped: QuestionErrorMap = {};
      const remaining = editQuestions.filter((_, i) => i !== index);
      remaining.forEach((_, i) => { if (clone[i]) remapped[i] = clone[i]; });
      return remapped;
    });
  };

  const handleEditOptionInputChange = (index: number, value: string) => {
    setEditOptionInputs(prev => prev.map((v, i) => (i === index ? value : v)));
  };

  const handleEditAddOption = (index: number) => {
    const value = (editOptionInputs[index] || '').trim();
    if (!value) return;
    setEditQuestions(prev => prev.map((q, i) => {
      if (i !== index) return q;
      if (q.question_type !== 'multiple-choice') return q;
      const opts = [...q.options];
      if (!opts.includes(value)) opts.push(value);
      return { ...q, options: opts } as MultipleChoiceQuestionDraft;
    }));
    handleEditOptionInputChange(index, '');
  };

  const handleEditRemoveOption = (qIdx: number, optValue: string) => {
    setEditQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      if (q.question_type !== 'multiple-choice') return q;
      const opts = q.options.filter(o => o !== optValue);
      return { ...q, options: opts } as MultipleChoiceQuestionDraft;
    }));
  };

  // Edit rating scale handled inside QuestionListEditor component

  // Derived lists for search and pagination
  const filtered = surveys.filter(s => (
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  ));
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(start, start + ITEMS_PER_PAGE);

  const handleDeleteSurvey = async (surveyId: number) => {
    if (!confirm('Delete this survey permanently?')) return;
    const previous = surveys;
    setSurveys(s => s.filter(sv => sv.id !== surveyId));
    try {
      await surveyApi.remove(surveyId);
      toast.success('Survey deleted');
    } catch (error) {
      setSurveys(previous);
      const err = surveyApi.normalizeError(error, 'Failed to delete survey');
      console.error('Error deleting survey:', error);
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const handleToggleSurveyActive = async (survey: Survey) => {
    const previous = surveys;
    const next = !survey.is_active;
    setSurveys(s => s.map(sv => sv.id === survey.id ? { ...sv, is_active: next } : sv));
    try {
      await surveyApi.toggleActive(survey.id, next);
      toast.success(`Survey ${next ? 'activated' : 'deactivated'}`);
    } catch (error) {
      setSurveys(previous);
      const err = surveyApi.normalizeError(error, 'Failed to update status');
      console.error('Error toggling survey status:', error);
      toast.error(`Status update failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Survey Management</h1>
          <p className="text-sm text-gray-300">Create, edit, and review surveys shared with students.</p>
        </div>
        <Button onClick={handleCreateModalOpen} variant="primaryGold" className="inline-flex items-center">
          <FiPlus className="h-4 w-4 mr-2" />
          Create Survey
        </Button>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
        <div className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search surveys by title or description..."
              className="w-full px-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/20">
            <thead className="bg-white/5">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-white/20">
              {paginated.map((survey) => (
                <tr key={survey.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{survey.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{survey.description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {survey.is_active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Tooltip title={survey.is_active ? 'Deactivate survey' : 'Activate survey'}>
                      <button
                        onClick={() => handleToggleSurveyActive(survey)}
                        className={`mr-4 transition-colors ${survey.is_active ? 'text-green-400 hover:text-green-300' : 'text-gray-400 hover:text-gray-300'}`}
                      >
                        {survey.is_active ? <FiToggleRight className="h-5 w-5" /> : <FiToggleLeft className="h-5 w-5" />}
                      </button>
                    </Tooltip>
                    <Tooltip title="View responses">
                      <button aria-label="View survey responses" title="View responses" onClick={() => handleResultsModalOpen(survey.id)} className="text-white hover:text-gray-300 transition-colors mr-4">
                        <FiEye className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip title="Edit survey (modal)">
                      <button aria-label="Edit survey" title="Edit survey" onClick={() => handleEditModalOpen(survey)} className="text-blue-400 hover:text-blue-300 transition-colors mr-4">
                        <FiEdit className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip title="Open full editor">
                      <button aria-label="Open full editor" title="Open full editor" onClick={() => window.location.assign(`/admin/surveys/${survey.id}/edit`)} className="text-blue-300 hover:text-blue-200 transition-colors mr-4">
                        <FiExternalLink className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip title="Analytics">
                      <button aria-label="Analytics" title="Analytics" onClick={() => window.location.assign(`/admin/surveys/${survey.id}/analytics`)} className="text-yellow-300 hover:text-yellow-200 transition-colors mr-4">
                        <FiBarChart2 className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip title="Delete survey">
                      <button aria-label="Delete survey" title="Delete survey" onClick={() => handleDeleteSurvey(survey.id)} className="text-red-400 hover:text-red-300 transition-colors">
                        <FiTrash2 className="h-4 w-4" />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination controls */}
        <div className="p-4 flex items-center justify-center gap-2">
          <Button variant="outline" className="text-white" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Previous</Button>
          <span className="text-sm text-gray-300">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" className="text-white" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Next</Button>
        </div>
      </div>

      <AnimatePresence>
        {isCreateModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={handleCreateModalClose}
            role="presentation"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-survey-title"
              ref={createModalRef}
              tabIndex={-1}
            >
              <div className="px-6 py-4 border-b border-white/20">
                <h3 id="create-survey-title" className="text-lg font-medium text-white">Create New Survey</h3>
              </div>
              <div className="p-6 space-y-4">
                <Input
                  name="title"
                  label="Title"
                  value={newSurvey.title}
                  onChange={handleNewSurveyChange}
                  required
                  className="w-full pl-3 pr-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm"
                />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-300">Description</label>
                  <Textarea
                    name="description"
                    value={newSurvey.description}
                    onChange={handleNewSurveyChange}
                    className="w-full min-h-[120px] p-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <h4 className="text-md font-medium text-white mb-2">Questions</h4>
                  <QuestionListEditor
                    questions={newSurvey.questions}
                    optionInputs={optionInputs}
                    errors={createErrors}
                    mode="create"
                    onQuestionsChange={(updated) => {
                      setNewSurvey(prev => ({
                        ...prev,
                        questions: updated.map(q => {
                          if (q.question_type === 'text') return { question_text: q.question_text, question_type: 'text', options: [] } as TextQuestionDraft;
                          if (q.question_type === 'multiple-choice') return { question_text: q.question_text, question_type: 'multiple-choice', options: [...q.options] } as MultipleChoiceQuestionDraft;
                          return { question_text: q.question_text, question_type: 'rating', options: { scale: { ...q.options.scale } } } as RatingQuestionDraft;
                        })
                      }));
                      setCreateErrors(() => {
                        const errs: QuestionErrorMap = {};
                        updated.forEach((q,i)=>{ if(!q.question_text.trim()) errs[i] = 'Question text is required'; });
                        return errs;
                      });
                    }}
                    onOptionInputsChange={setOptionInputs}
                    onAddQuestion={handleAddQuestion}
                    onRemoveQuestion={handleRemoveQuestion}
                    onAddOption={handleAddOption}
                    onRemoveOption={handleRemoveOption}
                    // rating scale handled internally
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-white/20 flex justify-end space-x-3">
                <Button onClick={handleCreateModalClose} type="button" variant="outline" className="text-white">Cancel</Button>
                <Button onClick={handleCreateSurvey} type="button" variant="primaryGold">Create</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEditModalOpen && selectedSurvey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={handleEditModalClose}
            role="presentation"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-survey-title"
              ref={editModalRef}
              tabIndex={-1}
            >
              <div className="px-6 py-4 border-b border-white/20">
                <h3 id="edit-survey-title" className="text-lg font-medium text-white">Edit Survey</h3>
              </div>
              <div className="p-6 space-y-4">
                <Input
                  name="title"
                  label="Title"
                  value={selectedSurvey.title}
                  onChange={(e) => setSelectedSurvey({ ...selectedSurvey, title: e.target.value })}
                  required
                  className="w-full pl-3 pr-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm"
                />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-300">Description</label>
                  <Textarea
                    value={selectedSurvey.description || ''}
                    onChange={(e) => setSelectedSurvey({ ...selectedSurvey, description: e.target.value })}
                    className="w-full min-h-[120px] p-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm"
                  />
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedSurvey.is_active}
                      onChange={(e) => setSelectedSurvey({ ...selectedSurvey, is_active: e.target.checked })}
                      className="h-4 w-4 text-[#FFCA40] focus:ring-[#FFCA40] bg-white/10 border-white/20 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-300">Active</span>
                  </label>
                </div>
                <div>
                  <h4 className="text-md font-medium text-white mb-2">Questions</h4>
                  <QuestionListEditor
                    questions={editQuestions}
                    optionInputs={editOptionInputs}
                    errors={editErrors}
                    mode="edit"
                    onQuestionsChange={(updated) => {
                      setEditQuestions(updated.map(q => {
                        if (q.question_type === 'text') return { question_text: q.question_text, question_type: 'text', options: [], id: q.id } as TextQuestionDraft;
                        if (q.question_type === 'multiple-choice') return { question_text: q.question_text, question_type: 'multiple-choice', options: [...q.options], id: q.id } as MultipleChoiceQuestionDraft;
                        return { question_text: q.question_text, question_type: 'rating', options: { scale: { ...q.options.scale } }, id: q.id } as RatingQuestionDraft;
                      }));
                      setEditErrors(() => {
                        const errs: QuestionErrorMap = {};
                        updated.forEach((q,i)=>{ if(!q.question_text.trim()) errs[i] = 'Question text is required'; });
                        return errs;
                      });
                    }}
                    onOptionInputsChange={setEditOptionInputs}
                    onAddQuestion={handleEditAddQuestion}
                    onRemoveQuestion={handleEditRemoveQuestion}
                    onAddOption={handleEditAddOption}
                    onRemoveOption={handleEditRemoveOption}
                    // rating scale handled internally
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-white/20 flex justify-end space-x-3">
                <Button onClick={handleEditModalClose} type="button" variant="outline" className="text-white">Cancel</Button>
                <Button onClick={handleUpdateSurvey} type="button" variant="primaryGold">Update</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isResultsModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={handleResultsModalClose}
            role="presentation"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="results-survey-title"
              ref={resultsModalRef}
              tabIndex={-1}
            >
              <div className="px-6 py-4 border-b border-white/20">
                <h3 id="results-survey-title" className="text-lg font-medium text-white">Survey Results</h3>
              </div>
              <div className="p-6">
                {surveyResults.length > 0 ? (
                  <div className="space-y-4">
                    {surveyResults.map((response) => (
                      <div key={response.id} className="p-4 border border-white/20 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-medium text-white">User ID: {response.user_id}</p>
                          <p className="text-xs text-gray-400">{new Date(response.created_at).toLocaleString()}</p>
                        </div>
                        <div className="space-y-2">
                          {response.answers.map((answer) => (
                            <div key={answer.id}>
                              <p className="text-sm font-medium text-gray-300">{answer.question_text}</p>
                              <p className="text-sm text-white">{answer.answer_text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400">No results found for this survey.</p>
                )}
              </div>
              <div className="px-6 py-4 border-t border-white/20 flex justify-end">
                <Button onClick={handleResultsModalClose} type="button" variant="outline" className="text-white">Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
