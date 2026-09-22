import { motion } from 'motion/react';
import type { SensorFrame, SignalKey } from '@/api';
import { cn } from '@/lib/cn';

interface Reading {
  key: SignalKey;
  label: string;
  value: string | null;
  unit?: string;
}

function format(value: number | null, digits: number): string | null {
  if (value === null) return null;
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/**
 * Les quatre relevés, en bande sous la question.
 *
 * C'est le seul endroit de la cabine où les quatre capteurs sont montrés
 * ensemble, et c'est pendant la mesure : on voit que ça capte. La pastille dit
 * si le signal est exploitable, pas si la personne va bien — un capteur hors
 * bornes n'est pas une urgence médicale, c'est un capteur à vérifier.
 */
export function SensorStrip({ frame, className }: { frame: SensorFrame | null; className?: string }) {
  const readings: Reading[] = [
    { key: 'hr', label: 'Cardiaque', value: format(frame?.heartRate ?? null, 0), unit: 'bpm' },
    { key: 'eda', label: 'Sudation', value: format(frame?.skinConductance ?? null, 1), unit: 'µS' },
    { key: 'face', label: 'Visage', value: format(frame?.faceTension ?? null, 2) },
    { key: 'voice', label: 'Voix', value: format(frame?.voiceIndex ?? null, 2) },
  ];

  return (
    <div
      className={cn(
        'glass glass-edge grid w-full grid-cols-2 rounded-card sm:grid-cols-4',
        className,
      )}
    >
      {readings.map((reading, index) => {
        const suspect = frame?.suspect.includes(reading.key) ?? false;
        const missing = reading.value === null;

        return (
          <div
            key={reading.key}
            className={cn(
              'px-6 py-5 text-center',
              // Des filets entre les colonnes, pas autour : la bande est une
              // seule pièce de verre, pas quatre cartes accolées.
              index > 0 && 'sm:border-l sm:border-hairline/50',
              index === 2 && 'border-t border-hairline/50 sm:border-t-0',
              index === 3 && 'border-l border-t border-hairline/50 sm:border-t-0',
              index === 1 && 'border-l border-hairline/50',
            )}
          >
            <p className="text-sm text-ink-soft">{reading.label}</p>
            <p className="mt-1 flex items-baseline justify-center gap-1.5 font-mono text-2xl tabular text-ink">
              {missing ? <span className="text-ink-faint">—</span> : reading.value}
              {reading.unit && !missing && (
                <span className="text-xs text-ink-faint">{reading.unit}</span>
              )}
              <motion.span
                aria-hidden
                className={cn(
                  'size-1.5 self-center rounded-full',
                  missing ? 'bg-ink-faint/50' : suspect ? 'bg-watch' : 'bg-calm',
                )}
                animate={missing ? undefined : { opacity: [1, 0.35, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            </p>
            <span className="sr-only">
              {missing
                ? 'signal absent'
                : suspect
                  ? 'signal hors bornes, non exploitable'
                  : 'signal exploitable'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
