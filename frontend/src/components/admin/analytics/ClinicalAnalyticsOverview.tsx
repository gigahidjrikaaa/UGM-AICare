/**
 * Clinical Analytics Overview Component
 * 
 * Displays privacy-preserving clinical intelligence overview including:
 * - Treatment effectiveness summary
 * - Service utilization metrics
 * - Privacy audit status
 * - Clinical recommendations
 */

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FiTrendingUp, 
  FiShield, 
  FiActivity, 
  FiCheckCircle, 
  FiAlertTriangle,
  FiInfo
} from 'react-icons/fi';

import { StatCard } from '@/components/admin/analytics/StatCard';
import { CollapsibleSection } from '@/components/admin/analytics/CollapsibleSection';
import { 
  getClinicalIntelligenceReport, 
  getTreatmentOutcomes,
  getPrivacyAuditStatus,
  summarizeTreatmentOutcomes,
  getClinicalSignificanceColor,
  getEvidenceQualityColor,
  formatEffectSize,
  formatPValue,
  type ClinicalIntelligenceReport,
  type TreatmentOutcome,
  type PrivacyAuditStatus 
} from '@/services/clinicalAnalytics';

interface ClinicalOverviewProps {
  className?: string;
}

export function ClinicalAnalyticsOverview({ className = '' }: ClinicalOverviewProps) {
  const [clinicalReport, setClinicalReport] = useState<ClinicalIntelligenceReport | null>(null);
  const [treatmentOutcomes, setTreatmentOutcomes] = useState<Record<string, TreatmentOutcome>>({});
  const [privacyAudit, setPrivacyAudit] = useState<PrivacyAuditStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClinicalData();
  }, []);

  const loadClinicalData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load clinical intelligence report
      const reportResponse = await getClinicalIntelligenceReport({
        analysisPeriodDays: 90,
        privacyLevel: 'medium'
      });

      if (reportResponse.success) {
        setClinicalReport(reportResponse.data);
      }

      // Load treatment outcomes
      const outcomesResponse = await getTreatmentOutcomes({
        timePeriodDays: 90,
        privacyLevel: 'medium'
      });

      if (outcomesResponse.success) {
        setTreatmentOutcomes(outcomesResponse.data);
      }

      // Load privacy audit status
      const auditResponse = await getPrivacyAuditStatus();

      if (auditResponse.success) {
        setPrivacyAudit(auditResponse.data);
      }

    } catch (err) {
      console.error('Error loading clinical data:', err);
      setError('Failed to load clinical analytics data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg h-32"></div>
            ))}
          </div>
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
              <h3 className="text-red-800 font-medium">Error Loading Clinical Data</h3>
              <p className="text-red-600 text-sm mt-1">{error}</p>
              <button 
                onClick={loadClinicalData}
                className="mt-3 text-red-700 hover:text-red-800 text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const outcomesSummary = Object.keys(treatmentOutcomes).length > 0 
    ? summarizeTreatmentOutcomes(treatmentOutcomes) 
    : null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Treatment Effectiveness"
          value={outcomesSummary ? `${outcomesSummary.effectivenessRate.toFixed(1)}%` : 'No Data'}
          change={outcomesSummary ? `${outcomesSummary.highEffectiveness} high-impact interventions` : ''}
          trend="up"
          icon={<FiTrendingUp className="h-5 w-5" />}
          color="green"
        />

        <StatCard
          title="Active Analyses"
          value={clinicalReport?.treatment_outcomes_summary.total_analyses.toString() || '0'}
          change={`${clinicalReport?.treatment_outcomes_summary.interventions_analyzed.length || 0} intervention types`}
          trend="neutral"
          icon={<FiActivity className="h-5 w-5" />}
          color="blue"
        />

        <StatCard
          title="Data Quality Score"
          value={clinicalReport?.quality_assurance.data_quality_score 
            ? (clinicalReport.quality_assurance.data_quality_score * 100).toFixed(1) + '%'
            : 'N/A'}
          change={`${clinicalReport?.quality_assurance.consent_compliance_rate 
            ? (clinicalReport.quality_assurance.consent_compliance_rate * 100).toFixed(1) + '% consent compliance'
            : 'No consent data'}`}
          trend={clinicalReport?.quality_assurance.data_quality_score > 0.8 ? "up" : "down"}
          icon={<FiCheckCircle className="h-5 w-5" />}
          color="purple"
        />

        <StatCard
          title="Privacy Status"
          value={privacyAudit?.budget_status.budget_status || 'Unknown'}
          change={privacyAudit ? `${privacyAudit.budget_status.budget_used_percentage.toFixed(1)}% budget used` : ''}
          trend={privacyAudit?.compliance_indicators.budget_healthy ? "up" : "down"}
          icon={<FiShield className="h-5 w-5" />}
          color="indigo"
        />
      </div>

      {/* Clinical Intelligence Summary */}
      {clinicalReport && (
        <CollapsibleSection 
          title="Clinical Intelligence Summary" 
          defaultOpen={true}
          className="bg-white rounded-lg shadow-sm"
        >
          <div className="space-y-6">
            {/* Analysis Period */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <FiInfo className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium text-blue-900">Analysis Period</h4>
              </div>
              <p className="text-blue-800 text-sm">
                {new Date(clinicalReport.analysis_period.start_date).toLocaleDateString()} - {' '}
                {new Date(clinicalReport.analysis_period.end_date).toLocaleDateString()} 
                ({clinicalReport.analysis_period.duration_days} days)
              </p>
              <p className="text-blue-700 text-xs mt-1">
                Privacy Level: <span className="font-medium capitalize">{clinicalReport.privacy_level}</span>
              </p>
            </div>

            {/* Treatment Outcomes Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">High Effectiveness</h4>
                <div className="text-2xl font-bold text-green-800">
                  {clinicalReport.treatment_outcomes_summary.high_effectiveness_count}
                </div>
                <p className="text-green-700 text-sm">Interventions showing strong clinical significance</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Moderate Effectiveness</h4>
                <div className="text-2xl font-bold text-blue-800">
                  {clinicalReport.treatment_outcomes_summary.moderate_effectiveness_count}
                </div>
                <p className="text-blue-700 text-sm">Interventions showing moderate clinical benefit</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">Total Analyses</h4>
                <div className="text-2xl font-bold text-purple-800">
                  {clinicalReport.treatment_outcomes_summary.total_analyses}
                </div>
                <p className="text-purple-700 text-sm">Evidence-based outcome measurements</p>
              </div>
            </div>

            {/* Service Optimization Recommendations */}
            {clinicalReport.service_optimization.recommendations.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <FiTrendingUp className="h-4 w-4 text-yellow-600" />
                  <h4 className="font-medium text-yellow-900">
                    Service Optimization Recommendations 
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      clinicalReport.service_optimization.priority_level === 'high' 
                        ? 'bg-red-100 text-red-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {clinicalReport.service_optimization.priority_level} priority
                    </span>
                  </h4>
                </div>
                <ul className="space-y-2">
                  {clinicalReport.service_optimization.recommendations.slice(0, 5).map((rec, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-yellow-800">
                      <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2 flex-shrink-0"></div>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
                {clinicalReport.service_optimization.recommendations.length > 5 && (
                  <p className="text-yellow-700 text-xs mt-2">
                    +{clinicalReport.service_optimization.recommendations.length - 5} more recommendations
                  </p>
                )}
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Treatment Outcomes Detail */}
      {Object.keys(treatmentOutcomes).length > 0 && (
        <CollapsibleSection 
          title="Treatment Outcomes Analysis" 
          defaultOpen={false}
          className="bg-white rounded-lg shadow-sm"
        >
          <div className="space-y-4">
            {Object.entries(treatmentOutcomes).slice(0, 5).map(([key, outcome]) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {outcome.intervention_type} + {outcome.instrument_type}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Sample size: {outcome.sample_size} participants
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getClinicalSignificanceColor(outcome.clinical_significance.rating)}`}>
                      {outcome.clinical_significance.rating} significance
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getEvidenceQualityColor(outcome.evidence_quality)}`}>
                      {outcome.evidence_quality} evidence
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Effect Size</p>
                    <p className="font-medium">
                      {outcome.statistical_results.effect_size.toFixed(3)} ({formatEffectSize(outcome.statistical_results.effect_size)})
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Statistical Significance</p>
                    <p className="font-medium">
                      {formatPValue(outcome.statistical_results.p_value)}
                      {outcome.statistical_results.statistically_significant && 
                        <span className="text-green-600 ml-1">✓</span>
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Recovery Rate</p>
                    <p className="font-medium">
                      {outcome.clinical_significance.recovery_rate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {outcome.clinical_recommendations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Clinical Recommendations:</p>
                    <p className="text-sm text-gray-800">{outcome.clinical_recommendations[0]}</p>
                  </div>
                )}
              </motion.div>
            ))}
            
            {Object.keys(treatmentOutcomes).length > 5 && (
              <div className="text-center pt-4">
                <p className="text-gray-600 text-sm">
                  +{Object.keys(treatmentOutcomes).length - 5} more treatment outcome analyses
                </p>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Privacy & Compliance Status */}
      {privacyAudit && (
        <CollapsibleSection 
          title="Privacy & Compliance Status" 
          defaultOpen={false}
          className="bg-white rounded-lg shadow-sm"
        >
          <div className="space-y-4">
            {/* Privacy Budget Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Privacy Budget</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Used:</span>
                    <span className="font-medium">{privacyAudit.budget_status.budget_used_percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        privacyAudit.budget_status.budget_used_percentage > 80 ? 'bg-red-500' : 
                        privacyAudit.budget_status.budget_used_percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      data-width={Math.min(privacyAudit.budget_status.budget_used_percentage, 100)}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600">
                    Status: <span className="font-medium capitalize">{privacyAudit.budget_status.budget_status}</span>
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Analysis Count</h4>
                <div className="text-2xl font-bold text-gray-800">
                  {privacyAudit.budget_status.analysis_count}
                </div>
                <p className="text-gray-600 text-sm">Privacy-affecting operations</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Compliance Status</h4>
                <div className="space-y-2">
                  {Object.entries(privacyAudit.compliance_indicators).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{key.replace('_', ' ')}:</span>
                      <span className={`font-medium ${value ? 'text-green-600' : 'text-red-600'}`}>
                        {value ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Privacy Recommendations */}
            {privacyAudit.recommendations.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Privacy Recommendations</h4>
                <ul className="space-y-1">
                  {privacyAudit.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-blue-800 flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}