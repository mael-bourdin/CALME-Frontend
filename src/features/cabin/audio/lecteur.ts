import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../../../api/config';

/**
 * La voix de la cabine : un seul `AudioContext` pour toute la page.
 *
 * Pourquoi pas `new Audio(url).play()` : les navigateurs refusent de jouer un
 * son qu'aucun geste de l'utilisateur n'a précédé. Or la mesure démarre quand
 * la main se pose sur l'accoudoir, pas sur un toucher d'écran — Firefox
 * rejetait donc chaque phrase, et la cabine restait muette. Un `AudioContext`
 * réveillé une fois par un geste, n'importe lequel (choisir son nom, toucher
 * l'accueil), le reste pour toute la page : c'est ce que fait
 * `installerDeverrouillageAudio`.
 *
 * Sur le Pi, Chromium est lancé avec `--autoplay-policy=no-user-gesture-required`
 * et n'a pas besoin de ce déverrouillage ; il reste utile partout ailleurs.
 */

let contexte: AudioContext | null = null;

function contexteAudio(): AudioContext {
  contexte ??= new AudioContext();
  return contexte;
}

/** À appeler une fois au démarrage : le premier geste, quel qu'il soit,
 * réveille la sortie son pour le reste de la visite. */
export function installerDeverrouillageAudio(): void {
  if (typeof window === 'undefined') return;
  const deverrouiller = () => {
    const ctx = contexteAudio();
    void ctx.resume();
    // Un échantillon muet joué pendant le geste : certains navigateurs ne
    // considèrent le contexte débloqué qu'après une première lecture.
    const muet = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = muet;
    source.connect(ctx.destination);
    source.start();
    if (ctx.state === 'running') {
      window.removeEventListener('pointerdown', deverrouiller);
      window.removeEventListener('keydown', deverrouiller);
    }
  };
  window.addEventListener('pointerdown', deverrouiller);
  window.addEventListener('keydown', deverrouiller);
}

/* ---- Musique de fond -------------------------------------------------- */

/** Volume de la musique quand personne ne parle, et pendant que Lila parle :
 * la voix doit toujours passer devant, la musique ne s'arrête jamais net. */
const VOLUME_MUSIQUE = 0.55;
const VOLUME_MUSIQUE_SOUS_VOIX = 0.15;

let gainMusique: GainNode | null = null;
let voixEnCours = 0;

/** Le lecteur YouTube en cours, s'il y en a un : son volume suit la voix
 * comme celui de la piste locale (0 à 100 chez YouTube). */
let lecteurYoutube: YoutubePlayer | null = null;
const VOLUME_YOUTUBE = 100;
const VOLUME_YOUTUBE_SOUS_VOIX = 35;

function ajusterMusique(): void {
  const sousVoix = voixEnCours > 0;
  lecteurYoutube?.setVolume(sousVoix ? VOLUME_YOUTUBE_SOUS_VOIX : VOLUME_YOUTUBE);
  if (!gainMusique || !contexte) return;
  const cible = sousVoix ? VOLUME_MUSIQUE_SOUS_VOIX : VOLUME_MUSIQUE;
  gainMusique.gain.setTargetAtTime(cible, contexte.currentTime, 0.25);
}

export interface Musique {
  pause(): void;
  reprendre(): void;
  arreter(): void;
}

/**
 * Joue une piste en boucle, sous la voix. Passe par le même `AudioContext`
 * que la voix : débloqué une fois, il sert aux deux, et le volume de la
 * musique peut baisser pendant que Lila parle.
 */
export function jouerMusique(url: string): Musique {
  if (url.startsWith('youtube:')) return jouerYoutube(url.slice('youtube:'.length));
  return jouerPiste(url);
}

function jouerPiste(url: string): Musique {
  const ctx = contexteAudio();
  void ctx.resume().catch(() => undefined);
  const element = new Audio(url);
  element.loop = true;
  element.preload = 'auto';
  const source = ctx.createMediaElementSource(element);
  const gain = ctx.createGain();
  gain.gain.value = 0;
  source.connect(gain).connect(ctx.destination);
  gainMusique = gain;
  ajusterMusique();
  void element.play().catch(() => undefined);

  return {
    pause: () => element.pause(),
    reprendre: () => void element.play().catch(() => undefined),
    arreter: () => {
      gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      window.setTimeout(() => {
        element.pause();
        element.src = '';
        source.disconnect();
        gain.disconnect();
      }, 1200);
      if (gainMusique === gain) gainMusique = null;
    },
  };
}

/* ---- Musique lue depuis YouTube ----------------------------------------- */

/**
 * Certaines musiques ne sont pas libres de droits : on ne les copie pas, on
 * les lit avec le lecteur intégré officiel de YouTube (autorisé par l'auteur,
 * `playableInEmbed`). Il faut donc Internet ; sans réponse de YouTube en
 * quelques secondes, la piste libre embarquée prend le relais.
 */

interface YoutubePlayer {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  setVolume(volume: number): void;
  destroy(): void;
}

interface YoutubeApi {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      width?: number;
      height?: number;
      playerVars?: Record<string, number>;
      events?: { onReady?: () => void; onError?: () => void };
    },
  ) => YoutubePlayer;
}

declare global {
  interface Window {
    YT?: YoutubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PISTE_DE_SECOURS = '/audio/respiration-carree-80bpm.ogg';
const DELAI_YOUTUBE_MS = 8000;

let apiYoutube: Promise<YoutubeApi> | null = null;

function chargerApiYoutube(): Promise<YoutubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiYoutube ??= new Promise<YoutubeApi>((resolve, reject) => {
    const precedent = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      precedent?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.onerror = () => {
      apiYoutube = null;
      reject(new Error('YouTube injoignable'));
    };
    document.head.appendChild(script);
  });
  return apiYoutube;
}

function jouerYoutube(videoId: string): Musique {
  let arrete = false;
  let enPause = false;
  let joueur: YoutubePlayer | null = null;
  let secours: Musique | null = null;
  // Le lecteur est une iframe : on la garde hors de la vue, elle ne sert
  // qu'au son.
  const hote = document.createElement('div');
  hote.style.cssText =
    'position:fixed;width:1px;height:1px;left:-10px;top:-10px;opacity:0;pointer-events:none';
  const cible = document.createElement('div');
  hote.appendChild(cible);
  document.body.appendChild(hote);

  const passerAuSecours = () => {
    if (arrete || secours) return;
    joueur?.destroy();
    joueur = null;
    if (lecteurYoutube) lecteurYoutube = null;
    secours = jouerPiste(PISTE_DE_SECOURS);
    if (enPause) secours.pause();
  };
  const minuteur = window.setTimeout(passerAuSecours, DELAI_YOUTUBE_MS);

  chargerApiYoutube()
    .then((YT) => {
      if (arrete || secours) return;
      joueur = new YT.Player(cible, {
        videoId,
        width: 1,
        height: 1,
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: () => {
            if (arrete || secours || !joueur) return;
            window.clearTimeout(minuteur);
            lecteurYoutube = joueur;
            ajusterMusique();
            if (!enPause) joueur.playVideo();
          },
          onError: passerAuSecours,
        },
      });
    })
    .catch(passerAuSecours);

  return {
    pause: () => {
      enPause = true;
      joueur?.pauseVideo();
      secours?.pause();
    },
    reprendre: () => {
      enPause = false;
      joueur?.playVideo();
      secours?.reprendre();
    },
    arreter: () => {
      arrete = true;
      window.clearTimeout(minuteur);
      if (lecteurYoutube === joueur) lecteurYoutube = null;
      joueur?.stopVideo();
      joueur?.destroy();
      secours?.arreter();
      hote.remove();
    },
  };
}

/** Vrai quand la sortie son peut jouer sans nouveau geste. */
export function sonDisponible(): boolean {
  return contexte?.state === 'running';
}

function attendreFinOuAnnulation(
  source: AudioBufferSourceNode,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve) => {
    const finir = () => {
      signal?.removeEventListener('abort', annuler);
      resolve();
    };
    const annuler = () => {
      try {
        source.stop();
      } catch {
        /* déjà arrêtée */
      }
      finir();
    };
    source.onended = finir;
    signal?.addEventListener('abort', annuler, { once: true });
  });
}

async function direParLeServeur(texte: string, signal?: AbortSignal): Promise<boolean> {
  const controleur = new AbortController();
  const minuteur = window.setTimeout(() => controleur.abort(), REQUEST_TIMEOUT_MS);
  signal?.addEventListener('abort', () => controleur.abort(), { once: true });
  try {
    const reponse = await fetch(`${API_BASE_URL}/tts`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texte }),
      signal: controleur.signal,
    });
    if (!reponse.ok) return false;
    const ctx = contexteAudio();
    if (ctx.state !== 'running') await ctx.resume().catch(() => undefined);
    if (ctx.state !== 'running') return false; // aucun geste encore : repli navigateur
    const son = await ctx.decodeAudioData(await reponse.arrayBuffer());
    if (signal?.aborted) return true;
    const source = ctx.createBufferSource();
    source.buffer = son;
    source.connect(ctx.destination);
    source.start();
    await attendreFinOuAnnulation(source, signal);
    return true;
  } catch {
    return signal?.aborted ?? false;
  } finally {
    window.clearTimeout(minuteur);
  }
}

function direParLeNavigateur(texte: string, signal?: AbortSignal): Promise<void> {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
  if (!synth) return Promise.resolve();
  return new Promise((resolve) => {
    const phrase = new SpeechSynthesisUtterance(texte);
    const voixFrancaise = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('fr'));
    if (voixFrancaise) phrase.voice = voixFrancaise;
    phrase.lang = 'fr-FR';
    // Un peu plus lent que le défaut : la cabine accompagne quelqu'un qu'elle
    // mesure pour du stress, elle ne doit pas le surprendre.
    phrase.rate = 0.95;
    // Garde-fou : certains moteurs (le module factice de speech-dispatcher
    // par exemple) n'émettent jamais `end`.
    const garde = window.setTimeout(resolve, 400 + texte.length * 90);
    const finir = () => {
      window.clearTimeout(garde);
      resolve();
    };
    phrase.onend = finir;
    phrase.onerror = finir;
    signal?.addEventListener(
      'abort',
      () => {
        synth.cancel();
        finir();
      },
      { once: true },
    );
    synth.cancel();
    synth.speak(phrase);
  });
}

/**
 * Prononce `texte` et se résout quand la phrase est finie (ou annulée) :
 * le dialogue attend cette fin pour ouvrir le micro, sinon il enregistrerait
 * la voix de la cabine elle-même.
 *
 * Serveur (Piper), puis voix du navigateur, puis silence : ne rejette jamais.
 */
export async function direTexte(texte: string, signal?: AbortSignal): Promise<void> {
  if (!texte || signal?.aborted) return;
  voixEnCours++;
  ajusterMusique();
  try {
    const ok = await direParLeServeur(texte, signal);
    if (!ok && !signal?.aborted) await direParLeNavigateur(texte, signal);
  } finally {
    voixEnCours--;
    ajusterMusique();
  }
}
