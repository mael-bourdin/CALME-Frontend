import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import type { ApiErrorBody } from './types';

/**
 * Une erreur qui vient du serveur de bord, ou de l'impossibilité de l'atteindre.
 * On distingue les deux : une cabine hors ligne et une cabine qui refuse une
 * mesure ne se présentent pas de la même façon à l'écran.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly offline: boolean;

  constructor(message: string, options: { status: number; code?: string; offline?: boolean }) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.offline = options.offline ?? false;
  }

  /** Vrai quand le serveur est injoignable, pas quand il répond une erreur. */
  static unreachable(cause: unknown): ApiError {
    const detail = cause instanceof Error ? cause.message : 'connexion impossible';
    return new ApiError(`Serveur de bord injoignable — ${detail}`, { status: 0, offline: true });
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  /** Certaines routes sont plus lentes, la recommandation notamment. */
  timeoutMs?: number;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal, timeoutMs = REQUEST_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });

  // Un FormData porte sa propre frontière multipart, que fetch calcule et pose
  // lui-même dans l'en-tête content-type. Le sérialiser en JSON le viderait
  // (aucune propriété énumérable : JSON.stringify(new FormData()) vaut "{}")
  // et lui imposer notre en-tête cassait l'envoi du fichier — donc il passe
  // tel quel, sans JSON.stringify ni en-tête forcé.
  const estFormData = body instanceof FormData;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers: body && !estFormData ? { 'content-type': 'application/json' } : undefined,
      body: body === undefined ? undefined : estFormData ? body : JSON.stringify(body),
    });
  } catch (cause) {
    throw ApiError.unreachable(cause);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let detail = response.statusText;
    let code: string | undefined;
    try {
      const parsed = (await response.json()) as ApiErrorBody;
      detail = parsed.detail || detail;
      code = parsed.code;
    } catch {
      // Le serveur n'a pas renvoyé de JSON : on garde le statut HTTP.
    }
    throw new ApiError(detail, { status: response.status, code });
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
