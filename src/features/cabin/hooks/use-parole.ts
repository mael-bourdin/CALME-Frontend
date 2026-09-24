import { useEffect } from 'react';

import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../../../api/config';

/**
 * Fait parler la cabine, avec une cascade de replis.
 *
 * 1. Le serveur : `POST /api/v1/tts` rend un WAV, joué avec `Audio`. Un autre
 *    agent écrit cet endpoint en ce moment — tant qu'il n'existe pas, ou tant
 *    qu'il démarre, le serveur répond 404 ou 503, et c'est un repli normal,
 *    pas une panne à remonter à l'écran.
 * 2. Le navigateur : `speechSynthesis`, avec une voix française si Chromium en
 *    propose une.
 * 3. Le silence : le texte reste affiché, il l'était déjà avant ce hook.
 *
 * Chaque échec retombe silencieusement sur le repli suivant. Rien de tout ça
 * n'est visible à l'écran : la cabine est déployée et se joue demain, une
 * voix qui manque ne doit jamais empêcher la mesure de continuer.
 */

/** Ce qui a déjà été dit, par séance : une clé de séance plutôt qu'une ref de
 * composant, parce que la question de la mesure et la consigne du résultat
 * vivent dans deux écrans différents, chacun avec son propre montage — et
 * que React StrictMode remonte un même écran deux fois en développement. */
const dernierePhraseParSeance = new Map<string, string>();

/**
 * Lit `texte` à voix haute dès qu'il change, et coupe toute lecture en cours
 * — sur les deux canaux possibles — avant d'en lancer une autre ou de se
 * démonter. `cle` isole les séances entre elles (pratiquement `sessionId`) ;
 * `null` ou `undefined` retombe sur une clé commune, ce qui reste correct
 * pour un hook qui n'est monté que pendant une séance à la fois.
 */
export function useParole(texte: string | null, cle: string | null | undefined): void {
  useEffect(() => {
    if (!texte) return;
    // Recopié dans une constante : `texte` est un paramètre, TypeScript
    // n'étend pas son étroitissement `!== null` aux fermetures asynchrones
    // ci-dessous, qui le capturent pourtant après ce retour anticipé.
    const phrase = texte;

    let vivant = true;
    let audio: HTMLAudioElement | null = null;
    let urlObjet: string | null = null;
    const controleur = new AbortController();

    function couperAudioServeur() {
      if (audio) {
        audio.pause();
        audio.src = '';
        audio = null;
      }
      if (urlObjet) {
        URL.revokeObjectURL(urlObjet);
        urlObjet = null;
      }
    }

    function couperVoixNavigateur() {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }

    // Une seule chose parle à la fois : le navigateur n'a qu'une synthèse
    // vocale globale, on la coupe avant de commencer, même si c'est cet écran
    // qui l'a lancée un instant plus tôt.
    couperVoixNavigateur();

    async function parlerParLeServeur(): Promise<boolean> {
      const minuteur = window.setTimeout(() => controleur.abort(), REQUEST_TIMEOUT_MS);
      try {
        const reponse = await fetch(`${API_BASE_URL}/tts`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ texte: phrase }),
          signal: controleur.signal,
        });
        if (!reponse.ok) return false; // 404 tant que l'endpoint n'existe pas, 503 le temps qu'il démarre
        const blob = await reponse.blob();
        if (!vivant) return true; // démonté pendant le téléchargement : rien à jouer, mais pas d'échec non plus

        const url = URL.createObjectURL(blob);
        urlObjet = url;
        const lecteur = new Audio(url);
        audio = lecteur;
        const liberer = () => {
          URL.revokeObjectURL(url);
          if (urlObjet === url) urlObjet = null;
        };
        lecteur.addEventListener('ended', liberer, { once: true });
        lecteur.addEventListener('error', liberer, { once: true });
        await lecteur.play();
        return true;
      } catch {
        return false;
      } finally {
        window.clearTimeout(minuteur);
      }
    }

    function parlerParLeNavigateur() {
      const synth = window.speechSynthesis;
      if (!synth) return; // troisième repli : silence, le texte reste affiché

      const utterance = new SpeechSynthesisUtterance(phrase);
      const voixFrancaise = synth.getVoices().find((voix) => voix.lang.toLowerCase().startsWith('fr'));
      if (voixFrancaise) utterance.voice = voixFrancaise;
      utterance.lang = 'fr-FR';
      // Un peu plus lent que le défaut : la cabine accompagne quelqu'un
      // qu'elle mesure pour du stress, elle ne doit pas le surprendre.
      utterance.rate = 0.95;
      synth.speak(utterance);
    }

    void (async () => {
      const cleSeance = cle ?? '';
      if (dernierePhraseParSeance.get(cleSeance) === phrase) return; // déjà dit, on ne le redit pas

      const parleParLeServeur = await parlerParLeServeur();
      if (!vivant) return; // démonté pendant l'essai serveur : inutile de basculer sur le navigateur

      if (!parleParLeServeur) parlerParLeNavigateur();
      dernierePhraseParSeance.set(cleSeance, phrase);
    })();

    return () => {
      vivant = false;
      controleur.abort();
      couperAudioServeur();
      couperVoixNavigateur();
    };
  }, [texte, cle]);
}
