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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['clinical-intelligence-summary']));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleToggleSection = (id: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

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
              <div key={i} className="bg-white/10 rounded-2xl h-32 border border-white/20 backdrop-blur-md"></div>
            ))}
          </div>
          <div className="space-y-4 mt-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-2xl h-24 border border-white/10 backdrop-blur-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-500/10 backdrop-blur-md border border-red-400/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="bg-red-500/20 rounded-full p-2">
              <FiAlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-red-300 font-semibold">Error Loading Clinical Data</h3>
              <p className="text-red-400/80 text-sm mt-1">{error}</p>
              <motion.button 
                onClick={loadClinicalData}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="mt-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-red-200 text-sm font-medium px-4 py-2 rounded-lg border border-red-400/30 transition-all duration-300"
              >
                Try Again
              </motion.button>
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
          trend={(clinicalReport?.quality_assurance.data_quality_score ?? 0) > 0.8 ? "up" : "down"}
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
          id="clinical-intelligence-summary"
          title="Clinical Intelligence Summary"
          expandedSections={expandedSections}
          onToggle={handleToggleSection}
        >
          <div className="space-y-6">
            {/* Analysis Period */}
            <div className="bg-ugm-blue/10 backdrop-blur-sm border border-ugm-blue/20 rounded-xl p-5">
              <div className="flex items-center space-x-2 mb-3">
                <div className="bg-[#FFCA40]/20 rounded-full p-1.5">
                  <FiInfo className="h-4 w-4 text-[#FFCA40]" />
                </div>
                <h4 className="font-semibold text-white">Analysis Period</h4>
              </div>
              <p className="text-white/90 text-sm">
                {new Date(clinicalReport.analysis_period.start_date).toLocaleDateString()} - {' '}
                {new Date(clinicalReport.analysis_period.end_date).toLocaleDateString()} 
                ({clinicalReport.analysis_period.duration_days} days)
              </p>
              <p className="text-white/70 text-xs mt-2">
                Privacy Level: <span className="font-medium capitalize text-[#FFCA40]">{clinicalReport.privacy_level}</span>
              </p>
            </div>

            {/* Treatment Outcomes Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <motion.div 
                whileHover={{ scale: 1.02, y: -2 }}
                className="bg-green-500/10 backdrop-blur-sm border border-green-400/30 rounded-xl p-5 shadow-lg"
              >
                <h4 className="font-semibold text-green-400 mb-3 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>High Effectiveness</span>
                </h4>
                <div className="text-3xl font-bold text-white mb-2">
                  {clinicalReport.treatment_outcomes_summary.high_effectiveness_count}
                </div>
                <p className="text-white/70 text-sm">Interventions showing strong clinical significance</p>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.02, y: -2 }}
                className="bg-ugm-blue/10 backdrop-blur-sm border border-ugm-blue/30 rounded-xl p-5 shadow-lg"
              >
                <h4 className="font-semibold text-ugm-blue-light mb-3 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-ugm-blue-light rounded-full"></div>
                  <span>Moderate Effectiveness</span>
                </h4>
                <div className="text-3xl font-bold text-white mb-2">
                  {clinicalReport.treatment_outcomes_summary.moderate_effectiveness_count}
                </div>
                <p className="text-white/70 text-sm">Interventions showing moderate clinical benefit</p>
              </motion.div>

              <motion.div 
                whileHover={{ scale: 1.02, y: -2 }}
                className="bg-[#FFCA40]/10 backdrop-blur-sm border border-[#FFCA40]/30 rounded-xl p-5 shadow-lg"
              >
                <h4 className="font-semibold text-[#FFCA40] mb-3 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#FFCA40] rounded-full"></div>
                  <span>Total Analyses</span>
                </h4>
                <div className="text-3xl font-bold text-white mb-2">
                  {clinicalReport.treatment_outcomes_summary.total_analyses}
                </div>
                <p className="text-white/70 text-sm">Evidence-based outcome measurements</p>
              </motion.div>
            </div>

            {/* Service Optimization Recommendations */}
            {clinicalReport.service_optimization.recommendations.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#FFCA40]/10 backdrop-blur-sm border border-[#FFCA40]/30 rounded-xl p-5 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-[#FFCA40]/20 rounded-full p-2">
                      <FiTrendingUp className="h-4 w-4 text-[#FFCA40]" />
                    </div>
                    <h4 className="font-semibold text-white">
                      Service Optimization Recommendations
                    </h4>
                  </div>
                  <span className={`px-3 py-1 text-xs rounded-full font-medium backdrop-blur-sm border ${
                    clinicalReport.service_optimization.priority_level === 'high' 
                      ? 'bg-red-500/20 text-red-400 border-red-400/30' 
                      : 'bg-ugm-blue/20 text-ugm-blue-light border-ugm-blue/30'
                  }`}>
                    {clinicalReport.service_optimization.priority_level} priority
                  </span>
                </div>
                <div className="space-y-3">
                  {clinicalReport.service_optimization.recommendations.slice(0, 5).map((rec, index) => (
                    <motion.div 
                      key={index} 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start space-x-3 text-sm text-white/90"
                    >
                      <div className="w-2 h-2 rounded-full bg-[#FFCA40] mt-2 flex-shrink-0"></div>
                      <span>{rec}</span>
                    </motion.div>
                  ))}
                </div>
                {clinicalReport.service_optimization.recommendations.length > 5 && (
                  <p className="text-white/60 text-xs mt-3 italic">
                    +{clinicalReport.service_optimization.recommendations.length - 5} more recommendations available
                  </p>
                )}
              </motion.div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Treatment Outcomes Detail */}
      {Object.keys(treatmentOutcomes).length > 0 && (
        <CollapsibleSection 
          id="treatment-outcomes-analysis"
          title="Treatment Outcomes Analysis" 
          expandedSections={expandedSections}
          onToggle={handleToggleSection}
        >
          <div className="space-y-4">
            {Object.entries(treatmentOutcomes).slice(0, 5).map(([key, outcome], index) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01, y: -2 }}
                className="border border-white/20 bg-white/5 backdrop-blur-md rounded-xl p-6 shadow-lg hover:bg-white/10"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-semibold text-white text-lg mb-2">
                      {outcome.intervention_type} + {outcome.instrument_type}
                    </h4>
                    <p className="text-sm text-white/70 flex items-center space-x-2">
                      <span>Sample size:</span>
                      <span className="bg-ugm-blue/20 text-ugm-blue-light px-2 py-1 rounded-full text-xs font-medium">
                        {outcome.sample_size} participants
                      </span>
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-3 py-1 text-xs rounded-full font-medium backdrop-blur-sm border ${getClinicalSignificanceColor(outcome.clinical_significance.rating)}`}>
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
          id="privacy-compliance-status"
          title="Privacy & Compliance Status"
          expandedSections={expandedSections}
          onToggle={handleToggleSection}
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