import { motion } from 'motion/react';
import { AIPresence } from '@/components/ai/presence';
import { AIMessage } from '@/components/ai/message';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Curve } from '@/components/data/curve';
import { cn } from '@/lib/cn';
import type { Assessment, Recommendation } from '@/api';
import { CabinChrome } from '../components/cabin-chrome';

const LEVEL_TEXT = {
  green: 'text-calm',
  amber: 'text-watch',
  red: 'text-alert',
  unreliable: 'text-unknown',
} as const;

const SIGNAL_LABEL: Record<string, string> = {
  hr: 'cardiaque',
  eda: 'sudation',
  face: 'caméra coupée',
  voice: 'micro coupé',
};

interface ResultScreenProps {
  assessment: Assessment;
  recommendation: Recommendation | null;
  /** Trente jours d'indice, pour que le chiffre du jour soit le bout de la courbe. */
  history: number[];
  onAccept: () => void;
  onLater: () => void;
}

/**
 * Le résultat.
 *
 * Le chiffre n'est pas dans une jauge : c'est le point final de sa courbe. Sa
 * moyenne habituelle est une ligne pointillée qui traverse l'écran, donc la
 * comparaison devient spatiale et n'a plus besoin d'être écrite.
 */
export function ResultScreen({
  assessment,
  recommendation,
  history,
  onAccept,
  onLater,
}: ResultScreenProps) {
  const unreliable = assessment.level === 'unreliable';
  const baseline = assessment.personalBaseline ?? undefined;
  const missing = assessment.missingSignals.map((m) => SIGNAL_LABEL[m.signal] ?? m.signal);

  return (
    <section className="relative flex min-h-dvh flex-col overflow-hidden">
      <CabinChrome />

      {/* Le plan arrière : trente jours, à fond perdu. */}
      {!unreliable && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] sm:h-[45vh]">
          <Curve
            values={history}
            min={10}
            max={90}
            baseline={baseline}
            color="var(--c-watch)"
            height={340}
            className="h-full"
            aria-label={`Indice de charge sur trente jours, aujourd’hui ${assessment.index}`}
          />
          {baseline !== undefined && (
            <span
              className="absolute right-6 font-sans text-sm text-ink-faint sm:right-10"
              style={{ bottom: `${((baseline - 10) / 80) * 100}%` }}
            >
              ta normale
            </span>
          )}
        </div>
      )}

      {/* Le chiffre, posé au bout de la courbe. */}
      {!unreliable && (
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            'pointer-events-none absolute right-5 z-10 font-display leading-none tabular sm:right-12',
            'text-[clamp(4.5rem,14vw,9rem)]',
            LEVEL_TEXT[assessment.level],
          )}
          style={{ bottom: `calc(${((assessment.index - 10) / 80) * 42}vh + 1rem)` }}
        >
          {assessment.index}
        </motion.p>
      )}

      <div className="relative z-20 grid flex-1 place-items-center px-5 py-24 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-xl"
        >
          <GlassPanel density="thick" className="flex flex-col items-center gap-6 p-7 sm:p-10">
            <AIPresence state={unreliable ? 'idle' : 'speaking'} size={110} />

            {unreliable ? (
              <>
                <h1 className="text-center font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                  Je ne calcule pas d’indice.
                </h1>
                <p className="text-balance text-center text-ink-soft">
                  Une mesure est sortie des bornes plausibles. Ce n’est pas une urgence, c’est un
                  capteur à vérifier.
                </p>
              </>
            ) : (
              <h1 className="text-center font-display text-3xl leading-tight tracking-tight sm:text-4xl">
                Voilà où tu en es.
              </h1>
            )}

            {recommendation ? (
              <AIMessage
                message={recommendation.message}
                level={assessment.level}
                source={recommendation.source}
                missing={missing}
                className="w-full"
              />
            ) : (
              <p className="text-sm text-ink-faint">La consigne arrive…</p>
            )}

            <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={onAccept}
                disabled={!recommendation}
                className="w-full sm:w-auto"
              >
                {unreliable
                  ? 'Reprendre la mesure'
                  : recommendation
                    ? `${recommendation.exercise.name} · ${recommendation.exercise.duration} min`
                    : 'Commencer'}
              </Button>
              <Button variant="ghost" size="lg" onClick={onLater} className="w-full sm:w-auto">
                Plus tard
              </Button>
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </section>
  );
}
