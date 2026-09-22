import { motion } from 'motion/react';
import { AIPresence } from '@/components/ai/presence';
import type { ConnectionState, ConsentState, SensorFrame } from '@/api';
import { CabinChrome, CabinProgress } from '../components/cabin-chrome';
import { PrivacyToggles } from '../components/privacy-toggles';
import { SensorStrip } from '../components/sensor-strip';

interface MeasureScreenProps {
  elapsedSeconds: number;
  totalSeconds: number;
  frame: SensorFrame | null;
  consent: ConsentState;
  onToggleConsent: (key: keyof ConsentState) => void;
  connection?: ConnectionState;
  /** Les signaux absents, dits à l'écran plutôt que cachés. */
  reducedConfidence?: string | null;
  /** La question posée par l'IA pendant qu'elle écoute. */
  question?: string;
}

/**
 * La mesure, telle que la maquette C2 la pose.
 *
 * L'IA occupe le haut et sa question occupe le milieu, en grand. Rien ne
 * l'encadre : la phrase est l'écran. En bas, ce que la cabine relève pendant
 * qu'elle écoute, et les deux pastilles qui disent ce qui est ouvert.
 *
 * Le filet de progression ne porte aucun chiffre. Savoir qu'il reste
 * vingt-trois secondes ne sert à personne ; savoir que ça avance, si.
 */
export function MeasureScreen({
  elapsedSeconds,
  totalSeconds,
  frame,
  consent,
  onToggleConsent,
  connection,
  reducedConfidence,
  question = 'Qu’est-ce que tu as fait aujourd’hui ?',
}: MeasureScreenProps) {
  return (
    <section className="relative flex min-h-dvh flex-col items-center overflow-hidden px-6">
      <CabinChrome connection={connection} position="top" />

      <div className="flex flex-1 flex-col items-center justify-center pb-40 pt-24 sm:pb-44">
        {/* Iridescente : sur cet écran l'IA pose une question, donc elle parle. Le
            témoin rouge du micro n'est pas sur la sphère mais dans la pastille
            « Micro » — c'est là qu'on va le chercher quand on se demande ce qui
            est ouvert. */}
        <AIPresence state="speaking" size={290} />

        <motion.h1
          key={question}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12 max-w-[33rem] text-center font-display text-[clamp(2rem,4.2vw,3.4rem)] leading-[1.15] tracking-tight"
        >
          {question}
        </motion.h1>

        {reducedConfidence && (
          <p className="mt-6 max-w-md text-balance text-center text-sm text-watch">
            {reducedConfidence}
          </p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-6 px-6 pb-8">
        <PrivacyToggles consent={consent} onToggle={onToggleConsent} />
        <SensorStrip frame={frame} className="max-w-5xl" />
      </div>

      <CabinProgress ratio={elapsedSeconds / totalSeconds} />
    </section>
  );
}
