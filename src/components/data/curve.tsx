import { useId } from 'react';
import { motion } from 'motion/react';
import { smoothPath, toPoints } from '@/lib/curve';
import { cn } from '@/lib/cn';

interface CurveProps {
  values: readonly number[];
  /** Bornes de l'axe vertical. Fixer 0–100 quand on trace un indice de charge. */
  min?: number;
  max?: number;
  /** Les seuils du moteur de règles. Ils doivent se voir sur la courbe. */
  thresholds?: { value: number; color: string; label?: string }[];
  /** La moyenne habituelle de la personne, pour situer le point du jour. */
  baseline?: number;
  color?: string;
  area?: boolean;
  /** Le point final, quand il porte la valeur du jour. */
  endpoint?: boolean;
  className?: string;
  height?: number;
  /** Trace la courbe au montage. Une seule fois, pas à chaque re-rendu. */
  animate?: boolean;
  'aria-label'?: string;
}

/**
 * Une courbe lisse, à fond perdu ou dans une carte.
 *
 * Le viewBox fait 1000 de large et la courbe s'étire : elle s'adapte donc à
 * toutes les largeurs sans recalcul, ce qui compte pour le responsive.
 */
export function Curve({
  values,
  min = 0,
  max = 100,
  thresholds = [],
  baseline,
  color = 'var(--c-accent)',
  area = true,
  endpoint = true,
  className,
  height = 220,
  animate = true,
  'aria-label': ariaLabel,
}: CurveProps) {
  const gradientId = useId();
  const W = 1000;
  const H = height;

  const points = toPoints(values, W, H, { min, max, pad: 6 });
  const line = smoothPath(points);
  const last = points.at(-1);
  const yFor = (value: number) => H - 6 - ((value - min) / (max - min || 1)) * (H - 12);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn('w-full', className)}
      style={{ height }}
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {baseline !== undefined && (
        <line
          x1={0}
          y1={yFor(baseline)}
          x2={W}
          y2={yFor(baseline)}
          stroke="var(--c-ink-faint)"
          strokeOpacity={0.6}
          strokeWidth={1}
          strokeDasharray="3 8"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {thresholds.map((threshold) => (
        <line
          key={threshold.value}
          x1={0}
          y1={yFor(threshold.value)}
          x2={W}
          y2={yFor(threshold.value)}
          stroke={threshold.color}
          strokeOpacity={0.5}
          strokeWidth={1}
          strokeDasharray="4 7"
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {area && line && (
        <path d={`${line} L ${W} ${H} L 0 ${H} Z`} fill={`url(#${gradientId})`} stroke="none" />
      )}

      {line && (
        <motion.path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={animate ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 0.61, 0.36, 1] }}
        />
      )}

      {endpoint && last && (
        <motion.circle
          cx={last[0]}
          cy={last[1]}
          r={5}
          fill={color}
          vectorEffect="non-scaling-stroke"
          initial={animate ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: animate ? 1 : 0, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </svg>
  );
}
