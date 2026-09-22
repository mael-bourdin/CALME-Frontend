import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  // La seule surface teintée de l'écran, et elle l'est à peine.
  primary:
    'glass-thick glass-edge bg-accent-surface/80 text-accent border border-accent-line/70 hover:bg-accent-surface active:scale-[0.985]',
  secondary: 'glass glass-edge text-ink hover:bg-overlay/70 active:scale-[0.985]',
  ghost: 'text-ink-soft hover:text-ink hover:bg-overlay/50',
  danger: 'bg-overlay text-alert border border-alert/55 hover:bg-alert/10 active:scale-[0.985]',
};

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm gap-2',
  md: 'h-12 px-6 text-base gap-2.5',
  lg: 'h-14 px-8 text-lg gap-3',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconAfter?: ReactNode;
  /** Occupe toute la largeur disponible. Utile en mobile. */
  block?: boolean;
}

/**
 * Règle de cabine : jamais plus d'un bouton `primary` à l'écran à la fois.
 * L'interface s'adresse à quelqu'un de fatigué, parfois dans la pénombre — il
 * ne doit pas avoir à choisir où appuyer.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconAfter,
  block,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-pill font-medium',
        'transition-all duration-300 ease-calm',
        'disabled:pointer-events-none disabled:opacity-45',
        VARIANT[variant],
        SIZE[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
      {iconAfter}
    </button>
  );
}
