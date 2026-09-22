import { CABIN_ID } from './config';
import { request } from './http';
import { createLiveStream } from './stream';
import type { ConsentState, Feedback, Transport } from './transport';
import type {
  AggregateTrends,
  Alert,
  Assessment,
  CrewHistory,
  CrewMember,
  CrewSummary,
  HealthState,
  PowerState,
  Recommendation,
  Session,
  SessionOutcome,
} from './types';

/**
 * L'implémentation qui parle au FastAPI.
 *
 * Les chemins reprennent exactement l'API versionnée décrite dans le dossier.
 * Le versionnement n'est pas du zèle : le microcontrôleur ne se met pas à jour
 * aussi facilement que le serveur, et les deux doivent pouvoir avancer à des
 * rythmes différents sans se casser.
 */
export const liveTransport: Transport = {
  getCurrentMember() {
    return request<CrewMember>(`/cabins/${CABIN_ID}/occupant`);
  },

  async getLastSessionAt(crewId) {
    const result = await request<{ lastSessionAt: string | null }>(`/crew/${crewId}/last-session`);
    return result.lastSessionAt;
  },

  openSession(crewId) {
    return request<Session>('/sessions', {
      method: 'POST',
      body: { crewId, cabinId: CABIN_ID },
    });
  },

  getSession(sessionId) {
    return request<Session>(`/sessions/${sessionId}`);
  },

  closeSession(sessionId) {
    return request<SessionOutcome>(`/sessions/${sessionId}/close`, { method: 'POST' });
  },

  recommend(assessmentId) {
    // La consigne passe par le modèle local : le dossier se donne trente
    // secondes entre la fin de la mesure et l'affichage, on laisse la marge.
    return request<Recommendation>(`/assessments/${assessmentId}/recommend`, {
      method: 'POST',
      timeoutMs: 30_000,
    });
  },

  async sendFeedback(recommendationId: string, feedback: Feedback) {
    await request<void>(`/recommendations/${recommendationId}/feedback`, {
      method: 'POST',
      body: { feedback },
    });
  },

  setConsent(sessionId, consent) {
    return request<ConsentState>(`/sessions/${sessionId}/consent`, {
      method: 'POST',
      body: consent,
    });
  },

  getConsent() {
    return request<ConsentState>(`/cabins/${CABIN_ID}/consent`);
  },

  getAssessment(sessionId) {
    return request<Assessment>(`/sessions/${sessionId}/assessment`);
  },

  streamSession(sessionId) {
    return createLiveStream(sessionId);
  },

  getCrewOverview() {
    return request<CrewSummary[]>('/crew/overview');
  },

  getCrewHistory(crewId) {
    return request<CrewHistory>(`/crew/${crewId}/history`);
  },

  getAlerts() {
    return request<Alert[]>('/alerts');
  },

  acknowledgeAlert(alertId, acknowledgedBy) {
    return request<Alert>(`/alerts/${alertId}/acknowledge`, {
      method: 'POST',
      body: { acknowledgedBy },
    });
  },

  getTrends() {
    return request<AggregateTrends>('/trends');
  },

  getPower() {
    return request<PowerState>('/power');
  },

  setPowerSetpoint(percent) {
    return request<PowerState>('/power/setpoint', {
      method: 'POST',
      body: { percent },
    });
  },

  getHealth() {
    return request<HealthState>('/health');
  },
};
