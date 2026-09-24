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
  SensorHealth,
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
 * L'indice facial calculé dans le navigateur de la cabine.
 *
 * Seuls ces quatre nombres partent. L'image est analysée sur le poste et
 * détruite image par image : la promesse « aucune image conservée » est vraie
 * dans l'architecture, pas seulement dans la politique.
 */
export interface FaceIndex {
  at: string;
  /** Tension du visage, 0 à 1. */
  tension: number;
  /** Clignements par minute, sur une fenêtre glissante de 30 s. */
  blinkRate: number;
  /** Immobilité, 0 à 1. */
  stillness: number;
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
  /** Pousse l'indice facial calculé localement. Une fois par seconde. */
  sendFaceIndex(sessionId: string, indice: FaceIndex): Promise<void>;
  /** Pousse dix secondes de voix. La réponse ne contient que des indicateurs. */
  sendVoiceSample(sessionId: string, wav: Blob): Promise<{ voiceIndex: number }>;
  getCurrentMember(): Promise<CrewMember>;
  getLastSessionAt(crewId: string): Promise<string | null>;
  /**
   * L'équipage déjà enrôlé, pour la liste de repli de l'accueil quand la
   * reconnaissance faciale ne reconnaît personne — ou n'a pas pu essayer.
   */
  getCrewList(): Promise<CrewMember[]>;
  /**
   * Compare l'empreinte calculée dans le navigateur à celles déjà enrôlées.
   * `null` si personne ne correspond d'assez près : ce n'est pas une erreur,
   * c'est le résultat normal d'une personne pas encore enrôlée.
   */
  identifyCrewMember(empreinte: number[]): Promise<CrewMember | null>;
  /** Enrôle un nouveau membre d'équipage avec sa première empreinte faciale. */
  enrollCrewMember(displayName: string, empreinte: number[]): Promise<CrewMember>;
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
  /**
   * Qui acquitte est déduit de la session authentifiée, côté serveur.
   * Le client ne le dit pas : sinon la trace ne prouve rien.
   */
  acknowledgeAlert(alertId: string): Promise<Alert>;
  getTrends(): Promise<AggregateTrends>;

  /* ---- Énergie et santé système ------------------------------------------ */
  getPower(): Promise<PowerState>;
  /** La consigne de réduction vient du réseau du vaisseau. */
  setPowerSetpoint(percent: number): Promise<PowerState>;
  getHealth(): Promise<HealthState>;

  /** Les quatre capteurs de la cabine, avec leur dernière fenêtre de mesure. */
  getSensors(): Promise<SensorHealth[]>;

  /* ---- Simulations de démonstration -------------------------------------- */
  /** Injecte une valeur aberrante pour montrer que le système la rejette. */
  simulateSuspectSensor?(signal: SignalKey): Promise<void>;
  /** Coupe le modèle local pour montrer le repli sur les règles seules. */
  simulateModelOutage?(down: boolean): Promise<void>;
}
