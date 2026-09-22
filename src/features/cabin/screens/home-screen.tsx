import { motion } from 'motion/react';
import { AIPresence } from '@/components/ai/presence';
import { Button } from '@/components/ui/button';
import { CabinChrome } from '../components/cabin-chrome';

interface HomeScreenProps {
  firstName: string;
  lastSessionAt: string | null;
  onStart: () => void;
  busy?: boolean;
}

/**
 * L'accueil, tel que la maquette C1 le pose.
 *
 * Quatre choses et rien d'autre : la sphère, le bonsoir, la dernière séance,
 * un bouton. Pas de rappel de confidentialité ici — il arrive à l'écran de
 * mesure, au moment où la caméra et le micro s'ouvrent vraiment, et c'est là
 * qu'il veut dire quelque chose.
 *
 * La sphère est petite. C'est volontaire : l'IA salue, elle ne se présente pas.
 */
export function HomeScreen({ firstName, lastSessionAt, onStart, busy }: HomeScreenProps) {
  return (
    <section className="relative grid min-h-dvh place-items-center overflow-hidden px-6">
      <CabinChrome position="bottom" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="-mt-12 flex flex-col items-center text-center"
      >
        <AIPresence state="speaking" size={104} count={220} />

        <h1 className="mt-14 font-display text-[clamp(2.5rem,5.5vw,3.5rem)] leading-none tracking-tight">
          Bonsoir {firstName}.
        </h1>

        <p className="mt-11 max-w-md text-balance text-[1.0625rem] text-ink-soft">
          {lastSessionAt
            ? `Ta dernière séance remonte à ${lastSessionAt}.`
            : 'Première séance. Assieds-toi et pose la main sur l’accoudoir.'}
        </p>

        <Button size="lg" onClick={onStart} disabled={busy} className="mt-11">
          {busy ? 'Ouverture…' : 'Commencer'}
        </Button>
      </motion.div>
    </section>
  );
}
