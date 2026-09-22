import { USE_MOCK } from './config';
import { liveTransport } from './live';
import { mockTransport } from './mock/transport';
import type { Transport } from './transport';

/**
 * Le seul point d'entrée des écrans.
 *
 * Tant que `VITE_USE_MOCK` n'est pas à `false`, l'application tourne sur le
 * transport simulé. Brancher le serveur Python ne demande donc de toucher à
 * aucun composant : c'est une variable d'environnement.
 */
export const api: Transport = USE_MOCK ? mockTransport : liveTransport;

export const isMock = USE_MOCK;

export { ApiError } from './http';
export type { ConsentState, Feedback, SessionStream, Transport } from './transport';
export type * from './types';
