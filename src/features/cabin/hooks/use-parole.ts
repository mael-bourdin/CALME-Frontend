import { useEffect } from 'react';

import { direTexte } from '../audio/lecteur';

/**
 * Fait dire une phrase à la cabine dès qu'elle change : la consigne de
 * l'écran de résultat, par exemple. La cascade serveur → navigateur →
 * silence et le déverrouillage du son vivent dans `../audio/lecteur.ts` ;
 * ce hook ne fait que déclencher et couper.
 *
 * Le dialogue de la mesure n'utilise pas ce hook : il a besoin de savoir
 * quand la phrase se termine (voir `use-dialogue.ts`).
 */

/** Ce qui a déjà été dit, par séance : une clé de séance plutôt qu'une ref de
 * composant, parce que React StrictMode remonte un même écran deux fois en
 * développement, et qu'une phrase déjà dite ne doit pas être redite. */
const dernierePhraseParSeance = new Map<string, string>();

export function useParole(texte: string | null, cle: string | null | undefined): void {
  useEffect(() => {
    if (!texte) return;
    const cleSeance = cle ?? '';
    if (dernierePhraseParSeance.get(cleSeance) === texte) return;

    const controleur = new AbortController();
    void direTexte(texte, controleur.signal).then(() => {
      // Marquée « dite » seulement si elle n'a pas été coupée : un montage
      // interrompu (StrictMode, retour arrière) doit pouvoir la redire.
      if (!controleur.signal.aborted) dernierePhraseParSeance.set(cleSeance, texte);
    });
    return () => controleur.abort();
  }, [texte, cle]);
}
