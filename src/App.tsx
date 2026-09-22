import { RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { ThemeProvider } from './lib/theme';
import { router } from './app/router';

/**
 * `reducedMotion="user"` fait respecter la préférence système par toutes les
 * animations d'un coup, au lieu de la traiter composant par composant.
 *
 * Ça compte ici plus qu'ailleurs : l'interface s'adresse à quelqu'un qu'on est
 * en train de mesurer pour du stress. Quelqu'un que le mouvement gêne doit
 * pouvoir couper le mouvement sans perdre l'information — les transformations
 * sautent à leur état final, les fondus restent.
 */
export function App() {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <div className="veil" aria-hidden />
        <RouterProvider router={router} />
      </MotionConfig>
    </ThemeProvider>
  );
}
