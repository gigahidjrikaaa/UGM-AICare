'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit, FiTrash2, FiEye, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiCall } from '@/utils/adminApi';

interface SurveyQuestion {
  id: number;
  question_text: string;
  question_type: string;
  options: string[] | null;
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
  };

  const handleRemoveQuestion = (index: number) => {
    const questions = [...newSurvey.questions];
    questions.splice(index, 1);
    setNewSurvey((prev) => ({ ...prev, questions }));
  };

  const handleCreateSurvey = async () => {
    try {
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
      toast.success('Survey updated successfully');
      handleEditModalClose();
      fetchSurveys();
    } catch (error) {
      console.error('Error updating survey:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update survey');
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Survey Management</h1>
        <button onClick={handleCreateModalOpen} className="inline-flex items-center px-4 py-2 bg-[#FFCA40] hover:bg-[#ffda63] text-black rounded-lg text-sm font-medium transition-colors">
          <FiPlus className="h-4 w-4 mr-2" />
          Create Survey
        </button>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
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
              {surveys.map((survey) => (
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
                    <button onClick={() => handleResultsModalOpen(survey.id)} className="text-white hover:text-gray-300 transition-colors mr-4">
                      <FiEye className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleEditModalOpen(survey)} className="text-blue-400 hover:text-blue-300 transition-colors mr-4">
                      <FiEdit className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDeleteSurvey(survey.id)} className="text-red-400 hover:text-red-300 transition-colors">
                      <FiTrash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={newSurvey.title}
                    onChange={handleNewSurveyChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    name="description"
                    value={newSurvey.description}
                    onChange={handleNewSurveyChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
                  />
                </div>
                <div>
                  <h4 className="text-md font-medium text-white mb-2">Questions</h4>
                  {newSurvey.questions.map((q, i) => (
                    <div key={i} className="p-4 border border-white/20 rounded-lg mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-300">Question {i + 1}</label>
                        <button onClick={() => handleRemoveQuestion(i)} className="text-red-400 hover:text-red-300">
                          <FiTrash2 />
                        </button>
                      </div>
                      <input
                        type="text"
                        name="question_text"
                        value={q.question_text}
                        onChange={(e) => handleNewQuestionChange(i, e)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors mb-2"
                      />
                      <select
                        name="question_type"
                        value={q.question_type}
                        onChange={(e) => handleNewQuestionChange(i, e)}
                        className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
                      >
                        <option value="text">Text</option>
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="rating">Rating (1-5)</option>
                      </select>
                    </div>
                  ))}
                  <button onClick={handleAddQuestion} className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors">
                    <FiPlus className="h-4 w-4 mr-2" />
                    Add Question
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-white/20 flex justify-end space-x-4">
                <button onClick={handleCreateModalClose} className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30">Cancel</button>
                <button onClick={handleCreateSurvey} className="px-4 py-2 bg-[#FFCA40] text-black rounded-lg hover:bg-[#ffda63]">Create</button>
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
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={selectedSurvey.title}
                    onChange={(e) => setSelectedSurvey({ ...selectedSurvey, title: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={selectedSurvey.description || ''}
                    onChange={(e) => setSelectedSurvey({ ...selectedSurvey, description: e.target.value })}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
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
              </div>
              <div className="px-6 py-4 border-t border-white/20 flex justify-end space-x-4">
                <button onClick={handleEditModalClose} className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30">Cancel</button>
                <button onClick={handleUpdateSurvey} className="px-4 py-2 bg-[#FFCA40] text-black rounded-lg hover:bg-[#ffda63]">Update</button>
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
                <button onClick={handleResultsModalClose} className="px-4 py-2 bg-gray-500/20 text-gray-300 rounded-lg hover:bg-gray-500/30">Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}