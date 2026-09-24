import { pcmVersWav } from './wav-encoder';

/**
 * Enregistre une réponse parlée et s'arrête tout seul quand la personne a
 * fini : après un silence, ou au bout d'une durée maximale.
 *
 * Même choix que l'ancien échantillon de voix (PCM brut encodé en WAV, pas de
 * `MediaRecorder`) : le serveur décode avec `soundfile`, qui ne lit pas le
 * webm/opus. `noiseSuppression: false` aussi : ce même WAV sert à l'indice
 * vocal, qui mesure précisément ce qu'une réduction de bruit modifierait.
 */

const TAUX = 16000;
const TAILLE_BLOC = 2048; // un relevé toutes les 128 ms à 16 kHz

export interface OptionsEnregistrement {
  signal?: AbortSignal;
  /** Personne ne parle pendant ce délai : on abandonne, réponse vide. */
  attenteParoleMs?: number;
  /** Silence après avoir parlé : la réponse est terminée. */
  silenceFinMs?: number;
  /** Plafond absolu, quoi qu'il arrive. */
  dureeMaxMs?: number;
}

export interface Enregistrement {
  wav: Blob;
  /** Faux si le seuil de parole n'a jamais été franchi. */
  aParle: boolean;
}

/** Niveau (RMS) au-dessus duquel un bloc compte comme de la parole. Le bruit
 * de fond est mesuré sur la première demi-seconde et relève ce seuil, pour
 * que le ronflement d'un ventilateur ne passe pas pour une voix. */
const SEUIL_PAROLE_MIN = 0.012;

function rms(bloc: Float32Array): number {
  let somme = 0;
  for (let i = 0; i < bloc.length; i++) somme += bloc[i] * bloc[i];
  return Math.sqrt(somme / bloc.length);
}

export async function enregistrerReponse({
  signal,
  attenteParoleMs = 6000,
  silenceFinMs = 1400,
  dureeMaxMs = 12000,
}: OptionsEnregistrement = {}): Promise<Enregistrement | null> {
  if (signal?.aborted) return null;

  const flux = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: false },
  });
  const contexte = new AudioContext({ sampleRate: TAUX });
  const source = contexte.createMediaStreamSource(flux);
  const processeur = contexte.createScriptProcessor(TAILLE_BLOC, 1, 1);
  const silence = contexte.createGain();
  silence.gain.value = 0;

  const blocs: Float32Array[] = [];
  const msParBloc = (TAILLE_BLOC / contexte.sampleRate) * 1000;

  return new Promise<Enregistrement | null>((resolve) => {
    let ecoule = 0;
    let bruitDeFond = 0;
    let blocsCalibrage = 0;
    let aParle = false;
    let silenceDepuis = 0;
    let fini = false;

    const terminer = (garder: boolean) => {
      if (fini) return;
      fini = true;
      processeur.disconnect();
      source.disconnect();
      silence.disconnect();
      flux.getTracks().forEach((piste) => piste.stop());
      const taux = contexte.sampleRate;
      void contexte.close().catch(() => undefined);
      signal?.removeEventListener('abort', annuler);
      if (!garder) return resolve(null);
      resolve({ wav: new Blob([pcmVersWav(blocs, taux)], { type: 'audio/wav' }), aParle });
    };
    const annuler = () => terminer(false);
    signal?.addEventListener('abort', annuler, { once: true });

    processeur.onaudioprocess = (evenement) => {
      if (fini) return;
      const bloc = new Float32Array(evenement.inputBuffer.getChannelData(0));
      blocs.push(bloc);
      ecoule += msParBloc;
      const niveau = rms(bloc);

      if (ecoule <= 500) {
        bruitDeFond = (bruitDeFond * blocsCalibrage + niveau) / (blocsCalibrage + 1);
        blocsCalibrage++;
      }
      const seuil = Math.max(SEUIL_PAROLE_MIN, bruitDeFond * 2.5);

      if (niveau > seuil) {
        aParle = true;
        silenceDepuis = 0;
      } else if (aParle) {
        silenceDepuis += msParBloc;
      }

      if (aParle && silenceDepuis >= silenceFinMs) terminer(true);
      else if (!aParle && ecoule >= attenteParoleMs) terminer(true);
      else if (ecoule >= dureeMaxMs) terminer(true);
    };

    source.connect(processeur);
    processeur.connect(silence);
    silence.connect(contexte.destination);
  });
}
