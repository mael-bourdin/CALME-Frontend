import { useEffect, useRef, useState } from 'react';
import { AIPresence } from '@/components/ai/presence';
import { direTexte } from '../audio/lecteur';
import type { Replique } from '../lib/exercices-guides';

interface VoiceGuideProps {
  script: Replique[];
  durationMinutes: number;
  onComplete: () => void;
  paused?: boolean;
  size?: number;
}

/**
 * Les exercices guidés à la voix : relâchement du visage, relaxation
 * musculaire, scan corporel, ancrage, recul, visualisation, sieste…
 *
 * Lila dit chaque réplique à son heure, et la phrase reste affichée en grand
 * jusqu'à la suivante — on peut fermer les yeux et suivre à l'oreille, ou les
 * garder ouverts et lire. La pause arrête l'horloge de l'exercice : les
 * répliques suivantes attendent, celle en cours se termine.
 */
export function VoiceGuide({
  script,
  durationMinutes,
  onComplete,
  paused = false,
  size = 260,
}: VoiceGuideProps) {
  const [elapsed, setElapsed] = useState(0);
  const [indice, setIndice] = useState(-1);
  const [parle, setParle] = useState(false);
  const enPause = useRef(paused);
  enPause.current = paused;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const fini = useRef(false);

  useEffect(() => {
    let precedent = Date.now();
    const id = window.setInterval(() => {
      const maintenant = Date.now();
      const pas = (maintenant - precedent) / 1000;
      precedent = maintenant;
      if (!enPause.current) setElapsed((e) => e + pas);
    }, 250);
    return () => window.clearInterval(id);
  }, [script]);

  // La réplique courante : la dernière dont l'heure est passée.
  useEffect(() => {
    let dernier = -1;
    script.forEach((r, i) => {
      if (r.t <= elapsed) dernier = i;
    });
    if (dernier !== indice) setIndice(dernier);
  }, [elapsed, script, indice]);

  useEffect(() => {
    if (indice < 0) return;
    const controleur = new AbortController();
    setParle(true);
    void direTexte(script[indice].texte, controleur.signal).then(() => {
      if (!controleur.signal.aborted) setParle(false);
    });
    return () => controleur.abort();
  }, [indice, script]);

  useEffect(() => {
    if (!fini.current && elapsed >= durationMinutes * 60) {
      fini.current = true;
      onCompleteRef.current();
    }
  }, [elapsed, durationMinutes]);

  const texte = indice >= 0 ? script[indice].texte : '';

  return (
    <div className="flex w-[min(44rem,100%)] flex-col items-center text-center">
      <AIPresence state={parle ? 'speaking' : 'idle'} tint="accent" size={size} count={340} />
      <p
        key={indice}
        aria-live="polite"
        className="mt-8 min-h-[5.5rem] animate-[fade-in_0.6s_ease-out] text-balance font-display text-[clamp(1.4rem,2.8vw,2.4rem)] leading-[1.3] tracking-[-0.012em] [@media(max-height:520px)]:mt-3 [@media(max-height:520px)]:min-h-[3.5rem] [@media(max-height:520px)]:text-[1.15rem]"
      >
        {texte}
      </p>
    </div>
  );
}
