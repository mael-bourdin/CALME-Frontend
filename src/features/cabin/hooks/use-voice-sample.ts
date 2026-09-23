import { useEffect, useRef, useState } from 'react';

import { api } from '../../../api';
import { pcmVersWav } from '../audio/wav-encoder';

/**
 * L'échantillon de voix, capturé une fois par séance dans le navigateur.
 *
 * Pas de `MediaRecorder` : il ne sait produire que du webm/opus, que le
 * serveur ne sait pas lire (il décode avec `soundfile`, qui accepte le WAV, le
 * FLAC et l'OGG). On capture donc le PCM brut nous-mêmes et on encode un WAV
 * en local — voir `../audio/wav-encoder.ts`.
 *
 * `noiseSuppression: false` est un choix, pas un oubli : on mesure la forme de
 * la voix — hauteur, intensité, débit, silences — et une réduction de bruit
 * modifierait précisément ce que le serveur cherche à lire.
 *
 * Le taux d'échantillonnage demandé à l'`AudioContext` (16 kHz) évite tout
 * rééchantillonnage côté serveur ; Chromium — seul navigateur de la cabine —
 * le respecte. Le WAV écrit reprend malgré tout le taux réellement obtenu par
 * le contexte, au cas où un navigateur de développement l'ignorerait.
 */

const SAMPLE_RATE = 16000;
// Taille de bloc du ScriptProcessorNode : doit être une puissance de deux
// entre 256 et 16384. 4096 donne un relevé toutes les 256 ms à 16 kHz, largo
// suffisant puisqu'on ne fait qu'accumuler, sans traitement temps réel.
const TAILLE_BLOC = 4096;

interface OptionsVoiceSample {
  actif: boolean;
  dureeSecondes: number;
}

export function useVoiceSample(
  sessionId: string | null,
  { actif, dureeSecondes }: OptionsVoiceSample,
) {
  const [pret, setPret] = useState(false);
  const [enregistre, setEnregistre] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  // Retient la séance déjà enregistrée : la question n'est posée qu'une fois,
  // et un aller-retour de consentement (coupé puis rendu) ne doit pas rouvrir
  // le micro pour recommencer.
  const dejaEnregistree = useRef<string | null>(null);

  useEffect(() => {
    if (!actif || !sessionId) return;
    if (dejaEnregistree.current === sessionId) return;

    setErreur(null);
    setPret(false);
    setEnregistre(false);

    let vivant = true;
    let flux: MediaStream | null = null;
    let contexte: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let processeur: ScriptProcessorNode | null = null;
    let silence: GainNode | null = null;
    let minuteur = 0;
    const blocs: Float32Array[] = [];

    // Coupe tout ce qui a pu être ouvert, sans se soucier de ce qui l'est déjà
    // ou pas : appelée à la fin normale de l'enregistrement comme au
    // démontage, elle doit rester sûre dans les deux cas.
    function relacherRessources() {
      window.clearTimeout(minuteur);
      processeur?.disconnect();
      source?.disconnect();
      silence?.disconnect();
      flux?.getTracks().forEach((piste) => piste.stop());
      void contexte?.close().catch(() => {
        /* déjà fermé : rien à faire de plus */
      });
      flux = null;
      contexte = null;
      source = null;
      processeur = null;
      silence = null;
    }

    async function arreterEtEnvoyer() {
      // On détache la source avant l'envoi : il n'y a plus rien à accumuler,
      // inutile de laisser le graphe audio tourner pendant l'encodage.
      const echantillons = blocs.slice();
      const debitReel = contexte?.sampleRate ?? SAMPLE_RATE;
      relacherRessources();
      if (!vivant) return;

      try {
        const wav = pcmVersWav(echantillons, debitReel);
        const blob = new Blob([wav], { type: 'audio/wav' });
        await api.sendVoiceSample(sessionId!, blob);
        if (!vivant) return;
        setEnregistre(true);
      } catch (e) {
        if (vivant) setErreur(e instanceof Error ? e.message : 'envoi de la voix impossible');
      }
    }

    async function demarrer() {
      try {
        const fluxLocal = await navigator.mediaDevices.getUserMedia({
          audio: { channelCount: 1, echoCancellation: true, noiseSuppression: false },
        });
        if (!vivant) {
          // Même raisonnement que pour la caméra : le démontage est passé
          // pendant l'attente du micro, et `flux` valait encore `null` à ce
          // moment-là — sans ce nettoyage, le voyant resterait allumé.
          fluxLocal.getTracks().forEach((piste) => piste.stop());
          return;
        }
        flux = fluxLocal;

        const contexteLocal = new AudioContext({ sampleRate: SAMPLE_RATE });
        if (!vivant) {
          void contexteLocal.close();
          return;
        }
        contexte = contexteLocal;

        source = contexte.createMediaStreamSource(flux);
        // `ScriptProcessorNode` plutôt qu'un `AudioWorkletNode` : ce dernier
        // exige un module séparé chargé par `audioContext.audioWorklet.
        // addModule(...)`, une plomberie de build que dix secondes d'audio,
        // une fois par séance, ne justifient pas ici. Voir le rapport de
        // tâche pour ce compromis assumé.
        processeur = contexte.createScriptProcessor(TAILLE_BLOC, 1, 1);
        processeur.onaudioprocess = (evenement) => {
          // Copie : le tampon fourni par l'API est réutilisé au tour suivant,
          // le conserver tel quel écraserait les échantillons déjà accumulés.
          blocs.push(new Float32Array(evenement.inputBuffer.getChannelData(0)));
        };

        // Le spec Web Audio n'exécute `onaudioprocess` que si le noeud est
        // relié à la destination — mais on ne veut pas entendre le micro
        // repartir dans les enceintes. Un gain à zéro rend le chemin muet
        // sans empêcher le traitement de tourner.
        silence = contexte.createGain();
        silence.gain.value = 0;

        source.connect(processeur);
        processeur.connect(silence);
        silence.connect(contexte.destination);

        setPret(true);
        dejaEnregistree.current = sessionId;

        minuteur = window.setTimeout(() => {
          void arreterEtEnvoyer();
        }, dureeSecondes * 1000);
      } catch (e) {
        if (vivant) setErreur(e instanceof Error ? e.message : 'micro indisponible');
      }
    }

    void demarrer();

    return () => {
      vivant = false;
      relacherRessources();
    };
  }, [sessionId, actif, dureeSecondes]);

  return { enregistre, pret, erreur };
}
