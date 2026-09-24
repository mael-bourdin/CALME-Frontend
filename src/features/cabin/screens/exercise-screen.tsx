import { useEffect, useRef, useState } from 'react';
import { Music, Pause, Play, X } from 'lucide-react';
import type { Exercise } from '@/api';
import { direTexte, jouerMusique } from '../audio/lecteur';
import type { Musique } from '../audio/lecteur';
import { BreathingGuide, useExerciseProgress } from '../components/breathing-guide';
import { CabinChrome, CabinProgress } from '../components/cabin-chrome';
import { VoiceGuide } from '../components/voice-guide';
import { useCompactCabin } from '../hooks/use-compact-cabin';
import { CREDITS_MUSIQUE, INTRO_RESPIRATION, RESPIRATIONS, SCRIPTS } from '../lib/exercices-guides';

interface ExerciseScreenProps {
  exercise: Exercise;
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
 *
 * Deux formes d'exercice : la respiration (l'anneau qui se referme, avec une
 * consigne dite au départ) et le guidage à la voix (Lila dit chaque étape à
 * son heure). La musique, quand l'exercice en a une, joue dessous et baisse
 * d'elle-même pendant que Lila parle.
 */
export function ExerciseScreen({ exercise, onComplete }: ExerciseScreenProps) {
  const [music, setMusic] = useState(true);
  const [paused, setPaused] = useState(false);
  const progress = useExerciseProgress(exercise.duration, paused);
  const remaining = exercise.duration * 60 * (1 - progress);
  const compact = useCompactCabin();

  const respiration = RESPIRATIONS[exercise.id] !== undefined || exercise.kind === 'breathing';
  const script = SCRIPTS[exercise.id];

  // La musique vit le temps de l'écran, et suit les boutons musique et pause.
  const piste = useRef<Musique | null>(null);
  useEffect(() => {
    if (!exercise.music) return;
    const lecture = jouerMusique(exercise.music);
    piste.current = lecture;
    return () => {
      lecture.arreter();
      piste.current = null;
    };
  }, [exercise.music]);
  useEffect(() => {
    if (music && !paused) piste.current?.reprendre();
    else piste.current?.pause();
  }, [music, paused]);

  // La consigne de départ des respirations, dite une fois.
  useEffect(() => {
    const intro = INTRO_RESPIRATION[exercise.id];
    if (!respiration || !intro) return;
    const controleur = new AbortController();
    void direTexte(intro, controleur.signal);
    return () => controleur.abort();
  }, [exercise.id, respiration]);

  const credit = exercise.music && music ? CREDITS_MUSIQUE[exercise.music] : undefined;

  return (
    <section
      className="relative grid min-h-dvh place-items-center overflow-hidden px-6"
      aria-label={exercise.name}
    >
      <CabinChrome position="bottom" hideToggle />

      {exercise.music && (
        <button
          type="button"
          onClick={() => setMusic((on) => !on)}
          aria-pressed={music}
          // Rembourrage porté à 3.5 (au lieu de 2.5) : la cible ne faisait
          // qu'environ 40 px de haut, sous le seuil tactile de 44.
          className="glass glass-edge fixed left-6 top-6 z-20 inline-flex items-center gap-2 rounded-pill px-4 py-3.5 text-sm text-ink-soft transition-colors hover:text-ink sm:left-12 sm:top-10"
        >
          <Music className="size-4" strokeWidth={1.7} aria-hidden />
          {music ? 'Musique' : 'Silence'}
        </button>
      )}

      <p className="fixed right-6 top-6 z-20 font-mono text-sm text-ink-soft sm:right-12 sm:top-10">
        {clock(remaining)}
      </p>

      <div className="-mt-10 [@media(max-height:520px)]:-mt-3">
        {respiration || !script ? (
          <BreathingGuide
            exerciseId={exercise.id}
            durationMinutes={exercise.duration}
            onComplete={onComplete}
            size={compact ? 260 : 428}
            paused={paused}
          />
        ) : (
          <VoiceGuide
            script={script}
            durationMinutes={exercise.duration}
            onComplete={onComplete}
            paused={paused}
            size={compact ? 110 : 200}
          />
        )}
      </div>

      <div className="glass glass-edge fixed bottom-16 left-1/2 z-20 flex -translate-x-1/2 items-center rounded-pill [@media(max-height:520px)]:bottom-10">
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

      {/* Licence Creative Commons BY : l'auteur est crédité tant que sa
          musique joue. */}
      {credit && (
        <p className="fixed bottom-4 left-1/2 z-10 w-[min(36rem,90%)] -translate-x-1/2 text-center text-[11px] leading-4 text-ink-faint [@media(max-height:520px)]:bottom-2 [@media(max-height:520px)]:text-[10px]">
          {credit}
        </p>
      )}

      <CabinProgress ratio={progress} />
    </section>
  );
}
