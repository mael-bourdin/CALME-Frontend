import { useEffect, useState } from 'react';

/**
 * Détecte l'écran court (dalle 800×480 du Pi), pour les tailles qui ne
 * peuvent pas se corriger par une simple classe Tailwind.
 *
 * Le reste de l'adaptation cabine se fait en CSS pur, par des variantes
 * `[@media(max-height:520px)]:` posées à côté des valeurs fixes. Mais la
 * sphère de présence et l'anneau de respiration reçoivent leur taille en
 * pixels par une prop JavaScript (`size`) qui pilote aussi le calcul du
 * dessin — rayon, nombre de particules — pas seulement la boîte CSS. Une
 * classe Tailwind ne peut pas changer un argument passé au composant : il
 * faut donc, pour ces deux-là seulement, une bascule côté React. Ce hook
 * est cette unique dérogation à la méthode « classe additive », et sert le
 * même seuil de 520 px que le reste des correctifs.
 */
export function useCompactCabin(seuilPx = 520): boolean {
  const requete = `(max-height: ${seuilPx}px)`;
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(requete).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(requete);
    const onChange = () => setCompact(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [requete]);

  return compact;
}
