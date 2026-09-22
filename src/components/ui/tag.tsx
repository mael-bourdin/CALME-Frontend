import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { Level } from '@/api';

/**
 * Les quatre états du système, et rien d'autre.
 * Aucune autre couleur n'a le droit de signifier un état.
 */
export const LEVEL_LABEL: Record<Level, string> = {
  green: 'Calme',
  amber: 'Vigilance',
  red: 'Alerte',
  unreliable: 'Non fiable',
};

export const LEVEL_RANGE: Record<Level, string> = {
  green: '0 à 39',
  amber: '40 à 69',
  red: '70 à 100',
  unreliable: 'mesure rejetée',
};

const LEVEL_CLASS: Record<Level, { text: string; border: string; dot: string }> = {
  green: { text: 'text-calm', border: 'border-calm/55', dot: 'bg-calm' },
  amber: { text: 'text-watch', border: 'border-watch/55', dot: 'bg-watch' },
  red: { text: 'text-alert', border: 'border-alert/60', dot: 'bg-alert' },
  unreliable: { text: 'text-unknown', border: 'border-unknown/50', dot: 'bg-unknown' },
};

export function levelClasses(level: Level) {
  return LEVEL_CLASS[level];
}

interface TagProps {
  level: Level;
  children?: ReactNode;
  /** Le point coloré. À couper quand la couleur du texte suffit. */
  dot?: boolean;
  className?: string;
}

export function Tag({ level, children, dot = true, className }: TagProps) {
  const style = LEVEL_CLASS[level];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border bg-overlay px-3.5 py-1.5',
        'text-xs font-medium',
        style.text,
        style.border,
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', style.dot)} aria-hidden />}
      {children ?? LEVEL_LABEL[level]}
    </span>
  );
}
