import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import type { Level } from '@/api';

const DOT: Record<Level, string> = {
  green: 'bg-calm',
  amber: 'bg-watch',
  red: 'bg-alert',
  unreliable: 'bg-unknown',
};

interface TrackProps {
  value: number;
  level: Level;
  className?: string;
  /** Les seuils du moteur de règles, en crans sur la réglette. */
  thresholds?: number[];
  label?: string;
}

/**
 * La position d'un indice sur 0–100, avec les seuils en crans.
 *
 * Huit cartes identiques ne se comparent pas ; huit réglettes alignées, si.
 * On lit le rang et la distance au seuil sans avoir à lire les chiffres.
 */
export function Track({ value, level, className, thresholds = [40, 70], label }: TrackProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={cn('relative h-5 w-full', className)}
      role="meter"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-hairline" />

      {thresholds.map((threshold) => (
        <div
          key={threshold}
          className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-ink-faint/70"
          style={{ left: `${threshold}%` }}
          aria-hidden
        />
      ))}

      <motion.div
        className={cn('absolute top-1/2 size-2.5 rounded-full', DOT[level])}
        style={{ left: `${clamped}%` }}
        initial={{ x: '-50%', y: '-50%', scale: 0 }}
        animate={{ x: '-50%', y: '-50%', scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      />
    </div>
  );
}
