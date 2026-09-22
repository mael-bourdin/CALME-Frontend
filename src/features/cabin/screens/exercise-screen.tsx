import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { BreathingGuide } from '../components/breathing-guide';

interface ExerciseScreenProps {
  exerciseId: string;
  exerciseName: string;
  durationMinutes: number;
  onComplete: () => void;
}

/**
 * La séance.
 *
 * Une seule chose à l'écran. Le dossier est explicite : l'écran fait partie de
 * l'environnement de la séance et ne doit pas travailler contre elle.
 */
export function ExerciseScreen({
  exerciseId,
  exerciseName,
  durationMinutes,
  onComplete,
}: ExerciseScreenProps) {
  const [size, setSize] = useState(340);

  useEffect(() => {
    const update = () => {
      const smallest = Math.min(window.innerWidth, window.innerHeight);
      setSize(Math.max(240, Math.min(420, Math.round(smallest * 0.62))));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <section className="relative grid min-h-dvh place-items-center overflow-hidden px-6 py-20">
      <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between px-6 py-6 sm:px-10 sm:py-8">
        <p className="text-sm text-ink-soft">{exerciseName}</p>
        <ThemeToggle />
      </div>

      <BreathingGuide
        exerciseId={exerciseId}
        durationMinutes={durationMinutes}
        onComplete={onComplete}
        size={size}
      />
    </section>
  );
}
