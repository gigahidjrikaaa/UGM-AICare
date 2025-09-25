"""Test script to verify the new clinical analytics system is working correctly."""

import sys
import os
from datetime import datetime, timedelta
import logging

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.statistical_analysis import StatisticalAnalysisEngine
from app.services.privacy_analytics import PrivacyPreservingAnalytics, PrivacyLevel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_statistical_engine():
    """Test the statistical analysis engine."""
    logger.info("Testing Statistical Analysis Engine...")
    
    engine = StatisticalAnalysisEngine()
    
    # Test descriptive statistics
    test_data = [10.0, 12.0, 14.0, 16.0, 18.0, 20.0, 22.0, 24.0, 26.0, 28.0]
    result = engine.descriptive_statistics(test_data)
    
    logger.info(f"Mean: {result.mean:.2f}")
    logger.info(f"Std Dev: {result.standard_deviation:.2f}")
    logger.info(f"Confidence Interval: ({result.confidence_interval[0]:.2f}, {result.confidence_interval[1]:.2f})")
    
    # Test clinical outcome analysis
    baseline_scores = [20.0, 18.0, 22.0, 19.0, 21.0, 17.0, 23.0, 20.0, 18.0, 19.0]
    followup_scores = [12.0, 10.0, 14.0, 11.0, 13.0, 9.0, 15.0, 12.0, 10.0, 11.0]
    
    clinical_analysis = engine.clinical_outcome_analysis(
        intervention_type="CBT",
        instrument_type="PHQ9",
        baseline_scores=baseline_scores,
        followup_scores=followup_scores
    )
    
    logger.info(f"Clinical Significance: {clinical_analysis.clinical_significance_rating}")
    logger.info(f"Effect Size: {clinical_analysis.improvement_effect_size:.3f}")
    logger.info(f"Reliable Improvement: {clinical_analysis.percentage_reliable_improvement:.1f}%")
    
    return True

def test_privacy_engine():
    """Test the privacy-preserving analytics engine."""
    logger.info("Testing Privacy-Preserving Analytics Engine...")
    
    privacy_engine = PrivacyPreservingAnalytics(
        default_privacy_level=PrivacyLevel.MEDIUM,
        global_epsilon_budget=10.0
    )
    
    # Test private mean calculation
    test_values = [15.5, 18.2, 16.8, 19.1, 17.3, 20.0, 16.5, 18.9, 17.7, 19.5]
    
    private_result = privacy_engine.private_mean_calculation(
        test_values,
        privacy_level=PrivacyLevel.MEDIUM
    )
    
    logger.info(f"Original Mean: {sum(test_values)/len(test_values):.2f}")
    logger.info(f"Private Mean: {private_result.value:.2f}")
    logger.info(f"Noise Added: {private_result.noise_added:.3f}")
    logger.info(f"Utility Score: {private_result.utility_score:.3f}")
    logger.info(f"Privacy Risk Score: {private_result.privacy_risk_score:.3f}")
    
    # Test count query
    count_result = privacy_engine.private_count_query(
        count_value=45,
        privacy_level=PrivacyLevel.MEDIUM
    )
    
    logger.info(f"Original Count: 45")
    logger.info(f"Private Count: {count_result.value}")
    
    # Check privacy budget
    budget_status = privacy_engine.get_privacy_budget_status()
    logger.info(f"Privacy Budget Used: {budget_status['budget_used_percentage']:.1f}%")
    
    return True

def test_trend_analysis():
    """Test trend analysis functionality."""
    logger.info("Testing Trend Analysis...")
    
    engine = StatisticalAnalysisEngine()
    
    # Create synthetic time series data
    start_date = datetime.now() - timedelta(days=30)
    time_series_data = []
    
    for i in range(30):
        date = start_date + timedelta(days=i)
        # Simulate improving trend (decreasing PHQ-9 scores)
        value = 20.0 - (i * 0.3) + (i % 3 * 0.5)  # Add some noise
        time_series_data.append((date, value))
    
    try:
        trend_result = engine.trend_analysis_with_forecasting(
            time_series_data=time_series_data,
            forecast_periods=7
        )
        
        logger.info(f"Trend Direction: {trend_result['trend_direction']}")
        logger.info(f"Trend Significant: {trend_result['trend_significant']}")
        logger.info(f"R-squared: {trend_result['r_squared']:.3f}")
        logger.info(f"Forecast Reliability: {trend_result['forecast_reliability']}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error in trend analysis test: {str(e)}")
        return False

def main():
    """Run all tests."""
    logger.info("=== Clinical Analytics System Test ===")
    
    success_count = 0
    total_tests = 3
    
    # Test 1: Statistical Engine
    try:
        if test_statistical_engine():
            success_count += 1
            logger.info("✅ Statistical Analysis Engine: PASSED")
        else:
            logger.error("❌ Statistical Analysis Engine: FAILED")
    except Exception as e:
        logger.error(f"❌ Statistical Analysis Engine: FAILED - {str(e)}")
    
    print("-" * 50)
    
    # Test 2: Privacy Engine  
    try:
        if test_privacy_engine():
            success_count += 1
            logger.info("✅ Privacy-Preserving Analytics: PASSED")
        else:
            logger.error("❌ Privacy-Preserving Analytics: FAILED")
    except Exception as e:
        logger.error(f"❌ Privacy-Preserving Analytics: FAILED - {str(e)}")
    
    print("-" * 50)
    
    # Test 3: Trend Analysis
    try:
        if test_trend_analysis():
            success_count += 1
            logger.info("✅ Trend Analysis: PASSED")
        else:
            logger.error("❌ Trend Analysis: FAILED")
    except Exception as e:
        logger.error(f"❌ Trend Analysis: FAILED - {str(e)}")
    
    print("=" * 50)
    logger.info(f"Test Results: {success_count}/{total_tests} tests passed")
    
    if success_count == total_tests:
        logger.info("🎉 All tests passed! Clinical Analytics System is ready.")
        return 0
    else:
        logger.error("⚠️  Some tests failed. Please review the errors above.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)