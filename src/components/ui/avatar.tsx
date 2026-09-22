import type { Level } from '@/api';
import { cn } from '@/lib/cn';

const RING: Record<Level, string> = {
  green: 'border-calm/55 text-calm',
  amber: 'border-watch/55 text-watch',
  red: 'border-alert/55 text-alert',
  unreliable: 'border-hairline text-ink-faint',
};

/** Les initiales, jamais plus de deux. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * La pastille d'un membre d'équipage.
 *
 * Pas de photo : le vaisseau n'en stocke pas, et une initiale suffit à
 * retrouver une ligne dans une liste de huit. L'anneau reprend le palier, ce
 * qui donne au médecin un deuxième repère de couleur en bout de ligne comme en
 * début — il balaie la colonne de gauche sans lire les chiffres.
 */
export function Avatar({
  name,
  level,
  size = 56,
  className,
}: {
  name: string;
  level: Level;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full border bg-overlay/45 font-medium',
        RING[level],
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.25 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
