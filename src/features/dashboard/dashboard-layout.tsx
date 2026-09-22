import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Dock, type DockItem } from '@/components/ui/dock';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAsync } from '@/lib/use-async';
import { api } from '@/api';

/**
 * Le poste du médecin de bord.
 *
 * Le contenu est centré et le dock flotte en bas : pas de colonne latérale,
 * l'écran entier reste à l'information. Le garde-fou est écrit en permanence
 * sous le contenu — un garde-fou qui n'est pas visible finit par sauter.
 */
export function DashboardLayout() {
  const location = useLocation();
  const { data: alerts } = useAsync(() => api.getAlerts(), []);
  const pending = alerts?.filter((alert) => !alert.acknowledgedAt).length ?? 0;

  const items: DockItem[] = [
    { to: '/medecin', label: 'Équipage', icon: 'crew' },
    { to: '/medecin/alertes', label: 'Alertes', icon: 'alerts', badge: pending },
    { to: '/medecin/tendances', label: 'Tendances', icon: 'trends' },
    { to: '/medecin/energie', label: 'Énergie', icon: 'power' },
    { to: '/medecin/membre/ana', label: 'Membre', icon: 'member' },
  ];

  return (
    <div className="relative min-h-dvh pb-32">
      <div className="absolute right-5 top-5 z-30 sm:right-8 sm:top-8">
        <ThemeToggle />
      </div>

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto w-full max-w-5xl px-5 pt-8 sm:px-8 sm:pt-14"
        >
          <Outlet />

          <p className="mx-auto mt-10 max-w-xl text-balance text-center text-sm text-ink-faint">
            Le tableau de bord ne montre que des tendances. Le détail d’une séance reste à
            l’astronaute.
          </p>
        </motion.main>
      </AnimatePresence>

      <Dock items={items} />
    </div>
  );
}
