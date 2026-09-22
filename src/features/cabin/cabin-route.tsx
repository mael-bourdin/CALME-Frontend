import { AnimatePresence, motion } from 'motion/react';
import { useSession } from './session-context';
import { HomeScreen } from './screens/home-screen';
import { MeasureScreen } from './screens/measure-screen';
import { ThinkingScreen } from './screens/thinking-screen';
import { ResultScreen } from './screens/result-screen';
import { ExerciseScreen } from './screens/exercise-screen';
import { ClosingScreen } from './screens/closing-screen';

const SIGNAL_LABEL: Record<string, string> = {
  face: 'caméra coupée',
  voice: 'micro coupé',
  hr: 'capteur cardiaque suspect',
  eda: 'capteur de sudation suspect',
};

/**
 * Le parcours complet, piloté par la phase.
 *
 * Une seule route : la cabine n'a pas de navigation, on ne peut pas revenir en
 * arrière au milieu d'une mesure. C'est voulu — l'interface s'adresse à
 * quelqu'un qui n'a aucune envie de manipuler un logiciel.
 */
export function CabinRoute() {
  const session = useSession();
  const reducedConfidence = (() => {
    const off: string[] = [];
    if (!session.consent.camera) off.push(SIGNAL_LABEL.face);
    if (!session.consent.microphone) off.push(SIGNAL_LABEL.voice);
    if (off.length === 0) return null;
    return `Confiance réduite — ${off.join(', ')}. Je continue sur les capteurs de l’accoudoir.`;
  })();

  const firstName = session.member?.displayName.split(' ')[0] ?? '';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={session.phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
      >
        {session.phase === 'idle' && (
          <HomeScreen
            firstName={firstName}
            lastSessionAt={session.lastSessionAt}
            onStart={() => void session.start()}
            busy={!session.member}
          />
        )}

        {session.phase === 'measuring' && (
          <MeasureScreen
            elapsedSeconds={session.elapsedSeconds}
            totalSeconds={session.totalSeconds}
            frame={session.frame}
            consent={session.consent}
            onToggleConsent={(key) => void session.toggleConsent(key)}
            connection={session.connection}
            reducedConfidence={reducedConfidence}
          />
        )}

        {session.phase === 'thinking' && <ThinkingScreen />}

        {session.phase === 'result' && session.assessment && (
          <ResultScreen
            assessment={session.assessment}
            recommendation={session.recommendation}
            onAccept={session.acceptExercise}
          />
        )}

        {session.phase === 'exercise' && session.recommendation && (
          <ExerciseScreen
            exerciseId={session.recommendation.exercise.id}
            exerciseName={session.recommendation.exercise.name}
            durationMinutes={session.recommendation.exercise.duration}
            onComplete={() => void session.finishExercise()}
          />
        )}

        {(session.phase === 'closing' || session.phase === 'done') && (
          <ClosingScreen
            outcome={
              session.outcome ?? {
                sessionId: session.sessionId ?? '',
                indexBefore: session.assessment?.index ?? 0,
                indexAfter: null,
                breathingRateBefore: null,
                breathingRateAfter: null,
                heartRateBefore: null,
                heartRateAfter: null,
                alertRaised: false,
              }
            }
            onFeedback={(feedback) => void session.sendFeedback(feedback)}
            onDone={session.reset}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
