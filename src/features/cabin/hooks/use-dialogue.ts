import { useEffect, useRef, useState } from 'react';

import { api } from '../../../api';
import type { TourDialogue } from '../../../api';
import { direTexte } from '../audio/lecteur';
import { enregistrerReponse } from '../audio/enregistreur';

/**
 * La conversation de la minute de mesure.
 *
 * La cabine pose sa question, écoute la réponse jusqu'à ce que la personne se
 * taise, l'envoie au serveur (transcription + relance rédigée par le modèle
 * local), prononce la relance, et recommence. Quelques tours seulement : la
 * conversation sert à poser la personne pendant qu'on la mesure, pas à la
 * retenir. Le dernier tour se termine sans question.
 *
 * L'historique ne vit qu'ici, dans le navigateur, et disparaît avec l'écran :
 * le serveur le reçoit à chaque tour et ne le garde pas.
 *
 * La première réponse sert aussi à l'indice vocal (hauteur, débit, silences) :
 * c'est l'échantillon de voix de la séance, pris au moment où la personne
 * parle vraiment, et non pendant que la cabine parle.
 *
 * Micro coupé par consentement : la cabine pose sa question et s'arrête là,
 * comme avant. Serveur de dialogue indisponible : pareil, en silence — la
 * mesure continue, elle n'a jamais dépendu de la conversation.
 */

export type EtatDialogue = 'parle' | 'ecoute' | 'reflechit' | 'termine';

interface OptionsDialogue {
  question: string;
  micro: boolean;
  /** Secondes restantes de mesure : sous le seuil, le tour suivant est le dernier. */
  resteSecondes: number;
  /** Nombre maximal de réponses de l'astronaute. */
  toursMax?: number;
}

/** Un tour complet (écoute, transcription, rédaction, relance) prend une
 * vingtaine de secondes sur le CPU de la tour : mesuré, pas estimé. */
const SECONDES_PAR_TOUR = 22;

/** Dit aussitôt la réponse enregistrée, pendant que le serveur rédige : sans
 * elle, dix secondes de silence laissent croire que la cabine n'a rien
 * entendu. Courtes et variées, pour ne pas sonner comme un automate. */
const ACCUSES = ['Mmh, d’accord.', 'Je vois.', 'D’accord.', 'Mmh.'];

export function useDialogue(
  sessionId: string | null,
  { question, micro, resteSecondes, toursMax = 3 }: OptionsDialogue,
) {
  const [phrase, setPhrase] = useState(question);
  const [entendu, setEntendu] = useState<string | null>(null);
  const [etat, setEtat] = useState<EtatDialogue>('parle');
  const [erreur, setErreur] = useState<string | null>(null);

  // Lu à chaque tour sans relancer l'effet : le temps qui passe ne doit pas
  // redémarrer la conversation.
  const reste = useRef(resteSecondes);
  reste.current = resteSecondes;

  useEffect(() => {
    if (!sessionId) return;
    const controleur = new AbortController();
    const { signal } = controleur;
    const historique: TourDialogue[] = [];

    setPhrase(question);
    setEntendu(null);
    setErreur(null);

    void (async () => {
      let aDire = question;
      for (let tour = 0; ; tour++) {
        setPhrase(aDire);
        setEtat('parle');
        historique.push({ role: 'lila', texte: aDire });
        await direTexte(aDire, signal);
        if (signal.aborted) return;

        const plusDeTemps = reste.current < SECONDES_PAR_TOUR / 2;
        if (!micro || tour >= toursMax || plusDeTemps) break;

        setEtat('ecoute');
        const reponse = await enregistrerReponse({ signal });
        if (signal.aborted || !reponse) return;

        if (tour === 0 && reponse.aParle) {
          void api.sendVoiceSample(sessionId, reponse.wav).catch(() => {
            /* l'indice vocal manquera, la mesure continue */
          });
        }

        setEtat('reflechit');
        const dernier = tour + 1 >= toursMax || reste.current < SECONDES_PAR_TOUR * 1.5;
        const accuse = reponse.aParle
          ? direTexte(ACCUSES[tour % ACCUSES.length], signal)
          : Promise.resolve();
        const resultat = await api.sendDialogueTurn(sessionId, reponse.wav, historique, dernier);
        await accuse; // la relance ne coupe jamais l'accusé en cours
        if (signal.aborted) return;
        setEntendu(resultat.entendu || null);
        if (resultat.entendu) historique.push({ role: 'astronaute', texte: resultat.entendu });
        aDire = resultat.reponse;
        if (dernier) {
          setPhrase(aDire);
          setEtat('parle');
          await direTexte(aDire, signal);
          break;
        }
      }
      if (!signal.aborted) setEtat('termine');
    })().catch((e: unknown) => {
      if (signal.aborted) return;
      setErreur(e instanceof Error ? e.message : 'dialogue indisponible');
      setEtat('termine');
    });

    return () => controleur.abort();
  }, [sessionId, micro, question, toursMax]);

  return { phrase, entendu, etat, erreur };
}
