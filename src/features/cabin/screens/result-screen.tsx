import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { AIPresence } from '@/components/ai/presence';
import { Button } from '@/components/ui/button';
import type { Assessment, Recommendation } from '@/api';
import { CabinChrome } from '../components/cabin-chrome';

interface ResultScreenProps {
  assessment: Assessment;
  recommendation: Recommendation | null;
  onAccept: () => void;
  onLater: () => void;
}

/**
 * Le résultat, tel que les maquettes C3 le posent.
 *
 * C'est l'écran qui tient toute la thèse du projet : l'IA annonce, et sa
 * phrase est l'écran. Pas de carte, pas de bulle, pas de chiffre posé à côté.
 * La sphère prend la couleur du palier — c'est elle qui porte le niveau, ce
 * qui évite une étiquette « ALERTE » que personne n'a envie de lire en sortant
 * d'un quart de huit heures.
 *
 * L'indice reste disponible, en petit, sous la phrase : le dossier demande
 * qu'il soit calculé et montré, mais rien n'oblige à en faire le sujet.
 */
export function ResultScreen({
  assessment,
  recommendation,
  onAccept,
  onLater,
}: ResultScreenProps) {
  const unreliable = assessment.level === 'unreliable';
  const tint = unreliable ? undefined : (assessment.level as 'green' | 'amber' | 'red');

  const sentence = unreliable
    ? 'La mesure n’est pas exploitable. Je préfère ne rien en conclure.'
    : (recommendation?.message ?? 'Je regarde encore.');

  return (
    <section className="relative flex min-h-dvh flex-col items-center overflow-hidden px-6">
      <CabinChrome position="top" />

      <div className="flex flex-1 flex-col items-center justify-center pb-24 pt-24">
        <AIPresence
          state={assessment.level === 'red' ? 'alert' : 'speaking'}
          size={270}
          tint={tint}
        />

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-11 max-w-4xl text-balance text-center font-display text-[clamp(2rem,4.2vw,3.4rem)] leading-[1.15] tracking-tight"
        >
          {sentence}
        </motion.h1>

        {!unreliable && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-7 font-mono text-sm text-ink-faint"
          >
            indice {assessment.index}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex flex-col items-center gap-4"
        >
          <Button
            size="lg"
            onClick={onAccept}
            disabled={!unreliable && !recommendation}
            iconAfter={<ArrowRight className="size-4.5" strokeWidth={1.7} aria-hidden />}
          >
            {unreliable ? 'Reprendre la mesure' : 'Voir mes résultats'}
          </Button>

          {!unreliable && (
            <button
              type="button"
              onClick={onLater}
              className="text-sm text-ink-faint transition-colors hover:text-ink-soft"
            >
              Plus tard
            </button>
          )}
        </motion.div>
      </div>
    </section>
  );
}
