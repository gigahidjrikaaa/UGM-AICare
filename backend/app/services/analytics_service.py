from __future__ import annotations
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
import re
import logging

from app.schemas.analytics import (
    AnalyticsQuerySpec, TimeframeSpec, QueryFilters, AnalyticsRunResult, AllowedIntent
)
from app.models import TriageAssessment, User
from app.core.llm import generate_gemini_response, GOOGLE_API_KEY

logger = logging.getLogger(__name__)

INTENT_KEYWORDS = {
    'user_leaderboard': re.compile(r'(which|who).*user.*(most|highest)', re.I),
    'aggregate': re.compile(r'(how many|count|summary|overall)', re.I),
    'trend': re.compile(r'(trend|increase|decrease|change)', re.I)
}

SEVERITY_ORDER = ['low','moderate','high','critical']
SEVERITY_WEIGHT = {'low':1,'moderate':2,'high':4,'critical':6}

SAFE_DEFAULT_METRIC = 'concerning_assessment_count'

SPEC_EXTRACTION_SYSTEM = (
    "You convert admin analytics questions about mental health triage assessments into STRICT JSON. "
    "Return ONLY JSON, no markdown. JSON schema keys: intent, metric, timeframe:{mode,days|calendar_month,source}, "
    "filters:{severity_at_or_above?}, assumptions. Choose intent from [user_leaderboard,aggregate,trend]. "
    "metric from [concerning_assessment_count,severe_assessment_count]. If question asks 'which user' or 'most concerning user' -> intent=user_leaderboard. "
    "'Most concerning' => filters.severity_at_or_above='high'. If unspecified timeframe, use rolling 30 days. If 'last month' phrase, mode=calendar and calendar_month = previous month (YYYY-MM)."
)

EXPLANATION_SYSTEM = (
    "You explain analytics results. You are given spec, metrics, and context. DO NOT fabricate data. "
    "If metrics.empty or no rows, explain absence succinctly. Include timeframe and severity threshold if present."
)

async def interpret_question_to_spec(question: str) -> AnalyticsQuerySpec:
    q = question.strip()
    # Heuristic fallback before LLM
    intent: AllowedIntent = 'aggregate'  # type: ignore[assignment]
    from typing import cast
    for key, pat in INTENT_KEYWORDS.items():
        if pat.search(q):
            intent = cast(AllowedIntent, key)
            break
    filters = None
    assumptions: List[str] = []
    severity_threshold = None
    if re.search(r'most concerning|most flagged|highest severity', q, re.I):
        severity_threshold = 'high'
    # Timeframe parse
    m_last_month = re.search(r'last month', q, re.I)
    if m_last_month:
        from datetime import date
        today = date.today()
        prev_month = today.month - 1 or 12
        year = today.year - 1 if prev_month == 12 and today.month == 1 else today.year
        timeframe = TimeframeSpec(mode='calendar', calendar_month=f"{year:04d}-{prev_month:02d}", source='last month')
    else:
        # rolling 30 default
        timeframe = TimeframeSpec(mode='rolling', days=30, source='default_rolling_30')
    if severity_threshold:
        filters = QueryFilters(severity_at_or_above=severity_threshold)
    spec = AnalyticsQuerySpec(  # type: ignore[arg-type]
        intent=intent,
        metric=SAFE_DEFAULT_METRIC,
        timeframe=timeframe,
        filters=filters,
        raw_question=q,
        assumptions=assumptions
    )

    if not GOOGLE_API_KEY:
        return spec

    # LLM refinement
    history = [
        {'role':'system','content':SPEC_EXTRACTION_SYSTEM},
        {'role':'user','content':f"Question: {q}\nReturn JSON now."}
    ]
    try:
        resp = await generate_gemini_response(history, temperature=0.1, max_tokens=1024)
        # Attempt to parse JSON strictly
        import json
        start = resp.find('{')
        end = resp.rfind('}')
        if start >=0 and end >= start:
            candidate = resp[start:end+1]
            data = json.loads(candidate)
            # Build spec safeguarding defaults
            timeframe_data = data.get('timeframe') or {}
            tf_mode = timeframe_data.get('mode','rolling')
            if tf_mode == 'rolling':
                days = timeframe_data.get('days') or 30
                timeframe = TimeframeSpec(mode='rolling', days=int(days), source=timeframe_data.get('source') or 'llm')
            else:
                cm = timeframe_data.get('calendar_month')
                if not cm:
                    raise ValueError('calendar timeframe missing calendar_month')
                timeframe = TimeframeSpec(mode='calendar', calendar_month=cm, source=timeframe_data.get('source') or 'llm')
            filters_obj = None
            filt = data.get('filters') or {}
            sev = filt.get('severity_at_or_above')
            if sev in SEVERITY_ORDER:
                filters_obj = QueryFilters(severity_at_or_above=sev)
            spec = AnalyticsQuerySpec(
                intent=data.get('intent', intent),
                metric=data.get('metric', SAFE_DEFAULT_METRIC),
                timeframe=timeframe,
                filters=filters_obj,
                raw_question=q,
                assumptions=data.get('assumptions') or []
            )
    except Exception as e:
        logger.warning(f"LLM spec refinement failed: {e}")
    return spec

async def run_analytics_spec(db: AsyncSession, spec: AnalyticsQuerySpec) -> AnalyticsRunResult:
    # Build timeframe
    if spec.timeframe.mode == 'rolling':
        cutoff_start = datetime.utcnow() - timedelta(days=spec.timeframe.days or 30)
        cutoff_end = datetime.utcnow()
    else:  # calendar
        from datetime import datetime as dt
        year, month = map(int, spec.timeframe.calendar_month.split('-'))  # type: ignore
        start = datetime(year, month, 1)
        if month == 12:
            end = datetime(year+1,1,1)
        else:
            end = datetime(year, month+1,1)
        cutoff_start, cutoff_end = start, end

    severity_threshold_index = None
    if spec.filters and spec.filters.severity_at_or_above:
        severity_threshold_index = SEVERITY_ORDER.index(spec.filters.severity_at_or_above)

    # Query per user counts
    stmt = (
        select(
            TriageAssessment.user_id.label('user_id'),
            func.count(TriageAssessment.id).label('count'),
            func.max(TriageAssessment.created_at).label('last_at'),
            func.array_agg(func.lower(TriageAssessment.severity_level)).label('severities')
        )
        .where(TriageAssessment.user_id.isnot(None))
        .where(TriageAssessment.created_at >= cutoff_start)
        .where(TriageAssessment.created_at < cutoff_end)
        .group_by(TriageAssessment.user_id)
    )
    rows = (await db.execute(stmt)).all()
    leaderboard: List[Dict[str, Any]] = []
    for r in rows:
        user_id = r.user_id
        severities = [s for s in (r.severities or []) if s]
        if severity_threshold_index is not None:
            if not any(SEVERITY_ORDER.index(s) >= severity_threshold_index for s in severities):
                continue
        score = sum(SEVERITY_WEIGHT.get(s,0) for s in severities)
        leaderboard.append({
            'user_id': user_id,
            'count': r.count,
            'last_at': r.last_at.isoformat() if r.last_at else None,
            'severity_score': score,
            'severities': severities,
        })
    # Sort by severity_score then count
    leaderboard.sort(key=lambda x: (x['severity_score'], x['count']), reverse=True)

    metrics: Dict[str, Any] = {
        'timeframe': spec.timeframe.dict(),
        'intent': spec.intent,
        'metric': spec.metric,
        'rows': leaderboard[:10],
        'total_users_considered': len(leaderboard),
        'severity_weight': SEVERITY_WEIGHT,
    }

    empty = len(leaderboard) == 0
    return AnalyticsRunResult(spec=spec, metrics=metrics, empty=empty)

async def explain_analytics_result(result: AnalyticsRunResult) -> AnalyticsRunResult:
    if result.answer:
        return result
    if result.empty:
        result.answer = "No users met the specified criteria in the selected timeframe." if result.spec.intent == 'user_leaderboard' else "No matching data for the specified criteria/timeframe." 
        return result
    if not GOOGLE_API_KEY:
        # Simple deterministic answer
        rows = result.metrics.get('rows') if isinstance(result.metrics, dict) else None
        if not isinstance(rows, list) or not rows:
            result.answer = "No data rows available."; return result
        top = rows[0]
        total = len(rows)
        result.answer = (
            f"User {top['user_id']} has the highest severity_score={top['severity_score']} "
            f"across {total} users in timeframe (mode={result.spec.timeframe.mode})."
        )
        return result

    system_prompt = EXPLANATION_SYSTEM
    rows_json = result.metrics.get('rows') if isinstance(result.metrics, dict) else []
    if not isinstance(rows_json, list):
        rows_json = []
    spec_tf = result.spec.timeframe.dict()
    user_prompt = (
        f"Spec intent={result.spec.intent} metric={result.spec.metric} timeframe={spec_tf}. "
        f"Rows (top {len(rows_json)}): {rows_json}. Provide concise explanation."
    )
    history = [
        {'role':'system','content':system_prompt},
        {'role':'user','content':user_prompt}
    ]
    try:
        resp = await generate_gemini_response(history, temperature=0.2, max_tokens=1024)
        result.answer = resp
    except Exception as e:
        logger.warning(f"LLM explanation failed: {e}")
        if not result.answer:
            rows2 = result.metrics.get('rows') if isinstance(result.metrics, dict) else []
            if isinstance(rows2, list) and rows2:
                top = rows2[0]
                result.answer = f"User {top.get('user_id')} ranks highest (severity_score={top.get('severity_score')})."
            else:
                result.answer = "No data available for explanation." 
    return result

__all__ = ['interpret_question_to_spec','run_analytics_spec','explain_analytics_result']
