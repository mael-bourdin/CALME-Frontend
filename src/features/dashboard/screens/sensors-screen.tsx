import { Activity, Camera, Heart, Mic, Smile } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from '@/api';
import type { SensorHealth, SignalKey } from '@/api';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Sparkline } from '@/components/data/sparkline';
import { useAsync } from '@/lib/use-async';
import { cn } from '@/lib/cn';

const ICON: Record<SignalKey, LucideIcon> = {
  hr: Heart,
  eda: Activity,
  face: Camera,
  voice: Mic,
  mood: Smile,
};

const TONE: Record<string, { dot: string; text: string; stroke: string }> = {
  green: { dot: 'bg-calm', text: 'text-calm', stroke: 'var(--c-calm)' },
  amber: { dot: 'bg-watch', text: 'text-watch', stroke: 'var(--c-watch)' },
  red: { dot: 'bg-alert', text: 'text-alert', stroke: 'var(--c-alert)' },
  unreliable: { dot: 'bg-ink-faint', text: 'text-ink-faint', stroke: 'var(--c-quiet)' },
};

function Card({ sensor, index }: { sensor: SensorHealth; index: number }) {
  const Icon = ICON[sensor.key];
  const tone = TONE[sensor.level] ?? TONE.unreliable;
  const faulty = sensor.level === 'red';

  return (
    <div
      className={cn(
        'glass glass-edge animate-[fade-in_0.4s_cubic-bezier(0.16,1,0.3,1)_both] rounded-card p-5',
        // Un capteur hors bornes se signale par son contour, pas par un fond
        // rouge : la carte reste lisible, elle est seulement mise en cause.
        faulty && 'border border-alert/70',
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-[0.9375rem]">
          <Icon className={cn('size-4', tone.text)} strokeWidth={1.7} aria-hidden />
          {sensor.label}
        </span>
        <span className={cn('size-1.5 rounded-full', tone.dot)} aria-hidden />
      </div>

      <p
        className={cn(
          'mt-3 flex items-baseline gap-1.5 font-mono text-2xl tabular',
          faulty ? tone.text : 'text-ink',
        )}
      >
        {sensor.value === null ? '—' : sensor.value.toLocaleString('fr-FR')}
        {sensor.unit && <span className="text-xs text-ink-faint">{sensor.unit}</span>}
      </p>

      <Sparkline
        values={sensor.window}
        color={tone.stroke}
        area
        height={42}
        className="mt-3 w-full"
      />

      <p
        className={cn(
          'mt-4 text-[0.6875rem] uppercase tracking-wide',
          faulty ? tone.text : 'text-ink-faint',
        )}
      >
        {sensor.note ?? `${sensor.model} · ${sensor.sampleRate}`}
      </p>
    </div>
  );
}

/**
 * Les quatre capteurs de la cabine, comme la maquette D3 les pose.
 *
 * Le modèle et la fréquence sont écrits sous chaque relevé. C'est ce qui rend
 * la mesure discutable : « 214 » ne veut rien dire tant qu'on ne sait pas que
 * le MAX30102 échantillonne à cent hertz et que ses bornes plausibles sont
 * trente et deux cent vingt. Un capteur hors bornes le dit à cet endroit-là,
 * et l'indice l'ignore plutôt que de le faire sonner comme une urgence.
 */
export function SensorsScreen() {
  const sensors = useAsync(() => api.getSensors(), []);

  return (
    <GlassPanel density="thick" className="p-5 sm:p-7">
      {sensors.loading && <p className="py-10 text-center text-ink-faint">Lecture des capteurs…</p>}
      {sensors.error && <p className="py-10 text-center text-alert">{sensors.error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {sensors.data?.map((sensor, index) => (
          <Card key={sensor.key} sensor={sensor} index={index} />
        ))}
      </div>
    </GlassPanel>
  );
}
