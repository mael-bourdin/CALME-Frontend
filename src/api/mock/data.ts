import type {
  AggregateTrends,
  Alert,
  CrewMember,
  CrewSummary,
  Exercise,
  Level,
  PowerBudgetLine,
} from '../types';

/** Sol courant, pour que les dates affichées restent cohérentes entre écrans. */
export const CURRENT_SOL = 4212;

/** Générateur déterministe : une démonstration doit être reproductible. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function levelFor(index: number): Level {
  if (index >= 70) return 'red';
  if (index >= 40) return 'amber';
  return 'green';
}

export const CREW: CrewMember[] = [
  {
    id: 'mei',
    displayName: 'Mei Tanaka',
    role: 'Ingénieure systèmes',
    initials: 'MT',
    joinedSol: 0,
  },
  { id: 'ana', displayName: 'Ana Ferreira', role: 'Commandante', initials: 'AF', joinedSol: 0 },
  {
    id: 'priya',
    displayName: 'Priya Raman',
    role: 'Biologiste serre',
    initials: 'PR',
    joinedSol: 0,
  },
  { id: 'nour', displayName: 'Nour Haddad', role: 'Navigation', initials: 'NH', joinedSol: 0 },
  { id: 'lars', displayName: 'Lars Nyqvist', role: 'Propulsion', initials: 'LN', joinedSol: 0 },
  { id: 'tomas', displayName: 'Tomas Varga', role: 'Maintenance', initials: 'TV', joinedSol: 0 },
  {
    id: 'youssef',
    displayName: 'Youssef Benali',
    role: 'Médecin de bord',
    initials: 'YB',
    joinedSol: 0,
  },
  {
    id: 'diego',
    displayName: 'Diego Morales',
    role: 'Recyclage ECLSS',
    initials: 'DM',
    joinedSol: 0,
  },
];

export const OCCUPANT_ID = 'mei';

/**
 * Le catalogue, identique à celui du serveur (Backend/app/services/exercices.py).
 * Quatorze interventions, toutes non médicamenteuses, toutes
 * réalisables avec le son et la lumière d'une pièce. Le modèle de langage
 * choisit dans cette liste, il ne l'invente pas.
 */
export const EXERCISES: Exercise[] = [
  {
    id: 'cc365',
    name: 'Cohérence cardiaque 365',
    duration: 5,
    indication: 'Activation forte, variabilité cardiaque basse',
    minLevel: 'green',
    kind: 'breathing',
    music: null,
    signals: ['fc_moyenne', 'hrv_rmssd', 'diffus'],
  },
  {
    id: 'soupir',
    name: 'Soupir physiologique',
    duration: 2,
    indication: 'Pic de stress aigu : cœur rapide et sudation en pics',
    minLevel: 'green',
    kind: 'breathing',
    music: null,
    signals: ['fc_moyenne', 'eda_reponses'],
  },
  {
    id: 'carre',
    name: 'Respiration au carré',
    duration: 4,
    indication: 'Anxiété avant une tâche, sudation de fond élevée',
    minLevel: 'green',
    kind: 'breathing',
    music: '/audio/respiration-carree-80bpm.ogg',
    signals: ['eda_fond', 'hrv_rmssd', 'voix'],
  },
  {
    id: '478',
    name: 'Respiration 4-7-8',
    duration: 3,
    indication: "Agitation en fin de journée, difficulté d'endormissement",
    minLevel: 'green',
    kind: 'breathing',
    music: null,
    signals: ['fc_moyenne', 'visage'],
  },
  {
    id: 'visage',
    name: 'Relâchement du visage',
    duration: 3,
    indication: 'Visage crispé : sourcils froncés, mâchoire serrée',
    minLevel: 'green',
    kind: 'relaxation',
    music: '/audio/respiration-carree-80bpm.ogg',
    signals: ['visage'],
  },
  {
    id: 'jacobson',
    name: 'Relaxation musculaire progressive',
    duration: 8,
    indication: 'Corps tendu, sudation de fond et visage crispés',
    minLevel: 'amber',
    kind: 'relaxation',
    music: '/audio/respiration-carree-80bpm.ogg',
    signals: ['eda_fond', 'visage'],
  },
  {
    id: 'scan',
    name: 'Scan corporel',
    duration: 7,
    indication: 'Charge modérée, sans signal dominant',
    minLevel: 'green',
    kind: 'relaxation',
    music: '/audio/respiration-carree-80bpm.ogg',
    signals: ['diffus'],
  },
  {
    id: 'ancrage5432',
    name: 'Ancrage sensoriel 5-4-3-2-1',
    duration: 5,
    indication: 'Rumination, pensées qui tournent en boucle',
    minLevel: 'amber',
    kind: 'grounding',
    music: null,
    signals: ['eda_reponses', 'voix'],
  },
  {
    id: 'recul',
    name: 'Prendre du recul',
    duration: 5,
    indication: 'Voix tendue après une journée difficile',
    minLevel: 'green',
    kind: 'reflection',
    music: null,
    signals: ['voix', 'eda_reponses'],
  },
  {
    id: 'visualisation',
    name: 'La Terre vue du hublot',
    duration: 6,
    indication: "Lassitude, voix éteinte, besoin d'évasion",
    minLevel: 'green',
    kind: 'relaxation',
    music: '/audio/respiration-carree-80bpm.ogg',
    signals: ['fatigue', 'diffus'],
  },
  {
    id: 'playlist',
    name: 'Playlist à tempo décroissant',
    duration: 10,
    indication: 'Charge modérée, descente progressive',
    minLevel: 'green',
    kind: 'audio',
    music: '/audio/respiration-carree-80bpm.ogg',
    signals: ['diffus'],
  },
  {
    id: 'circadien',
    name: 'Séquence lumineuse circadienne',
    duration: 15,
    indication: 'Désynchronisation, baisse de vigilance',
    minLevel: 'green',
    kind: 'light',
    music: '/audio/respiration-carree-80bpm.ogg',
    signals: ['fatigue'],
  },
  {
    id: 'sieste',
    name: 'Micro-sieste guidée',
    duration: 20,
    indication: 'Fatigue accumulée',
    minLevel: 'amber',
    kind: 'nap',
    music: '/audio/respiration-carree-80bpm.ogg',
    signals: ['fatigue'],
  },
  {
    id: 'journal',
    name: 'Journal vocal différé',
    duration: 8,
    indication: 'Repli, isolement social',
    minLevel: 'green',
    kind: 'journal',
    music: null,
    signals: ['voix', 'fatigue'],
  },
];

/** Sept jours d'indice par membre, qui servent aussi à calculer la tendance. */
const SPARKS: Record<string, number[]> = {
  mei: [28, 31, 29, 34, 38, 47, 58],
  ana: [52, 55, 58, 61, 65, 69, 74],
  priya: [41, 42, 43, 44, 45, 46, 47],
  nour: [36, 37, 38, 38, 39, 40, 41],
  lars: [33, 34, 32, 35, 34, 36, 35],
  tomas: [30, 31, 29, 30, 28, 29, 29],
  youssef: [26, 25, 24, 24, 23, 23, 22],
  diego: [21, 21, 20, 20, 19, 19, 18],
};

const LAST_SESSION: Record<string, string> = {
  mei: 'il y a 12 min',
  ana: 'il y a 3 h',
  priya: 'il y a 19 h',
  nour: 'il y a 8 h',
  lars: 'il y a 6 h',
  tomas: 'il y a 2 j',
  youssef: 'hier, 21:40',
  diego: 'il y a 30 h',
};

export function buildCrewOverview(): CrewSummary[] {
  return CREW.map((member) => {
    const spark = SPARKS[member.id] ?? [30, 30, 30, 30, 30, 30, 30];
    const meanIndex = spark[spark.length - 1];
    return {
      member,
      meanIndex,
      level: levelFor(meanIndex),
      delta: meanIndex - spark[0],
      lastSessionAt: LAST_SESSION[member.id] ?? null,
      spark,
    };
  }).sort((a, b) => b.meanIndex - a.meanIndex);
}

/** Trente jours d'indice pour une personne, avec une dérive lente et du bruit. */
export function buildHistory(
  crewId: string,
  from: number,
  to: number,
): { sol: number; index: number }[] {
  const random = seeded(crewId.length * 9973 + from * 31);
  const points: { sol: number; index: number }[] = [];
  for (let i = 0; i < 30; i += 1) {
    const t = i / 29;
    const trend = from + (to - from) * t;
    const noise = (random() - 0.5) * 3.2;
    points.push({ sol: CURRENT_SOL - 29 + i, index: Math.round((trend + noise) * 10) / 10 });
  }
  points[points.length - 1].index = to;
  return points;
}

export const ALERTS: Alert[] = [
  {
    id: 'alert-1',
    crewId: 'ana',
    crewName: 'Ana Ferreira',
    raisedAt: `Sol ${CURRENT_SOL}, 18:22`,
    kind: 'threshold-crossed',
    acknowledgedAt: null,
    acknowledgedBy: null,
    note: null,
  },
  {
    id: 'alert-2',
    crewId: 'ana',
    crewName: 'Ana Ferreira',
    raisedAt: `Sol ${CURRENT_SOL - 3}, 07:51`,
    kind: 'threshold-crossed',
    acknowledgedAt: `Sol ${CURRENT_SOL - 3}, 08:14`,
    acknowledgedBy: 'Dr. Benali',
    note: 'Entretien programmé.',
  },
  {
    id: 'alert-3',
    crewId: 'priya',
    crewName: 'Priya Raman',
    raisedAt: `Sol ${CURRENT_SOL - 14}, 14:07`,
    kind: 'threshold-crossed',
    acknowledgedAt: `Sol ${CURRENT_SOL - 14}, 15:02`,
    acknowledgedBy: 'Dr. Benali',
    note: 'Indice redescendu depuis.',
  },
  {
    id: 'alert-4',
    crewId: 'mei',
    crewName: 'Mei Tanaka',
    raisedAt: `Sol ${CURRENT_SOL - 21}, 22:30`,
    kind: 'sensor-suspect',
    acknowledgedAt: `Sol ${CURRENT_SOL - 21}, 22:35`,
    acknowledgedBy: 'Dr. Benali',
    note: 'Capteur cardiaque remplacé.',
  },
];

/** Le budget du dossier, poste par poste. */
export const POWER_LINES: PowerBudgetLine[] = [
  {
    label: 'Capteurs et ESP32',
    byMode: { standby: 1.2, measuring: 2.4, session: 2.4, degraded: 2.0 },
  },
  { label: 'Caméra', byMode: { standby: 0, measuring: 1.8, session: 1.8, degraded: 0 } },
  { label: 'Serveur', byMode: { standby: 8, measuring: 22, session: 28, degraded: 14 } },
  { label: 'Écran', byMode: { standby: 0, measuring: 12, session: 12, degraded: 0 } },
  { label: 'Éclairage', byMode: { standby: 2, measuring: 4, session: 18, degraded: 4 } },
  { label: 'Son', byMode: { standby: 0, measuring: 0, session: 10, degraded: 6 } },
];

export const POWER_TOTALS: Record<string, number> = {
  standby: 11,
  measuring: 42,
  session: 72,
  degraded: 26,
};

export function buildTrends(): AggregateTrends {
  const random = seeded(4212);
  const meanIndex = Array.from({ length: 30 }, (_, i) => {
    const trend = 31 + (43 - 31) * (i / 29);
    return {
      sol: CURRENT_SOL - 29 + i,
      value: Math.round((trend + (random() - 0.5) * 2.4) * 10) / 10,
    };
  });
  return {
    meanIndex,
    sessionsPerDay: 6.7,
    breathingRateBefore: 13.4,
    breathingRateAfter: 7.1,
    amberShare: 0.31,
  };
}

/**
 * Les consignes de repli, jouées quand le modèle local est coupé.
 * Elles sont volontairement génériques : le système perd la personnalisation,
 * pas sa fonction, et il vaut mieux l'annoncer que faire semblant.
 */
export const FALLBACK_MESSAGES: Record<Level, string> = {
  green: 'Tout va bien. Je te propose l’exercice prévu par les règles.',
  amber: 'Le modèle est coupé. Voici l’exercice prévu par les règles, sans adaptation.',
  red: 'Tu as franchi le seuil. Le médecin de bord est prévenu. On respire.',
  unreliable: 'Je ne calcule pas d’indice : les mesures ne sont pas exploitables.',
};

/** Les consignes rédigées par le modèle, quand il est disponible. */
/**
 * Les consignes sont courtes, comme sur les maquettes.
 *
 * Elles sont composées en Bodoni à cinquante pixels et occupent tout l'écran :
 * au-delà de trois lignes, l'écran devient un paragraphe et ce qui devait se
 * lire d'un coup d'œil se lit en s'appliquant. Le détail, quand il compte,
 * arrive après — pas dans la phrase d'annonce.
 */
export const MODEL_MESSAGES: Record<Level, string> = {
  green: 'Tout va bien. Ton indice est dans ta zone habituelle.',
  amber: 'Ta sudation est au-dessus de ta normale. Cinq minutes de cohérence cardiaque.',
  red: 'Tu respires beaucoup trop vite. On commence par un exercice court.',
  unreliable: 'Une mesure est sortie des bornes. Ce n’est pas toi, c’est un capteur.',
};
