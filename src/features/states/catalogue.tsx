import type { ReactNode } from 'react';
import { HomeScreen } from '@/features/cabin/screens/home-screen';
import { MeasureScreen } from '@/features/cabin/screens/measure-screen';
import { ThinkingScreen } from '@/features/cabin/screens/thinking-screen';
import { ResultScreen } from '@/features/cabin/screens/result-screen';
import { ExerciseScreen } from '@/features/cabin/screens/exercise-screen';
import { ClosingScreen } from '@/features/cabin/screens/closing-screen';
import { assessment, frame, outcome, recommendation } from './fixtures';

const noop = () => {};
const consentOn = { camera: true, microphone: true };

export interface StateEntry {
  id: string;
  group: 'Cabine' | 'Cas limites';
  title: string;
  /** Pourquoi cet écran existe, pour la soutenance. */
  note: string;
  render: () => ReactNode;
}

/**
 * Tous les écrans et toutes leurs alternatives, atteignables un par un.
 *
 * Les écrans de la cabine sont des composants de présentation : le parcours
 * réel leur passe l'état du serveur, ce catalogue leur passe un état figé.
 * Aucun code d'écran n'est dupliqué pour la démonstration.
 */
export const STATES: StateEntry[] = [
  {
    id: 'accueil',
    group: 'Cabine',
    title: 'Accueil',
    note: 'Le nom, l’heure de bord, la dernière séance et un seul bouton. Rien d’autre n’aide quelqu’un qui sort d’un quart de huit heures.',
    render: () => <HomeScreen firstName="Mei" lastSessionAt="deux jours" onStart={noop} />,
  },
  {
    id: 'ouverture',
    group: 'Cabine',
    title: 'Ouverture',
    note: 'Ce qui se passe entre « Commencer » et la mesure : la sphère grandit jusqu’à sa taille de mesure et prononce sa phrase, révélée mot à mot. L’écran suivant la reprend au même endroit, donc on ne voit pas de coupure.',
    render: () => (
      <HomeScreen firstName="Mei" lastSessionAt="deux jours" onStart={noop} autoGreet />
    ),
  },
  {
    id: 'mesure',
    group: 'Cabine',
    title: 'Mesure',
    note: 'Son propre tracé cardiaque occupe l’écran, derrière le verre. C’est ce qui fait sentir qu’on la mesure.',
    render: () => (
      <MeasureScreen
        elapsedSeconds={37}
        totalSeconds={60}
        frame={frame()}
        consent={consentOn}
        onToggleConsent={noop}
        connection="open"
      />
    ),
  },
  {
    id: 'calcul',
    group: 'Cabine',
    title: 'Calcul',
    note: 'Les trente secondes que le dossier se donne entre la fin de la mesure et la consigne. L’attente doit être visible, sinon on croit que la cabine a planté.',
    render: () => <ThinkingScreen />,
  },
  {
    id: 'resultat-vert',
    group: 'Cabine',
    title: 'Résultat — vert',
    note: 'Indice sous 40. Exercices courts et légers.',
    render: () => (
      <ResultScreen
        assessment={assessment({ index: 28, level: 'green' })}
        recommendation={recommendation('green')}
        onAccept={noop}
      />
    ),
  },
  {
    id: 'resultat-orange',
    group: 'Cabine',
    title: 'Résultat — orange',
    note: 'Entre 40 et 70. Le chiffre est le point final de sa courbe, sa moyenne est la ligne pointillée.',
    render: () => (
      <ResultScreen
        assessment={assessment({ index: 58, level: 'amber' })}
        recommendation={recommendation('amber')}
        onAccept={noop}
      />
    ),
  },
  {
    id: 'resultat-rouge',
    group: 'Cabine',
    title: 'Résultat — rouge',
    note: 'Au-dessus de 70. Le médecin de bord est prévenu, et l’IA le dit plutôt que de le taire.',
    render: () => (
      <ResultScreen
        assessment={assessment({ index: 74, level: 'red' })}
        recommendation={recommendation('red')}
        onAccept={noop}
      />
    ),
  },
  {
    id: 'seance',
    group: 'Cabine',
    title: 'Séance',
    note: 'Une seule chose à l’écran. La sphère respire avec elle et reste sobre : pendant l’exercice l’IA accompagne, elle ne parle pas.',
    render: () => (
      <ExerciseScreen
        exerciseId="coherence-365"
        exerciseName="Cohérence cardiaque 365"
        durationMinutes={5}
        onComplete={noop}
      />
    ),
  },
  {
    id: 'cloture',
    group: 'Cabine',
    title: 'Clôture',
    note: 'Deux chiffres et deux boutons, comme le prescrit le dossier. Tout le reste serait du bruit.',
    render: () => (
      <ClosingScreen outcome={outcome({ before: 58, after: 34 })} onFeedback={noop} onDone={noop} />
    ),
  },

  /* ---- Cas limites ------------------------------------------------------ */
  {
    id: 'confiance-reduite',
    group: 'Cas limites',
    title: 'Confiance réduite',
    note: 'L’astronaute a coupé la caméra. Le système continue sur les capteurs de l’accoudoir et annonce sa confiance réduite plutôt que de faire comme si de rien n’était.',
    render: () => (
      <MeasureScreen
        elapsedSeconds={24}
        totalSeconds={60}
        frame={frame()}
        consent={{ camera: false, microphone: true }}
        onToggleConsent={noop}
        connection="open"
        reducedConfidence="Confiance réduite — caméra coupée. Je continue sur les capteurs de l’accoudoir."
      />
    ),
  },
  {
    id: 'hors-ligne',
    group: 'Cas limites',
    title: 'Réseau débranché',
    note: 'La démonstration prévoit qu’on débranche le réseau en pleine séance. La séance continue, le firmware empile dans son tampon, et l’écran le dit au lieu de le cacher.',
    render: () => (
      <MeasureScreen
        elapsedSeconds={41}
        totalSeconds={60}
        frame={frame()}
        consent={consentOn}
        onToggleConsent={noop}
        connection="offline"
      />
    ),
  },
  {
    id: 'capteur-suspect',
    group: 'Cas limites',
    title: 'Capteur suspect',
    note: 'Une fréquence hors des bornes 30–220 n’est pas une urgence médicale, c’est un capteur qui déconne. Le système le dit et ne déclenche aucune alerte rouge.',
    render: () => (
      <MeasureScreen
        elapsedSeconds={52}
        totalSeconds={60}
        frame={frame({ heartRate: 214, suspect: ['hr'] })}
        consent={consentOn}
        onToggleConsent={noop}
        connection="open"
      />
    ),
  },
  {
    id: 'mesure-rejetee',
    group: 'Cas limites',
    title: 'Mesure rejetée',
    note: 'Aucun indice calculé, aucun exercice lancé, un message de maintenance. Un système qui crie au loup sur un faux contact est un système qu’on finit par ignorer.',
    render: () => (
      <ResultScreen
        assessment={assessment({
          index: 0,
          level: 'unreliable',
          confidence: 0.2,
          heartRate: 214,
          missing: [{ signal: 'hr', reason: 'faulty' }],
        })}
        recommendation={null}
        onAccept={noop}
      />
    ),
  },
  {
    id: 'modele-coupe',
    group: 'Cas limites',
    title: 'Modèle local coupé',
    note: 'L’indice, le niveau et la liste d’exercices sont calculés par du code ordinaire. Le modèle ne sert qu’à choisir dans la liste et à rédiger : il perd la personnalisation, pas la fonction.',
    render: () => (
      <ResultScreen
        assessment={assessment({ index: 58, level: 'amber' })}
        recommendation={recommendation('amber', true)}
        onAccept={noop}
      />
    ),
  },
  {
    id: 'seuil-franchi',
    group: 'Cas limites',
    title: 'Clôture après un seuil franchi',
    note: 'Le médecin sait qu’elle a franchi le seuil, pas ce qu’elle a dit. C’est écrit à l’écran, pour qu’elle sache exactement ce qui a été transmis.',
    render: () => (
      <ClosingScreen
        outcome={outcome({ before: 74, after: 51, alert: true })}
        onFeedback={noop}
        onDone={noop}
      />
    ),
  },
];

export function findState(id: string): StateEntry | undefined {
  return STATES.find((entry) => entry.id === id);
}
