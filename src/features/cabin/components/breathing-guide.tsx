import { useEffect, useMemo, useRef, useState } from 'react';
import { AIPresence } from '@/components/ai/presence';
import { RESPIRATION_PAR_DEFAUT, RESPIRATIONS } from '../lib/exercices-guides';

// Les rythmes vivent avec le reste du contenu des exercices, sous les
// identifiants du catalogue du serveur (cc365, carre, 478, soupir).
interface BreathingGuideProps {
  exerciseId: string;
  durationMinutes: number;
  onComplete: () => void;
  size?: number;
  /** En pause, le temps s'arrête : compte à rebours, anneau et fin. */
  paused?: boolean;
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
  paused = false,
}: BreathingGuideProps) {
  const pattern = useMemo(() => RESPIRATIONS[exerciseId] ?? RESPIRATION_PAR_DEFAUT, [exerciseId]);
  const cycleSeconds = useMemo(
    () => pattern.reduce((total, step) => total + step.seconds, 0),
    [pattern],
  );

  const [elapsed, setElapsed] = useState(0);
  const finished = useRef(false);
  const enPause = useRef(paused);
  enPause.current = paused;

  // Le temps s'accumule par petits pas plutôt que d'être lu sur une horloge
  // de départ : c'est ce qui permet à la pause de vraiment l'arrêter.
  useEffect(() => {
    setElapsed(0);
    let precedent = Date.now();
    const id = window.setInterval(() => {
      const maintenant = Date.now();
      const pas = (maintenant - precedent) / 1000;
      precedent = maintenant;
      if (!enPause.current) setElapsed((e) => e + pas);
    }, 200);
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
            style={{
              animation: `ring ${cycleSeconds}s linear infinite`,
              animationPlayState: paused ? 'paused' : 'running',
            }}
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
export function useExerciseProgress(durationMinutes: number, paused = false): number {
  const [ratio, setRatio] = useState(0);
  const enPause = useRef(paused);
  enPause.current = paused;
  useEffect(() => {
    const total = durationMinutes * 60_000;
    let ecoule = 0;
    let precedent = Date.now();
    const id = window.setInterval(() => {
      const maintenant = Date.now();
      if (!enPause.current) ecoule += maintenant - precedent;
      precedent = maintenant;
      setRatio(Math.min(1, ecoule / total));
    }, 250);
    return () => window.clearInterval(id);
  }, [durationMinutes]);
  return ratio;
}
