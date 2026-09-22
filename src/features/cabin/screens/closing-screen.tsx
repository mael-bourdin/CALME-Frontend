import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import type { Feedback, SessionOutcome } from '@/api';
import { CabinChrome, CabinFooter } from '../components/cabin-chrome';

interface ClosingScreenProps {
  outcome: SessionOutcome;
  onFeedback: (feedback: Feedback) => void;
  onDone: () => void;
}

function Figure({ label, value, tone }: { label: string; value: number | null; tone: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm text-ink-faint">{label}</span>
      <span
        className={cn('font-display text-[clamp(3.5rem,12vw,6rem)] leading-none tabular', tone)}
      >
        {value ?? '—'}
      </span>
    </div>
  );
}

/**
 * La clôture.
 *
 * Deux chiffres, avant et après, et deux boutons. C'est la consigne du dossier,
 * et tout le reste serait du bruit : la personne veut voir ce qu'elle a gagné,
 * pas un tableau de bord.
 */
export function ClosingScreen({ outcome, onFeedback, onDone }: ClosingScreenProps) {
  const [sent, setSent] = useState<Feedback | null>(null);

  function answer(feedback: Feedback) {
    setSent(feedback);
    onFeedback(feedback);
    setTimeout(onDone, 900);
  }

  return (
    <section className="relative grid min-h-dvh place-items-center overflow-hidden px-6">
      <CabinChrome />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-10 text-center"
      >
        <h1 className="font-display text-[clamp(1.9rem,6vw,2.75rem)] tracking-tight">
          Séance terminée.
        </h1>

        <div className="flex items-center gap-6 sm:gap-10">
          <Figure label="avant" value={outcome.indexBefore} tone="text-watch" />
          <ArrowRight className="size-6 text-ink-faint" strokeWidth={1.5} aria-hidden />
          <Figure label="après" value={outcome.indexAfter} tone="text-calm" />
        </div>

        <p className="text-ink-faint">
          {outcome.alertRaised
            ? 'Le médecin de bord a été prévenu : il sait que tu as franchi le seuil, pas ce que tu as dit.'
            : 'Personne n’a été prévenu.'}
        </p>

        {sent ? (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-ink-soft"
          >
            C’est noté. À bientôt.
          </motion.p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="secondary" onClick={() => answer('helped')}>
              Ça a servi
            </Button>
            <Button variant="ghost" onClick={() => answer('not-really')}>
              Pas vraiment
            </Button>
          </div>
        )}
      </motion.div>

      <CabinFooter left="Ton historique n’est visible que par toi." right="11 W · veille" />
    </section>
  );
}
