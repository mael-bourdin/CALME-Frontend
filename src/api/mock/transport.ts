import type { ConsentState, Feedback, SessionStream, Transport } from '../transport';
import type {
  Assessment,
  CabinMode,
  ConnectionState,
  CrewHistory,
  CrewMember,
  Indicators,
  Level,
  Recommendation,
  SensorHealth,
  SensorFrame,
  Session,
  SessionOutcome,
  SignalKey,
  StreamEvent,
} from '../types';
import {
  ALERTS,
  CREW,
  CURRENT_SOL,
  EXERCISES,
  FALLBACK_MESSAGES,
  MODEL_MESSAGES,
  OCCUPANT_ID,
  POWER_TOTALS,
  buildCrewOverview,
  buildHistory,
  buildTrends,
  levelFor,
  seeded,
} from './data';

/**
 * Le serveur de bord, simulé en mémoire.
 *
 * Il implémente la même interface que le vrai transport, y compris le flux
 * temps réel et ses défaillances : on peut couper la connexion, rendre un
 * capteur aberrant ou éteindre le modèle local, et l'interface doit réagir
 * comme elle réagira en démonstration.
 */

/** La minute de mesure est jouée plus vite en mock, sinon on attend pour rien. */
const SPEED = Number(import.meta.env.VITE_MOCK_SPEED ?? 4) || 4;
const MEASURE_SECONDS = 60;

/** Le médecin connecté. Côté serveur, il vient de la session authentifiée. */
const SIGNED_IN_DOCTOR = 'Dr. Benali';

function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms / SPEED));
}

interface MockState {
  mode: CabinMode;
  setpointPercent: number;
  consent: ConsentState;
  modelDown: boolean;
  suspect: Set<SignalKey>;
  session: Session | null;
  assessment: Assessment | null;
  recommendation: Recommendation | null;
  alerts: typeof ALERTS;
  feedback: Record<string, Feedback>;
  /** Copie mutable de CREW : un enrôlement en mock y ajoute une ligne, sans
   * toucher à la constante importée (les huit membres de la démonstration
   * restent ceux de data.ts d'une exécution à l'autre). */
  crew: CrewMember[];
  /** Empreinte par identifiant, pour que `identifyCrewMember` ait quelque
   * chose à comparer. Vide au démarrage : comme en vrai, personne n'est
   * reconnu tant que personne ne s'est enrôlé dans cette session. */
  empreintes: Map<string, number[]>;
}

const state: MockState = {
  mode: 'standby',
  setpointPercent: 100,
  consent: { camera: true, microphone: true },
  modelDown: false,
  suspect: new Set(),
  session: null,
  assessment: null,
  recommendation: null,
  alerts: ALERTS.map((a) => ({ ...a })),
  feedback: {},
  crew: CREW.map((m) => ({ ...m })),
  empreintes: new Map(),
};

/** Même seuil euclidien que le serveur (voir app/services/visage.py). */
const SEUIL_IDENTIFICATION = 0.6;

function distanceEuclidienne(a: number[], b: number[]): number {
  let somme = 0;
  for (let i = 0; i < a.length; i += 1) somme += (a[i] - b[i]) ** 2;
  return Math.sqrt(somme);
}

/** Deux initiales au plus, comme `Avatar` les affiche côté écrans. */
function initialesDe(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function wattsFor(mode: CabinMode): number {
  return POWER_TOTALS[mode] ?? 11;
}

/** Les signaux réellement pris en compte, une fois le consentement appliqué. */
function activeSignals(): SignalKey[] {
  const signals: SignalKey[] = ['hr', 'eda'];
  if (state.consent.camera && state.mode !== 'degraded') signals.push('face');
  if (state.consent.microphone) signals.push('voice');
  return signals.filter((s) => !state.suspect.has(s));
}

function buildAssessment(sessionId: string): Assessment {
  const active = activeSignals();
  const hasBiological = active.includes('hr') && active.includes('eda');

  // Une valeur hors bornes n'est pas une urgence médicale : c'est un capteur
  // qui déconne. Le système le dit et ne calcule pas d'indice.
  const unreliable = !hasBiological || state.suspect.has('hr');

  const index = unreliable ? 0 : 58;
  const level: Level = unreliable ? 'unreliable' : levelFor(index);

  const missing: Assessment['missingSignals'] = [];
  if (!state.consent.camera) missing.push({ signal: 'face', reason: 'disabled' });
  if (!state.consent.microphone) missing.push({ signal: 'voice', reason: 'disabled' });
  if (state.mode === 'degraded' && state.consent.camera)
    missing.push({ signal: 'face', reason: 'degraded' });
  for (const s of state.suspect) missing.push({ signal: s, reason: 'faulty' });

  // La confiance baisse avec chaque signal perdu, et le système l'annonce
  // plutôt que de faire comme si de rien n'était.
  const confidence = unreliable ? 0.2 : Math.max(0.45, 1 - missing.length * 0.18);

  return {
    id: `assess-${sessionId}`,
    sessionId,
    index,
    level,
    confidence,
    missingSignals: missing,
    indicators: {
      heartRateMean: state.suspect.has('hr') ? 214 : 71,
      heartRateVariability: unreliable ? null : 28,
      edaTonic: 4.8,
      edaPhasic: 1.9,
      faceTension: state.consent.camera && state.mode !== 'degraded' ? 0.31 : null,
      voiceIndex: state.consent.microphone ? 0.44 : null,
      breathingRate: 14,
    },
    personalBaseline: 30,
    computedAt: new Date().toISOString(),
  };
}

function buildRecommendation(assessment: Assessment): Recommendation {
  // Le modèle choisit dans la liste que les règles lui ont donnée. Si la liste
  // est vide ou le format invalide, le serveur prend un choix par défaut.
  const allowed = EXERCISES.filter((e) => {
    if (assessment.level === 'red') return e.kind === 'breathing';
    if (assessment.level === 'amber') return e.kind === 'breathing' || e.kind === 'grounding';
    return e.minLevel === 'green';
  });
  // Démonstration : `?exercice=visage` dans l'adresse force l'exercice
  // proposé, pour montrer n'importe lequel sans fabriquer la mesure qui y mène.
  const force =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('exercice')
      : null;
  const exercise = EXERCISES.find((e) => e.id === force) ?? allowed[0] ?? EXERCISES[0];
  const source = state.modelDown ? 'rules' : 'model';

  return {
    id: `reco-${assessment.id}`,
    assessmentId: assessment.id,
    exercise,
    message:
      source === 'rules' ? FALLBACK_MESSAGES[assessment.level] : MODEL_MESSAGES[assessment.level],
    source,
    modelName: source === 'model' ? 'llama-3b-instruct' : null,
  };
}

/* -------------------------------------------------------------------------
   Flux simulé
   ------------------------------------------------------------------------- */

function createMockStream(sessionId: string): SessionStream {
  const handlers = new Set<(event: StreamEvent) => void>();
  const stateHandlers = new Set<(s: ConnectionState) => void>();
  let connection: ConnectionState = 'connecting';
  let elapsed = 0;
  let timer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;
  const random = seeded(7919);

  function emit(event: StreamEvent) {
    if (connection !== 'open') return; // hors ligne, le firmware empile
    for (const handler of handlers) handler(event);
  }

  function setConnection(next: ConnectionState) {
    if (connection === next) return;
    connection = next;
    for (const handler of stateHandlers) handler(next);
  }

  function frame(): SensorFrame {
    const suspectHr = state.suspect.has('hr');
    return {
      at: new Date().toISOString(),
      heartRate: suspectHr
        ? 214
        : Math.round(68 + Math.sin(elapsed / 4) * 3 + (random() - 0.5) * 2),
      skinConductance: Math.round((4.4 + Math.sin(elapsed / 7) * 0.6 + random() * 0.3) * 10) / 10,
      faceTension:
        state.consent.camera && state.mode !== 'degraded' ? 0.28 + random() * 0.08 : null,
      voiceIndex: state.consent.microphone ? 0.4 + random() * 0.1 : null,
      suspect: [...state.suspect],
      // Notes de bien-être sur 100, comme celles du serveur.
      faceScore:
        state.consent.camera && state.mode !== 'degraded' ? Math.round(70 + random() * 12) : null,
      voiceScore: state.consent.microphone ? Math.round(72 + random() * 10) : null,
      moodScore: elapsed > 20 ? 68 : null,
    };
  }

  function tick() {
    if (disposed) return;
    elapsed += 1;

    emit({ type: 'frame', payload: frame() });
    emit({
      type: 'progress',
      payload: {
        elapsedSeconds: Math.min(elapsed, MEASURE_SECONDS),
        totalSeconds: MEASURE_SECONDS,
      },
    });

    // Les indicateurs sont recalculés toutes les cinq secondes sur une fenêtre
    // glissante de trente, comme côté serveur.
    if (elapsed % 5 === 0) {
      const indicators: Indicators = {
        heartRateMean: 71,
        heartRateVariability: 28,
        edaTonic: 4.8,
        edaPhasic: 1.9,
        faceTension: state.consent.camera ? 0.31 : null,
        voiceIndex: state.consent.microphone ? 0.44 : null,
        breathingRate: 14,
      };
      emit({ type: 'indicators', payload: indicators });
    }

    if (elapsed >= MEASURE_SECONDS) {
      if (timer) clearInterval(timer);
      timer = null;
      const assessment = buildAssessment(sessionId);
      state.assessment = assessment;
      emit({ type: 'assessment', payload: assessment });
    }
  }

  const openTimer = setTimeout(() => {
    if (disposed) return;
    setConnection('open');
    state.mode = 'measuring';
    emit({
      type: 'mode',
      payload: { mode: 'measuring', watts: wattsFor('measuring'), reason: 'Acquisition en cours' },
    });
    timer = setInterval(tick, 1000 / SPEED);
  }, 260 / SPEED);

  return {
    get state() {
      return connection;
    },
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    onConnectionChange(handler) {
      stateHandlers.add(handler);
      handler(connection);
      return () => stateHandlers.delete(handler);
    },
    close() {
      disposed = true;
      clearTimeout(openTimer);
      if (timer) clearInterval(timer);
      setConnection('closed');
      handlers.clear();
      stateHandlers.clear();
    },
  };
}

/* -------------------------------------------------------------------------
   Transport
   ------------------------------------------------------------------------- */

export const mockTransport: Transport = {
  async sendFaceIndex() {
    /* Le transport simulé accepte et oublie : les écrans n'ont pas à savoir
       lequel des deux transports ils utilisent. */
  },

  async sendVoiceSample() {
    return { voiceIndex: 0.42 };
  },

  async sendDialogueTurn(_sessionId, _wav, historique, dernierTour) {
    // Le mock n'entend rien : il fait semblant d'avoir compris, pour que la
    // conversation se déroule en démonstration sans serveur.
    const tours = historique.filter((t) => t.role === 'lila').length;
    const relances = [
      'Ça a l’air d’avoir été une longue journée. Qu’est-ce qui t’a le plus pesé ?',
      'Je comprends. Et là, maintenant, comment te sens-tu ?',
    ];
    return delay({
      entendu: 'Une journée chargée.',
      reponse: dernierTour
        ? 'Merci de m’avoir parlé. Respire calmement, je termine la mesure.'
        : relances[(tours - 1) % relances.length],
      source: 'rules' as const,
    });
  },

  getCurrentMember() {
    return delay(CREW.find((m) => m.id === OCCUPANT_ID) ?? CREW[0]);
  },

  getLastSessionAt() {
    return delay('deux jours');
  },

  getCrewList() {
    return delay(state.crew.map((m) => ({ ...m })));
  },

  async addFaceReference() {
    /* La simulation n'apprend pas de visages. */
  },

  identifyCrewMember(empreinte) {
    // Le mock ne voit jamais de vraie image : sans empreinte enrôlée dans
    // cette même exécution, personne ne peut correspondre — exactement ce
    // qui se passe en vrai la première fois qu'une cabine rencontre
    // quelqu'un. Une fois enrôlé (voir enrollCrewMember), se réidentifier
    // avec la même empreinte fonctionne, pour pouvoir démontrer les deux cas.
    let meilleur: { id: string; distance: number } | null = null;
    for (const [id, reference] of state.empreintes) {
      const distance = distanceEuclidienne(reference, empreinte);
      if (!meilleur || distance < meilleur.distance) meilleur = { id, distance };
    }
    const trouve =
      meilleur && meilleur.distance < SEUIL_IDENTIFICATION
        ? (state.crew.find((m) => m.id === meilleur!.id) ?? null)
        : null;
    return delay(trouve);
  },

  enrollCrewMember(displayName, empreinte) {
    const membre: CrewMember = {
      id: `crew-${Date.now()}`,
      displayName,
      role: 'Nouvel équipage',
      initials: initialesDe(displayName),
      joinedSol: CURRENT_SOL,
    };
    state.crew.push(membre);
    state.empreintes.set(membre.id, empreinte);
    return delay(membre);
  },

  openSession(crewId) {
    const session: Session = {
      id: `sess-${Date.now()}`,
      crewId,
      startedAt: new Date().toISOString(),
      closedAt: null,
      mode: 'measuring',
      exerciseId: null,
    };
    state.session = session;
    state.assessment = null;
    state.recommendation = null;
    return delay(session);
  },

  getSession(sessionId) {
    if (state.session?.id === sessionId) return delay(state.session);
    return Promise.reject(new Error('Séance inconnue'));
  },

  async assess() {
    // La simulation termine la mesure elle-même, par son flux (voir
    // createMockStream) : la cabine ne l'appelle jamais en mode simulé.
    throw new Error('La simulation termine la mesure elle-même.');
  },

  closeSession(sessionId) {
    const before = state.assessment?.index ?? 58;
    const after = state.assessment?.level === 'unreliable' ? null : 34;
    state.mode = 'standby';
    if (state.session) state.session = { ...state.session, closedAt: new Date().toISOString() };

    const outcome: SessionOutcome = {
      sessionId,
      indexBefore: before,
      indexAfter: after,
      breathingRateBefore: 14,
      breathingRateAfter: after === null ? null : 6,
      heartRateBefore: 71,
      heartRateAfter: after === null ? null : 58,
      // Aucun seuil franchi : personne n'est prévenu.
      alertRaised: before >= 70,
    };
    return delay(outcome, 320);
  },

  recommend(assessmentId) {
    const assessment = state.assessment;
    if (!assessment || assessment.id !== assessmentId) {
      return Promise.reject(new Error('Mesure introuvable'));
    }
    const recommendation = buildRecommendation(assessment);
    state.recommendation = recommendation;
    // Le dossier se donne trente secondes ; le modèle local en prend deux.
    return delay(recommendation, state.modelDown ? 180 : 1400);
  },

  sendFeedback(recommendationId, feedback) {
    state.feedback[recommendationId] = feedback;
    return delay(undefined);
  },

  setConsent(_sessionId, consent) {
    state.consent = { ...consent };
    return delay(state.consent);
  },

  getConsent() {
    return delay(state.consent);
  },

  getAssessment(sessionId) {
    if (state.assessment) return delay(state.assessment);
    return delay(buildAssessment(sessionId));
  },

  streamSession(sessionId) {
    return createMockStream(sessionId);
  },

  getCrewOverview() {
    return delay(buildCrewOverview());
  },

  getCrewHistory(crewId) {
    const member = CREW.find((m) => m.id === crewId) ?? CREW[0];
    const overview = buildCrewOverview().find((c) => c.member.id === crewId);
    const to = overview?.meanIndex ?? 40;

    const history: CrewHistory = {
      member,
      points: buildHistory(crewId, Math.max(12, to - 30), to),
      sessions: [
        {
          id: 's1',
          at: `Sol ${CURRENT_SOL}, 18:22`,
          indexBefore: to,
          indexAfter: null,
          exerciseName: 'Cohérence cardiaque 365',
          feedback: null,
        },
        {
          id: 's2',
          at: `Sol ${CURRENT_SOL - 3}, 07:40`,
          indexBefore: to - 5,
          indexAfter: to - 23,
          exerciseName: 'Cohérence cardiaque 365',
          feedback: 'helped',
        },
        {
          id: 's3',
          at: `Sol ${CURRENT_SOL - 6}, 22:10`,
          indexBefore: to - 11,
          indexAfter: to - 30,
          exerciseName: 'Respiration 4-7-8',
          feedback: 'helped',
        },
        {
          id: 's4',
          at: `Sol ${CURRENT_SOL - 9}, 19:55`,
          indexBefore: to - 16,
          indexAfter: to - 33,
          exerciseName: 'Ancrage sensoriel 5-4-3-2-1',
          feedback: 'not-really',
        },
      ],
    };
    return delay(history);
  },

  getAlerts() {
    return delay(state.alerts);
  },

  acknowledgeAlert(alertId) {
    const alert = state.alerts.find((a) => a.id === alertId);
    if (!alert) return Promise.reject(new Error('Alerte inconnue'));
    alert.acknowledgedAt = `Sol ${CURRENT_SOL}, 18:26`;
    // Le mock tient lieu de serveur : c'est lui qui sait qui est connecté.
    alert.acknowledgedBy = SIGNED_IN_DOCTOR;
    return delay({ ...alert });
  },

  getTrends() {
    return delay(buildTrends());
  },

  getSensors() {
    // Une fenêtre déterministe par capteur : une démonstration doit être
    // reproductible, y compris dans la forme de ses courbes.
    const wave = (seed: number, base: number, spread: number) => {
      const random = seeded(seed);
      return Array.from({ length: 30 }, (_, i) =>
        Number((base + Math.sin(i / 3.1) * spread + (random() - 0.5) * spread * 0.7).toFixed(2)),
      );
    };

    const suspectHr = state.suspect.has('hr');

    return delay<SensorHealth[]>([
      {
        key: 'hr',
        label: 'Cardiaque',
        model: 'MAX30102',
        sampleRate: '100 Hz',
        value: suspectHr ? 214 : 62,
        unit: 'bpm',
        window: suspectHr ? wave(11, 205, 12) : wave(11, 62, 4),
        level: suspectHr ? 'red' : 'green',
        note: suspectHr ? 'Hors bornes 30–220, mesure ignorée' : null,
      },
      {
        key: 'eda',
        label: 'Sudation',
        model: 'GSR analogique',
        sampleRate: '10 Hz',
        value: 4.8,
        unit: 'µS',
        window: wave(23, 4.8, 0.9),
        level: 'amber',
        note: 'Signal bruité — poids réduit dans l’indice',
      },
      {
        key: 'face',
        label: 'Visage',
        model: 'OV2640',
        sampleRate: '5 im/s',
        value: 0.31,
        unit: '',
        window: wave(41, 0.31, 0.08),
        level: 'green',
        note: null,
      },
      {
        key: 'voice',
        label: 'Voix',
        model: 'INMP441',
        sampleRate: '16 kHz',
        value: 0.44,
        unit: '',
        window: wave(59, 0.44, 0.1),
        level: 'green',
        note: null,
      },
    ]);
  },

  simulateSuspectSensor(signal) {
    if (state.suspect.has(signal)) state.suspect.delete(signal);
    else state.suspect.add(signal);
    return delay(undefined);
  },

  simulateModelOutage(down) {
    state.modelDown = down;
    return delay(undefined);
  },
};
