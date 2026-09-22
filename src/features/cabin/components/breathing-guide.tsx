import { useEffect, useMemo, useRef, useState } from 'react';
import { AIPresence } from '@/components/ai/presence';

interface Step {
  label: string;
  seconds: number;
}

const PATTERNS: Record<string, Step[]> = {
  'coherence-365': [
    { label: 'Inspire', seconds: 5 },
    { label: 'Expire', seconds: 5 },
  ],
  carre: [
    { label: 'Inspire', seconds: 4 },
    { label: 'Retiens', seconds: 4 },
    { label: 'Expire', seconds: 4 },
    { label: 'Retiens', seconds: 4 },
  ],
  'respiration-478': [
    { label: 'Inspire', seconds: 4 },
    { label: 'Retiens', seconds: 7 },
    { label: 'Expire', seconds: 8 },
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
 * Le guide respiratoire : un carré dont le contour se parcourt.
 *
 * Le trait part du coin haut droit et tourne dans le sens des aiguilles. Sur la
 * respiration carrée, chaque côté vaut exactement une phase — le dessin n'est
 * pas une métaphore du rythme, il est le rythme. Sur les autres motifs, les
 * côtés ne tombent plus juste, et c'est sans importance : ce qu'on suit est le
 * mot au centre, le contour ne fait que dire où on en est du cycle.
 *
 * Pendant l'exercice, l'IA est en `idle` : elle accompagne, elle ne parle pas.
 */
export function BreathingGuide({
  exerciseId,
  durationMinutes,
  onComplete,
  size = 520,
}: BreathingGuideProps) {
  const pattern = useMemo(() => PATTERNS[exerciseId] ?? DEFAULT_PATTERN, [exerciseId]);
  const cycleSeconds = useMemo(
    () => pattern.reduce((total, step) => total + step.seconds, 0),
    [pattern],
  );

  const [elapsed, setElapsed] = useState(0);
  const finished = useRef(false);

  useEffect(() => {
    const start = performance.now();
    const id = window.setInterval(() => {
      setElapsed((performance.now() - start) / 1000);
    }, 100);
    return () => window.clearInterval(id);
  }, [exerciseId]);

  const totalSeconds = durationMinutes * 60;

  useEffect(() => {
    if (!finished.current && elapsed >= totalSeconds) {
      finished.current = true;
      onComplete();
    }
  }, [elapsed, totalSeconds, onComplete]);

  const inCycle = elapsed % cycleSeconds;
  let consumed = 0;
  let step = pattern[0];
  for (const candidate of pattern) {
    if (inCycle < consumed + candidate.seconds) {
      step = candidate;
      break;
    }
    consumed += candidate.seconds;
  }
  const countdown = Math.max(1, Math.ceil(consumed + step.seconds - inCycle));
  const cycleRatio = inCycle / cycleSeconds;

  const inset = 10;
  const side = size - inset * 2;
  const center = size / 2;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="absolute inset-0"
        role="img"
        aria-label={`${step.label}, ${countdown} secondes`}
      >
        {/* Le rect démarre son tracé en haut à gauche ; la rotation d'un quart
            de tour place le départ en haut à droite, comme sur la maquette. */}
        <g transform={`rotate(90 ${center} ${center})`}>
          <rect
            x={inset}
            y={inset}
            width={side}
            height={side}
            rx={14}
            fill="none"
            stroke="var(--c-hairline)"
            strokeWidth={20}
            strokeLinejoin="round"
            opacity={0.65}
          />
          <rect
            x={inset}
            y={inset}
            width={side}
            height={side}
            rx={14}
            fill="none"
            stroke="var(--c-accent)"
            strokeWidth={20}
            strokeLinejoin="round"
            pathLength={1}
            strokeDasharray={`${cycleRatio} 1`}
          />
        </g>
      </svg>

      <div className="relative z-10 flex flex-col items-center">
        <AIPresence state="idle" tint="accent" size={Math.round(size * 0.29)} count={340} />

        {/* Le mot est la consigne : il ne passe pas par AnimatePresence, pour
            qu'aucune animation interrompue ne puisse le laisser invisible. */}
        <p
          key={step.label}
          className="mt-9 animate-[fade-in_0.35s_ease-out] font-display text-[2.125rem] leading-none tracking-tight"
        >
          {step.label}
        </p>

        <p
          className="mt-6 font-display text-[4.5rem] leading-none tabular text-accent"
          aria-hidden
        >
          {countdown}
        </p>
      </div>
    </div>
  );
}

/** La part du temps total déjà écoulée, pour le filet du bas. */
export function useExerciseProgress(durationMinutes: number): number {
  const [ratio, setRatio] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const total = durationMinutes * 60_000;
    const id = window.setInterval(() => {
      setRatio(Math.min(1, (performance.now() - start) / total));
    }, 250);
    return () => window.clearInterval(id);
  }, [durationMinutes]);
  return ratio;
}
