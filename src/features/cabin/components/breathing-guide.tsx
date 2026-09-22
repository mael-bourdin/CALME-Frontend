import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AIPresence } from '@/components/ai/presence';
import { cn } from '@/lib/cn';

interface Step {
  label: string;
  seconds: number;
  /** Échelle visée de la sphère à la fin de l'étape. */
  scale: number;
}

/**
 * Les rythmes du catalogue. Trois motifs suffisent à couvrir les exercices
 * respiratoires : seuls les décomptes changent.
 */
const PATTERNS: Record<string, Step[]> = {
  'coherence-365': [
    { label: 'Inspire', seconds: 5, scale: 1 },
    { label: 'Expire', seconds: 5, scale: 0.58 },
  ],
  carre: [
    { label: 'Inspire', seconds: 4, scale: 1 },
    { label: 'Retiens', seconds: 4, scale: 0.94 },
    { label: 'Expire', seconds: 4, scale: 0.58 },
    { label: 'Retiens', seconds: 4, scale: 0.62 },
  ],
  'respiration-478': [
    { label: 'Inspire', seconds: 4, scale: 1 },
    { label: 'Retiens', seconds: 7, scale: 0.92 },
    { label: 'Expire', seconds: 8, scale: 0.55 },
  ],
};

const DEFAULT_PATTERN = PATTERNS['coherence-365'];

interface BreathingGuideProps {
  exerciseId: string;
  durationMinutes: number;
  onComplete: () => void;
  size?: number;
}

/**
 * Le guide respiratoire, c'est la sphère elle-même.
 *
 * Les points s'écartent à l'inspiration et se resserrent à l'expiration ;
 * l'anneau pointillé reste fixe et sert de repère. Rien d'autre à l'écran :
 * une seule chose est active à la fois, et quelqu'un de fatigué ne doit pas
 * avoir à choisir où regarder. La sphère reste sobre — pendant l'exercice l'IA
 * ne parle pas, elle accompagne.
 */
export function BreathingGuide({
  exerciseId,
  durationMinutes,
  onComplete,
  size = 380,
}: BreathingGuideProps) {
  const pattern = useMemo(() => PATTERNS[exerciseId] ?? DEFAULT_PATTERN, [exerciseId]);
  const [stepIndex, setStepIndex] = useState(0);
  const [remainingInStep, setRemainingInStep] = useState(pattern[0].seconds);
  const [remainingTotal, setRemainingTotal] = useState(durationMinutes * 60);
  const completed = useRef(false);

  const step = pattern[stepIndex % pattern.length];

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTotal((total) => {
        const next = total - 1;
        if (next <= 0 && !completed.current) {
          completed.current = true;
          onComplete();
        }
        return Math.max(0, next);
      });

      setRemainingInStep((left) => {
        if (left > 1) return left - 1;
        setStepIndex((index) => index + 1);
        const nextStep = pattern[(stepIndex + 1) % pattern.length];
        return nextStep.seconds;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [pattern, stepIndex, onComplete]);

  const minutes = Math.floor(remainingTotal / 60);
  const seconds = remainingTotal % 60;

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        {/* La cible : elle ne bouge jamais, c'est elle qui rend le mouvement lisible. */}
        <div
          className="absolute rounded-full border border-dashed border-quiet/45"
          style={{ width: size * 0.94, height: size * 0.94 }}
          aria-hidden
        />
        <motion.div
          animate={{ scale: step.scale }}
          transition={{ duration: step.seconds, ease: 'easeInOut' }}
          className="grid place-items-center"
        >
          <AIPresence state="idle" size={Math.round(size * 0.82)} count={520} />
        </motion.div>
      </div>

      <div className="text-center">
        <motion.p
          key={`${step.label}-${stepIndex}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-4xl tracking-tight sm:text-5xl"
        >
          {step.label}
        </motion.p>
        <p
          className={cn(
            'font-display text-6xl leading-none text-accent sm:text-7xl',
            'tabular mt-2',
          )}
          aria-live="polite"
        >
          {remainingInStep}
        </p>
      </div>

      <p className="font-mono text-sm text-ink-faint">
        {minutes}:{String(seconds).padStart(2, '0')} restantes
      </p>
    </div>
  );
}
