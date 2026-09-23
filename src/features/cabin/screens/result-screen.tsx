import { motion } from 'motion/react';
import { useSpeech } from '@/lib/use-speech';
import { ArrowRight } from 'lucide-react';
import { AIPresence } from '@/components/ai/presence';
import { Button } from '@/components/ui/button';
import type { Assessment, Recommendation } from '@/api';
import { CabinChrome } from '../components/cabin-chrome';
import { useCompactCabin } from '../hooks/use-compact-cabin';

interface ResultScreenProps {
  assessment: Assessment;
  recommendation: Recommendation | null;
  onAccept: () => void;
}

/**
 * Le résultat, tel que les maquettes C3 le posent.
 *
 * C'est l'écran qui tient toute la thèse du projet : l'IA annonce, et sa
 * phrase est l'écran. Pas de carte, pas de bulle, pas de chiffre posé à côté.
 * La sphère prend la couleur du palier — c'est elle qui porte le niveau, ce
 * qui évite une étiquette « ALERTE » que personne n'a envie de lire en sortant
 * d'un quart de huit heures.
 *
 * La maquette ne montre ni l'indice chiffré ni le moyen de refuser l'exercice.
 * Les deux sont retirés : c'est l'écran tel qu'il est dessiné.
 */
export function ResultScreen({ assessment, recommendation, onAccept }: ResultScreenProps) {
  const unreliable = assessment.level === 'unreliable';
  const tint = unreliable ? undefined : (assessment.level as 'green' | 'amber' | 'red');

  const sentence = unreliable
    ? 'La mesure n’est pas exploitable. Je préfère ne rien en conclure.'
    : (recommendation?.message ?? 'Je regarde encore.');

  // La sphère bat au rythme de la phrase qu'elle prononce. Le texte, lui,
  // s'affiche d'un coup : c'est un résultat, on doit pouvoir le relire tout de
  // suite sans attendre qu'une animation finisse de le livrer.
  const speech = useSpeech(sentence);

  // Sur la dalle 800×480, 177 (marge) + 304 (sphère) dépassent déjà les 480
  // disponibles avant même la phrase et le bouton. En dessous de 520 px de
  // haut, la marge tombe à 24 (--cabine-marge) et la sphère à 160 : voir le
  // rapport de tâche pour le budget vertical chiffré complet.
  const compact = useCompactCabin();

  return (
    <section className="relative flex min-h-dvh flex-col items-center overflow-hidden px-6">
      <CabinChrome position="top" />

      {/* Cotes de C3 : sphère de 304 posée à 177 du haut, la phrase juste
          dessous sur 722 de large, le bouton 45 px plus bas. */}
      <div className="flex w-full flex-col items-center pt-[177px] [@media(max-height:520px)]:pt-6">
        <AIPresence
          state={assessment.level === 'red' ? 'alert' : 'speaking'}
          size={compact ? 160 : 304}
          tint={tint}
          amplitude={speech.amplitude}
        />

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
className="mt-2 w-[min(722px,100%)] text-center font-display text-[clamp(1.75rem,3.5vw,50.41px)] leading-[1.322] tracking-[-0.018em]"
        >
          {sentence}
        </motion.h1>


        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-[45px] flex flex-col items-center gap-4 [@media(max-height:520px)]:mt-4"
        >
          <Button
            size="lg"
            onClick={onAccept}
            disabled={!unreliable && !recommendation}
            iconAfter={<ArrowRight className="size-4.5" strokeWidth={1.7} aria-hidden />}
          >
            {unreliable ? 'Reprendre la mesure' : 'Voir mes résultats'}
          </Button>

        </motion.div>
      </div>
    </section>
  );
}
