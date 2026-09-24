import { Link, Outlet, useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
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
    // Le dossier d'un membre s'ouvre depuis la liste de l'équipage ; la page
    // Énergie reposait sur le capteur de courant (abandonné) : retirée.
    { to: '/medecin/tendances', label: 'Tendances', icon: 'trends' },
    { to: '/medecin/capteurs', label: 'Capteurs', icon: 'cabin' },
  ];

  return (
    <div className="relative flex min-h-dvh flex-col pb-32 pt-32">
      <div className="absolute right-5 top-5 z-30 flex items-center gap-2 sm:right-8 sm:top-8">
        {/* Fermer le poste, c'est revenir à la cabine : le médecin de bord est
            un membre d'équipage comme les autres, il y repasse. */}
        <Link
          to="/"
          aria-label="Fermer le poste du médecin"
          title="Fermer le poste du médecin"
          className="glass glass-edge grid size-10 place-items-center rounded-full text-ink-soft transition-colors duration-300 ease-calm hover:text-ink"
        >
          <X className="size-4.5" strokeWidth={1.7} aria-hidden />
        </Link>
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
    </div>
  );
}
