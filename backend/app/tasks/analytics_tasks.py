# backend/app/tasks/analytics_tasks.py
import logging
from sqlalchemy.orm import Session
from app.agents.analytics_agent import AnalyticsAgent
from app.models.agents import AnalyticsReport, ReportStatus

logger = logging.getLogger(__name__)

def execute_analytics_analysis(report_id: int, db: Session):
    """Background task to execute analytics analysis."""
    logger.info(f"Starting analytics analysis for report_id: {report_id}")
    
    report = db.query(AnalyticsReport).filter(AnalyticsReport.id == report_id).first()
    if not report:
        logger.error(f"Analytics report with id {report_id} not found.")
        return

    try:
        # Update status to RUNNING
        report.status = ReportStatus.RUNNING
        db.commit()

        # Initialize and run the agent
        analytics_agent = AnalyticsAgent(db=db)
        analysis_results = analytics_agent.execute(timeframe=report.report_period)

        # Update the report with the results
        report.status = ReportStatus.COMPLETED
        report.insights = analysis_results.get("insights", {})
        report.users_analyzed = analysis_results.get("data_summary", {}).get("active_users", 0)
        report.conversations_analyzed = analysis_results.get("data_summary", {}).get("total_conversations", 0)
        # ... populate other fields as necessary from analysis_results

        db.commit()
        logger.info(f"Successfully completed analytics analysis for report_id: {report_id}")

    except Exception as e:
        logger.error(f"Error during analytics analysis for report_id {report_id}: {e}", exc_info=True)
        report.status = ReportStatus.FAILED
        report.error_message = str(e)
        db.commit()
    finally:
        db.close()