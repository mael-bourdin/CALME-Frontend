import { motion } from 'motion/react';
import { WifiOff } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import type { ConnectionState } from '@/api';
import { cn } from '@/lib/cn';

interface CabinChromeProps {
  /** Le sol et l'heure de bord, posés sans fond : ils sont du plan arrière. */
  sol?: number;
  time?: string;
  connection?: ConnectionState;
  /**
   * En haut quand une sphère occupe le centre haut de l'écran, en bas sinon.
   * Les maquettes alternent selon ce que la composition laisse libre.
   */
  position?: 'top' | 'bottom';
  /** L'écran de séance met son minuteur à cette place. */
  hideToggle?: boolean;
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
  position = 'top',
  hideToggle,
  className,
}: CabinChromeProps) {
  const disconnected = connection === 'offline' || connection === 'reconnecting';

  return (
    <>
      <div
        className={cn(
          'pointer-events-none fixed left-0 z-20 px-6 font-mono text-sm leading-tight sm:px-12',
          position === 'top' ? 'top-0 py-6 sm:py-12' : 'bottom-0 py-6 sm:py-12',
          className,
        )}
      >
        <p className="text-ink-soft">Sol {sol.toLocaleString('fr-FR')}</p>
        <p className="text-ink-faint">{time}</p>
      </div>

      <div className="pointer-events-none fixed right-0 top-0 z-20 flex items-center gap-3 px-6 py-6 sm:px-12 sm:py-12">
        {disconnected && (
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass glass-edge pointer-events-auto inline-flex items-center gap-2 rounded-pill px-3.5 py-2 text-xs text-watch"
          >
            <WifiOff className="size-3.5" strokeWidth={1.7} aria-hidden />
            Hors ligne — la séance continue
          </motion.span>
        )}
        {/* Les maquettes laissent ce coin vide. La bascule y tient sans fond ni
            contour pour ne pas casser le calme : elle n'existe que si on la
            cherche, ce qui est le bon rang pour un réglage d'affichage. */}
        {!hideToggle && (
          <div className="pointer-events-auto">
            <ThemeToggle bare />
          </div>
        )}
      </div>
    </>
  );
}

/**
 * Le filet de progression, collé au bas de l'écran.
 *
 * Deux écrans des maquettes le portent : la mesure et la séance. Il fait trois
 * pixels et ne porte aucun chiffre — on n'a pas besoin de savoir combien il
 * reste, seulement que ça avance.
 */
export function CabinProgress({ ratio }: { ratio: number }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 h-[3px] bg-hairline/45">
      <motion.div
        className="h-full bg-accent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: Math.max(0, Math.min(1, ratio)) }}
        transition={{ duration: 0.5, ease: 'linear' }}
        style={{ transformOrigin: 'left' }}
      />
    </div>
  );
}
