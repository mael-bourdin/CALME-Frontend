import type { CSSProperties, ReactNode } from 'react';
import { arcPath } from '@/lib/curve';
import { cn } from '@/lib/cn';

interface DialProps {
  value: number;
  max: number;
  color?: string;
  size?: number;
  className?: string;
  children?: ReactNode;
  'aria-label'?: string;
}

/**
 * Un cadran. Sert à la consommation : on voit d'un coup que le mode dégradé
 * tient dans un tiers du budget, ce qu'une barre horizontale montre moins bien.
 */
export function Dial({
  value,
  max,
  color = 'var(--c-accent)',
  size = 168,
  className,
  children,
  'aria-label': ariaLabel,
}: DialProps) {
  const r = size / 2 - 9;
  const START = -135;
  const SWEEP = 270;
  const ratio = Math.max(0, Math.min(1, value / max));
  const circumference = (SWEEP / 360) * 2 * Math.PI * r;

  return (
    <div
      className={cn('relative grid place-items-center', className)}
      style={{ width: size, height: size }}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={ariaLabel}
    >
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="absolute inset-0">
        <path
          d={arcPath(size / 2, size / 2, r, START, START + SWEEP)}
          fill="none"
          stroke="var(--c-hairline)"
          strokeWidth={7}
          strokeLinecap="round"
        />
        {/* L'arc s'anime en CSS, en partant de `--dial-from` : c'est la valeur
            du cadran, elle ne doit pas pouvoir rester à zéro parce qu'une
            animation n'a pas démarré. Sans animation, l'arc est déjà juste. */}
        <path
          d={arcPath(size / 2, size / 2, r, START, START + SWEEP)}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          className="animate-[dial_0.9s_cubic-bezier(0.16,1,0.3,1)_backwards]"
          style={{ '--dial-from': circumference } as CSSProperties}
        />
      </svg>
      <div className="relative z-10 text-center">{children}</div>
    </div>
  );
}
