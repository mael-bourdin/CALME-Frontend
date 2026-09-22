import { createBrowserRouter, Navigate } from 'react-router-dom';
import { SessionProvider } from '@/features/cabin/session-context';
import { CabinRoute } from '@/features/cabin/cabin-route';
import { DashboardLayout } from '@/features/dashboard/dashboard-layout';
import { CrewScreen } from '@/features/dashboard/screens/crew-screen';
import { AlertsScreen } from '@/features/dashboard/screens/alerts-screen';
import { TrendsScreen } from '@/features/dashboard/screens/trends-screen';
import { PowerScreen } from '@/features/dashboard/screens/power-screen';
import { MemberScreen } from '@/features/dashboard/screens/member-screen';
import { StatesGallery } from '@/features/states/states-gallery';
import { StateView } from '@/features/states/state-view';

/**
 * Deux surfaces, deux publics.
 *
 * La cabine n'a pas de navigation : on ne revient pas en arrière au milieu
 * d'une mesure, et l'occupante n'a aucune envie de manipuler un logiciel.
 * Le poste du médecin en a une, parce qu'il compare.
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
  {
    path: '/medecin',
    element: <DashboardLayout />,
    children: [
      { index: true, element: <CrewScreen /> },
      { path: 'alertes', element: <AlertsScreen /> },
      { path: 'tendances', element: <TrendsScreen /> },
      { path: 'energie', element: <PowerScreen /> },
      { path: 'membre/:crewId', element: <MemberScreen /> },
    ],
  },
  // Le catalogue : chaque écran et chaque alternative, atteignables un par un
  // pour la soutenance, sans avoir à dérouler une séance entière.
  { path: '/ecrans', element: <StatesGallery /> },
  { path: '/ecrans/:stateId', element: <StateView /> },
  { path: '*', element: <Navigate to="/" replace /> },
]);
