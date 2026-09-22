import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AIPresence } from '@/components/ai/presence';
import { Button } from '@/components/ui/button';
import { useSpeech } from '@/lib/use-speech';
import { CabinChrome } from '../components/cabin-chrome';

interface HomeScreenProps {
  firstName: string;
  lastSessionAt: string | null;
  onStart: () => void;
  busy?: boolean;
  /** Le catalogue s'en sert pour atteindre directement la phrase d'ouverture. */
  autoGreet?: boolean;
}

/** Ce que la cabine dit en s'ouvrant, avant la première question. */
const GREETING = 'Installe-toi. Pose la main sur l’accoudoir, je commence à mesurer.';

/** La sphère est dessinée à sa taille de mesure et réduite : une seule toile. */
const FULL = 304;
const SMALL = 84;

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * L'accueil, tel que la maquette C1 le pose.
 *
 * Quatre choses et rien d'autre : la sphère, le bonsoir, la dernière séance,
 * un bouton. Pas de rappel de confidentialité ici — il arrive à l'écran de
 * mesure, au moment où la caméra et le micro s'ouvrent vraiment.
 *
 * La sphère est petite et vivante : elle enfle au survol et répond au clic par
 * une onde. Rien ne se passe d'autre. C'est ce qui la distingue d'un logo — on
 * peut la toucher, et elle accuse réception.
 *
 * « Commencer » ne change pas de page. La sphère grandit jusqu'à sa taille de
 * mesure, prononce sa phrase en la révélant mot à mot, puis la séance s'ouvre.
 * L'écran suivant la reprend à la même taille, au même endroit : on ne voit pas
 * de coupure, on voit quelqu'un s'approcher et se mettre à parler.
 */
export function HomeScreen({
  firstName,
  lastSessionAt,
  onStart,
  busy,
  autoGreet,
}: HomeScreenProps) {
  const [greeting, setGreeting] = useState(autoGreet ?? false);
  const [sentence, setSentence] = useState<string | null>(null);
  const speech = useSpeech(sentence, onStart);

  // La phrase part une fois la croissance engagée : elle grossit, puis parle.
  useEffect(() => {
    if (!greeting) return;
    const id = window.setTimeout(() => setSentence(GREETING), 380);
    return () => window.clearTimeout(id);
  }, [greeting]);

  const words = GREETING.split(' ');
  const spoken = Math.ceil(words.length * speech.progress);

  return (
    <section className="relative grid min-h-dvh place-items-center overflow-hidden px-6">
      <CabinChrome position="bottom" />

      {/* Cotes relevées sur la maquette C1 : sphère de 84, puis 30 px entre
          chaque élément, le tout centré exactement sur la moitié de l'écran. */}
      <div className="flex flex-col items-center text-center">
        <motion.div
          className="relative grid place-items-center"
          initial={false}
          animate={{ width: greeting ? FULL : SMALL, height: greeting ? FULL : SMALL }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <motion.div
            className="absolute"
            style={{ width: FULL, height: FULL }}
            initial={false}
            animate={{ scale: greeting ? 1 : SMALL / FULL }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <AIPresence
              state="speaking"
              size={FULL}
              interactive={!greeting}
              amplitude={greeting ? speech.amplitude : undefined}
            />
          </motion.div>
        </motion.div>

        <AnimatePresence mode="wait">
          {greeting ? (
            <p
              key="greeting"
className="mt-[30px] w-[min(45rem,100%)] animate-[fade-in_0.4s_ease-out_both] font-display text-[clamp(1.75rem,3.5vw,3.15rem)] leading-[1.32] tracking-[-0.018em]"
            >
              {/* Révélée mot à mot au rythme de la voix : la phrase se dit,
                  elle ne s'affiche pas. */}
              {words.map((word, index) => (
                <span key={index} style={{ opacity: index < spoken ? 1 : 0.16 }}>
                  {word}{' '}
                </span>
              ))}
            </p>
          ) : (
            <motion.div
              key="accueil"
              initial={false}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="flex flex-col items-center"
            >
              <h1 className="mt-[30px] font-display text-[clamp(2.25rem,4.5vw,3.5rem)] leading-[1.32] tracking-[-0.018em]">
                Bonsoir {firstName}.
              </h1>

              <p className="mt-[30px] max-w-md text-balance text-[1.125rem] leading-7 text-ink-soft">
                {lastSessionAt
                  ? `Ta dernière séance remonte à ${lastSessionAt}.`
                  : 'Première séance. Assieds-toi et pose la main sur l’accoudoir.'}
              </p>

              <Button
                size="lg"
                onClick={() => setGreeting(true)}
                disabled={busy}
                className="mt-[30px]"
              >
                {busy ? 'Ouverture…' : 'Commencer'}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
