import { motion } from 'motion/react';
import { AIPresence } from '@/components/ai/presence';
import { GlassPanel } from '@/components/ui/glass-panel';
import { cn } from '@/lib/cn';
import type { ConnectionState, ConsentState, SensorFrame } from '@/api';
import { CabinChrome } from '../components/cabin-chrome';
import { PrivacyToggles } from '../components/privacy-toggles';
import { VitalsTrace } from '../components/vitals-trace';

interface MeasureScreenProps {
  elapsedSeconds: number;
  totalSeconds: number;
  frame: SensorFrame | null;
  consent: ConsentState;
  onToggleConsent: (key: keyof ConsentState) => void;
  connection?: ConnectionState;
  /** Les signaux absents, dits à l'écran plutôt que cachés. */
  reducedConfidence?: string | null;
}

/** Dix barres qui se remplissent pendant qu'elle parle, pour savoir quand s'arrêter. */
function SpeechMeter({ seconds, total }: { seconds: number; total: number }) {
  const heights = [0.35, 0.62, 0.48, 0.88, 0.7, 0.95, 0.55, 0.4, 0.22, 0.12];
  const filled = Math.round((seconds / total) * heights.length);

  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className="flex items-center gap-1.5" aria-hidden>
        {heights.map((height, index) => (
          <motion.span
            key={index}
            className={cn('w-[5px] rounded-full', index < filled ? 'bg-accent' : 'bg-ink-faint/30')}
            style={{ height: Math.max(6, 34 * height) }}
            animate={index < filled ? { scaleY: [1, 1.12, 1] } : { scaleY: 1 }}
            transition={{
              duration: 1.1,
              repeat: index < filled ? Infinity : 0,
              delay: index * 0.06,
            }}
          />
        ))}
      </div>
      <p className="font-mono text-xs text-ink-faint">
        {Math.min(seconds, total)} secondes sur {total}
      </p>
    </div>
  );
}

/**
 * La mesure.
 *
 * Son propre signal cardiaque occupe l'écran entier, derrière tout ; la question
 * flotte dessus dans un panneau de verre. C'est la seule façon de faire sentir
 * qu'on la mesure — une carte de capteur en bas d'écran ne le fait pas.
 */
export function MeasureScreen({
  elapsedSeconds,
  totalSeconds,
  frame,
  consent,
  onToggleConsent,
  connection,
  reducedConfidence,
}: MeasureScreenProps) {
  const progress = Math.min(1, elapsedSeconds / totalSeconds);
  const suspect = (frame?.suspect.length ?? 0) > 0;

  return (
    <section className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-24 sm:px-6">
      <VitalsTrace running={connection !== 'offline'} suspect={suspect} />
      <CabinChrome connection={connection} />

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-7">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
        >
          <GlassPanel
            density="thick"
            className="flex flex-col items-center gap-6 px-7 py-9 text-center sm:px-12 sm:py-11"
          >
            <AIPresence state="listening" size={150} className="sm:hidden" />
            <AIPresence state="listening" size={190} className="hidden sm:block" />

            <h1 className="font-display text-[clamp(1.75rem,5.5vw,3rem)] leading-tight tracking-tight">
              Qu’est-ce que tu as fait aujourd’hui ?
            </h1>

            <p className="max-w-md text-balance text-ink-soft">
              Je ne garde pas ce que tu dis, seulement la forme de ta voix.
            </p>

            <SpeechMeter seconds={Math.min(elapsedSeconds, 10)} total={10} />
          </GlassPanel>
        </motion.div>

        <PrivacyToggles consent={consent} onToggle={onToggleConsent} />

        {reducedConfidence && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-ink-faint"
          >
            {reducedConfidence}
          </motion.p>
        )}

        {frame?.heartRate != null && (
          <p className="font-mono text-sm text-ink-faint">
            {suspect ? 'valeur hors bornes' : `${frame.heartRate} bpm`}
          </p>
        )}
      </div>

      {/* La minute en cours : un filet collé au bord bas, toujours visible,
          jamais en concurrence avec la question. */}
      <div className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-hairline/60" aria-hidden>
        <motion.div
          className="h-full bg-accent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: progress }}
          style={{ transformOrigin: 'left' }}
          transition={{ ease: 'linear', duration: 0.4 }}
        />
      </div>
      <p className="absolute bottom-5 left-6 z-20 font-mono text-xs text-ink-faint sm:left-10">
        {elapsedSeconds} s sur {totalSeconds}
      </p>
    </section>
  );
}
