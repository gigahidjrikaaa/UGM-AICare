"""Statistical Analysis Engine for Clinical Analytics.

This module provides rigorous statistical analysis for clinical mental health data,
focusing on evidence-based outcomes measurement and proper statistical inference.
"""

from typing import List, Tuple, Optional, Dict, Any, Union
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging

# Statistical libraries
import numpy as np
import scipy.stats as stats
from scipy.stats import ttest_1samp, ttest_ind, chi2_contingency

# Type hints
from pydantic import BaseModel

logger = logging.getLogger(__name__)


@dataclass
class StatisticalResult:
    """Comprehensive statistical analysis result with proper confidence measures."""
    
    # Sample characteristics
    sample_size: int
    mean: float
    standard_deviation: float
    median: float
    
    # Confidence intervals
    confidence_interval: Tuple[float, float]
    confidence_level: float
    
    # Hypothesis testing
    test_statistic: Optional[float] = None
    p_value: Optional[float] = None
    statistically_significant: Optional[bool] = None
    alpha_level: float = 0.05
    
    # Effect size measures
    effect_size: Optional[float] = None
    effect_size_type: Optional[str] = None  # cohens_d, eta_squared, etc.
    effect_size_interpretation: Optional[str] = None
    
    # Distribution information
    normality_test_p: Optional[float] = None
    is_normally_distributed: Optional[bool] = None
    
    # Additional descriptive statistics
    quartiles: Optional[Tuple[float, float, float]] = None  # Q1, Q2, Q3
    interquartile_range: Optional[float] = None
    outlier_count: Optional[int] = None


@dataclass
class ClinicalOutcomeAnalysis:
    """Comprehensive clinical treatment outcome analysis."""
    
    # Basic information
    intervention_type: str
    instrument_type: str
    sample_size: int
    
    # Assessment data
    baseline_scores: List[float]
    followup_scores: List[float]
    time_between_assessments_days: List[int]
    
    # Statistical analysis
    paired_t_test_result: StatisticalResult
    improvement_effect_size: float
    
    # Clinical significance
    minimal_clinically_important_difference: float
    mcid_threshold_met: bool
    percentage_achieving_mcid: float
    
    # Reliable Change Index
    reliable_change_indices: List[float]
    percentage_reliable_improvement: float
    percentage_reliable_deterioration: float
    percentage_no_reliable_change: float
    
    # Recovery rates
    recovery_rate: float  # Percentage moving from clinical to non-clinical range
    deterioration_rate: float  # Percentage getting significantly worse
    
    # Clinical interpretation
    clinical_significance_rating: str  # "high", "moderate", "low", "none"
    evidence_quality: str  # "strong", "moderate", "weak"
    
    # Recommendations
    clinical_recommendations: List[str]


class StatisticalAnalysisEngine:
    """
    Statistical analysis engine for clinical mental health data.
    
    Provides rigorous statistical analysis including:
    - Proper hypothesis testing with effect sizes
    - Clinical significance assessment
    - Confidence intervals for all estimates
    - Normality testing and assumption checking
    - Multiple comparison corrections
    """
    
    def __init__(self, alpha_level: float = 0.05, confidence_level: float = 0.95):
        self.alpha_level = alpha_level
        self.confidence_level = confidence_level
        
        # Clinical significance thresholds (Minimal Clinically Important Differences)
        self.mcid_thresholds = {
            'PHQ9': 5.0,      # Depression (PHQ-9)
            'GAD7': 4.0,      # Anxiety (GAD-7) 
            'PSS': 7.0,       # Perceived Stress Scale
            'DASS21': {       # Depression, Anxiety, Stress Scale
                'depression': 2.3,
                'anxiety': 1.9,
                'stress': 3.7
            },
            'K10': 4.0,       # Kessler Psychological Distress Scale
            'SWLS': 3.0,      # Satisfaction with Life Scale
            'WEMWBS': 4.0     # Warwick-Edinburgh Mental Well-being Scale
        }
        
        # Test-retest reliability coefficients for instruments
        self.reliability_coefficients = {
            'PHQ9': 0.84,
            'GAD7': 0.83,
            'PSS': 0.85,
            'DASS21': 0.85,
            'K10': 0.86,
            'SWLS': 0.82,
            'WEMWBS': 0.83
        }
        
        # Clinical cut-off scores (thresholds for clinical significance)
        self.clinical_cutoffs = {
            'PHQ9': {'minimal': 4, 'mild': 5, 'moderate': 10, 'severe': 15},
            'GAD7': {'minimal': 4, 'mild': 5, 'moderate': 10, 'severe': 15},
            'PSS': {'low': 13, 'moderate': 20, 'high': 27},  # Out of 40
        }
    
    def descriptive_statistics(self, data: List[float]) -> StatisticalResult:
        """Calculate comprehensive descriptive statistics with confidence intervals."""
        
        if not data or len(data) < 2:
            raise ValueError("Need at least 2 data points for statistical analysis")
        
        data_array = np.array(data)
        n = len(data_array)
        
        # Basic descriptive statistics
        mean = np.mean(data_array)
        std = np.std(data_array, ddof=1)  # Sample standard deviation
        median = np.median(data_array)
        
        # Confidence interval for mean
        sem = stats.sem(data_array)  # Standard error of mean
        t_critical = stats.t.ppf((1 + self.confidence_level) / 2, n - 1)
        margin_error = t_critical * sem
        ci_lower = mean - margin_error
        ci_upper = mean + margin_error
        
        # Quartiles and IQR
        q1, q2, q3 = np.percentile(data_array, [25, 50, 75])
        iqr = q3 - q1
        
        # Outlier detection (using IQR method)
        lower_fence = q1 - 1.5 * iqr
        upper_fence = q3 + 1.5 * iqr
        outliers = data_array[(data_array < lower_fence) | (data_array > upper_fence)]
        outlier_count = len(outliers)
        
        # Normality test (Shapiro-Wilk for n < 50, otherwise Anderson-Darling)
        if n < 50:
            normality_stat, normality_p = stats.shapiro(data_array)
        else:
            normality_result = stats.anderson(data_array, dist='norm')
            normality_p = None  # Anderson-Darling doesn't provide p-value directly
        
        is_normal = normality_p > self.alpha_level if normality_p is not None else None
        
        return StatisticalResult(
            sample_size=n,
            mean=mean,
            standard_deviation=std,
            median=median,
            confidence_interval=(ci_lower, ci_upper),
            confidence_level=self.confidence_level,
            normality_test_p=normality_p,
            is_normally_distributed=is_normal,
            quartiles=(q1, q2, q3),
            interquartile_range=iqr,
            outlier_count=outlier_count
        )
    
    def paired_t_test_analysis(
        self,
        baseline_scores: List[float],
        followup_scores: List[float]
    ) -> StatisticalResult:
        """
        Comprehensive paired t-test analysis for pre-post treatment outcomes.
        
        Args:
            baseline_scores: Pre-treatment assessment scores
            followup_scores: Post-treatment assessment scores
            
        Returns:
            StatisticalResult with paired t-test analysis
        """
        
        if len(baseline_scores) != len(followup_scores):
            raise ValueError("Baseline and follow-up scores must have equal length")
        
        if len(baseline_scores) < 3:
            raise ValueError("Need at least 3 paired observations for meaningful analysis")
        
        baseline_array = np.array(baseline_scores)
        followup_array = np.array(followup_scores)
        differences = followup_array - baseline_array  # Positive = improvement
        
        n = len(differences)
        mean_diff = np.mean(differences)
        std_diff = np.std(differences, ddof=1)
        
        # Paired t-test
        t_statistic, p_value = ttest_1samp(differences, 0)
        
        # Effect size (Cohen's d for paired samples)
        # d = mean_difference / standard_deviation_of_differences
        cohens_d = mean_diff / std_diff if std_diff > 0 else 0
        
        # Effect size interpretation
        abs_d = abs(cohens_d)
        if abs_d < 0.2:
            effect_interpretation = "negligible"
        elif abs_d < 0.5:
            effect_interpretation = "small"
        elif abs_d < 0.8:
            effect_interpretation = "medium"
        else:
            effect_interpretation = "large"
        
        # Confidence interval for mean difference
        sem = stats.sem(differences)
        t_critical = stats.t.ppf((1 + self.confidence_level) / 2, n - 1)
        margin_error = t_critical * sem
        ci_lower = mean_diff - margin_error
        ci_upper = mean_diff + margin_error
        
        # Statistical significance
        is_significant = p_value < self.alpha_level
        
        return StatisticalResult(
            sample_size=n,
            mean=mean_diff,
            standard_deviation=std_diff,
            median=np.median(differences),
            confidence_interval=(ci_lower, ci_upper),
            confidence_level=self.confidence_level,
            test_statistic=t_statistic,
            p_value=p_value,
            statistically_significant=is_significant,
            alpha_level=self.alpha_level,
            effect_size=cohens_d,
            effect_size_type="cohens_d",
            effect_size_interpretation=effect_interpretation
        )
    
    def clinical_outcome_analysis(
        self,
        intervention_type: str,
        instrument_type: str,
        baseline_scores: List[float],
        followup_scores: List[float],
        time_between_assessments: Optional[List[int]] = None
    ) -> ClinicalOutcomeAnalysis:
        """
        Comprehensive clinical outcome analysis including statistical and clinical significance.
        
        Args:
            intervention_type: Type of intervention (e.g., "CBT", "DBT", "Mindfulness")
            instrument_type: Assessment instrument (e.g., "PHQ9", "GAD7")
            baseline_scores: Pre-treatment scores
            followup_scores: Post-treatment scores
            time_between_assessments: Days between assessments (optional)
            
        Returns:
            ClinicalOutcomeAnalysis with comprehensive results
        """
        
        if len(baseline_scores) != len(followup_scores):
            raise ValueError("Baseline and follow-up scores must have equal length")
        
        n = len(baseline_scores)
        if n < 10:
            logger.warning(f"Small sample size (n={n}) may limit statistical power")
        
        # Statistical analysis
        statistical_result = self.paired_t_test_analysis(baseline_scores, followup_scores)
        
        # Get clinical parameters for this instrument
        mcid_threshold = self.mcid_thresholds.get(instrument_type, 0)
        reliability = self.reliability_coefficients.get(instrument_type, 0.80)
        
        # Clinical significance analysis
        differences = np.array(followup_scores) - np.array(baseline_scores)
        
        # MCID analysis (usually negative difference indicates improvement for most scales)
        mcid_threshold_met = abs(statistical_result.mean) >= mcid_threshold
        achieving_mcid = np.sum(np.abs(differences) >= mcid_threshold)
        percentage_achieving_mcid = (achieving_mcid / n) * 100
        
        # Reliable Change Index (RCI) analysis
        # RCI = (score2 - score1) / SE_diff
        # SE_diff = SD * sqrt(2) * sqrt(1 - reliability)
        pooled_sd = np.sqrt((np.var(baseline_scores, ddof=1) + np.var(followup_scores, ddof=1)) / 2)
        se_measurement = pooled_sd * np.sqrt(1 - reliability)
        se_diff = se_measurement * np.sqrt(2)
        
        # Calculate RCI for each participant
        rci_scores = differences / se_diff if se_diff > 0 else np.zeros_like(differences)
        
        # RCI interpretation (|RCI| > 1.96 indicates reliable change)
        reliable_improvement = np.sum(rci_scores < -1.96)  # Negative = improvement for most scales
        reliable_deterioration = np.sum(rci_scores > 1.96)  # Positive = deterioration
        no_reliable_change = n - reliable_improvement - reliable_deterioration
        
        percentage_reliable_improvement = (reliable_improvement / n) * 100
        percentage_reliable_deterioration = (reliable_deterioration / n) * 100
        percentage_no_reliable_change = (no_reliable_change / n) * 100
        
        # Clinical ranges analysis (if cutoff scores available)
        recovery_rate = 0.0
        deterioration_rate = 0.0
        
        if instrument_type in self.clinical_cutoffs:
            cutoffs = self.clinical_cutoffs[instrument_type]
            clinical_threshold = cutoffs.get('mild', cutoffs.get('moderate', 0))
            
            # Count participants moving from clinical to non-clinical range
            baseline_clinical = np.array(baseline_scores) >= clinical_threshold
            followup_nonclinical = np.array(followup_scores) < clinical_threshold
            recovered = baseline_clinical & followup_nonclinical
            recovery_rate = (np.sum(recovered) / n) * 100
            
            # Count participants moving from non-clinical to clinical range
            baseline_nonclinical = np.array(baseline_scores) < clinical_threshold
            followup_clinical = np.array(followup_scores) >= clinical_threshold
            deteriorated = baseline_nonclinical & followup_clinical
            deterioration_rate = (np.sum(deteriorated) / n) * 100
        
        # Clinical significance rating
        if mcid_threshold_met and percentage_achieving_mcid >= 50 and statistical_result.statistically_significant:
            if abs(statistical_result.effect_size) >= 0.8:
                significance_rating = "high"
            else:
                significance_rating = "moderate"
        elif mcid_threshold_met or statistical_result.statistically_significant:
            significance_rating = "low"
        else:
            significance_rating = "none"
        
        # Evidence quality assessment
        if n >= 30 and statistical_result.statistically_significant and abs(statistical_result.effect_size) >= 0.5:
            evidence_quality = "strong"
        elif n >= 15 and (statistical_result.statistically_significant or abs(statistical_result.effect_size) >= 0.3):
            evidence_quality = "moderate"
        else:
            evidence_quality = "weak"
        
        # Generate clinical recommendations
        recommendations = []
        if significance_rating in ["high", "moderate"]:
            recommendations.append(f"{intervention_type} shows clinically meaningful improvements for {instrument_type}")
        if percentage_reliable_improvement >= 60:
            recommendations.append("Majority of participants show reliable improvement - consider expanding program")
        if percentage_reliable_deterioration >= 20:
            recommendations.append("Significant deterioration rate - review intervention protocol and screening")
        if evidence_quality == "weak":
            recommendations.append("Increase sample size for more robust evidence")
        
        return ClinicalOutcomeAnalysis(
            intervention_type=intervention_type,
            instrument_type=instrument_type,
            sample_size=n,
            baseline_scores=baseline_scores,
            followup_scores=followup_scores,
            time_between_assessments_days=time_between_assessments or [],
            paired_t_test_result=statistical_result,
            improvement_effect_size=statistical_result.effect_size,
            minimal_clinically_important_difference=mcid_threshold,
            mcid_threshold_met=mcid_threshold_met,
            percentage_achieving_mcid=percentage_achieving_mcid,
            reliable_change_indices=rci_scores.tolist(),
            percentage_reliable_improvement=percentage_reliable_improvement,
            percentage_reliable_deterioration=percentage_reliable_deterioration,
            percentage_no_reliable_change=percentage_no_reliable_change,
            recovery_rate=recovery_rate,
            deterioration_rate=deterioration_rate,
            clinical_significance_rating=significance_rating,
            evidence_quality=evidence_quality,
            clinical_recommendations=recommendations
        )
    
    def trend_analysis_with_forecasting(
        self,
        time_series_data: List[Tuple[datetime, float]],
        forecast_periods: int = 30
    ) -> Dict[str, Any]:
        """
        Time series trend analysis with statistical forecasting and confidence intervals.
        
        Args:
            time_series_data: List of (datetime, value) tuples
            forecast_periods: Number of periods to forecast
            
        Returns:
            Dictionary with trend analysis results
        """
        
        if len(time_series_data) < 10:
            raise ValueError("Need at least 10 time points for reliable trend analysis")
        
        # Sort by date
        sorted_data = sorted(time_series_data, key=lambda x: x[0])
        dates, values = zip(*sorted_data)
        
        # Convert dates to numerical format (days since first observation)
        date_nums = [(d - dates[0]).days for d in dates]
        values_array = np.array(values)
        
        # Linear regression for trend
        slope, intercept, r_value, p_value, std_err = stats.linregress(date_nums, values_array)
        
        # R-squared and adjusted R-squared
        r_squared = r_value ** 2
        n = len(values_array)
        adj_r_squared = 1 - (1 - r_squared) * (n - 1) / (n - 2)
        
        # Residual analysis
        predicted_values = slope * np.array(date_nums) + intercept
        residuals = values_array - predicted_values
        residual_std = np.std(residuals, ddof=2)  # df = n - 2 for linear regression
        
        # Forecast future values
        last_date_num = date_nums[-1]
        forecast_date_nums = [last_date_num + i for i in range(1, forecast_periods + 1)]
        forecast_values = [slope * x + intercept for x in forecast_date_nums]
        
        # Generate forecast dates
        forecast_dates = [dates[-1] + timedelta(days=i) for i in range(1, forecast_periods + 1)]
        
        # Prediction intervals (95% confidence)
        t_critical = stats.t.ppf(0.975, n - 2)  # df = n - 2
        
        forecast_std_errors = []
        forecast_lower = []
        forecast_upper = []
        
        mean_x = np.mean(date_nums)
        sum_sq_x = np.sum([(x - mean_x) ** 2 for x in date_nums])
        
        for x_forecast in forecast_date_nums:
            # Standard error of prediction
            se_pred = residual_std * np.sqrt(1 + 1/n + (x_forecast - mean_x)**2 / sum_sq_x)
            forecast_std_errors.append(se_pred)
            
            # Prediction intervals
            margin = t_critical * se_pred
            y_forecast = slope * x_forecast + intercept
            forecast_lower.append(y_forecast - margin)
            forecast_upper.append(y_forecast + margin)
        
        # Trend direction and significance
        trend_direction = "increasing" if slope > 0 else "decreasing" if slope < 0 else "stable"
        trend_significant = p_value < self.alpha_level
        
        # Autocorrelation check (Durbin-Watson test)
        try:
            from statsmodels.stats.diagnostic import durbin_watson
            dw_statistic = durbin_watson(residuals)
        except ImportError:
            # Fallback: simple autocorrelation check
            if len(residuals) > 1:
                lag1_corr = np.corrcoef(residuals[:-1], residuals[1:])[0, 1]
                dw_statistic = 2 * (1 - lag1_corr) if not np.isnan(lag1_corr) else 2.0
            else:
                dw_statistic = 2.0
        
        return {
            # Trend parameters
            'slope': slope,
            'intercept': intercept,
            'r_squared': r_squared,
            'adjusted_r_squared': adj_r_squared,
            'trend_p_value': p_value,
            'standard_error': std_err,
            
            # Trend interpretation
            'trend_direction': trend_direction,
            'trend_significant': trend_significant,
            'trend_strength': 'strong' if r_squared >= 0.7 else 'moderate' if r_squared >= 0.3 else 'weak',
            
            # Forecast results
            'forecast_dates': forecast_dates,
            'forecast_values': forecast_values,
            'forecast_lower_bound': forecast_lower,
            'forecast_upper_bound': forecast_upper,
            'forecast_confidence_level': 0.95,
            
            # Model diagnostics
            'residual_standard_error': residual_std,
            'durbin_watson_statistic': dw_statistic,
            'autocorrelation_concern': dw_statistic < 1.5 or dw_statistic > 2.5,
            
            # Data quality
            'sample_size': n,
            'forecast_reliability': 'high' if n >= 50 and r_squared >= 0.5 else 'moderate' if n >= 20 else 'low'
        }
    
    def service_comparison_analysis(
        self,
        group_a_outcomes: List[float],
        group_b_outcomes: List[float],
        group_a_name: str = "Group A",
        group_b_name: str = "Group B"
    ) -> Dict[str, Any]:
        """
        Compare outcomes between two service delivery approaches.
        
        Args:
            group_a_outcomes: Outcomes for first group/service
            group_b_outcomes: Outcomes for second group/service
            group_a_name: Name of first group
            group_b_name: Name of second group
            
        Returns:
            Dictionary with comparison analysis results
        """
        
        if len(group_a_outcomes) < 3 or len(group_b_outcomes) < 3:
            raise ValueError("Need at least 3 observations per group for comparison")
        
        # Independent samples t-test
        t_statistic, p_value = ttest_ind(group_a_outcomes, group_b_outcomes)
        
        # Descriptive statistics for each group
        group_a_stats = self.descriptive_statistics(group_a_outcomes)
        group_b_stats = self.descriptive_statistics(group_b_outcomes)
        
        # Effect size (Cohen's d for independent samples)
        pooled_std = np.sqrt(((len(group_a_outcomes) - 1) * group_a_stats.standard_deviation**2 + 
                             (len(group_b_outcomes) - 1) * group_b_stats.standard_deviation**2) / 
                            (len(group_a_outcomes) + len(group_b_outcomes) - 2))
        
        cohens_d = (group_a_stats.mean - group_b_stats.mean) / pooled_std if pooled_std > 0 else 0
        
        # Effect size interpretation
        abs_d = abs(cohens_d)
        if abs_d < 0.2:
            effect_interpretation = "negligible"
        elif abs_d < 0.5:
            effect_interpretation = "small"
        elif abs_d < 0.8:
            effect_interpretation = "medium"
        else:
            effect_interpretation = "large"
        
        # Statistical significance
        is_significant = p_value < self.alpha_level
        
        # Practical significance (difference in means relative to pooled SD)
        mean_difference = group_a_stats.mean - group_b_stats.mean
        
        return {
            'group_a_name': group_a_name,
            'group_b_name': group_b_name,
            'group_a_stats': group_a_stats,
            'group_b_stats': group_b_stats,
            'mean_difference': mean_difference,
            't_statistic': t_statistic,
            'p_value': p_value,
            'statistically_significant': is_significant,
            'effect_size': cohens_d,
            'effect_size_interpretation': effect_interpretation,
            'better_performing_group': group_a_name if group_a_stats.mean > group_b_stats.mean else group_b_name,
            'recommendation': self._generate_comparison_recommendation(
                is_significant, abs_d, group_a_name, group_b_name, group_a_stats.mean > group_b_stats.mean
            )
        }
    
    def _generate_comparison_recommendation(
        self, 
        significant: bool, 
        effect_size: float, 
        group_a: str, 
        group_b: str, 
        a_better: bool
    ) -> str:
        """Generate clinical recommendation based on comparison analysis."""
        
        better_group = group_a if a_better else group_b
        
        if significant and effect_size >= 0.5:
            return f"{better_group} shows significantly better outcomes with medium-to-large effect size. Recommend adopting this approach."
        elif significant and effect_size >= 0.2:
            return f"{better_group} shows statistically significant improvement with small effect size. Consider piloting this approach."
        elif effect_size >= 0.5:
            return f"{better_group} shows large practical difference but not statistically significant (possibly due to small sample size). Recommend further investigation."
        else:
            return "No meaningful difference detected between approaches. Both appear equally effective."