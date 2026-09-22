import { useMemo } from 'react';
import { cn } from '@/lib/cn';

/** Un cycle cardiaque stylisé : ligne de base, complexe QRS, onde T. */
function beatPath(width: number, midline: number, amplitude: number, beats: number): string {
  const seg = width / beats;
  let d = '';

  for (let b = 0; b < beats; b += 1) {
    const x = b * seg;
    const m = midline;
    const a = amplitude;
    d +=
      `M ${x.toFixed(1)} ${m} ` +
      `C ${(x + seg * 0.14).toFixed(1)} ${m}, ${(x + seg * 0.2).toFixed(1)} ${(m - a * 0.16).toFixed(1)}, ${(x + seg * 0.27).toFixed(1)} ${(m - a * 0.16).toFixed(1)} ` +
      `C ${(x + seg * 0.33).toFixed(1)} ${(m - a * 0.16).toFixed(1)}, ${(x + seg * 0.36).toFixed(1)} ${m}, ${(x + seg * 0.4).toFixed(1)} ${m} ` +
      `L ${(x + seg * 0.45).toFixed(1)} ${(m + a * 0.22).toFixed(1)} ` +
      `L ${(x + seg * 0.5).toFixed(1)} ${(m - a).toFixed(1)} ` +
      `L ${(x + seg * 0.56).toFixed(1)} ${(m + a * 0.42).toFixed(1)} ` +
      `C ${(x + seg * 0.6).toFixed(1)} ${m}, ${(x + seg * 0.63).toFixed(1)} ${m}, ${(x + seg * 0.68).toFixed(1)} ${m} ` +
      `C ${(x + seg * 0.78).toFixed(1)} ${m}, ${(x + seg * 0.82).toFixed(1)} ${(m - a * 0.28).toFixed(1)}, ${(x + seg * 0.88).toFixed(1)} ${(m - a * 0.26).toFixed(1)} ` +
      `C ${(x + seg * 0.93).toFixed(1)} ${(m - a * 0.24).toFixed(1)}, ${(x + seg * 0.96).toFixed(1)} ${m}, ${(x + seg).toFixed(1)} ${m} `;
  }
  return d;
}

interface VitalsTraceProps {
  /** Suspend le défilement quand la mesure est en pause ou rejetée. */
  running?: boolean;
  /** Passe au corail quand le capteur est signalé suspect. */
  suspect?: boolean;
  className?: string;
}

/**
 * Le tracé cardiaque, à fond perdu, derrière tout le reste.
 *
 * C'est le plan arrière du système : la mesure brute traverse l'écran de bord à
 * bord et le verre passe par-dessus. Sans elle, les panneaux n'ont rien à
 * réfracter et l'effet de verre ne sert à rien.
 */
export function VitalsTrace({ running = true, suspect = false, className }: VitalsTraceProps) {
  const path = useMemo(() => beatPath(1200, 100, 62, 7), []);

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      aria-hidden
    >
      <div
        className="absolute inset-x-0 top-1/2 flex w-[200%] -translate-y-1/2"
        style={{
          animation: running ? 'drift 22s linear infinite' : undefined,
        }}
      >
        {[0, 1].map((index) => (
          <svg
            key={index}
            viewBox="0 0 1200 200"
            preserveAspectRatio="none"
            className="h-[34vh] w-1/2 shrink-0"
          >
            <path
              d={path}
              fill="none"
              stroke={suspect ? 'var(--c-alert)' : 'var(--c-calm)'}
              strokeOpacity={suspect ? 0.42 : 0.34}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        ))}
      </div>
    </div>
  );
}
