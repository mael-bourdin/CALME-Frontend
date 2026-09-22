/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Racine de l'API du serveur de bord, par exemple https://calme.local/api/v1 */
  readonly VITE_API_BASE_URL?: string;
  /** Racine du WebSocket. Déduite de l'API si absente. */
  readonly VITE_WS_BASE_URL?: string;
  /** 'false' pour parler au vrai serveur ; toute autre valeur garde le mock. */
  readonly VITE_USE_MOCK?: string;
  /** Accélère la minute de mesure simulée. Sans effet sur le vrai serveur. */
  readonly VITE_MOCK_SPEED?: string;
  /** Identifiant de la cabine courante. */
  readonly VITE_CABIN_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
