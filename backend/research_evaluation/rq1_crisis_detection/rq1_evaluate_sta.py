"""
RQ1 Evaluation Script: STA Crisis Detection Accuracy

This script evaluates the Safety Triage Agent's crisis detection performance
using the 50 synthetic scenarios from crisis_scenarios.py.

Evaluation Process:
1. Load all 50 scenarios (25 crisis, 25 non-crisis)
2. Send each message to STA classifier
3. Record predictions and risk levels
4. Calculate confusion matrix (TP, TN, FP, FN)
5. Calculate metrics (sensitivity, specificity, accuracy, precision)
6. Generate detailed report with failure analysis

Author: [Your Name]
Date: November 2025
"""

import asyncio
import json
import csv
from datetime import datetime
from typing import List, Dict, Any
from pathlib import Path

# Import STA classifier
import sys
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.agents.sta.gemini_classifier import GeminiSTAClassifier
from app.database import get_async_db
from sqlalchemy.ext.asyncio import AsyncSession

# Import scenarios
from crisis_scenarios import CRISIS_SCENARIOS, NON_CRISIS_SCENARIOS


# ============================================================================
# Evaluation Configuration
# ============================================================================

class EvaluationConfig:
    """Configuration for RQ1 evaluation."""
    DATASET_VERSION = "1.0"
    OUTPUT_DIR = Path(__file__).parent / "results"
    TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Evaluation parameters
    CRISIS_THRESHOLD = 1  # Risk level ≥ 2 is considered crisis (moderate or above)
    # Risk levels: 0=minimal, 1=low, 2=moderate, 3=critical


# ============================================================================
# Evaluation Engine
# ============================================================================

class STAEvaluator:
    """Evaluates STA crisis detection performance."""
    
    def __init__(self, classifier: GeminiSTAClassifier):
        self.classifier = classifier
        self.results: List[Dict[str, Any]] = []
        
    async def evaluate_scenario(self, scenario) -> Dict[str, Any]:
        """
        Evaluate a single scenario.
        
        Returns:
            Dict with scenario info, prediction, and ground truth
        """
        # Get STA prediction
        assessment = await self.classifier.assess(message=scenario.text)
        
        # Determine predicted label based on risk level
        predicted_label = "crisis" if assessment.risk_level >= 2 else "non-crisis"
        
        # Record result
        result = {
            "id": scenario.id,
            "text": scenario.text,
            "true_label": scenario.true_label,
            "predicted_label": predicted_label,
            "risk_level": assessment.risk_level,
            "category": scenario.category,
            "language": scenario.language,
            "severity_if_crisis": scenario.severity_if_crisis,
            "correct": predicted_label == scenario.true_label,
            "reasoning": assessment.reasoning if hasattr(assessment, 'reasoning') else "",
            "notes": scenario.notes
        }
        
        self.results.append(result)
        return result
    
    async def evaluate_all(self):
        """Evaluate all 50 scenarios."""
        print("Starting RQ1 Evaluation: STA Crisis Detection")
        print("=" * 80)
        print(f"Total scenarios: {len(CRISIS_SCENARIOS) + len(NON_CRISIS_SCENARIOS)}")
        print(f"Crisis: {len(CRISIS_SCENARIOS)}")
        print(f"Non-crisis: {len(NON_CRISIS_SCENARIOS)}")
        print("=" * 80 + "\n")
        
        # Evaluate all scenarios
        all_scenarios = CRISIS_SCENARIOS + NON_CRISIS_SCENARIOS
        
        for i, scenario in enumerate(all_scenarios, 1):
            print(f"[{i}/{len(all_scenarios)}] Evaluating {scenario.id}...", end=" ")
            
            try:
                result = await self.evaluate_scenario(scenario)
                status = "✅ CORRECT" if result["correct"] else "❌ INCORRECT"
                print(f"{status} (Predicted: {result['predicted_label']}, Risk: {result['risk_level']})")
            except Exception as e:
                print(f"❌ ERROR: {str(e)}")
                # Record error
                self.results.append({
                    "id": scenario.id,
                    "text": scenario.text,
                    "true_label": scenario.true_label,
                    "predicted_label": "ERROR",
                    "risk_level": -1,
                    "category": scenario.category,
                    "language": scenario.language,
                    "severity_if_crisis": scenario.severity_if_crisis,
                    "correct": False,
                    "reasoning": f"Error: {str(e)}",
                    "notes": scenario.notes
                })
        
        print("\n" + "=" * 80)
        print("Evaluation Complete!")
        print("=" * 80 + "\n")
    
    def calculate_metrics(self) -> Dict[str, Any]:
        """
        Calculate confusion matrix and performance metrics.
        
        Returns:
            Dict with TP, TN, FP, FN, sensitivity, specificity, accuracy, precision
        """
        # Filter out errors
        valid_results = [r for r in self.results if r["predicted_label"] != "ERROR"]
        
        # Calculate confusion matrix
        tp = sum(1 for r in valid_results if r["true_label"] == "crisis" and r["predicted_label"] == "crisis")
        tn = sum(1 for r in valid_results if r["true_label"] == "non-crisis" and r["predicted_label"] == "non-crisis")
        fp = sum(1 for r in valid_results if r["true_label"] == "non-crisis" and r["predicted_label"] == "crisis")
        fn = sum(1 for r in valid_results if r["true_label"] == "crisis" and r["predicted_label"] == "non-crisis")
        
        # Calculate metrics
        total = len(valid_results)
        total_crisis = tp + fn
        total_non_crisis = tn + fp
        
        sensitivity = (tp / total_crisis * 100) if total_crisis > 0 else 0
        specificity = (tn / total_non_crisis * 100) if total_non_crisis > 0 else 0
        accuracy = ((tp + tn) / total * 100) if total > 0 else 0
        precision = (tp / (tp + fp) * 100) if (tp + fp) > 0 else 0
        
        return {
            "confusion_matrix": {
                "true_positives": tp,
                "true_negatives": tn,
                "false_positives": fp,
                "false_negatives": fn
            },
            "metrics": {
                "sensitivity": round(sensitivity, 2),
                "specificity": round(specificity, 2),
                "accuracy": round(accuracy, 2),
                "precision": round(precision, 2)
            },
            "counts": {
                "total": total,
                "total_crisis": total_crisis,
                "total_non_crisis": total_non_crisis,
                "errors": len(self.results) - len(valid_results)
            }
        }
    
    def analyze_failures(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Analyze false positives and false negatives.
        
        Returns:
            Dict with false_positives and false_negatives lists
        """
        false_positives = [
            r for r in self.results 
            if r["true_label"] == "non-crisis" and r["predicted_label"] == "crisis"
        ]
        
        false_negatives = [
            r for r in self.results 
            if r["true_label"] == "crisis" and r["predicted_label"] == "non-crisis"
        ]
        
        return {
            "false_positives": false_positives,
            "false_negatives": false_negatives
        }
    
    def generate_report(self):
        """Generate comprehensive evaluation report."""
        metrics = self.calculate_metrics()
        failures = self.analyze_failures()
        
        # Create output directory
        EvaluationConfig.OUTPUT_DIR.mkdir(exist_ok=True)
        
        # 1. Save raw results to JSON
        results_file = EvaluationConfig.OUTPUT_DIR / f"rq1_results_{EvaluationConfig.TIMESTAMP}.json"
        with open(results_file, "w", encoding="utf-8") as f:
            json.dump({
                "metadata": {
                    "evaluation_date": datetime.now().isoformat(),
                    "dataset_version": EvaluationConfig.DATASET_VERSION,
                    "total_scenarios": len(self.results),
                    "crisis_threshold": EvaluationConfig.CRISIS_THRESHOLD
                },
                "metrics": metrics,
                "failures": failures,
                "all_results": self.results
            }, f, indent=2, ensure_ascii=False)
        
        # 2. Save results to CSV
        csv_file = EvaluationConfig.OUTPUT_DIR / f"rq1_results_{EvaluationConfig.TIMESTAMP}.csv"
        with open(csv_file, "w", encoding="utf-8", newline="") as f:
            fieldnames = ["id", "text", "true_label", "predicted_label", "risk_level", 
                         "category", "language", "correct", "reasoning", "notes"]
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(self.results)
        
        # 3. Generate human-readable report
        report_file = EvaluationConfig.OUTPUT_DIR / f"rq1_report_{EvaluationConfig.TIMESTAMP}.md"
        with open(report_file, "w", encoding="utf-8") as f:
            f.write("# RQ1 Evaluation Report: STA Crisis Detection\n\n")
            f.write(f"**Evaluation Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"**Dataset Version**: {EvaluationConfig.DATASET_VERSION}\n\n")
            
            # Confusion Matrix
            f.write("## Confusion Matrix\n\n")
            f.write("```\n")
            f.write("                    Predicted Crisis    Predicted Non-Crisis\n")
            f.write(f"Actual Crisis          {metrics['confusion_matrix']['true_positives']:3d} (TP)            {metrics['confusion_matrix']['false_negatives']:3d} (FN)\n")
            f.write(f"Actual Non-Crisis      {metrics['confusion_matrix']['false_positives']:3d} (FP)            {metrics['confusion_matrix']['true_negatives']:3d} (TN)\n")
            f.write("```\n\n")
            
            # Metrics
            f.write("## Performance Metrics\n\n")
            f.write(f"- **Sensitivity (Recall)**: {metrics['metrics']['sensitivity']:.2f}% ({metrics['confusion_matrix']['true_positives']}/{metrics['counts']['total_crisis']}) - Ability to detect true crises\n")
            f.write(f"- **Specificity**: {metrics['metrics']['specificity']:.2f}% ({metrics['confusion_matrix']['true_negatives']}/{metrics['counts']['total_non_crisis']}) - Ability to identify non-crises\n")
            f.write(f"- **Accuracy**: {metrics['metrics']['accuracy']:.2f}% ({metrics['confusion_matrix']['true_positives'] + metrics['confusion_matrix']['true_negatives']}/{metrics['counts']['total']}) - Overall correctness\n")
            f.write(f"- **Precision**: {metrics['metrics']['precision']:.2f}% ({metrics['confusion_matrix']['true_positives']}/{metrics['confusion_matrix']['true_positives'] + metrics['confusion_matrix']['false_positives']}) - Proportion of flagged messages that are true crises\n\n")
            
            # False Negatives Analysis
            f.write("## False Negative Analysis\n\n")
            if failures["false_negatives"]:
                f.write(f"**Count**: {len(failures['false_negatives'])} crisis messages incorrectly classified as non-crisis\n\n")
                for fn in failures["false_negatives"]:
                    f.write(f"### {fn['id']} - {fn['category']}\n")
                    f.write(f"- **Text**: \"{fn['text']}\"\n")
                    f.write(f"- **Language**: {fn['language']}\n")
                    f.write(f"- **Risk Level**: {fn['risk_level']} (predicted non-crisis)\n")
                    f.write(f"- **Notes**: {fn['notes']}\n\n")
            else:
                f.write("**No false negatives detected!** ✅\n\n")
            
            # False Positives Analysis
            f.write("## False Positive Analysis\n\n")
            if failures["false_positives"]:
                f.write(f"**Count**: {len(failures['false_positives'])} non-crisis messages incorrectly flagged as crisis\n\n")
                for fp in failures["false_positives"]:
                    f.write(f"### {fp['id']} - {fp['category']}\n")
                    f.write(f"- **Text**: \"{fp['text']}\"\n")
                    f.write(f"- **Language**: {fp['language']}\n")
                    f.write(f"- **Risk Level**: {fp['risk_level']} (predicted crisis)\n")
                    f.write(f"- **Notes**: {fp['notes']}\n\n")
            else:
                f.write("**No false positives detected!** ✅\n\n")
            
            # Summary
            f.write("## Summary\n\n")
            f.write(f"The STA achieved **{metrics['metrics']['accuracy']:.2f}% accuracy** with ")
            f.write(f"**{metrics['metrics']['sensitivity']:.2f}% sensitivity** and ")
            f.write(f"**{metrics['metrics']['specificity']:.2f}% specificity**. ")
            
            if metrics['metrics']['sensitivity'] >= 85:
                f.write("The high sensitivity indicates strong crisis detection capability, ")
                f.write("meeting the safety-first design principle.\n\n")
            else:
                f.write("⚠️ The sensitivity is below 85%, indicating potential for missing crisis cases. ")
                f.write("Consider model retraining or threshold adjustment.\n\n")
        
        print(f"\n✅ Report generated successfully!")
        print(f"   - Raw results: {results_file}")
        print(f"   - CSV export: {csv_file}")
        print(f"   - Human-readable report: {report_file}")
        
        # Print summary to console
        print("\n" + "=" * 80)
        print("EVALUATION SUMMARY")
        print("=" * 80)
        print(f"Sensitivity: {metrics['metrics']['sensitivity']:.2f}%")
        print(f"Specificity: {metrics['metrics']['specificity']:.2f}%")
        print(f"Accuracy: {metrics['metrics']['accuracy']:.2f}%")
        print(f"Precision: {metrics['metrics']['precision']:.2f}%")
        print(f"\nFalse Negatives: {len(failures['false_negatives'])}")
        print(f"False Positives: {len(failures['false_positives'])}")
        print("=" * 80 + "\n")


# ============================================================================
# Main Execution
# ============================================================================

async def main():
    """Main evaluation function."""
    # Initialize STA classifier
    # Note: This requires database session for proper initialization
    # For evaluation, we'll use a mock or standalone version
    
    print("Initializing STA Classifier...")
    classifier = GeminiSTAClassifier()
    
    # Create evaluator
    evaluator = STAEvaluator(classifier)
    
    # Run evaluation
    await evaluator.evaluate_all()
    
    # Generate report
    evaluator.generate_report()


if __name__ == "__main__":
    asyncio.run(main())
