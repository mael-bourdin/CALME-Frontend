import { useId } from 'react';
import { smoothPath, toPoints } from '@/lib/curve';
import { cn } from '@/lib/cn';

interface SparklineProps {
  values: readonly number[];
  color?: string;
  area?: boolean;
  className?: string;
  width?: number;
  height?: number;
}

/** Sept jours en petit. Une tendance, pas une lecture précise. */
export function Sparkline({
  values,
  color = 'var(--c-accent)',
  area = true,
  className,
  width = 120,
  height = 40,
}: SparklineProps) {
  const gradientId = useId();
  const points = toPoints(values, width, height, { pad: 4 });
  const line = smoothPath(points);
  const last = points.at(-1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      width={width}
      height={height}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {area && line && (
        <path d={`${line} L ${width} ${height} L 0 ${height} Z`} fill={`url(#${gradientId})`} />
      )}
      {line && (
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {last && <circle cx={last[0]} cy={last[1]} r={2.6} fill={color} />}
    </svg>
  );
}
