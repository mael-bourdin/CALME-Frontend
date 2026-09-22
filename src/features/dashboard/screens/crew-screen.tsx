import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowDown, ArrowRight, ArrowUp, Minus } from 'lucide-react';
import { api } from '@/api';
import type { CrewSummary, Level } from '@/api';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Track } from '@/components/data/track';
import { levelClasses } from '@/components/ui/tag';
import { useAsync } from '@/lib/use-async';
import { cn } from '@/lib/cn';
import { AlertBanner } from '../components/alert-banner';

function TrendIcon({ delta }: { delta: number }) {
  if (delta > 2) return <ArrowUp className="size-3.5" strokeWidth={2} aria-hidden />;
  if (delta < -2) return <ArrowDown className="size-3.5" strokeWidth={2} aria-hidden />;
  return <Minus className="size-3.5" strokeWidth={2} aria-hidden />;
}

function Row({ entry, index }: { entry: CrewSummary; index: number }) {
  const tone = levelClasses(entry.level as Level);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        to={`/medecin/membre/${entry.member.id}`}
        className={cn(
          'group grid items-center gap-x-5 gap-y-2 rounded-card px-3 py-3.5 transition-colors',
          'hover:bg-overlay/60',
          'grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,15rem)_1fr_auto_auto_auto]',
        )}
      >
        <div className="min-w-0">
          <p className="truncate">{entry.member.displayName}</p>
          <p className="truncate text-sm text-ink-faint">{entry.member.role}</p>
        </div>

        <div className="order-3 col-span-2 sm:order-none sm:col-span-1">
          <Track
            value={entry.meanIndex}
            level={entry.level}
            label={`${entry.member.displayName}, indice ${entry.meanIndex} sur 100`}
          />
        </div>

        <p className={cn('font-mono text-xl tabular sm:w-14 sm:text-right', tone.text)}>
          {entry.meanIndex}
        </p>

        <p className={cn('hidden items-center gap-1.5 font-mono text-xs sm:flex sm:w-20', tone.text)}>
          <TrendIcon delta={entry.delta} />
          {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
        </p>

        <p className="hidden font-mono text-xs text-ink-faint sm:block sm:text-right">
          {entry.lastSessionAt}
        </p>
      </Link>
    </motion.div>
  );
}

/**
 * L'équipage, classé par indice.
 *
 * Huit cartes identiques ne se comparent pas ; huit lignes classées, si. Les
 * seuils 40 et 70 sont des crans sur chaque réglette, donc on lit le rang et la
 * distance au seuil sans avoir à lire les chiffres.
 */
export function CrewScreen() {
  const crew = useAsync(() => api.getCrewOverview(), []);
  const alerts = useAsync(() => api.getAlerts(), []);
  const open = alerts.data?.find((alert) => !alert.acknowledgedAt) ?? null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Équipage</h1>
          <p className="mt-1 text-ink-soft">Huit personnes à bord, indices moyens sur sept jours.</p>
        </div>
      </header>

      {open && (
        <AlertBanner
          alert={open}
          onAcknowledge={async () => {
            await api.acknowledgeAlert(open.id, 'Dr. Benali');
            alerts.reload();
          }}
        />
      )}

      <GlassPanel density="thick" className="px-4 py-3 sm:px-6">
        {crew.loading && <p className="py-8 text-center text-ink-faint">Lecture des indices…</p>}
        {crew.error && <p className="py-8 text-center text-alert">{crew.error}</p>}

        <div className="divide-y divide-hairline/50">
          {crew.data?.map((entry, index) => (
            <Row key={entry.member.id} entry={entry} index={index} />
          ))}
        </div>
      </GlassPanel>

      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-ink-faint transition-colors hover:text-ink-soft"
      >
        Aller à la cabine
        <ArrowRight className="size-3.5" strokeWidth={1.7} aria-hidden />
      </Link>
    </div>
  );
}
