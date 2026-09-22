import { motion } from 'motion/react';
import { AIPresence } from '@/components/ai/presence';
import { Button } from '@/components/ui/button';
import { CabinChrome, CabinFooter } from '../components/cabin-chrome';

interface HomeScreenProps {
  firstName: string;
  lastSessionAt: string | null;
  onStart: () => void;
  busy?: boolean;
}

/**
 * L'accueil.
 *
 * Le dossier prévoit le nom, l'heure de bord, la date de la dernière séance et
 * un seul bouton. On s'y tient : rien d'autre n'aide quelqu'un qui vient de
 * finir un quart de huit heures.
 */
export function HomeScreen({ firstName, lastSessionAt, onStart, busy }: HomeScreenProps) {
  return (
    <section className="relative grid min-h-dvh place-items-center overflow-hidden px-6">
      <CabinChrome />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-7 text-center"
      >
        <AIPresence state="speaking" size={160} className="sm:hidden" />
        <AIPresence state="speaking" size={200} className="hidden sm:block" />

        <h1 className="font-display text-[clamp(2.25rem,7vw,3.5rem)] leading-tight tracking-tight">
          Bonsoir {firstName}.
        </h1>

        <p className="max-w-sm text-balance text-lg text-ink-soft">
          {lastSessionAt
            ? `Ta dernière séance remonte à ${lastSessionAt}.`
            : 'Première séance. Assieds-toi et pose la main sur l’accoudoir.'}
        </p>

        <Button size="lg" onClick={onStart} disabled={busy}>
          {busy ? 'Ouverture…' : 'Commencer'}
        </Button>
      </motion.div>

      <CabinFooter left="Aucune image ni aucun son n’est conservé." right="11 W · veille" />
    </section>
  );
}
