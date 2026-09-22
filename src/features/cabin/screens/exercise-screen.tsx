import { useState } from 'react';
import { Music, Pause, Play, X } from 'lucide-react';
import { BreathingGuide, useExerciseProgress } from '../components/breathing-guide';
import { CabinChrome, CabinProgress } from '../components/cabin-chrome';

interface ExerciseScreenProps {
  exerciseId: string;
  exerciseName: string;
  durationMinutes: number;
  onComplete: () => void;
}

function clock(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * La séance, telle que la maquette C4 la pose.
 *
 * Une seule chose à l'écran. Le dossier est explicite : l'écran fait partie de
 * l'exercice, il ne doit rien demander. Les commandes tiennent en deux boutons
 * posés en bas, et le nom de l'exercice n'apparaît nulle part — pendant qu'on
 * respire, savoir que ça s'appelle « cohérence cardiaque 365 » n'aide personne.
 */
export function ExerciseScreen({
  exerciseId,
  exerciseName,
  durationMinutes,
  onComplete,
}: ExerciseScreenProps) {
  const progress = useExerciseProgress(durationMinutes);
  const [music, setMusic] = useState(true);
  const [paused, setPaused] = useState(false);
  const remaining = durationMinutes * 60 * (1 - progress);

  return (
    <section
      className="relative grid min-h-dvh place-items-center overflow-hidden px-6"
      aria-label={exerciseName}
    >
      <CabinChrome position="bottom" hideToggle />

      <button
        type="button"
        onClick={() => setMusic((on) => !on)}
        aria-pressed={music}
        className="glass glass-edge fixed left-6 top-6 z-20 inline-flex items-center gap-2 rounded-pill px-4 py-2.5 text-sm text-ink-soft transition-colors hover:text-ink sm:left-12 sm:top-10"
      >
        <Music className="size-4" strokeWidth={1.7} aria-hidden />
        {music ? 'Musique' : 'Silence'}
      </button>

      <p className="fixed right-6 top-6 z-20 font-mono text-sm text-ink-soft sm:right-12 sm:top-10">
        {clock(remaining)}
      </p>

      <div className="-mt-10">
        <BreathingGuide
          exerciseId={exerciseId}
          durationMinutes={durationMinutes}
          onComplete={onComplete}
          size={520}
        />
      </div>

      <div className="glass glass-edge fixed bottom-16 left-1/2 z-20 flex -translate-x-1/2 items-center rounded-pill">
        <button
          type="button"
          onClick={() => setPaused((on) => !on)}
          aria-label={paused ? 'Reprendre' : 'Mettre en pause'}
          className="grid size-12 place-items-center rounded-pill text-ink-soft transition-colors hover:text-ink"
        >
          {paused ? (
            <Play className="size-4.5" strokeWidth={1.7} aria-hidden />
          ) : (
            <Pause className="size-4.5" strokeWidth={1.7} aria-hidden />
          )}
        </button>
        <span className="h-5 w-px bg-hairline" aria-hidden />
        <button
          type="button"
          onClick={onComplete}
          aria-label="Arrêter la séance"
          className="grid size-12 place-items-center rounded-pill text-ink-soft transition-colors hover:text-ink"
        >
          <X className="size-4.5" strokeWidth={1.7} aria-hidden />
        </button>
      </div>

      <CabinProgress ratio={progress} />
    </section>
  );
}
