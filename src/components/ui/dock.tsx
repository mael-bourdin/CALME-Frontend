import { NavLink } from 'react-router-dom';
import { motion } from 'motion/react';
import { Activity, BellRing, LineChart, User, Users, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface DockItem {
  to: string;
  label: string;
  icon: 'crew' | 'alerts' | 'trends' | 'power' | 'member' | 'cabin';
  /** Le nombre d'alertes non acquittées. La seule chose qui appelle une action. */
  badge?: number;
}

const ICONS = {
  crew: Users,
  alerts: BellRing,
  trends: LineChart,
  power: Zap,
  member: User,
  cabin: Activity,
} as const;

/**
 * La navigation du médecin de bord.
 *
 * Une pastille de verre qui flotte en bas de l'écran plutôt qu'une colonne
 * latérale : l'écran entier reste au contenu, et le même composant fonctionne
 * du poste de travail au téléphone sans changer de forme.
 */
export function Dock({ items, className }: { items: DockItem[]; className?: string }) {
  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-40',
        'flex justify-center px-4',
        className,
      )}
      aria-label="Navigation principale"
    >
      <div className="glass-thick glass-edge flex items-center gap-1.5 rounded-pill p-2.5">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <NavLink
              // `end` sinon /medecin correspond aussi à /medecin/capteurs et
              // deux onglets s'allument en même temps.
              end
              key={item.to}
              to={item.to}
              className="group relative grid size-13 place-items-center rounded-full transition-colors duration-300 ease-calm sm:size-14"
              title={item.label}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="dock-active"
                      className="absolute inset-0 rounded-full border border-accent-line/70 bg-accent-surface"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      'relative z-10 size-5 transition-colors duration-300',
                      isActive ? 'text-accent' : 'text-ink-faint group-hover:text-ink-soft',
                    )}
                    strokeWidth={1.7}
                    aria-hidden
                  />
                  {item.badge ? (
                    <span className="absolute right-2.5 top-2.5 z-10 size-2.5 rounded-full bg-alert ring-2 ring-overlay" />
                  ) : null}
                  <span className="sr-only">
                    {item.label}
                    {item.badge ? ` — ${item.badge} non acquittée` : ''}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
