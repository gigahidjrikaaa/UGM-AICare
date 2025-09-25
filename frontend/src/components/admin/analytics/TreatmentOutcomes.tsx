/**
 * Treatment Outcomes Component
 * 
 * Displays detailed treatment effectiveness analysis with:
 * - Statistical significance testing
 * - Effect size calculations
 * - Clinical significance measures
 * - Professional validation status
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiTrendingUp, 
  FiTrendingDown,
  FiActivity,
  FiCheckCircle,
  FiAlertCircle,
  FiInfo,
  FiFilter
} from 'react-icons/fi';

import { 
  getTreatmentOutcomes,
  formatEffectSize,
  formatPValue,
  formatConfidenceInterval,
  getClinicalSignificanceColor,
  getEvidenceQualityColor,
  type TreatmentOutcome 
} from '@/services/clinicalAnalytics';

interface TreatmentOutcomesProps {
  className?: string;
}

export function TreatmentOutcomes({ className = '' }: TreatmentOutcomesProps) {
  const [outcomes, setOutcomes] = useState<Record<string, TreatmentOutcome>>({});
  const [filteredOutcomes, setFilteredOutcomes] = useState<Record<string, TreatmentOutcome>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [interventionFilter, setInterventionFilter] = useState<string>('all');
  const [significanceFilter, setSignificanceFilter] = useState<string>('all');
  const [evidenceFilter, setEvidenceFilter] = useState<string>('all');

  useEffect(() => {
    loadTreatmentOutcomes();
  }, []);

  useEffect(() => {
    let filtered = { ...outcomes };

    // Filter by intervention type
    if (interventionFilter !== 'all') {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([, outcome]) => 
          outcome.intervention_type.toLowerCase().includes(interventionFilter.toLowerCase())
        )
      );
    }

    // Filter by clinical significance
    if (significanceFilter !== 'all') {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([, outcome]) => 
          outcome.clinical_significance.rating === significanceFilter
        )
      );
    }

    // Filter by evidence quality
    if (evidenceFilter !== 'all') {
      filtered = Object.fromEntries(
        Object.entries(filtered).filter(([, outcome]) => 
          outcome.evidence_quality === evidenceFilter
        )
      );
    }

    setFilteredOutcomes(filtered);
  }, [outcomes, interventionFilter, significanceFilter, evidenceFilter]);

  const loadTreatmentOutcomes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getTreatmentOutcomes({
        timePeriodDays: 90,
        privacyLevel: 'medium'
      });

      if (response.success) {
        setOutcomes(response.data);
      } else {
        setError('Failed to load treatment outcomes');
      }
    } catch (err) {
      console.error('Error loading treatment outcomes:', err);
      setError('Error loading treatment outcomes data');
    } finally {
      setLoading(false);
    }
  };

  const getUniqueInterventions = () => {
    return [...new Set(Object.values(outcomes).map(o => o.intervention_type))];
  };

  const getOutcomeIcon = (outcome: TreatmentOutcome) => {
    if (outcome.statistical_results.statistically_significant && outcome.clinical_significance.rating === 'high') {
      return <FiTrendingUp className="h-5 w-5 text-green-600" />;
    } else if (outcome.statistical_results.statistically_significant) {
      return <FiActivity className="h-5 w-5 text-blue-600" />;
    } else if (outcome.statistical_results.effect_size < 0) {
      return <FiTrendingDown className="h-5 w-5 text-red-600" />;
    } else {
      return <FiInfo className="h-5 w-5 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="bg-gray-200 rounded-lg h-12 w-full"></div>
          {[...Array(3)].map((_, i) => (
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
            <FiAlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <h3 className="text-red-800 font-medium">Error Loading Treatment Outcomes</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button 
                onClick={loadTreatmentOutcomes}
                className="mt-3 text-red-700 hover:text-red-800 text-sm font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center space-x-2 mb-4">
          <FiFilter className="h-4 w-4 text-gray-600" />
          <h3 className="font-medium text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intervention Type
            </label>
            <select
              value={interventionFilter}
              onChange={(e) => setInterventionFilter(e.target.value)}
              aria-label="Filter by intervention type"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Interventions</option>
              {getUniqueInterventions().map(intervention => (
                <option key={intervention} value={intervention}>{intervention}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Clinical Significance
            </label>
            <select
              value={significanceFilter}
              onChange={(e) => setSignificanceFilter(e.target.value)}
              aria-label="Filter by clinical significance"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="high">High</option>
              <option value="moderate">Moderate</option>
              <option value="low">Low</option>
              <option value="none">None</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Evidence Quality
            </label>
            <select
              value={evidenceFilter}
              onChange={(e) => setEvidenceFilter(e.target.value)}
              aria-label="Filter by evidence quality"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Quality Levels</option>
              <option value="strong">Strong</option>
              <option value="moderate">Moderate</option>
              <option value="weak">Weak</option>
            </select>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Showing {Object.keys(filteredOutcomes).length} of {Object.keys(outcomes).length} analyses
        </div>
      </div>

      {/* Treatment Outcomes List */}
      <div className="space-y-4">
        {Object.entries(filteredOutcomes).length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <FiInfo className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No treatment outcomes match your current filters</p>
            <button
              onClick={() => {
                setInterventionFilter('all');
                setSignificanceFilter('all');
                setEvidenceFilter('all');
              }}
              className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          Object.entries(filteredOutcomes).map(([key, outcome], index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {getOutcomeIcon(outcome)}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {outcome.intervention_type}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Measured with {outcome.instrument_type} • {outcome.sample_size} participants
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getClinicalSignificanceColor(outcome.clinical_significance.rating)}`}>
                      {outcome.clinical_significance.rating} significance
                    </span>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${getEvidenceQualityColor(outcome.evidence_quality)}`}>
                      {outcome.evidence_quality} evidence
                    </span>
                  </div>
                </div>

                {/* Statistical Results */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600 mb-1">Effect Size</div>
                    <div className="font-semibold text-gray-900">
                      {outcome.statistical_results.effect_size.toFixed(3)}
                    </div>
                    <div className="text-xs text-gray-600">
                      ({formatEffectSize(outcome.statistical_results.effect_size)})
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600 mb-1">Statistical Significance</div>
                    <div className="font-semibold text-gray-900">
                      {formatPValue(outcome.statistical_results.p_value)}
                    </div>
                    <div className="text-xs flex items-center space-x-1">
                      {outcome.statistical_results.statistically_significant ? (
                        <>
                          <FiCheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-green-600">Significant</span>
                        </>
                      ) : (
                        <>
                          <FiAlertCircle className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">Not significant</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600 mb-1">Recovery Rate</div>
                    <div className="font-semibold text-gray-900">
                      {outcome.clinical_significance.recovery_rate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600">
                      Clinical to non-clinical range
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600 mb-1">Reliable Improvement</div>
                    <div className="font-semibold text-gray-900">
                      {outcome.clinical_significance.reliable_improvement_rate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-600">
                      RCI-based improvement
                    </div>
                  </div>
                </div>

                {/* Confidence Interval */}
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <div className="text-sm font-medium text-blue-900 mb-1">
                    Mean Improvement: {outcome.statistical_results.mean_improvement.toFixed(2)} points
                  </div>
                  <div className="text-xs text-blue-700">
                    {formatConfidenceInterval(outcome.statistical_results.confidence_interval)}
                  </div>
                </div>

                {/* Clinical Recommendations */}
                {outcome.clinical_recommendations.length > 0 && (
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Clinical Recommendations</h4>
                    <ul className="space-y-1">
                      {outcome.clinical_recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {Object.keys(filteredOutcomes).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Analysis Summary</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Statistically Significant</div>
              <div className="font-semibold text-gray-900">
                {Object.values(filteredOutcomes).filter(o => o.statistical_results.statistically_significant).length} / {Object.keys(filteredOutcomes).length}
              </div>
            </div>
            <div>
              <div className="text-gray-600">High Clinical Significance</div>
              <div className="font-semibold text-gray-900">
                {Object.values(filteredOutcomes).filter(o => o.clinical_significance.rating === 'high').length} / {Object.keys(filteredOutcomes).length}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Strong Evidence</div>
              <div className="font-semibold text-gray-900">
                {Object.values(filteredOutcomes).filter(o => o.evidence_quality === 'strong').length} / {Object.keys(filteredOutcomes).length}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Avg Effect Size</div>
              <div className="font-semibold text-gray-900">
                {(Object.values(filteredOutcomes).reduce((sum, o) => sum + Math.abs(o.statistical_results.effect_size), 0) / Object.keys(filteredOutcomes).length).toFixed(3)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}