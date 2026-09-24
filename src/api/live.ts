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
  ReponseDialogue,
  SensorHealth,
  Session,
  SessionOutcome,
} from './types';

/**
 * Tout segment qui vient d'ailleurs est encodé avant d'entrer dans un chemin.
 *
 * `crewId` vient de l'URL de la page, `sessionId` d'une réponse serveur : sans
 * encodage, un identifiant contenant des slashs ou des points changerait la
 * route appelée. On le fait ici, au puits, plutôt que chez chaque appelant.
 */
function segment(value: string): string {
  return encodeURIComponent(value);
}

/**
 * L'implémentation qui parle au FastAPI.
 *
 * Les chemins reprennent exactement l'API versionnée décrite dans le dossier.
 * Le versionnement n'est pas du zèle : le microcontrôleur ne se met pas à jour
 * aussi facilement que le serveur, et les deux doivent pouvoir avancer à des
 * rythmes différents sans se casser.
 */
export const liveTransport: Transport = {
  sendFaceIndex(sessionId, indice) {
    // `request` encode déjà le corps en JSON (voir http.ts) : lui passer une
    // chaîne pré-sérialisée l'encoderait une seconde fois et casserait le
    // parsing côté serveur.
    return request<void>(`/sessions/${segment(sessionId)}/face`, {
      method: 'POST',
      body: indice,
    });
  },

  sendVoiceSample(sessionId, wav) {
    const corps = new FormData();
    corps.append('fichier', wav, 'voix.wav');
    return request<{ voiceIndex: number }>(`/sessions/${segment(sessionId)}/audio`, {
      method: 'POST',
      body: corps,
    });
  },

  sendDialogueTurn(sessionId, wav, historique, dernierTour) {
    const corps = new FormData();
    corps.append('fichier', wav, 'reponse.wav');
    corps.append('historique', JSON.stringify(historique));
    corps.append('dernier_tour', String(dernierTour));
    return request<ReponseDialogue>(`/sessions/${segment(sessionId)}/dialogue`, {
      method: 'POST',
      body: corps,
      // Transcription puis rédaction : plus long qu'un appel ordinaire.
      timeoutMs: 25_000,
    });
  },

  getCurrentMember() {
    return request<CrewMember>(`/cabins/${segment(CABIN_ID)}/occupant`);
  },

  async getLastSessionAt(crewId) {
    const result = await request<{ lastSessionAt: string | null }>(
      `/crew/${segment(crewId)}/last-session`,
    );
    return result.lastSessionAt;
  },

  getCrewList() {
    return request<CrewMember[]>('/crew');
  },

  identifyCrewMember(empreinte) {
    return request<CrewMember | null>(`/cabins/${segment(CABIN_ID)}/identify`, {
      method: 'POST',
      body: { empreinte },
    });
  },

  enrollCrewMember(displayName, empreinte) {
    return request<CrewMember>('/crew/enroll', {
      method: 'POST',
      body: { displayName, empreinte },
    });
  },

  openSession(crewId) {
    return request<Session>('/sessions', {
      method: 'POST',
      body: { crewId, cabinId: CABIN_ID },
    });
  },

  getSession(sessionId) {
    return request<Session>(`/sessions/${segment(sessionId)}`);
  },

  closeSession(sessionId) {
    return request<SessionOutcome>(`/sessions/${segment(sessionId)}/close`, { method: 'POST' });
  },

  recommend(assessmentId) {
    // La consigne passe par le modèle local : le dossier se donne trente
    // secondes entre la fin de la mesure et l'affichage, on laisse la marge.
    return request<Recommendation>(`/assessments/${segment(assessmentId)}/recommend`, {
      method: 'POST',
      timeoutMs: 30_000,
    });
  },

  async sendFeedback(recommendationId: string, feedback: Feedback) {
    await request<void>(`/recommendations/${segment(recommendationId)}/feedback`, {
      method: 'POST',
      body: { feedback },
    });
  },

  setConsent(sessionId, consent) {
    return request<ConsentState>(`/sessions/${segment(sessionId)}/consent`, {
      method: 'POST',
      body: consent,
    });
  },

  getConsent() {
    return request<ConsentState>(`/cabins/${segment(CABIN_ID)}/consent`);
  },

  getAssessment(sessionId) {
    return request<Assessment>(`/sessions/${segment(sessionId)}/assessment`);
  },

  streamSession(sessionId) {
    return createLiveStream(sessionId);
  },

  getCrewOverview() {
    return request<CrewSummary[]>('/crew/overview');
  },

  getCrewHistory(crewId) {
    return request<CrewHistory>(`/crew/${segment(crewId)}/history`);
  },

  getAlerts() {
    return request<Alert[]>('/alerts');
  },

  /**
   * Qui acquitte n'est jamais dit par le client.
   *
   * Le serveur le déduit de la session authentifiée. Toute la valeur de la
   * trace tient là-dedans : « accès ouvert par l'alerte acquittée par untel »
   * ne vaut rien si c'est l'appelant qui choisit le nom.
   */
  acknowledgeAlert(alertId) {
    return request<Alert>(`/alerts/${segment(alertId)}/acknowledge`, { method: 'POST' });
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

  getSensors() {
    return request<SensorHealth[]>(`/cabins/${segment(CABIN_ID)}/sensors`);
  },
};
