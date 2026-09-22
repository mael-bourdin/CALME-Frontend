import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { STATES, type StateEntry } from './catalogue';

const GROUPS: StateEntry['group'][] = ['Cabine', 'Cas limites'];

/**
 * Le catalogue des écrans.
 *
 * Il sert la soutenance : chaque état est atteignable directement, sans avoir à
 * dérouler une séance entière ni à débrancher quoi que ce soit. Les écrans ne
 * sont pas dupliqués — ce sont les mêmes composants, avec un état figé.
 */
export function StatesGallery() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
        <ThemeToggle />
      </div>

      <header className="mb-10">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Écrans</h1>
        <p className="mt-2 max-w-xl text-balance text-ink-soft">
          Tous les écrans et toutes leurs alternatives, atteignables un par un. Les données sont
          simulées.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link to="/" className="text-accent underline-offset-4 hover:underline">
            Parcours complet de la cabine
          </Link>
          <Link to="/medecin" className="text-accent underline-offset-4 hover:underline">
            Tableau de bord du médecin
          </Link>
        </div>
      </header>

      <div className="space-y-10">
        {GROUPS.map((group) => (
          <section key={group} className="space-y-3">
            <h2 className="text-sm text-ink-faint">{group}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {STATES.filter((entry) => entry.group === group).map((entry, index) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link to={`/ecrans/${entry.id}`} className="block h-full">
                    <GlassPanel
                      density="thick"
                      className="flex h-full flex-col gap-2 rounded-card p-5 transition-colors hover:bg-overlay/60"
                    >
                      <span className="flex items-center gap-2 font-medium">
                        {entry.title}
                        <ArrowUpRight
                          className="size-4 text-ink-faint"
                          strokeWidth={1.7}
                          aria-hidden
                        />
                      </span>
                      <span className="text-balance text-sm text-ink-faint">{entry.note}</span>
                    </GlassPanel>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
