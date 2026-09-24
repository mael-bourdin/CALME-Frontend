import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/api';
import type { CrewMember } from '@/api';
import { capturerEmpreinteDetaillee } from '../lib/empreinte-visage';
import { useFaceRecognition } from '../hooks/use-face-recognition';
import { CrewPicker } from './crew-picker';
import { TouchKeyboard } from './touch-keyboard';

interface IdentificationFlowProps {
  /** Pas de consentement caméra, pas de tentative de reconnaissance. */
  consentCamera: boolean;
  /** Appelé dès que quelqu'un est identifié, par n'importe laquelle des trois
   * voies (reconnu, choisi dans la liste, tout juste enrôlé). */
  onIdentified: (member: CrewMember) => void;
}

type Etape = 'liste' | 'clavier';

/**
 * Le parcours d'identification de l'accueil, quand la reconnaissance
 * automatique ne suffit pas : la liste de l'équipage, puis au besoin
 * l'enrôlement au clavier tactile.
 *
 * Ce composant disparaît de l'arbre dès que `onIdentified` a été appelé — le
 * parent (HomeScreen) bascule alors sur l'écran de bienvenue habituel, ce qui
 * coupe net tout effet encore en cours ici. C'est volontaire : inutile de
 * gérer un état « identifié » en plus de celui du parent.
 */
export function IdentificationFlow({ consentCamera, onIdentified }: IdentificationFlowProps) {
  const recherche = useFaceRecognition(consentCamera);

  // Une ref plutôt qu'une dépendance d'effet : `onIdentified` est reconstruit
  // à chaque rendu du parent (voir cabin-route.tsx), et le lister dans un
  // tableau de dépendances relancerait la recherche d'équipage à chaque fois.
  const onIdentifiedRef = useRef(onIdentified);
  onIdentifiedRef.current = onIdentified;

  const [etape, setEtape] = useState<Etape>('liste');
  const [equipe, setEquipe] = useState<CrewMember[]>([]);
  const [chargementEquipe, setChargementEquipe] = useState(false);
  const [prenom, setPrenom] = useState('');
  const [enrolement, setEnrolement] = useState<{ enCours: boolean; erreur: string | null }>({
    enCours: false,
    erreur: null,
  });

  // La reconnaissance a trouvé quelqu'un : on le fait remonter tout de suite.
  useEffect(() => {
    if (recherche.statut === 'reconnu' && recherche.membre) {
      onIdentifiedRef.current(recherche.membre);
    }
  }, [recherche.statut, recherche.membre]);

  // Échec (personne reconnu, ou caméra indisponible) : on va chercher la
  // liste de repli, une seule fois.
  useEffect(() => {
    if (recherche.statut !== 'echec') return;
    let vivant = true;
    setChargementEquipe(true);

    void (async () => {
      try {
        const liste = await api.getCrewList();
        if (vivant) setEquipe(liste);
      } catch {
        // Même la liste est injoignable : dernier repli, l'occupant connu du
        // serveur, pour que la cabine reste utilisable malgré une panne
        // réseau qui touche jusqu'à `/crew`.
        try {
          const secours = await api.getCurrentMember();
          if (vivant) onIdentifiedRef.current(secours);
        } catch {
          // Plus rien ne répond : on reste affiché avec une liste vide,
          // « Je suis nouveau » reste la seule issue si la caméra marche.
        }
      } finally {
        if (vivant) setChargementEquipe(false);
      }
    })();

    return () => {
      vivant = false;
    };
  }, [recherche.statut]);

  async function enroler() {
    const nom = prenom.trim();
    if (!nom) return;

    if (!consentCamera) {
      setEnrolement({
        enCours: false,
        erreur: 'Caméra coupée — réactive-la pour t’enrôler.',
      });
      return;
    }

    setEnrolement({ enCours: true, erreur: null });
    // Cinq images plutôt que trois : l'empreinte enrôlée sert de référence à
    // toutes les reconnaissances suivantes, elle doit être la plus stable.
    const capture = await capturerEmpreinteDetaillee(5);
    if (!capture.ok) {
      setEnrolement({
        enCours: false,
        erreur: `Je n’ai pas réussi à te voir (${capture.raison}). Réessaie.`,
      });
      return;
    }

    try {
      const membre = await api.enrollCrewMember(nom, capture.empreinte);
      onIdentifiedRef.current(membre);
    } catch {
      setEnrolement({ enCours: false, erreur: 'Enrôlement impossible pour l’instant.' });
    }
  }

  // Recherche en cours, ou déjà réussie (le parent va démonter ce composant
  // d'un instant à l'autre) : rien à montrer d'autre que ce discret repère.
  if (recherche.statut !== 'echec') {
    return <p className="text-sm text-ink-faint">Je regarde qui est là…</p>;
  }

  if (etape === 'clavier') {
    return (
      // Budget serré sur la dalle 800×480 : les quatre rangées du clavier
      // (44 px chacune, un plancher tactile qui ne descend pas plus bas)
      // pèsent à elles seules 176 px. Le libellé disparaît, les écarts se
      // resserrent, et les boutons perdent leurs 6 px de trop (50 → 44, la
      // taille minimale exacte, pas moins) pour que tout tienne.
      <div className="flex w-full flex-col items-center gap-4 [@media(max-height:520px)]:gap-2">
        <p className="text-sm text-ink-faint [@media(max-height:520px)]:hidden">Ton prénom ?</p>
        <p className="min-h-9 text-xl font-medium text-ink [@media(max-height:520px)]:min-h-0 [@media(max-height:520px)]:text-base">
          {prenom || ' '}
        </p>
        <TouchKeyboard value={prenom} onChange={setPrenom} />
        {enrolement.erreur && (
          <p role="status" className="text-xs text-watch">
            {enrolement.erreur}
          </p>
        )}
        <div className="mt-1 flex gap-3 [@media(max-height:520px)]:mt-0">
          <Button
            variant="secondary"
            size="md"
            className="[@media(max-height:520px)]:h-11"
            onClick={() => {
              setEtape('liste');
              setEnrolement({ enCours: false, erreur: null });
            }}
          >
            Retour
          </Button>
          <Button
            size="md"
            className="[@media(max-height:520px)]:h-11"
            onClick={() => void enroler()}
            disabled={prenom.trim().length === 0 || enrolement.enCours}
          >
            {enrolement.enCours ? 'Un instant…' : 'Valider'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-3 [@media(max-height:520px)]:gap-1.5">
      {recherche.raison && consentCamera && (
        <p role="status" className="flex items-center gap-3 text-xs text-ink-faint">
          <span>{recherche.raison.charAt(0).toUpperCase() + recherche.raison.slice(1)}.</span>
          <button
            type="button"
            className="min-h-11 rounded-full px-3 text-xs font-medium text-ink underline underline-offset-4"
            onClick={recherche.reessayer}
          >
            Réessayer
          </button>
        </p>
      )}
      <CrewPicker
        crew={equipe}
        loading={chargementEquipe}
        onSelect={(membre) => onIdentifiedRef.current(membre)}
        onNew={() => setEtape('clavier')}
      />
    </div>
  );
}
