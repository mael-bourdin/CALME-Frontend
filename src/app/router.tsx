import { createBrowserRouter } from 'react-router-dom';
import { SessionProvider } from '@/features/cabin/session-context';
import { CabinRoute } from '@/features/cabin/cabin-route';

/**
 * Deux surfaces, deux publics.
 *
 * La cabine n'a pas de navigation : on ne revient pas en arrière au milieu
 * d'une mesure. Le tableau de bord du médecin en a une, parce qu'il compare.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <SessionProvider>
        <CabinRoute />
      </SessionProvider>
    ),
  },
]);
