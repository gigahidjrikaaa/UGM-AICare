/**
 * Clinical Oversight Interface
 * 
 * Professional validation system for clinical insights and recommendations.
 * Provides clinicians with tools to review, approve, and validate AI-generated
 * clinical intelligence before it becomes actionable.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiUser, 
  FiCheckCircle,
  FiXCircle,
  FiEye,
  FiAlertTriangle,
  FiThumbsUp,
  FiMessageSquare,
  FiFilter,
  FiRefreshCw
} from 'react-icons/fi';

import { 
  validateClinicalInsight
} from '@/services/clinicalAnalytics';

interface ClinicalInsightValidation {
  status: 'approved' | 'rejected' | 'needs_revision';
  notes: string;
  clinicalRecommendations: string[];
}

interface PendingInsight {
  id: number;
  type: 'treatment_recommendation' | 'risk_assessment' | 'intervention_suggestion' | 'outcome_prediction';
  title: string;
  description: string;
  generated_at: string;
  confidence_score: number;
  evidence_quality: 'strong' | 'moderate' | 'weak';
  clinical_significance: 'high' | 'moderate' | 'low';
  affected_users: number;
  supporting_data: {
    statistical_significance: boolean;
    effect_size: number;
    sample_size: number;
    confidence_interval: [number, number];
  };
  ai_rationale: string;
  recommendations: string[];
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'needs_revision';
  priority: 'urgent' | 'high' | 'medium' | 'low';
}

interface ClinicalOversightProps {
  className?: string;
}

export function ClinicalOversight({ className = '' }: ClinicalOversightProps) {
  const [insights, setInsights] = useState<PendingInsight[]>([]);
  const [filteredInsights, setFilteredInsights] = useState<PendingInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // Review modal state
  const [selectedInsight, setSelectedInsight] = useState<PendingInsight | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'needs_revision'>('approved');
  const [clinicalRecommendations, setClinicalRecommendations] = useState<string[]>([]);

  useEffect(() => {
    loadPendingInsights();
  }, []);

  useEffect(() => {
    const applyCurrentFilters = () => {
      let filtered = [...insights];

      if (statusFilter !== 'all') {
        filtered = filtered.filter(insight => insight.status === statusFilter);
      }

      if (typeFilter !== 'all') {
        filtered = filtered.filter(insight => insight.type === typeFilter);
      }

      if (priorityFilter !== 'all') {
        filtered = filtered.filter(insight => insight.priority === priorityFilter);
      }

      // Sort by priority and timestamp
      filtered.sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime();
      });

      setFilteredInsights(filtered);
    };
    
    applyCurrentFilters();
  }, [insights, statusFilter, typeFilter, priorityFilter]);

  const loadPendingInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      // Mock data for demonstration - in real implementation, this would call an API
      const mockInsights: PendingInsight[] = [
        {
          id: 1,
          type: 'treatment_recommendation',
          title: 'CBT Protocol Recommendation for Anxiety Cohort',
          description: 'Statistical analysis indicates CBT-based interventions show 73% effectiveness for users with moderate to severe anxiety symptoms.',
          generated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          confidence_score: 0.87,
          evidence_quality: 'strong',
          clinical_significance: 'high',
          affected_users: 156,
          supporting_data: {
            statistical_significance: true,
            effect_size: 0.68,
            sample_size: 203,
            confidence_interval: [0.45, 0.91]
          },
          ai_rationale: 'Cross-sectional analysis of treatment outcomes over 90 days shows significant improvement in GAD-7 scores (p < 0.001) with medium-to-large effect size.',
          recommendations: [
            'Implement structured CBT protocol for new anxiety cases',
            'Consider group therapy sessions to optimize resource utilization',
            'Monitor progress using standardized GAD-7 assessments'
          ],
          status: 'pending',
          priority: 'high'
        },
        {
          id: 2,
          type: 'risk_assessment',
          title: 'Elevated Risk Pattern in Sleep-Related Concerns',
          description: 'Machine learning analysis detected increased risk indicators among users reporting sleep disturbances.',
          generated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          confidence_score: 0.74,
          evidence_quality: 'moderate',
          clinical_significance: 'moderate',
          affected_users: 89,
          supporting_data: {
            statistical_significance: true,
            effect_size: 0.42,
            sample_size: 127,
            confidence_interval: [0.23, 0.61]
          },
          ai_rationale: 'Correlation analysis shows sleep quality scores below 6/10 correlate with 40% higher likelihood of depression screening positive.',
          recommendations: [
            'Prioritize sleep hygiene assessment for at-risk users',
            'Consider sleep-focused interventions as preventive measure',
            'Implement early screening protocols'
          ],
          status: 'under_review',
          priority: 'medium'
        },
        {
          id: 3,
          type: 'intervention_suggestion',
          title: 'Mindfulness-Based Intervention for Stress Management',
          description: 'Data suggests mindfulness interventions could reduce stress levels by an estimated 34% in the target population.',
          generated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          confidence_score: 0.69,
          evidence_quality: 'moderate',
          clinical_significance: 'moderate',
          affected_users: 234,
          supporting_data: {
            statistical_significance: false,
            effect_size: 0.31,
            sample_size: 298,
            confidence_interval: [0.12, 0.50]
          },
          ai_rationale: 'Pre-post analysis of stress levels shows consistent improvement pattern, though statistical significance not achieved due to sample heterogeneity.',
          recommendations: [
            'Pilot mindfulness program with controlled group',
            'Standardize stress measurement instruments',
            'Track long-term retention and engagement'
          ],
          status: 'needs_revision',
          priority: 'low'
        }
      ];

      setInsights(mockInsights);
    } catch (err) {
      console.error('Error loading pending insights:', err);
      setError('Error loading clinical insights for review');
    } finally {
      setLoading(false);
    }
  };



  const handleValidateInsight = async (insightId: number, validation: ClinicalInsightValidation) => {
    try {
      const response = await validateClinicalInsight(insightId, validation);
      
      if (response.success) {
        // Update local state
        setInsights(prev => prev.map(insight => 
          insight.id === insightId 
            ? { ...insight, status: validation.status }
            : insight
        ));
        
        // Close modal
        setSelectedInsight(null);
        setReviewNotes('');
        setClinicalRecommendations([]);
      } else {
        setError('Failed to submit validation');
      }
    } catch (err) {
      console.error('Error validating insight:', err);
      setError('Error submitting clinical validation');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'under_review': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'needs_revision': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'treatment_recommendation': return <FiThumbsUp className="h-4 w-4" />;
      case 'risk_assessment': return <FiAlertTriangle className="h-4 w-4" />;
      case 'intervention_suggestion': return <FiMessageSquare className="h-4 w-4" />;
      case 'outcome_prediction': return <FiEye className="h-4 w-4" />;
      default: return <FiUser className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="bg-gray-200 rounded-lg h-12 w-full"></div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-32 w-full"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <FiAlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Clinical Oversight</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button 
                onClick={loadPendingInsights}
                className="mt-3 text-red-700 hover:text-red-800 text-sm font-medium flex items-center space-x-1"
              >
                <FiRefreshCw className="h-4 w-4" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
              <FiUser className="h-5 w-5 text-blue-600" />
              <span>Clinical Oversight</span>
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Review and validate AI-generated clinical insights before implementation
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={loadPendingInsights}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <FiRefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-4">
          <FiFilter className="h-4 w-4 text-gray-600" />
          <h3 className="font-medium text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending Review</option>
              <option value="under_review">Under Review</option>
              <option value="needs_revision">Needs Revision</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by insight type"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="treatment_recommendation">Treatment Recommendations</option>
              <option value="risk_assessment">Risk Assessments</option>
              <option value="intervention_suggestion">Intervention Suggestions</option>
              <option value="outcome_prediction">Outcome Predictions</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              aria-label="Filter by priority"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredInsights.length} of {insights.length} insights pending review
        </div>
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {filteredInsights.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <FiCheckCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No clinical insights match your current filters</p>
            <button
              onClick={() => {
                setStatusFilter('all');
                setTypeFilter('all');
                setPriorityFilter('all');
              }}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          filteredInsights.map((insight, index) => (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      {getTypeIcon(insight.type)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{insight.description}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(insight.status)}`}>
                          {insight.status.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(insight.priority)}`}>
                          {insight.priority} priority
                        </span>
                        <span className="text-xs text-gray-500">
                          Generated {new Date(insight.generated_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {Math.round(insight.confidence_score * 100)}%
                    </div>
                    <div className="text-xs text-gray-600">confidence</div>
                  </div>
                </div>

                {/* Evidence Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Evidence Summary</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Sample Size:</span>
                      <div className="font-medium text-gray-900">{insight.supporting_data.sample_size}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Effect Size:</span>
                      <div className="font-medium text-gray-900">{insight.supporting_data.effect_size.toFixed(3)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Statistical Significance:</span>
                      <div className={`font-medium ${insight.supporting_data.statistical_significance ? 'text-green-600' : 'text-red-600'}`}>
                        {insight.supporting_data.statistical_significance ? 'Yes' : 'No'}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Affected Users:</span>
                      <div className="font-medium text-gray-900">{insight.affected_users}</div>
                    </div>
                  </div>
                </div>

                {/* AI Rationale */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">AI Analysis Rationale</h4>
                  <p className="text-gray-700 text-sm">{insight.ai_rationale}</p>
                </div>

                {/* Recommendations */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {insight.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedInsight(insight)}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-md hover:bg-blue-100"
                  >
                    <FiEye className="h-4 w-4" />
                    <span>Review & Validate</span>
                  </button>
                  
                  {insight.status === 'pending' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedInsight(insight);
                          setReviewStatus('approved');
                        }}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-md hover:bg-green-100"
                      >
                        <FiCheckCircle className="h-4 w-4" />
                        <span>Quick Approve</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedInsight(insight);
                          setReviewStatus('rejected');
                        }}
                        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-md hover:bg-red-100"
                      >
                        <FiXCircle className="h-4 w-4" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Review Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Clinical Validation</h3>
                <button
                  onClick={() => setSelectedInsight(null)}
                  className="text-gray-400 hover:text-gray-600"
                  title="Close modal"
                  aria-label="Close validation modal"
                >
                  <FiXCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">{selectedInsight.title}</h4>
                  <p className="text-gray-600 text-sm mt-1">{selectedInsight.description}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Validation Decision
                  </label>
                  <div className="flex space-x-4">
                    {(['approved', 'needs_revision', 'rejected'] as const).map(status => (
                      <label key={status} className="flex items-center">
                        <input
                          type="radio"
                          name="reviewStatus"
                          value={status}
                          checked={reviewStatus === status}
                          onChange={(e) => setReviewStatus(e.target.value as 'approved' | 'needs_revision' | 'rejected')}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {status.replace('_', ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Clinical Notes
                  </label>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add your clinical assessment and any recommendations..."
                  />
                </div>

                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setSelectedInsight(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleValidateInsight(selectedInsight.id, {
                      status: reviewStatus,
                      notes: reviewNotes,
                      clinicalRecommendations: clinicalRecommendations
                    })}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Submit Validation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}