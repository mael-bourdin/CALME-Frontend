import { useCallback, useEffect, useState } from 'react';

import { api } from '../../../api';
import type { CrewMember } from '../../../api';
import { capturerEmpreinteDetaillee } from '../lib/empreinte-visage';

export type StatutIdentification = 'recherche' | 'reconnu' | 'echec';

interface ResultatIdentification {
  statut: StatutIdentification;
  membre: CrewMember | null;
  /** Pourquoi personne n'a été reconnu, quand on le sait : caméra occupée,
   * visage non vu, personne ne correspond. */
  raison?: string;
}

/**
 * La seule tentative de reconnaissance faciale de la séance, lancée à
 * l'arrivée sur l'écran d'accueil.
 *
 * Volontairement ponctuelle, pas continue : le Pi fait déjà tourner
 * Chromium, MediaPipe et la webcam sur les mêmes cœurs pendant la mesure, ce
 * budget ne doit pas être entamé avant même que la séance commence. Un seul
 * essai, borné dans le temps (voir `capturerEmpreinte`), puis c'est fini.
 *
 * `echec` regroupe volontairement « personne reconnu » et « caméra
 * indisponible ou coupée par consentement » : l'écran d'accueil réagit de la
 * même façon dans les deux cas, il affiche la liste de l'équipage.
 */
export function useFaceRecognition(
  consentCamera: boolean,
): ResultatIdentification & { reessayer: () => void } {
  const [resultat, setResultat] = useState<ResultatIdentification>({
    statut: 'recherche',
    membre: null,
  });
  // Un nouvel essai, à la demande : typiquement après avoir libéré une caméra
  // qu'un autre onglet gardait.
  const [essai, setEssai] = useState(0);
  const reessayer = useCallback(() => setEssai((n) => n + 1), []);

  useEffect(() => {
    let vivant = true;

    async function identifier() {
      setResultat({ statut: 'recherche', membre: null });
      if (!consentCamera) {
        // Pas de consentement, pas de reconnaissance : on ne tente même pas
        // d'ouvrir la caméra, on retombe directement sur la liste.
        setResultat({ statut: 'echec', membre: null, raison: 'caméra coupée' });
        return;
      }

      const capture = await capturerEmpreinteDetaillee(3);
      if (!vivant) return;
      if (!capture.ok) {
        setResultat({ statut: 'echec', membre: null, raison: capture.raison });
        return;
      }
      const empreinte = capture.empreinte;

      try {
        const membre = await api.identifyCrewMember(empreinte);
        if (!vivant) return;
        setResultat(
          membre
            ? { statut: 'reconnu', membre }
            : { statut: 'echec', membre: null, raison: 'visage vu, mais personne ne correspond' },
        );
      } catch {
        // Serveur injoignable ou route pas encore branchée : le repli est le
        // même que « personne ne correspond », l'écran ne distingue pas.
        if (vivant) setResultat({ statut: 'echec', membre: null, raison: 'serveur injoignable' });
      }
    }

    void identifier();

    return () => {
      vivant = false;
    };
  }, [consentCamera, essai]);

  return { ...resultat, reessayer };
}
