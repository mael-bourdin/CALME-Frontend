import type { Assessment, Level, Recommendation, SensorFrame, SessionOutcome } from '@/api';
import { EXERCISES, MODEL_MESSAGES, FALLBACK_MESSAGES } from '@/api/mock/data';

/** Trente jours d'indice, pour poser la courbe derrière le chiffre du jour. */
export function history(from: number, to: number): number[] {
  return Array.from({ length: 30 }, (_, index) => {
    const t = index / 29;
    const drift = from + (to - from) * t;
    const noise = Math.sin(index * 2.7) * 1.8;
    return Math.round((drift + noise) * 10) / 10;
  });
}

export function assessment(options: {
  index: number;
  level: Level;
  confidence?: number;
  missing?: Assessment['missingSignals'];
  heartRate?: number;
}): Assessment {
  return {
    id: 'demo-assessment',
    sessionId: 'demo-session',
    index: options.index,
    level: options.level,
    confidence: options.confidence ?? 1,
    missingSignals: options.missing ?? [],
    indicators: {
      heartRateMean: options.heartRate ?? 71,
      heartRateVariability: options.level === 'unreliable' ? null : 28,
      edaTonic: 4.8,
      edaPhasic: 1.9,
      faceTension: 0.31,
      voiceIndex: 0.44,
      breathingRate: 14,
    },
    personalBaseline: 30,
    computedAt: new Date().toISOString(),
  };
}

export function recommendation(level: Level, fromRules = false): Recommendation {
  const exercise =
    level === 'green'
      ? (EXERCISES.find((item) => item.id === 'journal') ?? EXERCISES[0])
      : (EXERCISES.find((item) => item.id === 'coherence-365') ?? EXERCISES[0]);

  return {
    id: 'demo-reco',
    assessmentId: 'demo-assessment',
    exercise,
    message: fromRules ? FALLBACK_MESSAGES[level] : MODEL_MESSAGES[level],
    source: fromRules ? 'rules' : 'model',
    modelName: fromRules ? null : 'llama-3b-instruct',
  };
}

export function frame(
  options: { heartRate?: number; suspect?: SensorFrame['suspect'] } = {},
): SensorFrame {
  return {
    at: new Date().toISOString(),
    heartRate: options.heartRate ?? 62,
    skinConductance: 4.8,
    faceTension: 0.31,
    voiceIndex: 0.44,
    suspect: options.suspect ?? [],
  };
}

export function outcome(options: {
  before: number;
  after: number | null;
  alert?: boolean;
}): SessionOutcome {
  return {
    sessionId: 'demo-session',
    indexBefore: options.before,
    indexAfter: options.after,
    breathingRateBefore: 14,
    breathingRateAfter: options.after === null ? null : 6,
    heartRateBefore: 71,
    heartRateAfter: options.after === null ? null : 58,
    alertRaised: options.alert ?? false,
  };
}
