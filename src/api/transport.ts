import type {
  AggregateTrends,
  Alert,
  Assessment,
  ConnectionState,
  CrewHistory,
  CrewMember,
  CrewSummary,
  HealthState,
  PowerState,
  Recommendation,
  Session,
  SessionOutcome,
  SignalKey,
  StreamEvent,
} from './types';

/**
 * Le flux temps réel d'une séance.
 *
 * Il ne renvoie jamais d'erreur : une coupure réseau est un état, pas un échec.
 * Le firmware empile dans son tampon et rejoue au retour, donc l'interface doit
 * savoir dire « je suis déconnectée » sans rien casser de ce qui est affiché.
 */
export interface SessionStream {
  /** S'abonner aux événements poussés par le serveur. Renvoie le désabonnement. */
  subscribe(handler: (event: StreamEvent) => void): () => void;
  /** Suivre l'état de la connexion, pour le dire à l'écran plutôt que le cacher. */
  onConnectionChange(handler: (state: ConnectionState) => void): () => void;
  readonly state: ConnectionState;
  close(): void;
}

export type Feedback = 'helped' | 'not-really';

export interface ConsentState {
  camera: boolean;
  microphone: boolean;
}

/**
 * La surface complète du serveur de bord.
 *
 * Deux implémentations : `live` qui parle au FastAPI, `mock` qui simule tout en
 * mémoire. Les écrans ne connaissent que cette interface, donc brancher le vrai
 * serveur ne demande de toucher à aucun composant.
 */
export interface Transport {
  /* ---- Cabine ------------------------------------------------------------ */
  getCurrentMember(): Promise<CrewMember>;
  getLastSessionAt(crewId: string): Promise<string | null>;
  openSession(crewId: string): Promise<Session>;
  getSession(sessionId: string): Promise<Session>;
  closeSession(sessionId: string): Promise<SessionOutcome>;
  /** Déclenche la décision puis la rédaction de la consigne. */
  recommend(assessmentId: string): Promise<Recommendation>;
  sendFeedback(recommendationId: string, feedback: Feedback): Promise<void>;
  /** La caméra et le micro se coupent de façon durable, depuis la cabine. */
  setConsent(sessionId: string, consent: ConsentState): Promise<ConsentState>;
  getConsent(): Promise<ConsentState>;
  /** Le dernier résultat calculé, pour l'écran de résultat. */
  getAssessment(sessionId: string): Promise<Assessment>;
  streamSession(sessionId: string): SessionStream;

  /* ---- Tableau de bord du médecin ---------------------------------------- */
  getCrewOverview(): Promise<CrewSummary[]>;
  getCrewHistory(crewId: string): Promise<CrewHistory>;
  getAlerts(): Promise<Alert[]>;
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<Alert>;
  getTrends(): Promise<AggregateTrends>;

  /* ---- Énergie et santé système ------------------------------------------ */
  getPower(): Promise<PowerState>;
  /** La consigne de réduction vient du réseau du vaisseau. */
  setPowerSetpoint(percent: number): Promise<PowerState>;
  getHealth(): Promise<HealthState>;

  /* ---- Simulations de démonstration -------------------------------------- */
  /** Injecte une valeur aberrante pour montrer que le système la rejette. */
  simulateSuspectSensor?(signal: SignalKey): Promise<void>;
  /** Coupe le modèle local pour montrer le repli sur les règles seules. */
  simulateModelOutage?(down: boolean): Promise<void>;
}
