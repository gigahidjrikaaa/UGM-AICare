"""Clinical Analytics Service for Privacy-Preserving Mental Health Intelligence.

This service provides clinical insights while respecting privacy and focusing on
evidence-based treatment outcomes rather than surveillance-style monitoring.
"""

from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc

from ..models.clinical_analytics import (
    ValidatedAssessment, ClinicalOutcome, ServiceUtilization,
    InterventionOutcome, SystemPerformanceMetric, ClinicalInsight
)
from ..models import User
from .statistical_analysis import StatisticalAnalysisEngine, ClinicalOutcomeAnalysis
from .privacy_analytics import PrivacyPreservingAnalytics, PrivacyLevel, PrivateAnalysisResult

logger = logging.getLogger(__name__)


@dataclass
class ClinicalIntelligenceReport:
    """Comprehensive clinical intelligence report with privacy protection."""
    
    # Report metadata
    report_id: str
    generated_at: datetime
    analysis_period: Tuple[datetime, datetime]
    privacy_level: PrivacyLevel
    
    # Treatment effectiveness
    treatment_outcomes: Dict[str, ClinicalOutcomeAnalysis]
    recovery_rates: Dict[str, PrivateAnalysisResult]
    improvement_rates: Dict[str, PrivateAnalysisResult]
    
    # Service performance
    utilization_metrics: Dict[str, PrivateAnalysisResult]
    engagement_patterns: Dict[str, Any]
    dropout_analysis: Dict[str, PrivateAnalysisResult]
    
    # Population health insights
    risk_factor_trends: Dict[str, Any]
    intervention_effectiveness: Dict[str, ClinicalOutcomeAnalysis]
    service_optimization_recommendations: List[str]
    
    # Quality assurance
    assessment_validity: Dict[str, float]
    clinical_significance_summary: Dict[str, str]
    evidence_quality_ratings: Dict[str, str]
    
    # Privacy and compliance
    privacy_audit_summary: Dict[str, Any]
    consent_compliance_rate: float
    data_quality_score: float


class ClinicalAnalyticsService:
    """
    Clinical analytics service providing privacy-preserving mental health intelligence.
    
    Focuses on:
    - Evidence-based treatment outcome measurement
    - Service optimization based on validated metrics
    - Population health insights with privacy protection
    - Clinical decision support through statistical analysis
    """
    
    def __init__(
        self,
        db: Session,
        privacy_level: PrivacyLevel = PrivacyLevel.MEDIUM
    ):
        self.db = db
        self.privacy_level = privacy_level
        
        # Initialize analysis engines
        self.statistical_engine = StatisticalAnalysisEngine()
        self.privacy_engine = PrivacyPreservingAnalytics(
            default_privacy_level=privacy_level,
            global_epsilon_budget=20.0,  # Generous budget for comprehensive analysis
            k_anonymity_threshold=5
        )
        
        # Valid assessment instruments
        self.valid_instruments = {
            'PHQ9', 'GAD7', 'PSS', 'DASS21', 'K10', 'SWLS', 'WEMWBS'
        }
        
        # Clinical significance thresholds
        self.clinical_thresholds = {
            'high_effectiveness': 0.8,    # 80% improvement rate
            'moderate_effectiveness': 0.6, # 60% improvement rate
            'minimal_effectiveness': 0.4,  # 40% improvement rate
        }
    
    def generate_treatment_outcome_analysis(
        self,
        intervention_types: Optional[List[str]] = None,
        assessment_instruments: Optional[List[str]] = None,
        time_period_days: int = 90,
        minimum_sample_size: int = 10
    ) -> Dict[str, ClinicalOutcomeAnalysis]:
        """
        Generate comprehensive treatment outcome analysis.
        
        Args:
            intervention_types: List of intervention types to analyze
            assessment_instruments: List of assessment instruments to include
            time_period_days: Analysis period in days
            minimum_sample_size: Minimum sample size for analysis
            
        Returns:
            Dictionary of clinical outcome analyses by intervention-instrument combination
        """
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=time_period_days)
        
        # Get validated assessments within time period
        assessments_query = self.db.query(ValidatedAssessment).filter(
            ValidatedAssessment.assessment_date >= start_date,
            ValidatedAssessment.assessment_date <= end_date,
            ValidatedAssessment.is_validated == True
        )
        
        if assessment_instruments:
            assessments_query = assessments_query.filter(
                ValidatedAssessment.instrument_type.in_(assessment_instruments)
            )
        
        assessments = assessments_query.all()
        
        # Group assessments by user, intervention, and instrument for paired analysis
        analysis_groups = {}
        
        for assessment in assessments:
            # Get associated clinical outcomes
            outcomes = self.db.query(ClinicalOutcome).filter(
                ClinicalOutcome.user_id == assessment.user_id,
                ClinicalOutcome.assessment_id == assessment.assessment_id
            ).all()
            
            for outcome in outcomes:
                if intervention_types and outcome.intervention_type not in intervention_types:
                    continue
                
                key = (outcome.intervention_type, assessment.instrument_type)
                
                if key not in analysis_groups:
                    analysis_groups[key] = {
                        'baseline_scores': [],
                        'followup_scores': [],
                        'time_intervals': []
                    }
                
                # For simplicity, assume baseline is assessment score and followup is outcome score
                analysis_groups[key]['baseline_scores'].append(assessment.total_score)
                analysis_groups[key]['followup_scores'].append(outcome.post_intervention_score)
                analysis_groups[key]['time_intervals'].append(
                    (outcome.outcome_date - assessment.assessment_date).days
                )
        
        # Perform statistical analysis for each group
        outcome_analyses = {}
        
        for (intervention, instrument), group_data in analysis_groups.items():
            if len(group_data['baseline_scores']) < minimum_sample_size:
                logger.info(f"Skipping {intervention}-{instrument}: insufficient sample size")
                continue
            
            try:
                analysis = self.statistical_engine.clinical_outcome_analysis(
                    intervention_type=intervention,
                    instrument_type=instrument,
                    baseline_scores=group_data['baseline_scores'],
                    followup_scores=group_data['followup_scores'],
                    time_between_assessments=group_data['time_intervals']
                )
                
                outcome_analyses[f"{intervention}_{instrument}"] = analysis
                
                # Log significant findings
                if analysis.clinical_significance_rating in ['high', 'moderate']:
                    logger.info(
                        f"Significant outcome found: {intervention} with {instrument} "
                        f"shows {analysis.clinical_significance_rating} effectiveness"
                    )
                
            except Exception as e:
                logger.error(f"Error analyzing {intervention}-{instrument}: {str(e)}")
                continue
        
        return outcome_analyses
    
    def calculate_service_utilization_metrics(
        self,
        time_period_days: int = 30
    ) -> Dict[str, PrivateAnalysisResult]:
        """
        Calculate privacy-protected service utilization metrics.
        
        Args:
            time_period_days: Analysis period in days
            
        Returns:
            Dictionary of utilization metrics with privacy protection
        """
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=time_period_days)
        
        # Query service utilization data
        utilization_records = self.db.query(ServiceUtilization).filter(
            ServiceUtilization.service_date >= start_date,
            ServiceUtilization.service_date <= end_date
        ).all()
        
        if not utilization_records:
            logger.warning("No utilization records found for specified period")
            return {}
        
        metrics = {}
        
        # Average sessions per user
        user_session_counts = {}
        for record in utilization_records:
            user_id = record.user_id
            user_session_counts[user_id] = user_session_counts.get(user_id, 0) + 1
        
        if user_session_counts:
            avg_sessions = self.privacy_engine.private_mean_calculation(
                list(user_session_counts.values()),
                privacy_level=self.privacy_level
            )
            metrics['average_sessions_per_user'] = avg_sessions
        
        # Service completion rates by type
        service_types = set(record.service_type for record in utilization_records)
        
        for service_type in service_types:
            type_records: List[ServiceUtilization] = []
            for record in utilization_records:
                if getattr(record, "service_type", None) == service_type:
                    type_records.append(record)

            completed_count = 0
            for record in type_records:
                if bool(getattr(record, "session_completed", False)):
                    completed_count += 1

            total_count = len(type_records)
            
            if total_count >= self.privacy_engine.k_anonymity_threshold:
                completion_rate = self.privacy_engine.private_proportion_analysis(
                    completed_count, total_count, privacy_level=self.privacy_level
                )
                metrics[f'completion_rate_{service_type}'] = completion_rate
        
        # Average session duration
        session_durations = [r.session_duration_minutes for r in utilization_records if r.session_duration_minutes]
        if session_durations:
            avg_duration = self.privacy_engine.private_mean_calculation(
                session_durations,
                privacy_level=self.privacy_level
            )
            metrics['average_session_duration_minutes'] = avg_duration
        
        return metrics
    
    def analyze_intervention_effectiveness(
        self,
        time_period_days: int = 180
    ) -> Dict[str, ClinicalOutcomeAnalysis]:
        """
        Analyze effectiveness of different intervention programs.
        
        Args:
            time_period_days: Analysis period in days
            
        Returns:
            Dictionary of intervention effectiveness analyses
        """
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=time_period_days)
        
        # Query intervention outcomes
        intervention_outcomes = self.db.query(InterventionOutcome).filter(
            InterventionOutcome.outcome_measurement_date >= start_date,
            InterventionOutcome.outcome_measurement_date <= end_date
        ).all()
        
        if not intervention_outcomes:
            logger.warning("No intervention outcomes found for specified period")
            return {}
        
        # Group by program type
        program_groups = {}
        
        for outcome in intervention_outcomes:
            program_type = outcome.program_type
            
            if program_type not in program_groups:
                program_groups[program_type] = {
                    'baseline_scores': [],
                    'outcome_scores': [],
                    'completion_status': []
                }
            
            program_groups[program_type]['baseline_scores'].append(outcome.baseline_measurement)
            program_groups[program_type]['outcome_scores'].append(outcome.outcome_measurement)
            program_groups[program_type]['completion_status'].append(outcome.program_completed)
        
        # Analyze each program
        effectiveness_analyses = {}
        
        for program_type, group_data in program_groups.items():
            if len(group_data['baseline_scores']) < 10:  # Minimum sample size
                continue
            
            try:
                # Use a generic instrument type for program analysis
                analysis = self.statistical_engine.clinical_outcome_analysis(
                    intervention_type=f"Program_{program_type}",
                    instrument_type="Generic_Outcome_Measure",
                    baseline_scores=group_data['baseline_scores'],
                    followup_scores=group_data['outcome_scores']
                )
                
                effectiveness_analyses[program_type] = analysis
                
            except Exception as e:
                logger.error(f"Error analyzing program {program_type}: {str(e)}")
                continue
        
        return effectiveness_analyses
    
    def generate_clinical_intelligence_report(
        self,
        analysis_period_days: int = 90,
        include_forecasting: bool = True
    ) -> ClinicalIntelligenceReport:
        """
        Generate comprehensive clinical intelligence report.
        
        Args:
            analysis_period_days: Period for analysis in days
            include_forecasting: Whether to include predictive forecasting
            
        Returns:
            ClinicalIntelligenceReport with comprehensive insights
        """
        
        report_id = f"clinical_intelligence_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        end_date = datetime.now()
        start_date = end_date - timedelta(days=analysis_period_days)
        
        logger.info(f"Generating clinical intelligence report {report_id}")
        
        # Treatment outcomes analysis
        treatment_outcomes = self.generate_treatment_outcome_analysis(
            time_period_days=analysis_period_days
        )
        
        # Service utilization metrics
        utilization_metrics = self.calculate_service_utilization_metrics(
            time_period_days=analysis_period_days
        )
        
        # Intervention effectiveness analysis
        intervention_effectiveness = self.analyze_intervention_effectiveness(
            time_period_days=analysis_period_days
        )
        
        # Calculate recovery and improvement rates
        recovery_rates = {}
        improvement_rates = {}
        
        for analysis_key, outcome_analysis in treatment_outcomes.items():
            # Recovery rate (privacy-protected)
            recovery_rate = self.privacy_engine.private_proportion_analysis(
                int(outcome_analysis.recovery_rate * outcome_analysis.sample_size / 100),
                outcome_analysis.sample_size,
                privacy_level=self.privacy_level
            )
            recovery_rates[analysis_key] = recovery_rate
            
            # Improvement rate (reliable change)
            improvement_count = int(outcome_analysis.percentage_reliable_improvement * outcome_analysis.sample_size / 100)
            improvement_rate = self.privacy_engine.private_proportion_analysis(
                improvement_count,
                outcome_analysis.sample_size,
                privacy_level=self.privacy_level
            )
            improvement_rates[analysis_key] = improvement_rate
        
        # Generate service optimization recommendations
        optimization_recommendations = self._generate_optimization_recommendations(
            treatment_outcomes, utilization_metrics, intervention_effectiveness
        )
        
        # Assessment validity summary
        assessment_validity = self._calculate_assessment_validity()
        
        # Clinical significance summary
        clinical_significance_summary = {}
        evidence_quality_ratings = {}
        
        for key, analysis in treatment_outcomes.items():
            clinical_significance_summary[key] = analysis.clinical_significance_rating
            evidence_quality_ratings[key] = analysis.evidence_quality
        
        # Privacy audit summary
        privacy_audit_summary = self.privacy_engine.get_privacy_budget_status()
        
        # Mock consent compliance (would integrate with actual consent system)
        consent_compliance_rate = 0.95  # 95% compliance rate
        
        # Data quality score (based on sample sizes and completeness)
        data_quality_score = self._calculate_data_quality_score(treatment_outcomes)
        
        return ClinicalIntelligenceReport(
            report_id=report_id,
            generated_at=datetime.now(),
            analysis_period=(start_date, end_date),
            privacy_level=self.privacy_level,
            treatment_outcomes=treatment_outcomes,
            recovery_rates=recovery_rates,
            improvement_rates=improvement_rates,
            utilization_metrics=utilization_metrics,
            engagement_patterns={},  # Placeholder - would analyze engagement data
            dropout_analysis={},     # Placeholder - would analyze dropout patterns
            risk_factor_trends={},   # Placeholder - would analyze risk factors
            intervention_effectiveness=intervention_effectiveness,
            service_optimization_recommendations=optimization_recommendations,
            assessment_validity=assessment_validity,
            clinical_significance_summary=clinical_significance_summary,
            evidence_quality_ratings=evidence_quality_ratings,
            privacy_audit_summary=privacy_audit_summary,
            consent_compliance_rate=consent_compliance_rate,
            data_quality_score=data_quality_score
        )
    
    def _generate_optimization_recommendations(
        self,
        treatment_outcomes: Dict[str, ClinicalOutcomeAnalysis],
        utilization_metrics: Dict[str, PrivateAnalysisResult],
        intervention_effectiveness: Dict[str, ClinicalOutcomeAnalysis]
    ) -> List[str]:
        """Generate service optimization recommendations based on analysis results."""
        
        recommendations = []
        
        # Analyze treatment outcomes for recommendations
        high_effectiveness_interventions = []
        low_effectiveness_interventions = []
        
        for key, analysis in treatment_outcomes.items():
            if analysis.clinical_significance_rating == 'high':
                high_effectiveness_interventions.append(key)
            elif analysis.clinical_significance_rating in ['low', 'none']:
                low_effectiveness_interventions.append(key)
        
        if high_effectiveness_interventions:
            recommendations.append(
                f"Expand high-effectiveness interventions: {', '.join(high_effectiveness_interventions[:3])}"
            )
        
        if low_effectiveness_interventions:
            recommendations.append(
                f"Review and improve low-effectiveness interventions: {', '.join(low_effectiveness_interventions[:3])}"
            )
        
        # Analyze utilization patterns
        if 'average_sessions_per_user' in utilization_metrics:
            avg_sessions_result = utilization_metrics['average_sessions_per_user']
            avg_sessions_value = avg_sessions_result.value
            if isinstance(avg_sessions_value, (int, float)):
                if avg_sessions_value < 3:
                    recommendations.append("Low session attendance detected. Consider engagement strategies.")
                elif avg_sessions_value > 15:
                    recommendations.append("High session usage detected. Assess capacity planning needs.")
        
        # Analyze completion rates
        completion_rates = {k: v for k, v in utilization_metrics.items() if 'completion_rate' in k}
        for service_type, rate_result in completion_rates.items():
            rate_value = rate_result.value
            if isinstance(rate_value, (int, float)) and rate_value < 0.6:  # Less than 60% completion
                service_name = service_type.replace('completion_rate_', '')
                recommendations.append(f"Improve completion rates for {service_name} service")
        
        # Intervention effectiveness recommendations
        for program_type, analysis in intervention_effectiveness.items():
            if analysis.clinical_significance_rating == 'high':
                recommendations.append(f"Consider scaling successful program: {program_type}")
            elif analysis.percentage_reliable_deterioration > 15:
                recommendations.append(f"Review program protocols for {program_type} due to deterioration concerns")
        
        # Generic recommendations if no specific patterns found
        if not recommendations:
            recommendations.extend([
                "Continue monitoring treatment outcomes for emerging patterns",
                "Maintain current service delivery approach based on stable metrics",
                "Consider implementing patient feedback collection for service improvement"
            ])
        
        return recommendations[:10]  # Limit to top 10 recommendations
    
    def _calculate_assessment_validity(self) -> Dict[str, float]:
        """Calculate validity scores for different assessment instruments."""
        
        validity_scores = {}
        
        for instrument in self.valid_instruments:
            # Query recent assessments for this instrument
            recent_assessments = self.db.query(ValidatedAssessment).filter(
                ValidatedAssessment.instrument_type == instrument,
                ValidatedAssessment.is_validated == True,
                ValidatedAssessment.assessment_date >= datetime.now() - timedelta(days=30)
            ).limit(100).all()
            
            if not recent_assessments:
                validity_scores[instrument] = 0.0
                continue
            
            # Calculate validity based on validation confidence
            confidence_scores = [a.validation_confidence for a in recent_assessments if a.validation_confidence]
            
            if confidence_scores:
                validity_scores[instrument] = sum(confidence_scores) / len(confidence_scores)
            else:
                validity_scores[instrument] = 0.8  # Default assuming good validity
        
        return validity_scores
    
    def _calculate_data_quality_score(
        self,
        treatment_outcomes: Dict[str, ClinicalOutcomeAnalysis]
    ) -> float:
        """Calculate overall data quality score based on sample sizes and completeness."""
        
        if not treatment_outcomes:
            return 0.0
        
        # Calculate based on sample sizes
        sample_sizes = [analysis.sample_size for analysis in treatment_outcomes.values()]
        avg_sample_size = sum(sample_sizes) / len(sample_sizes)
        
        # Score based on average sample size
        if avg_sample_size >= 50:
            size_score = 1.0
        elif avg_sample_size >= 20:
            size_score = 0.8
        elif avg_sample_size >= 10:
            size_score = 0.6
        else:
            size_score = 0.4
        
        # Score based on evidence quality
        evidence_scores = {
            'strong': 1.0,
            'moderate': 0.7,
            'weak': 0.4
        }
        
        evidence_ratings = [analysis.evidence_quality for analysis in treatment_outcomes.values()]
        avg_evidence_score = sum(evidence_scores.get(rating, 0.5) for rating in evidence_ratings) / len(evidence_ratings)
        
        # Combined score
        overall_score = (size_score * 0.6) + (avg_evidence_score * 0.4)
        
        return round(overall_score, 2)
    
    def create_clinical_insight(
        self,
        insight_text: str,
        insight_type: str,
        statistical_confidence: float,
        clinical_significance: str,
        supporting_data: Dict[str, Any],
        clinician_validated: bool = False
    ) -> ClinicalInsight:
        """
        Create and store a clinical insight with professional validation.
        
        Args:
            insight_text: The clinical insight description
            insight_type: Type of insight (outcome, service, population, etc.)
            statistical_confidence: Statistical confidence level (0-1)
            clinical_significance: Clinical significance rating
            supporting_data: Supporting statistical data
            clinician_validated: Whether insight has been validated by clinician
            
        Returns:
            ClinicalInsight object
        """
        
        insight = ClinicalInsight(
            insight_text=insight_text,
            insight_type=insight_type,
            statistical_confidence=statistical_confidence,
            clinical_significance=clinical_significance,
            supporting_data=supporting_data,
            clinician_validated=clinician_validated,
            generated_date=datetime.now()
        )
        
        self.db.add(insight)
        self.db.commit()
        
        logger.info(f"Created clinical insight: {insight_type} - {clinical_significance}")
        
        return insight