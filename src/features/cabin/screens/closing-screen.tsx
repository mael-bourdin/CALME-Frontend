import { useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Feedback } from '@/api';
import type { SessionOutcome } from '@/api';
import { cn } from '@/lib/cn';
import { CabinChrome } from '../components/cabin-chrome';

interface ClosingScreenProps {
  outcome: SessionOutcome;
  onFeedback: (feedback: Feedback) => void;
  onDone: () => void;
}

/** Le palier d'un indice, pour teinter les deux chiffres de la clôture. */
function toneFor(value: number | null): string {
  if (value === null) return 'text-ink-faint';
  if (value >= 70) return 'text-alert';
  if (value >= 40) return 'text-watch';
  return 'text-calm';
}

function Figure({ label, value, delay }: { label: string; value: number | null; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-1"
    >
      <span className="text-sm leading-5 text-ink-faint">{label}</span>
      <span
        className={cn(
          // Relevé sur C5 : Bodoni SemiBold 76, interligne 100, chasse -1,5.
          // En dessous de 520 px de haut, l'interligne se resserre à 58 : le
          // corps du chiffre ne change pas, seul le vide autour se réduit.
          'font-display font-semibold leading-[100px] tabular text-[clamp(3rem,5.3vw,76px)] tracking-[-0.0197em] [@media(max-height:520px)]:leading-[58px]',
          toneFor(value),
        )}
      >
        {value ?? '—'}
      </span>
    </motion.div>
  );
}

/**
 * La clôture, telle que la maquette C5 la pose.
 *
 * Deux chiffres et une flèche. C'est tout ce que le dossier demande de montrer
 * à la fin, et c'est tout ce qui se retient : l'écart entre avant et après est
 * la seule preuve que la séance a servi à quelque chose.
 *
 * La ligne sur l'alerte est là quoi qu'il arrive. Qu'aucun message ne soit
 * parti est une information au moins aussi importante que l'inverse : sans
 * elle, on ne sait pas, et on se méfie.
 */
/** Ce qu'on laisse à quelqu'un pour lire deux chiffres et répondre, en secondes. */
const RETOUR_AUTOMATIQUE_S = 25;

export function ClosingScreen({ outcome, onFeedback, onDone }: ClosingScreenProps) {
  // La cabine revient d'elle-même à l'accueil. Personne ne doit avoir à penser
  // à fermer une séance : la suivante commence en s'asseyant.
  useEffect(() => {
    const id = window.setTimeout(onDone, RETOUR_AUTOMATIQUE_S * 1000);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <section className="relative flex min-h-dvh flex-col items-center overflow-hidden px-6">
      <CabinChrome position="bottom" />

      {/* Cotes de C5 : titre posé à 234 du haut, comme les autres écrans de
          cabine, plutôt que centré — le centrage tombait trente pixels trop haut. */}
      <div className="flex flex-col items-center pt-[234px] text-center [@media(max-height:520px)]:pt-6">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="font-display font-medium text-[clamp(1.75rem,2.8vw,2.5rem)] leading-[54px] tracking-[-0.0125em] [@media(max-height:520px)]:leading-[36px]"
        >
          Séance terminée.
        </motion.h1>

        <div className="mt-[61px] flex items-center gap-[48px] [@media(max-height:520px)]:mt-6">
          <Figure label="avant" value={outcome.indexBefore} delay={0.2} />
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45, duration: 0.5 }}
            className="text-ink-faint"
            aria-hidden
          >
            <ArrowRight className="size-8" strokeWidth={1.5} />
          </motion.span>
          <Figure label="après" value={outcome.indexAfter} delay={0.35} />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-[61px] text-base leading-6 text-ink-faint [@media(max-height:520px)]:mt-6"
        >
          {outcome.alertRaised
            ? 'Le médecin de bord sait que tu as franchi le seuil. Ni la mesure ni ce que tu as dit ne lui sont transmis.'
            : 'Personne n’a été prévenu.'}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-[44px] flex items-center gap-3 [@media(max-height:520px)]:mt-4"
        >
          <Button
            variant="secondary"
            onClick={() => {
              onFeedback('helped');
              onDone();
            }}
          >
            Ça a servi
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              onFeedback('not-really');
              onDone();
            }}
          >
            Pas vraiment
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
