/**
 * Où trouver le serveur de bord.
 *
 * Le front est un paquet de fichiers statiques : il ne sait rien de l'endroit
 * où tourne le FastAPI. Tout passe par l'environnement, pour qu'on puisse le
 * déployer sur le serveur de bord, sur un poste de démonstration ou sur une
 * machine de développement sans recompiler.
 */

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

/**
 * En développement, on laisse l'URL relative : le proxy Vite renvoie vers le
 * Python et on évite CORS. En production, le serveur de bord sert le front
 * lui-même, donc le chemin relatif marche aussi.
 */
export const API_BASE_URL = trimSlash(import.meta.env.VITE_API_BASE_URL || '/api/v1');

/** Déduit l'URL du WebSocket de celle de l'API si elle n'est pas fournie. */
function deriveWebSocketBase(): string {
  const explicit = import.meta.env.VITE_WS_BASE_URL;
  if (explicit) return trimSlash(explicit);

  if (API_BASE_URL.startsWith('http')) {
    return trimSlash(API_BASE_URL.replace(/^http/, 'ws'));
  }
  if (typeof window === 'undefined') return '';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}${API_BASE_URL}`;
}

export const WS_BASE_URL = deriveWebSocketBase();

/**
 * Tant que le serveur n'est pas là, le front tourne sur un transport simulé qui
 * implémente exactement la même surface. Passer à `false` suffit à brancher le
 * vrai serveur — aucun écran n'a à changer.
 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

/** Au-delà, on considère que le serveur ne répondra pas. */
export const REQUEST_TIMEOUT_MS = 8_000;

/** Le firmware garde dix minutes en tampon ; le client se contente de moins. */
export const STREAM_RECONNECT_DELAYS_MS = [500, 1_000, 2_000, 4_000, 8_000, 15_000];

/** Identifiant de la cabine, pour les déploiements à plusieurs cabines. */
export const CABIN_ID = import.meta.env.VITE_CABIN_ID || 'cabine-01';
