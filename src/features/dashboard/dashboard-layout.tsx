import { Link, Outlet, useLocation } from 'react-router-dom';
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
    <div className="relative flex min-h-dvh flex-col pb-32">
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
          // Centré verticalement : sur la maquette D1 le panneau flotte au
          // milieu et le dock se pose dessous, au lieu de lui passer dessus.
          className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-10 sm:px-8"
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>

      <Dock items={items} />

      {/* Pas dans les maquettes, mais la soutenance a besoin d'un aller-retour
          entre les deux surfaces. Assez discret pour ne pas peser. */}
      <Link
        to="/"
        className="pointer-events-auto absolute bottom-6 left-6 text-xs text-ink-faint transition-colors hover:text-ink-soft"
      >
        Aller à la cabine
      </Link>
    </div>
  );
}
