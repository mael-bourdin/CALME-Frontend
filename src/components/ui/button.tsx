import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  // La seule surface teintée de l'écran, et elle l'est à peine.
  // Relevé sur la maquette : fond #dce8fb, filet #a9c6f5 d'un pixel, texte
  // #1f4480. Le fond garde un soupçon de transparence pour que le verre ait
  // encore quelque chose à réfracter sur ses bords.
  primary:
    'glass-thick glass-edge border border-accent-line bg-accent-surface/85 text-accent hover:bg-accent-surface active:scale-[0.985]',
  secondary: 'glass glass-edge text-ink hover:bg-overlay/70 active:scale-[0.985]',
  ghost: 'text-ink-soft hover:text-ink hover:bg-overlay/50',
  danger: 'bg-overlay text-alert border border-alert/55 hover:bg-alert/10 active:scale-[0.985]',
};

// Hauteurs et rembourrages relevés sur les maquettes : 62 px pour le bouton
// d'action d'un écran de cabine, 50 px pour les boutons de clôture.
const SIZE: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm gap-2',
  md: 'h-[50px] px-7 text-base gap-2.5',
  lg: 'h-[62px] px-[35px] text-[1.125rem] gap-[10px]',
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
