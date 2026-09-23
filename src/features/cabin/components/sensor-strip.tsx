import { Fragment } from 'react';
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
 * Cotes relevées sur la maquette C2 : 1040 × 91,5, rayon 24, verre à 52 %, et
 * des filets d'un pixel sur 34 de haut entre les colonnes — pas de bordure
 * autour. La bande est une seule pièce de verre, pas quatre cartes accolées.
 *
 * La pastille dit si le signal est exploitable, pas si la personne va bien : un
 * capteur hors bornes n'est pas une urgence médicale, c'est un capteur à
 * vérifier.
 */
export function SensorStrip({
  frame,
  className,
}: {
  frame: SensorFrame | null;
  className?: string;
}) {
  const readings: Reading[] = [
    { key: 'hr', label: 'Cardiaque', value: format(frame?.heartRate ?? null, 0), unit: 'bpm' },
    { key: 'eda', label: 'Sudation', value: format(frame?.skinConductance ?? null, 1), unit: 'µS' },
    { key: 'face', label: 'Visage', value: format(frame?.faceTension ?? null, 2) },
    { key: 'voice', label: 'Voix', value: format(frame?.voiceIndex ?? null, 2) },
  ];

  return (
    <div
      className={cn(
        'glass glass-edge flex w-full flex-wrap items-center justify-center gap-y-5 rounded-[24px] px-[33px] py-5',
        'sm:h-[91.5px] sm:flex-nowrap sm:py-0',
        // Sous 520 px de haut, la bande reste posée en bas de l'écran mesure
        // mais perd du gras : son contenu (une ligne de 53 px) tient large
        // dans 72.
        '[@media(max-height:520px)]:h-[72px]',
        className,
      )}
    >
      {readings.map((reading, index) => {
        const suspect = frame?.suspect.includes(reading.key) ?? false;
        const missing = reading.value === null;

        return (
          <Fragment key={reading.key}>
            {/* Les intervalles sont huit ressorts de largeur égale, comme dans
                la maquette : les colonnes ne sont pas de même largeur, elles
                se serrent autour de leur contenu. */}
            <span className="hidden flex-1 sm:block" aria-hidden />

            <div className="px-6 sm:px-0">
              <p className="text-sm leading-5 text-ink-soft">{reading.label}</p>
              <p className="mt-[3px] flex items-baseline gap-[6px] font-mono text-2xl leading-[30px] tabular text-ink">
                {missing ? <span className="text-ink-faint">—</span> : reading.value}
                {reading.unit && !missing && (
                  <span className="text-xs leading-4 text-ink-faint">{reading.unit}</span>
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

            <span className="hidden flex-1 sm:block" aria-hidden />
            {index < readings.length - 1 && (
              <span className="hidden h-[34px] w-px shrink-0 bg-hairline sm:block" aria-hidden />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
