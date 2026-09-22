import { useEffect, useRef, useState } from 'react';

/** Ce qui ne se prononce pas : la voix y retombe. */
const SILENT = /[\s.,;:!?…—–-]/;

/** Vitesse de lecture, en millisecondes par caractère. */
const PER_CHAR_MS = 48;

/**
 * Pas de l'enveloppe, en millisecondes.
 *
 * Un minuteur et non `requestAnimationFrame` : vingt hertz est déjà plus fin
 * qu'une syllabe, la sphère lisse le reste, et un minuteur continue de tourner
 * là où les images ne sont pas produites — onglet en arrière-plan, navigateur
 * sans affichage. Une phrase ne doit pas rester bloquée à mi-mot.
 */
const STEP_MS = 50;

function hash(index: number): number {
  const x = Math.sin(index * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export interface Speech {
  /** 0 à 1, à passer à la sphère. */
  amplitude: number;
  /** Part de la phrase déjà prononcée, 0 à 1. */
  progress: number;
  speaking: boolean;
}

/**
 * Simule la parole d'une phrase, sans synthèse vocale.
 *
 * La cabine n'a pas de haut-parleur dans cette version et le vaisseau n'a pas
 * d'énergie à dépenser en synthèse. Ce qu'il reste à montrer, c'est le rythme :
 * l'amplitude monte sur les lettres et retombe sur les espaces et la
 * ponctuation, ce qui suffit à faire lire « quelqu'un parle » plutôt que
 * « une animation tourne ».
 */
export function useSpeech(text: string | null, onDone?: () => void): Speech {
  const [state, setState] = useState<Speech>({ amplitude: 0, progress: 0, speaking: false });
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!text) {
      setState({ amplitude: 0, progress: 0, speaking: false });
      return;
    }

    const duration = Math.min(12_000, Math.max(1200, text.length * PER_CHAR_MS));
    const start = Date.now();
    let value = 0;
    let finished = false;

    const id = window.setInterval(() => {
      const progress = Math.min(1, (Date.now() - start) / duration);
      const index = Math.min(text.length - 1, Math.floor(progress * text.length));
      const target = SILENT.test(text[index]) ? 0.05 : 0.32 + 0.68 * hash(index);
      value += (target - value) * 0.35;

      if (progress >= 1) {
        finished = true;
        window.clearInterval(id);
        setState({ amplitude: 0, progress: 1, speaking: false });
        doneRef.current?.();
        return;
      }
      setState({ amplitude: value, progress, speaking: true });
    }, STEP_MS);

    return () => {
      window.clearInterval(id);
      if (!finished) setState({ amplitude: 0, progress: 0, speaking: false });
    };
  }, [text]);

  return state;
}
