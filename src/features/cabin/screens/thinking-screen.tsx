import { motion } from 'motion/react';
import { AIPresence } from '@/components/ai/presence';
import { CabinChrome } from '../components/cabin-chrome';

/**
 * Les trente secondes entre la fin de la mesure et la consigne.
 *
 * Le dossier se donne ce budget ; l'attente doit être visible plutôt que subie,
 * sinon la personne croit que la cabine a planté.
 */
export function ThinkingScreen() {
  return (
    <section className="relative grid min-h-dvh place-items-center overflow-hidden px-6">
      <CabinChrome />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center gap-7 text-center"
      >
        <AIPresence state="thinking" size={180} />
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Je regarde.</h1>
        <p className="max-w-sm text-balance text-ink-soft">
          Je compare tes mesures à tes séances précédentes. Quelques secondes.
        </p>
      </motion.div>
    </section>
  );
}
