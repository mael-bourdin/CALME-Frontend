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
export type SignalKey = 'hr' | 'eda' | 'face' | 'voice' | 'mood';

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

/** Un tour de la conversation de la mesure. L'historique ne vit que dans le
 * navigateur : le serveur le reçoit à chaque tour et l'oublie aussitôt. */
export interface TourDialogue {
  role: 'lila' | 'astronaute';
  texte: string;
}

export interface ReponseDialogue {
  /** Ce que le serveur a compris de la réponse, vide si personne n'a parlé. */
  entendu: string;
  /** La relance de la cabine, à prononcer. */
  reponse: string;
  source: RecommendationSource;
}

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
  /** Notes de bien-être sur 100 (100 = le mieux), calculées par le serveur. */
  faceScore?: number | null;
  voiceScore?: number | null;
  /** Humeur exprimée dans la conversation, sur 100. */
  moodScore?: number | null;
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
 * Note de bien-être sur 100 : 100 = le mieux. Vert à partir de 60, orange de
 * 35 à 59, rouge en dessous.
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
  /** Absent des évaluations antérieures à son introduction. */
  dominantSignal?: DominantSignal;
  /** Les trois notes sur 100 (100 = le mieux) : visage, voix, humeur. */
  scores?: { face: number | null; voice: number | null; mood: number | null };
  /** « Tout va bien : 82 sur 100. », rédigé par le serveur. */
  verdict?: string;
  computedAt: string;
}

/** Ce que la mesure a vu d'abord, et qui oriente le choix de l'exercice. */
export type DominantSignal =
  | 'fc_moyenne'
  | 'hrv_rmssd'
  | 'eda_reponses'
  | 'eda_fond'
  | 'visage'
  | 'voix'
  | 'parole'
  | 'fatigue'
  | 'diffus';

export interface Exercise {
  id: string;
  name: string;
  /** Durée en minutes. */
  duration: number;
  /** Dans quel cas le catalogue l'autorise. */
  indication: string;
  /** Le palier minimal qui l'autorise. */
  minLevel: Level;
  kind:
    'breathing' | 'grounding' | 'audio' | 'light' | 'nap' | 'journal' | 'relaxation' | 'reflection';
  /** Piste jouée en fond pendant l'exercice (servie par le front), ou rien. */
  music: string | null;
  /** Les signaux de la mesure que cet exercice vise, le principal d'abord. */
  signals: DominantSignal[];
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

/**
 * L'état d'un capteur de la cabine, pour l'écran des capteurs.
 *
 * Le modèle et la fréquence sont affichés parce qu'ils rendent le relevé
 * discutable : « 214 bpm » ne veut rien dire sans savoir que le MAX30102
 * échantillonne à 100 Hz et que 30–220 sont ses bornes plausibles.
 */
export interface SensorHealth {
  key: SignalKey;
  label: string;
  /** Référence du composant, telle qu'elle est gravée dessus. */
  model: string;
  sampleRate: string;
  value: number | null;
  unit: string;
  /** Les trente dernières valeurs, pour la courbe. */
  window: number[];
  level: Exclude<Level, 'unreliable'> | 'unreliable';
  /** Dit pourquoi le signal n'est pas exploitable, quand il ne l'est pas. */
  note: string | null;
}

export interface AggregateTrends {
  /** Trente points, agrégés sur l'équipage, sans nom. */
  meanIndex: { sol: number; value: number }[];
  sessionsPerDay: number;
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
