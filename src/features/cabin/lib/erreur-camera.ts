/**
 * Traduit une erreur de `getUserMedia` en une phrase qu'on peut afficher.
 *
 * Le cas qui a motivé ce fichier : un onglet oublié sur l'écran de mesure
 * gardait la caméra pour lui, et chaque nouvelle séance échouait sans rien
 * dire. « Caméra occupée par une autre application » dit exactement quoi
 * faire.
 */
export function messageErreurCamera(e: unknown): string {
  const nom = e instanceof DOMException || e instanceof Error ? e.name : '';
  switch (nom) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'accès à la caméra refusé par le navigateur';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'caméra occupée par une autre application ou un autre onglet';
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'aucune caméra détectée';
    default:
      if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
        return 'caméra inaccessible sur une page non sécurisée (ouvrir en localhost ou https)';
      }
      return e instanceof Error && e.message ? e.message : 'caméra indisponible';
  }
}
