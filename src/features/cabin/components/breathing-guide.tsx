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
 * Le guide respiratoire : un anneau qui se referme, une fois par cycle.
 *
 * L'anneau est animé en CSS, pas en JavaScript. C'est ce qui le rend fluide :
 * le navigateur interpole lui-même, à la fréquence de l'écran, sans qu'aucun
 * état React ne change. Le compte à rebours au centre, lui, ne bouge qu'une
 * fois par seconde — il peut se contenter d'un minuteur.
 *
 * Pendant l'exercice, l'IA est en `idle` : elle accompagne, elle ne parle pas.
 */
export function BreathingGuide({
  exerciseId,
  durationMinutes,
  onComplete,
  size = 428,
}: BreathingGuideProps) {
  const pattern = useMemo(() => PATTERNS[exerciseId] ?? DEFAULT_PATTERN, [exerciseId]);
  const cycleSeconds = useMemo(
    () => pattern.reduce((total, step) => total + step.seconds, 0),
    [pattern],
  );

  const [elapsed, setElapsed] = useState(0);
  const finished = useRef(false);

  useEffect(() => {
    const start = Date.now();
    const id = window.setInterval(() => setElapsed((Date.now() - start) / 1000), 200);
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

  const stroke = 20;
  const radius = (size - stroke) / 2;
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
        {/* Tourné d'un quart pour partir de midi. */}
        <g transform={`rotate(-90 ${center} ${center})`}>
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--c-hairline)"
            strokeWidth={stroke}
            opacity={0.65}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--c-accent)"
            strokeWidth={stroke}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            style={{ animation: `ring ${cycleSeconds}s linear infinite` }}
          />
        </g>
      </svg>

      <div className="relative z-10 flex flex-col items-center">
        <AIPresence state="idle" tint="accent" size={Math.round(size * 0.35)} count={340} />

        <p
          key={step.label}
          // À 260 (cercle compact), le contenu intérieur (sphère + consigne +
          // compte à rebours) doit tenir dans une boîte bien plus petite que
          // les 428 d'origine : la consigne et le compte à rebours perdent
          // du corps et de la marge sous 520 px de haut.
          className="mt-9 animate-[fade-in_0.35s_ease-out] font-display text-[2.125rem] leading-none tracking-tight [@media(max-height:520px)]:mt-3 [@media(max-height:520px)]:text-[1.375rem]"
        >
          {step.label}
        </p>

        <p
          className="mt-6 font-display text-[4.5rem] leading-none tabular text-accent [@media(max-height:520px)]:mt-2 [@media(max-height:520px)]:text-[2.5rem]"
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
    const start = Date.now();
    const total = durationMinutes * 60_000;
    const id = window.setInterval(() => {
      setRatio(Math.min(1, (Date.now() - start) / total));
    }, 250);
    return () => window.clearInterval(id);
  }, [durationMinutes]);
  return ratio;
}
