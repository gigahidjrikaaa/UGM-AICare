/**
 * Counselor email API — templated counselor → student email with audit.
 * Scope-enforced server-side (student must be in the counselor's caseload).
 */
import apiClient from './api';

export interface CounselorEmailTemplate {
  key: string;
  label: string;
  description: string;
  default_subject: string;
}

export interface CounselorEmailTemplatesResponse {
  templates: CounselorEmailTemplate[];
  daily_limit: number;
}

export interface CounselorEmailLog {
  id: number;
  template_key: string;
  subject: string;
  status: string;
  created_at: string;
  message_redacted: string | null;
}

export interface SendEmailResult {
  delivered: boolean;
  template: string;
  subject: string;
  student_email_opt_in: boolean;
  sent_today: number;
  daily_limit: number;
  thread_id?: number;
}

export const listEmailTemplates = async (): Promise<CounselorEmailTemplatesResponse> => {
  const response = await apiClient.get('/counselor/patients/email/templates');
  return response.data;
};

export const sendStudentEmail = async (
  studentUserId: number,
  body: { template_key: string; custom_message?: string },
): Promise<SendEmailResult> => {
  const response = await apiClient.post(
    `/counselor/patients/${studentUserId}/email`,
    body,
  );
  return response.data;
};

export const listStudentEmailHistory = async (
  studentUserId: number,
): Promise<{ emails: CounselorEmailLog[] }> => {
  const response = await apiClient.get(`/counselor/patients/${studentUserId}/emails`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Preview (rendered HTML, nothing sent or logged)
// ---------------------------------------------------------------------------

export interface EmailPreview {
  template: string;
  label: string;
  subject: string;
  html: string;
  plain: string;
  disclaimer: string;
}

export const previewStudentEmail = async (
  studentUserId: number,
  body: { template_key: string; custom_message?: string },
): Promise<EmailPreview> => {
  const response = await apiClient.post(
    `/counselor/patients/${studentUserId}/email/preview`,
    body,
  );
  return response.data;
};

// ---------------------------------------------------------------------------
// Admin template CRUD
// ---------------------------------------------------------------------------

export interface AdminEmailTemplate {
  id: number;
  key: string;
  label: string;
  description: string | null;
  subject: string;
  body_text: string;
  is_active: boolean;
  sort_order: number;
  updated_at: string;
}

export const adminListEmailTemplates = async (): Promise<{ templates: AdminEmailTemplate[] }> => {
  const response = await apiClient.get('/admin/email-templates');
  return response.data;
};

export const adminCreateEmailTemplate = async (body: {
  key: string;
  label: string;
  subject: string;
  body_text: string;
  description?: string;
  sort_order?: number;
}): Promise<AdminEmailTemplate> => {
  const response = await apiClient.post('/admin/email-templates', body);
  return response.data;
};

export const adminUpdateEmailTemplate = async (
  id: number,
  body: { label?: string; subject?: string; body_text?: string; description?: string; is_active?: boolean; sort_order?: number },
): Promise<AdminEmailTemplate> => {
  const response = await apiClient.put(`/admin/email-templates/${id}`, body);
  return response.data;
};

export const adminDeleteEmailTemplate = async (id: number): Promise<void> => {
  await apiClient.delete(`/admin/email-templates/${id}`);
};
