import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { api } from '@/api';
import type { CrewSummary, Level } from '@/api';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Track } from '@/components/data/track';
import { levelClasses } from '@/components/ui/tag';
import { Avatar } from '@/components/ui/avatar';
import { useAsync } from '@/lib/use-async';
import { cn } from '@/lib/cn';
import { dateLisible } from '@/lib/date-lisible';

function TrendIcon({ delta }: { delta: number }) {
  if (delta > 2) return <ArrowUp className="size-3.5" strokeWidth={2} aria-hidden />;
  if (delta < -2) return <ArrowDown className="size-3.5" strokeWidth={2} aria-hidden />;
  return <Minus className="size-3.5" strokeWidth={2} aria-hidden />;
}

function Row({ entry, index }: { entry: CrewSummary; index: number }) {
  const tone = levelClasses(entry.level as Level);

  return (
    // Apparition en CSS et non en JS : une animation d'entrée qui ne démarre
    // pas doit laisser la ligne visible, pas la laisser à opacité zéro. Ici
    // l'état naturel est « visible » et l'animation ne fait que l'amener.
    <div
      className="animate-[fade-in_0.4s_cubic-bezier(0.16,1,0.3,1)_both]"
      style={{ animationDelay: `${index * 35}ms` }}
    >
      <Link
        to={`/medecin/membre/${entry.member.id}`}
        className={cn(
          'group grid items-center gap-x-5 gap-y-2 rounded-card px-3 py-2.5 transition-colors',
          'hover:bg-overlay/60',
          'grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_minmax(0,13rem)_1fr_auto_auto_auto]',
        )}
      >
        <Avatar name={entry.member.displayName} level={entry.level as Level} size={48} />

        <div className="min-w-0">
          <p className="truncate">{entry.member.displayName}</p>
          <p className="truncate text-sm text-ink-faint">{entry.member.role}</p>
        </div>

        <div className="order-3 col-span-3 sm:order-none sm:col-span-1">
          <Track
            value={entry.meanIndex}
            level={entry.level}
            label={`${entry.member.displayName}, indice ${entry.meanIndex} sur 100`}
          />
        </div>

        <p className={cn('font-mono text-xl tabular sm:w-14 sm:text-right', tone.text)}>
          {entry.meanIndex}
        </p>

        <p
          className={cn('hidden items-center gap-1.5 font-mono text-xs sm:flex sm:w-20', tone.text)}
        >
          <TrendIcon delta={entry.delta} />
          {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
        </p>

        <p className="hidden font-mono text-xs text-ink-faint sm:block sm:text-right">
          {dateLisible(entry.lastSessionAt)}
        </p>
      </Link>
    </div>
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

  return (
    <div>
      {/* Ni titre ni bannière : la maquette D1 ne montre que la liste. Une page
          qui n'affiche qu'une chose n'a pas besoin qu'on la nomme, et l'alerte
          en cours a son propre écran, signalé par la pastille du dock. */}
      <GlassPanel density="thick" className="px-4 py-3 sm:px-6">
        {crew.loading && <p className="py-8 text-center text-ink-faint">Lecture des indices…</p>}
        {crew.error && <p className="py-8 text-center text-alert">{crew.error}</p>}

        <div className="divide-y divide-hairline/50">
          {crew.data?.map((entry, index) => (
            <Row key={entry.member.id} entry={entry} index={index} />
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
