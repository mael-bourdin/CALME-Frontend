import type { ConsentState, Feedback, SessionStream, Transport } from '../transport';
import type {
  Assessment,
  CabinMode,
  ConnectionState,
  CrewHistory,
  Indicators,
  Level,
  PowerState,
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
  POWER_LINES,
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
};

function wattsFor(mode: CabinMode): number {
  return POWER_TOTALS[mode] ?? 11;
}

function powerState(): PowerState {
  return {
    mode: state.mode,
    watts: wattsFor(state.mode),
    setpointPercent: state.setpointPercent,
    budgetWatts: 80,
    lines: POWER_LINES,
    // 8 séances de 15 min à 72 W, plus 22 h de veille à 11 W.
    dailyCostWh: 386,
    // 8 personnes × 100 W × 3 % de baisse supposée, sur 24 h.
    dailySavingWh: 576,
  };
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
  const exercise = allowed[0] ?? EXERCISES[0];
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
  getCurrentMember() {
    return delay(CREW.find((m) => m.id === OCCUPANT_ID) ?? CREW[0]);
  },

  getLastSessionAt() {
    return delay('deux jours');
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
    const alert = state.alerts.find((a) => a.crewId === crewId && a.acknowledgedAt);

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
      // Le détail ne s'ouvre qu'après acquittement d'une alerte, ou avec
      // l'accord explicite de la personne. L'ouverture est journalisée.
      accessGrant: {
        reason: alert ? 'alert-acknowledged' : 'explicit-consent',
        alertId: alert?.id ?? null,
        acknowledgedBy: alert?.acknowledgedBy ?? null,
        grantedAt: `Sol ${CURRENT_SOL}, 18:26`,
      },
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

  getPower() {
    return delay(powerState());
  },

  setPowerSetpoint(percent) {
    state.setpointPercent = percent;
    // Sous 60 % du budget, la cabine bascule d'elle-même : la caméra d'abord,
    // puis l'écran, puis le modèle de vision. Les capteurs biologiques restent.
    state.mode = percent < 60 ? 'degraded' : state.session ? 'measuring' : 'standby';
    return delay(powerState(), 400);
  },

  getHealth() {
    return delay({
      database: { ok: true, detail: '12,4 Go, 30 jours de brut' },
      model: state.modelDown
        ? { ok: false, detail: 'coupé pour économiser l’énergie', name: null }
        : { ok: true, detail: '3 Md, 1,8 s par consigne', name: 'llama-3b-instruct' },
      sensors: { ok: state.suspect.size === 0, online: 4 - state.suspect.size, total: 4 },
      buffer: { pending: 0, lastReplayAt: `Sol ${CURRENT_SOL - 5}` },
    });
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
