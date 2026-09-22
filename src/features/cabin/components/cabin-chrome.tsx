import { motion } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/cn';
import type { ConnectionState } from '@/api';

interface CabinChromeProps {
  /** Le sol et l'heure de bord, posés sans fond : ils sont du plan arrière. */
  sol?: number;
  time?: string;
  connection?: ConnectionState;
  className?: string;
}

/**
 * Les repères de bord.
 *
 * Empilés plutôt qu'en ligne séparée par un point médian : sur un instrument,
 * la date et l'heure se lisent l'une sous l'autre.
 */
export function CabinChrome({
  sol = 4212,
  time = '21:47',
  connection,
  className,
}: CabinChromeProps) {
  const disconnected = connection === 'offline' || connection === 'reconnecting';

  return (
    <div className={cn('pointer-events-none absolute inset-x-0 top-0 z-20', className)}>
      <div className="flex items-start justify-between px-6 py-6 sm:px-10 sm:py-8">
        <div className="font-mono text-sm leading-tight text-ink-soft">
          <p>Sol {sol.toLocaleString('fr-FR')}</p>
          <p className="text-ink-faint">{time}</p>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          {disconnected && (
            <motion.span
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass glass-edge inline-flex items-center gap-2 rounded-pill px-3.5 py-2 text-xs text-watch"
            >
              <WifiOff className="size-3.5" strokeWidth={1.7} aria-hidden />
              Hors ligne — la séance continue
            </motion.span>
          )}
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

/** Le bandeau bas : consommation, rappel de confidentialité. */
export function CabinFooter({
  left,
  right,
  className,
}: {
  left?: string;
  right?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-0 z-20',
        'flex items-end justify-between gap-4 px-6 py-6 text-sm sm:px-10',
        className,
      )}
    >
      <p className="text-ink-faint">{left}</p>
      {right && <p className="font-mono text-xs text-ink-faint">{right}</p>}
    </div>
  );
}
