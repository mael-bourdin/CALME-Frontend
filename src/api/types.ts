/**
 * Contrat avec le serveur de bord.
 *
 * Ces types décrivent l'API REST et le flux WebSocket exposés par le FastAPI.
 * Ils sont écrits à la main pour l'instant ; dès que le serveur publie son
 * schéma OpenAPI, ils doivent être générés à partir de lui — le dossier prévoit
 * que le contrat ne soit écrit qu'une fois, côté serveur, pour qu'une
 * incohérence se voie à la compilation plutôt qu'en démonstration.
 */

/** Les quatre signaux mesurés par la cabine. */
export type SignalKey = 'hr' | 'eda' | 'face' | 'voice';

/**
 * Le palier décidé par le moteur de règles. Jamais calculé côté client :
 * l'indice et le niveau viennent du serveur, où du code ordinaire les fixe de
 * façon déterministe. Le front affiche une décision, il n'en prend aucune.
 */
export type Level = 'green' | 'amber' | 'red' | 'unreliable';

/** L'état de fonctionnement de la cabine, piloté par le budget énergétique. */
export type CabinMode = 'standby' | 'measuring' | 'session' | 'degraded';

/** L'origine de la consigne affichée. */
export type RecommendationSource = 'model' | 'rules';

export interface CrewMember {
  id: string;
  displayName: string;
  role: string;
  initials: string;
  /** Sol d'embarquement, pour l'ancienneté à bord. */
  joinedSol: number;
}

export interface Session {
  id: string;
  crewId: string;
  startedAt: string;
  closedAt: string | null;
  mode: CabinMode;
  /** L'exercice joué, une fois la recommandation acceptée. */
  exerciseId: string | null;
}

/**
 * Un échantillon agrégé sur une seconde, tel que l'ESP32 l'envoie.
 * Le client ne produit jamais ça — il le reçoit par le flux temps réel.
 */
export interface SensorFrame {
  at: string;
  /** Battements par minute. Hors de 30–220, le serveur rejette et signale. */
  heartRate: number | null;
  /** Conductance de peau en microsiemens. */
  skinConductance: number | null;
  /** Tension du visage, 0 à 1. Absent si la caméra est coupée. */
  faceTension: number | null;
  /** Indice composite de la voix, 0 à 1. */
  voiceIndex: number | null;
  /** Les signaux que le serveur considère comme non exploitables. */
  suspect: SignalKey[];
}

/** Les indicateurs calculés sur fenêtre glissante de trente secondes. */
export interface Indicators {
  heartRateMean: number | null;
  /** Variabilité entre battements — l'indicateur le plus discriminant. */
  heartRateVariability: number | null;
  /** Niveau de fond de la sudation, qui dérive lentement. */
  edaTonic: number | null;
  /** Réponses rapides de la sudation, qui servent de signal d'alerte. */
  edaPhasic: number | null;
  faceTension: number | null;
  voiceIndex: number | null;
  /** Fréquence respiratoire estimée, en cycles par minute. */
  breathingRate: number | null;
}

/**
 * Le résultat d'une mesure. `index` est la moyenne pondérée des écarts à
 * l'historique de la personne, ramenée sur 100 ; les seuils sont 40 et 70.
 */
export interface Assessment {
  id: string;
  sessionId: string;
  index: number;
  level: Level;
  /** 0 à 1. Baisse quand un signal manque, et le système l'annonce. */
  confidence: number;
  /** Les signaux absents du calcul, avec la raison. */
  missingSignals: { signal: SignalKey; reason: 'disabled' | 'degraded' | 'faulty' }[];
  indicators: Indicators;
  /** La moyenne habituelle de la personne, pour situer l'indice. */
  personalBaseline: number | null;
  computedAt: string;
}

export interface Exercise {
  id: string;
  name: string;
  /** Durée en minutes. */
  duration: number;
  /** Dans quel cas le catalogue l'autorise. */
  indication: string;
  /** Le palier minimal qui l'autorise. */
  minLevel: Level;
  kind: 'breathing' | 'grounding' | 'audio' | 'light' | 'nap' | 'journal';
}

export interface Recommendation {
  id: string;
  assessmentId: string;
  exercise: Exercise;
  /** La consigne rédigée. Générique si le modèle est indisponible. */
  message: string;
  source: RecommendationSource;
  /** Le modèle qui a formulé, pour pouvoir expliquer après coup. */
  modelName: string | null;
}

export interface SessionOutcome {
  sessionId: string;
  indexBefore: number;
  indexAfter: number | null;
  breathingRateBefore: number | null;
  breathingRateAfter: number | null;
  heartRateBefore: number | null;
  heartRateAfter: number | null;
  /** Vrai seulement si un seuil a été franchi. */
  alertRaised: boolean;
}

export interface CrewSummary {
  member: CrewMember;
  /** Indice moyen sur sept jours. Le médecin voit des tendances, pas des minutes. */
  meanIndex: number;
  level: Level;
  /** Variation sur sept jours, en points d'indice. */
  delta: number;
  lastSessionAt: string | null;
  /** Sept points, un par jour. */
  spark: number[];
}

export interface CrewHistoryPoint {
  sol: number;
  index: number;
}

export interface CrewHistory {
  member: CrewMember;
  points: CrewHistoryPoint[];
  sessions: {
    id: string;
    at: string;
    indexBefore: number;
    indexAfter: number | null;
    exerciseName: string;
    feedback: 'helped' | 'not-really' | null;
  }[];
  /** L'accès au détail doit être justifié, et l'ouverture est journalisée. */
  accessGrant: {
    reason: 'alert-acknowledged' | 'explicit-consent';
    alertId: string | null;
    acknowledgedBy: string | null;
    grantedAt: string;
  };
}

export interface Alert {
  id: string;
  crewId: string;
  crewName: string;
  raisedAt: string;
  /** Une alerte ne transporte que qui et quand. Jamais la mesure. */
  kind: 'threshold-crossed' | 'sensor-suspect';
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
  note: string | null;
}

export interface PowerBudgetLine {
  label: string;
  /** Watts par mode, dans l'ordre veille, mesure, séance, dégradé. */
  byMode: Record<CabinMode, number>;
}

export interface PowerState {
  mode: CabinMode;
  /** Mesuré par l'INA219, pas estimé. C'est ce qui rend le discours vérifiable. */
  watts: number;
  /** Consigne du réseau du vaisseau, en pourcentage du budget nominal. */
  setpointPercent: number;
  budgetWatts: number;
  lines: PowerBudgetLine[];
  dailyCostWh: number;
  dailySavingWh: number;
}

export interface HealthState {
  database: { ok: boolean; detail: string };
  model: { ok: boolean; detail: string; name: string | null };
  sensors: { ok: boolean; online: number; total: number };
  buffer: { pending: number; lastReplayAt: string | null };
}

export interface AggregateTrends {
  /** Trente points, agrégés sur l'équipage, sans nom. */
  meanIndex: { sol: number; value: number }[];
  sessionsPerDay: number;
  breathingRateAfter: number;
  breathingRateBefore: number;
  amberShare: number;
}

/* -------------------------------------------------------------------------
   Flux temps réel — WS /api/v1/sessions/{id}/stream
   Le serveur pousse ; le client n'envoie rien d'autre qu'un ping.
   ------------------------------------------------------------------------- */

export type StreamEvent =
  | { type: 'frame'; payload: SensorFrame }
  | { type: 'indicators'; payload: Indicators }
  | { type: 'assessment'; payload: Assessment }
  | { type: 'recommendation'; payload: Recommendation }
  | { type: 'mode'; payload: { mode: CabinMode; watts: number; reason: string } }
  | { type: 'progress'; payload: { elapsedSeconds: number; totalSeconds: number } }
  | { type: 'notice'; payload: { level: 'info' | 'warning'; message: string } };

export type ConnectionState = 'connecting' | 'open' | 'reconnecting' | 'closed' | 'offline';

/* -------------------------------------------------------------------------
   Erreurs
   ------------------------------------------------------------------------- */

export interface ApiErrorBody {
  detail: string;
  code?: string;
}
