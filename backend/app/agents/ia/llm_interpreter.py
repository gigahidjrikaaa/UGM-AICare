"""LLM-powered interpretation module for Insights Agent analytics results.

This module provides natural language interpretation of k-anonymized,
differentially private aggregated analytics data, generating insights,
trends, and actionable recommendations.

Privacy Guarantee: LLM only receives aggregated statistics that have already
passed k-anonymity checks (k ≥ 5) and, when DP is enabled, Laplace noise.
No individual user data is ever sent to LLM.

Output contract: the model is asked for STRICT JSON (schema-enforced on the
Gemini path via config.response_schema). The legacy keyword-section parser
is kept only as a fallback for non-JSON responses.
"""
from __future__ import annotations

import json
import logging
from typing import Dict, List, Any
from datetime import datetime

from app.core.llm import generate_gemini_response

logger = logging.getLogger(__name__)

_INTERPRETATION_JSON_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "interpretation": {"type": "string"},
        "trends": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "trend": {"type": "string"},
                    "significance": {"type": "string", "enum": ["high", "medium", "low"]},
                    "implication": {"type": "string"},
                },
                "required": ["trend", "significance", "implication"],
            },
        },
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "recommendation": {"type": "string"},
                    "priority": {"type": "string", "enum": ["high", "medium", "low"]},
                    "action": {"type": "string"},
                },
                "required": ["recommendation", "priority", "action"],
            },
        },
        "privacy_statement": {"type": "string"},
    },
    "required": ["summary", "interpretation", "trends", "recommendations"],
}


class InsightsInterpreter:
    """LLM-powered interpreter for analytics results.

    This class generates natural language interpretations, identifies trends,
    and creates actionable recommendations from k-anonymized analytics data.

    Privacy Note: Only aggregated, k-anonymized data is processed. The LLM
    never receives individual user records or personally identifiable information.
    """

    def __init__(self):
        """Initialize the insights interpreter."""
        self.system_prompt = """Anda adalah asisten analitik data untuk platform kesehatan mental mahasiswa UGM-AICare.

Tugas Anda:
1. Menganalisis data statistik yang telah dianonimkan
2. Mengidentifikasi tren dan pola penting
3. Memberikan insight yang actionable untuk administrator
4. Merekomendasikan intervensi berdasarkan data

Format Respons (WAJIB):
- Balas HANYA dengan satu objek JSON valid, tanpa teks pembuka/penutup, tanpa markdown.
- Skema JSON: {"summary": string, "interpretation": string, "trends": [{"trend": string, "significance": "high"|"medium"|"low", "implication": string}], "recommendations": [{"recommendation": string, "priority": "high"|"medium"|"low", "action": string}], "privacy_statement": string}
- "summary": 1 paragraf ringkas untuk administrator sibuk, dengan angka spesifik dari data.
- "interpretation": 2-3 paragraf insight utama, apa yang menonjol atau mengkhawatirkan.
- "trends": 3-5 tren; "recommendations": 3-5 rekomendasi dengan aksi konkret.
- Gunakan bahasa Indonesia yang profesional dan angka spesifik dari data.

Catatan Privasi:
- Semua data sudah dianonimkan dan diagregasi; tidak ada informasi individual mahasiswa.
- "privacy_statement": salin pernyataan privasi yang tercantum pada catatan data (jika ada), atau tulis: "Data diagregasi dan dianonimkan untuk melindungi privasi pengguna."
"""

    async def interpret_analytics(
        self,
        question_id: str,
        data: List[Dict[str, Any]],
        chart: Dict[str, Any],
        notes: List[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Generate LLM interpretation of analytics results.

        Args:
            question_id: ID of the analytics question
            data: K-anonymized (and DP-noised, when enabled) aggregate rows
            chart: Chart configuration and data
            notes: Query-specific notes (may carry the DP disclosure)
            start_date: Analysis period start
            end_date: Analysis period end

        Returns:
            Dictionary containing:
            - interpretation: Natural language analysis
            - trends: List of identified trends
            - summary: Executive summary
            - recommendations: Actionable recommendations
        """
        try:
            # Build context from data
            data_summary = self._summarize_data(data)
            date_range = f"{start_date.strftime('%d %B %Y')} - {end_date.strftime('%d %B %Y')}"

            # Construct prompt
            user_prompt = f"""Silakan analisis data analitik berikut:

**Pertanyaan Analitik:** {question_id}
**Periode:** {date_range}
**Total Data Points:** {len(data)}

**Ringkasan Data:**
{data_summary}

**Catatan:**
{' | '.join(notes) if notes else 'Tidak ada catatan khusus'}

Balas HANYA dengan objek JSON sesuai skema pada instruksi sistem. Setiap analisis harus didukung angka spesifik dari data.
"""

            # Generate interpretation; schema-enforced JSON on the Gemini path.
            logger.info(f"Generating LLM interpretation for question_id={question_id}")
            response = await generate_gemini_response(
                history=[
                    {"role": "user", "content": user_prompt}
                ],
                system_prompt=self.system_prompt,
                temperature=0.3,  # Lower temperature for analytical consistency
                max_tokens=2000,
                json_mode=True,
                json_schema=_INTERPRETATION_JSON_SCHEMA,
            )

            parsed = self._parse_json_response(response)
            if parsed is None:
                # Fallback: legacy keyword-section parsing for non-JSON text.
                parsed = self._parse_interpretation(response)

            logger.info(
                f"Interpretation generated: {len(parsed['trends'])} trends, "
                f"{len(parsed['recommendations'])} recommendations"
            )

            return parsed

        except Exception as e:
            logger.error(f"Failed to generate interpretation: {e}", exc_info=True)
            return {
                "interpretation": "Maaf, interpretasi tidak dapat dihasilkan saat ini.",
                "trends": [],
                "summary": "Data analitik tersedia, namun interpretasi otomatis gagal.",
                "recommendations": []
            }

    def _parse_json_response(self, response_text: str) -> Dict[str, Any] | None:
        """Parse a schema-shaped JSON response; None when not valid JSON.

        Tolerates markdown code fences around the JSON payload.
        """
        cleaned = (response_text or "").strip()
        if cleaned.startswith("```"):
            first_newline = cleaned.find("\n")
            cleaned = cleaned[first_newline + 1:] if first_newline != -1 else cleaned
            if cleaned.rstrip().endswith("```"):
                cleaned = cleaned.rstrip()[:-3]
        try:
            payload = json.loads(cleaned.strip())
        except (json.JSONDecodeError, TypeError):
            return None
        if not isinstance(payload, dict) or "interpretation" not in payload:
            return None
        return {
            "interpretation": str(payload.get("interpretation", "")),
            "trends": list(payload.get("trends") or []),
            "summary": str(payload.get("summary", "")),
            "recommendations": list(payload.get("recommendations") or []),
        }
    
    def _summarize_data(self, data: List[Dict[str, Any]]) -> str:
        """Create a text summary of the data for LLM context.
        
        Args:
            data: List of data rows (k-anonymized aggregates)
            
        Returns:
            Text summary of the data
        """
        if not data:
            return "Tidak ada data tersedia untuk periode ini."
        
        # Get column names
        columns = list(data[0].keys()) if data else []
        
        # Build summary
        summary_lines = []
        for i, row in enumerate(data[:10], 1):  # Limit to first 10 rows
            row_summary = " | ".join([f"{k}: {v}" for k, v in row.items()])
            summary_lines.append(f"  {i}. {row_summary}")
        
        if len(data) > 10:
            summary_lines.append(f"  ... dan {len(data) - 10} baris data lainnya")
        
        return "\n".join(summary_lines)
    
    def _parse_interpretation(self, llm_response: str) -> Dict[str, Any]:
        """Parse LLM response into structured format.
        
        Args:
            llm_response: Raw LLM response text
            
        Returns:
            Structured interpretation with trends and recommendations
        """
        # Simple parsing - extract sections based on keywords
        sections = {
            "interpretation": "",
            "trends": [],
            "summary": "",
            "recommendations": []
        }
        
        lines = llm_response.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue

            is_bullet = line.startswith(("- ", "• ", "* "))
            
            # Detect section headers
            if not is_bullet and "INTERPRETASI" in line.upper():
                current_section = "interpretation"
            elif not is_bullet and "TREN" in line.upper():
                current_section = "trends"
            elif not is_bullet and "RINGKASAN" in line.upper():
                current_section = "summary"
            elif not is_bullet and "REKOMENDASI" in line.upper():
                current_section = "recommendations"
            elif current_section:
                # Add content to current section
                if current_section == "interpretation":
                    sections["interpretation"] += line + " "
                elif current_section == "summary":
                    sections["summary"] += line + " "
                elif current_section == "trends" and line.startswith(("- ", "• ", "* ")):
                    # Parse trend line
                    trend = self._parse_trend_line(line)
                    if trend:
                        sections["trends"].append(trend)
                elif current_section == "recommendations" and line.startswith(("- ", "• ", "* ")):
                    # Parse recommendation line
                    rec = self._parse_recommendation_line(line)
                    if rec:
                        sections["recommendations"].append(rec)
        
        # Clean up
        sections["interpretation"] = sections["interpretation"].strip()
        sections["summary"] = sections["summary"].strip()
        
        # If parsing failed, use raw response
        if not sections["interpretation"]:
            sections["interpretation"] = llm_response
        
        return sections
    
    def _parse_trend_line(self, line: str) -> Dict[str, Any] | None:
        """Parse a trend line into structured format.
        
        Args:
            line: Trend line from LLM response
            
        Returns:
            Structured trend dict or None if parsing fails
        """
        try:
            # Remove bullet point
            line = line.lstrip("- • * ").strip()
            
            # Try to extract components
            parts = line.split(" | ")
            if len(parts) >= 2:
                return {
                    "trend": parts[0].replace("Tren:", "").strip(),
                    "significance": parts[1].replace("Signifikansi:", "").strip() if len(parts) > 1 else "medium",
                    "implication": parts[2].replace("Implikasi:", "").strip() if len(parts) > 2 else ""
                }
            else:
                # Fallback: use entire line as trend
                return {
                    "trend": line,
                    "significance": "medium",
                    "implication": ""
                }
        except Exception:
            return None
    
    def _parse_recommendation_line(self, line: str) -> Dict[str, Any] | None:
        """Parse a recommendation line into structured format.
        
        Args:
            line: Recommendation line from LLM response
            
        Returns:
            Structured recommendation dict or None if parsing fails
        """
        try:
            # Remove bullet point
            line = line.lstrip("- • * ").strip()
            
            # Try to extract components
            parts = line.split(" | ")
            if len(parts) >= 2:
                return {
                    "recommendation": parts[0].replace("Rekomendasi:", "").strip(),
                    "priority": parts[1].replace("Prioritas:", "").strip() if len(parts) > 1 else "medium",
                    "action": parts[2].replace("Aksi:", "").strip() if len(parts) > 2 else ""
                }
            else:
                # Fallback: use entire line as recommendation
                return {
                    "recommendation": line,
                    "priority": "medium",
                    "action": ""
                }
        except Exception:
            return None
