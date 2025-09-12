'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiToggleLeft, FiToggleRight, FiExternalLink, FiBarChart2 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiCall } from '@/utils/adminApi';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Textarea } from '@/components/ui/TextArea';
import Tooltip from '@/components/ui/Tooltip';

interface SurveyQuestion {
  id: number;
  question_text: string;
  question_type: string;
  options: any; // can be array (multiple-choice) or object (rating scale)
}

interface Survey {
  id: number;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  questions: SurveyQuestion[];
}

export default function SurveyManagementPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [surveyResults, setSurveyResults] = useState<any[]>([]);
  const [newSurvey, setNewSurvey] = useState({
    title: '',
    description: '',
    questions: [{ question_text: '', question_type: 'text', options: [] }]
  });
  const [optionInputs, setOptionInputs] = useState<string[]>(['']);
  // Edit modal question state
  const [editQuestions, setEditQuestions] = useState<SurveyQuestion[]>([]);
  const [editOptionInputs, setEditOptionInputs] = useState<string[]>([]);
  // Search + pagination
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiCall<Survey[]>('/api/v1/admin/surveys');
      setSurveys(data);
    } catch (error) {
      console.error('Error fetching surveys:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load surveys');
    } finally {
      setLoading(false);
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
    const cloned = survey.questions.map(q => ({ ...q, options: q.options ? [...q.options] : [] }));
    setEditQuestions(cloned);
    setEditOptionInputs(new Array(cloned.length).fill(''));
  };
  const handleEditModalClose = () => {
    setSelectedSurvey(null);
    setIsEditModalOpen(false);
  };

  const handleResultsModalOpen = async (surveyId: number) => {
    try {
      const data = await apiCall<any[]>(`/api/v1/admin/surveys/${surveyId}/responses`);
      setSurveyResults(data);
      setIsResultsModalOpen(true);
    } catch (error) {
      console.error('Error fetching survey results:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load survey results');
    }
  };
  const handleResultsModalClose = () => setIsResultsModalOpen(false);

  const handleNewSurveyChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewSurvey((prev) => ({ ...prev, [name]: value }));
  };

  const handleNewQuestionChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const questions = [...newSurvey.questions];
    questions[index] = { ...questions[index], [name]: value };
    setNewSurvey((prev) => ({ ...prev, questions }));
  };

  const handleAddQuestion = () => {
    setNewSurvey((prev) => ({
      ...prev,
      questions: [...prev.questions, { question_text: '', question_type: 'text', options: [] }]
    }));
    setOptionInputs((prev) => [...prev, '']);
  };

  const handleRemoveQuestion = (index: number) => {
    const questions = [...newSurvey.questions];
    questions.splice(index, 1);
    setNewSurvey((prev) => ({ ...prev, questions }));
    setOptionInputs(prev => prev.filter((_, i) => i !== index));
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

  // Rating scale handlers (create modal)
  const setRatingScale = (index: number, key: 'min'|'max', value: number) => {
    const questions = [...newSurvey.questions];
    const cfg = (questions[index].options && typeof questions[index].options === 'object') ? questions[index].options : {};
    const scale = cfg.scale || {};
    scale[key] = value;
    cfg.scale = scale;
    questions[index].options = cfg;
    setNewSurvey(prev => ({ ...prev, questions }));
  };
  const getRatingScale = (q: any) => {
    const cfg = q.options && typeof q.options === 'object' ? q.options : {};
    const scale = cfg.scale || {};
    return { min: scale.min ?? 1, max: scale.max ?? 5 };
  };

  const handleCreateSurvey = async () => {
    try {
      // Validate multiple-choice questions
      for (const q of newSurvey.questions) {
        if (q.question_type === 'multiple-choice') {
          const opts = Array.isArray(q.options) ? q.options : [];
          if (opts.length < 2) {
            toast.error('Multiple-choice questions need at least 2 options.');
            return;
          }
        }
        if (q.question_type === 'rating') {
          const { min, max } = getRatingScale(q);
          if (!(Number.isFinite(min) && Number.isFinite(max) && min < max)) {
            toast.error('Rating questions need a valid scale (min < max).');
            return;
          }
        }
      }
      await apiCall('/api/v1/admin/surveys', {
        method: 'POST',
        body: JSON.stringify(newSurvey),
      });
      toast.success('Survey created successfully');
      handleCreateModalClose();
      fetchSurveys();
    } catch (error) {
      console.error('Error creating survey:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create survey');
    }
  };

  const handleUpdateSurvey = async () => {
    if (!selectedSurvey) return;
    try {
      // Validate edit questions
      for (const q of editQuestions) {
        if (q.question_type === 'multiple-choice') {
          const opts = Array.isArray(q.options) ? q.options : [];
          if (opts.length < 2) {
            toast.error('Multiple-choice questions need at least 2 options.');
            return;
          }
        }
        if (q.question_type === 'rating') {
          const cfg = q.options && typeof q.options === 'object' ? q.options : {};
          const scale = cfg.scale || {};
          const min = Number(scale.min ?? 1);
          const max = Number(scale.max ?? 5);
          if (!(Number.isFinite(min) && Number.isFinite(max) && min < max)) {
            toast.error('Rating questions need a valid scale (min < max).');
            return;
          }
        }
      }
      await apiCall(`/api/v1/admin/surveys/${selectedSurvey.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            title: selectedSurvey.title,
            description: selectedSurvey.description,
            is_active: selectedSurvey.is_active,
          }),
        }
      );
      // Bulk upsert questions
      await apiCall(`/api/v1/admin/surveys/${selectedSurvey.id}/questions/bulk`, {
        method: 'PUT',
        body: JSON.stringify(editQuestions.map(q => ({ id: q.id, question_text: q.question_text, question_type: q.question_type, options: q.options || [] })))
      });
      toast.success('Survey updated successfully');
      handleEditModalClose();
      fetchSurveys();
    } catch (error) {
      console.error('Error updating survey:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update survey');
    }
  };

  // Edit modal question handlers
  const handleEditQuestionChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditQuestions(prev => prev.map((q, i) => (i === index ? ({ ...q, [name]: value } as any) : q)));
  };

  const handleEditAddQuestion = () => {
    setEditQuestions(prev => [...prev, { id: undefined as any, question_text: '', question_type: 'text', options: [] } as any]);
    setEditOptionInputs(prev => [...prev, '']);
  };

  const handleEditRemoveQuestion = (index: number) => {
    setEditQuestions(prev => prev.filter((_, i) => i !== index));
    setEditOptionInputs(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditOptionInputChange = (index: number, value: string) => {
    setEditOptionInputs(prev => prev.map((v, i) => (i === index ? value : v)));
  };

  const handleEditAddOption = (index: number) => {
    const value = (editOptionInputs[index] || '').trim();
    if (!value) return;
    setEditQuestions(prev => prev.map((q, i) => {
      if (i !== index) return q;
      const opts = Array.isArray(q.options) ? [...q.options] : [];
      if (!opts.includes(value)) opts.push(value);
      return { ...q, options: opts } as any;
    }));
    handleEditOptionInputChange(index, '');
  };

  const handleEditRemoveOption = (qIdx: number, optValue: string) => {
    setEditQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = Array.isArray(q.options) ? q.options.filter(o => o !== optValue) : [];
      return { ...q, options: opts } as any;
    }));
  };

  const setEditRatingScale = (index: number, key: 'min'|'max', value: number) => {
    setEditQuestions(prev => prev.map((q, i) => {
      if (i !== index) return q;
      const cfg = q.options && typeof q.options === 'object' ? { ...q.options } : {};
      const scale = cfg.scale || {};
      scale[key] = value;
      cfg.scale = scale;
      return { ...q, options: cfg } as any;
    }));
  };
  const getEditRatingScale = (q: any) => {
    const cfg = q.options && typeof q.options === 'object' ? q.options : {};
    const scale = cfg.scale || {};
    return { min: scale.min ?? 1, max: scale.max ?? 5 };
  };

  // Derived lists for search and pagination
  const filtered = surveys.filter(s => (
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  ));
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(start, start + ITEMS_PER_PAGE);

  const handleDeleteSurvey = async (surveyId: number) => {
    if (!confirm('Are you sure you want to delete this survey?')) return;
    try {
      await apiCall(`/api/v1/admin/surveys/${surveyId}`, { method: 'DELETE' });
      toast.success('Survey deleted successfully');
      fetchSurveys();
    } catch (error) {
      console.error('Error deleting survey:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete survey');
    }
  };

  const handleToggleSurveyActive = async (survey: Survey) => {
    try {
      await apiCall(`/api/v1/admin/surveys/${survey.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({ is_active: !survey.is_active })
        }
      );
      toast.success(`Survey ${!survey.is_active ? 'activated' : 'deactivated'} successfully`);
      fetchSurveys();
    } catch (error) {
      console.error('Error toggling survey status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update survey status');
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
                      <button onClick={() => handleResultsModalOpen(survey.id)} className="text-white hover:text-gray-300 transition-colors mr-4">
                        <FiEye className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip title="Edit survey (modal)">
                      <button onClick={() => handleEditModalOpen(survey)} className="text-blue-400 hover:text-blue-300 transition-colors mr-4">
                        <FiEdit className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip title="Open full editor">
                      <button onClick={() => window.location.assign(`/admin/surveys/${survey.id}/edit`)} className="text-blue-300 hover:text-blue-200 transition-colors mr-4">
                        <FiExternalLink className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip title="Analytics">
                      <button onClick={() => window.location.assign(`/admin/surveys/${survey.id}/analytics`)} className="text-yellow-300 hover:text-yellow-200 transition-colors mr-4">
                        <FiBarChart2 className="h-4 w-4" />
                      </button>
                    </Tooltip>
                    <Tooltip title="Delete survey">
                      <button onClick={() => handleDeleteSurvey(survey.id)} className="text-red-400 hover:text-red-300 transition-colors">
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
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-white/20">
                <h3 className="text-lg font-medium text-white">Create New Survey</h3>
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
                  {newSurvey.questions.map((q, i) => (
                    <div key={i} className="p-4 border border-white/20 rounded-lg mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-300">Question {i + 1}</label>
                        <button onClick={() => handleRemoveQuestion(i)} className="text-red-400 hover:text-red-300" type="button">
                          <FiTrash2 />
                        </button>
                      </div>
                      <Input
                        name="question_text"
                        label="Question text"
                        value={q.question_text}
                        onChange={(e) => handleNewQuestionChange(i, e)}
                        required
                        className="w-full pl-3 pr-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm mb-2"
                      />
                      <Select
                        name="question_type"
                        label="Question type"
                        value={q.question_type}
                        onChange={(e) => handleNewQuestionChange(i, e)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
                      >
                        <option value="text" className="bg-gray-800">Text</option>
                        <option value="multiple-choice" className="bg-gray-800">Multiple Choice</option>
                        <option value="rating" className="bg-gray-800">Rating (1-5)</option>
                      </Select>

                      {q.question_type === 'multiple-choice' && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={optionInputs[i] || ''}
                              onChange={(e) => handleOptionInputChange(i, e.target.value)}
                              placeholder="Add an option"
                              className="flex-1 px-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm"
                            />
                            <Button type="button" variant="outline" onClick={() => handleAddOption(i)}>Add</Button>
                          </div>
                          {Array.isArray(q.options) && q.options.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {q.options.map((opt: string) => (
                                <span key={opt} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-white/10 border border-white/20 text-white">
                                  {opt}
                                  <button type="button" onClick={() => handleRemoveOption(i, opt)} className="text-red-400 hover:text-red-300">×</button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {q.question_type === 'rating' && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <Input
                            name="rating_min"
                            label="Scale min"
                            type="number"
                            value={getRatingScale(q).min}
                            onChange={(e) => setRatingScale(i, 'min', Number(e.target.value))}
                            className="w-full pl-3 pr-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white"
                          />
                          <Input
                            name="rating_max"
                            label="Scale max"
                            type="number"
                            value={getRatingScale(q).max}
                            onChange={(e) => setRatingScale(i, 'max', Number(e.target.value))}
                            className="w-full pl-3 pr-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  <Button onClick={handleAddQuestion} type="button" variant="outline" className="inline-flex items-center">
                    <FiPlus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
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
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-white/20">
                <h3 className="text-lg font-medium text-white">Edit Survey</h3>
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
                  {editQuestions.map((q, i) => (
                    <div key={q.id ?? `new-${i}`} className="p-4 border border-white/20 rounded-lg mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-300">Question {i + 1}</label>
                        <button onClick={() => handleEditRemoveQuestion(i)} className="text-red-400 hover:text-red-300" type="button">
                          <FiTrash2 />
                        </button>
                      </div>
                      <Input
                        name="question_text"
                        label="Question text"
                        value={q.question_text}
                        onChange={(e) => handleEditQuestionChange(i, e)}
                        required
                        className="w-full pl-3 pr-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm mb-2"
                      />
                      <Select
                        name="question_type"
                        label="Question type"
                        value={q.question_type}
                        onChange={(e) => handleEditQuestionChange(i, e)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
                      >
                        <option value="text" className="bg-gray-800">Text</option>
                        <option value="multiple-choice" className="bg-gray-800">Multiple Choice</option>
                        <option value="rating" className="bg-gray-800">Rating (1-5)</option>
                      </Select>
                      {q.question_type === 'multiple-choice' && (
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editOptionInputs[i] || ''}
                              onChange={(e) => handleEditOptionInputChange(i, e.target.value)}
                              placeholder="Add an option"
                              className="flex-1 px-3 py-2 bg-white/8 border border-white/15 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm"
                            />
                            <Button type="button" variant="outline" onClick={() => handleEditAddOption(i)}>Add</Button>
                          </div>
                          {Array.isArray(q.options) && q.options.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {q.options.map((opt: string) => (
                                <span key={opt} className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-white/10 border border-white/20 text-white">
                                  {opt}
                                  <button type="button" onClick={() => handleEditRemoveOption(i, opt)} className="text-red-400 hover:text-red-300">×</button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <Button onClick={handleEditAddQuestion} type="button" variant="outline" className="inline-flex items-center">
                    <FiPlus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
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
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-white/20">
                <h3 className="text-lg font-medium text-white">Survey Results</h3>
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
                          {response.answers.map((answer: any) => (
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
