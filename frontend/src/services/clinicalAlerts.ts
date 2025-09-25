/**
 * Clinical Alerts Service
 * 
 * Service functions for managing real-time clinical alerts and escalations.
 */

import { apiCall } from '@/utils/api';

export interface ClinicalAlert {
  id: string;
  alertId: number;
  userId: number;
  type: 'crisis_risk' | 'self_harm_indicators' | 'medication_adherence' | 'missed_appointments' | 'behavioral_change' | 'emergency_contact';
  severity: 'critical' | 'high' | 'medium' | 'low';
  priority: 'immediate' | 'urgent' | 'standard' | 'informational';
  title: string;
  description: string;
  triggeredAt: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'escalated' | 'expired';
}

export async function getClinicalAlerts(): Promise<ClinicalAlert[]> {
  try {
    // In real implementation, this would be an API call
    return apiCall('/api/clinical/alerts');
  } catch (error) {
    console.error('Error fetching clinical alerts:', error);
    return [];
  }
}

export async function acknowledgeAlert(
  alertId: number,
  note: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // In real implementation, this would be an API call
    return apiCall(`/api/clinical/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return { success: false, message: 'Failed to acknowledge alert' };
  }
}

export async function escalateAlert(
  alertId: number,
  reason: string
): Promise<{ success: boolean; message?: string }> {
  try {
    // In real implementation, this would be an API call
    return apiCall(`/api/clinical/alerts/${alertId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  } catch (error) {
    console.error('Error escalating alert:', error);
    return { success: false, message: 'Failed to escalate alert' };
  }
}