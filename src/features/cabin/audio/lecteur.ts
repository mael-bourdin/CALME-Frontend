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
  const ok = await direParLeServeur(texte, signal);
  if (!ok && !signal?.aborted) await direParLeNavigateur(texte, signal);
}
