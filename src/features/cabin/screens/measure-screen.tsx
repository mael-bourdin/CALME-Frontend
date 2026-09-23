import { motion } from 'motion/react';
import { AIPresence } from '@/components/ai/presence';
import type { ConnectionState, ConsentState, SensorFrame } from '@/api';
import { CabinChrome, CabinProgress } from '../components/cabin-chrome';
import { useCompactCabin } from '../hooks/use-compact-cabin';
import { PrivacyToggles } from '../components/privacy-toggles';
import { SensorStrip } from '../components/sensor-strip';

interface MeasureScreenProps {
  elapsedSeconds: number;
  totalSeconds: number;
  frame: SensorFrame | null;
  consent: ConsentState;
  onToggleConsent: (key: keyof ConsentState) => void;
  connection?: ConnectionState;
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
  question = 'Qu’est-ce que tu as fait aujourd’hui ?',
}: MeasureScreenProps) {
  // Sur la dalle courte, le bandeau bas (pastilles + relevés) reste en
  // position fixe et mange 144 px du bas de l'écran : la sphère et la
  // question qui débordaient dedans étaient entièrement masquées. On
  // réduit donc les deux bouts — le haut (marge, sphère) et le bas
  // (bandeau) — plutôt que de sortir le bandeau du flux : voir le rapport
  // de tâche pour le calcul complet des deux zones et leur marge de non-
  // recouvrement.
  const compact = useCompactCabin();

  return (
    <section className="relative flex min-h-dvh flex-col items-center overflow-hidden px-6">
      <CabinChrome connection={connection} position="top" />

      {/* Cotes relevées sur C2 : sphère de 304 posée à 97 du haut, question
          juste dessous sur 722 de large. */}
      <div className="flex w-full flex-col items-center pt-[97px] [@media(max-height:520px)]:pt-6">
        {/* Iridescente : sur cet écran l'IA pose une question, donc elle parle. Le
            témoin rouge du micro n'est pas sur la sphère mais dans la pastille
            « Micro » — c'est là qu'on va le chercher quand on se demande ce qui
            est ouvert. */}
        <AIPresence state="speaking" size={compact ? 160 : 304} />

        <motion.h1
          key={question}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
className="mt-2 w-[min(722px,100%)] text-center font-display text-[clamp(1.75rem,3.5vw,50.41px)] leading-[1.322] tracking-[-0.018em]"
        >
          {question}
        </motion.h1>
      </div>

      {/* Bas d'écran : pastilles, 41 px, bande de relevés, puis 46 px jusqu'au
          filet de progression. */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-[41px] px-6 pb-[46px] [@media(max-height:520px)]:gap-3 [@media(max-height:520px)]:pb-6">
        <PrivacyToggles consent={consent} onToggle={onToggleConsent} />
        <SensorStrip frame={frame} className="max-w-[1040px]" />
      </div>

      <CabinProgress ratio={elapsedSeconds / totalSeconds} />
    </section>
  );
}
