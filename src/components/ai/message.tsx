import { motion } from 'motion/react';
import { Info, Sparkles, WifiOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { Level, RecommendationSource } from '@/api';

interface AIMessageProps {
  message: string;
  level: Level;
  source: RecommendationSource;
  /** Les signaux absents du calcul. Le système le dit plutôt que le cacher. */
  missing?: string[];
  className?: string;
}

const ACCENT: Record<Level, string> = {
  green: 'text-accent',
  amber: 'text-watch',
  red: 'text-alert',
  unreliable: 'text-unknown',
};

/**
 * Ce que l'IA dit.
 *
 * Quand le modèle local est coupé, on l'écrit : la consigne devient générique,
 * et mieux vaut l'annoncer que faire semblant. C'est la même logique pour la
 * confiance réduite — un signal manquant se dit, il ne se cache pas.
 */
export function AIMessage({ message, level, source, missing = [], className }: AIMessageProps) {
  const offline = source === 'rules';
  const Icon = offline ? WifiOff : Sparkles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn('glass glass-edge flex gap-4 rounded-card p-5 sm:p-6', className)}
    >
      <span
        className={cn(
          'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-overlay',
          offline ? 'text-unknown' : ACCENT[level],
        )}
        aria-hidden
      >
        <Icon className="size-4" strokeWidth={1.7} />
      </span>

      <div className="min-w-0 space-y-1.5">
        <p className={cn('text-xs font-medium', offline ? 'text-unknown' : ACCENT[level])}>
          {offline ? 'C.A.L.M.E. — consigne générique' : 'C.A.L.M.E.'}
        </p>
        <p className="text-pretty text-base leading-relaxed">{message}</p>

        {missing.length > 0 && (
          <p className="flex items-start gap-1.5 pt-1 text-sm text-ink-faint">
            <Info className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.7} aria-hidden />
            Confiance réduite — {missing.join(', ')}.
          </p>
        )}
      </div>
    </motion.div>
  );
}
