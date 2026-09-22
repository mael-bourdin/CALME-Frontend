import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Density = 'thin' | 'regular' | 'thick';

const DENSITY: Record<Density, string> = {
  thin: 'glass-thin',
  regular: 'glass',
  thick: 'glass-thick',
};

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  /**
   * thin en cabine — le verre y sépare des plans sans attirer l'œil pendant une
   * séance. regular et thick au tableau de bord, où la densité d'information
   * justifie de séparer franchement.
   */
  density?: Density;
  /** L'arête lumineuse. À couper seulement pour un élément posé sur un autre verre. */
  edge?: boolean;
  as?: ElementType;
}

/**
 * La brique de base de toute l'interface.
 *
 * Le verre n'a de sens que s'il a quelque chose à réfracter : ces panneaux sont
 * faits pour flotter au-dessus du contenu, pas pour découper une page en cartes.
 */
export function GlassPanel({
  children,
  className,
  density = 'regular',
  edge = true,
  as: Component = 'div',
}: GlassPanelProps) {
  return (
    <Component
      className={cn(
        DENSITY[density],
        edge && 'glass-edge',
        'rounded-panel',
        'transition-colors duration-500 ease-calm',
        className,
      )}
    >
      {children}
    </Component>
  );
}
