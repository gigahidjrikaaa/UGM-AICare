/**
 * Formal Screening API — administered PHQ-9 / GAD-7 questionnaires.
 *
 * Mirrors the screeningApi pattern: shared axios client with the auth
 * interceptor from services/api.ts (base URL already includes /api/v1).
 * Scoring happens server-side (app/services/formal_instrument_service.py);
 * the client never computes severity bands.
 */
import apiClient from './api';

export interface InstrumentOption {
  value: number;
  label: string;
}

export interface InstrumentItem {
  text: string;
  is_crisis_item: boolean;
}

export interface FormalInstrument {
  code: string;
  name: string;
  dimension: string;
  timeframe: string;
  options: InstrumentOption[];
  items: InstrumentItem[];
  disclaimer: string;
  reference: string;
}

export interface InstrumentListResponse {
  instruments: FormalInstrument[];
}

export interface InstrumentSubmission {
  id: number;
  instrument: string;
  total_score: number;
  max_score: number;
  normalized_score: number;
  severity_band: string;
  severity_label: string;
  crisis_flag: boolean;
  created_at: string;
}

export interface InstrumentHistoryResponse {
  submissions: InstrumentSubmission[];
}

export interface InstrumentSubmitResult {
  instrument: string;
  dimension: string;
  total: number;
  max: number;
  normalized: number;
  band: string;
  band_label: string;
  interpretation: string;
  recommendation: string;
  disclaimer: string;
  crisis_flag: boolean;
  escalated: boolean;
  crisis_resources_note: string;
}

export const fetchFormalInstruments = async (): Promise<InstrumentListResponse> => {
  const response = await apiClient.get<InstrumentListResponse>('/screening/instruments');
  return response.data;
};

export const fetchInstrumentHistory = async (): Promise<InstrumentHistoryResponse> => {
  const response = await apiClient.get<InstrumentHistoryResponse>('/screening/instruments/history');
  return response.data;
};

export const submitFormalInstrument = async (
  instrumentCode: string,
  responses: number[],
): Promise<{ recorded: boolean; result: InstrumentSubmitResult }> => {
  const response = await apiClient.post(
    `/screening/instruments/${encodeURIComponent(instrumentCode)}/submit`,
    { responses },
  );
  return response.data;
};
