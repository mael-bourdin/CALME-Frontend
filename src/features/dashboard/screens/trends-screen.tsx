import { Eye } from 'lucide-react';
import { api } from '@/api';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Curve } from '@/components/data/curve';
import { useAsync } from '@/lib/use-async';
import { cn } from '@/lib/cn';

function Figure({ value, caption, tone }: { value: string; caption: string; tone: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 px-4 text-center">
      <span className={cn('font-display text-5xl leading-none tabular', tone)}>{value}</span>
      <span className="text-balance text-sm text-ink-faint">{caption}</span>
    </div>
  );
}

export function TrendsScreen() {
  const trends = useAsync(() => api.getTrends(), []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Tendances</h1>
        <p className="mt-1 text-ink-soft">
          Trente jours, agrégés sur l’équipage. Aucun nom, aucune séance.
        </p>
      </header>

      {trends.loading && <p className="py-10 text-center text-ink-faint">Agrégation…</p>}
      {trends.error && (
        <p role="alert" className="py-10 text-center text-alert">
          Tendances indisponibles : {trends.error}
        </p>
      )}

      {trends.data && (
        <>
          <GlassPanel density="thick" className="space-y-4 p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-medium">Indice moyen d’équipage</h2>
              <p className="text-sm text-ink-faint">
                Les pointillés sont les seuils 40 et 70 du moteur de règles.
              </p>
            </div>

            <Curve
              values={trends.data.meanIndex.map((point) => point.value)}
              min={15}
              max={80}
              color="var(--c-accent)"
              height={230}
              thresholds={[
                { value: 40, color: 'var(--c-watch)' },
                { value: 70, color: 'var(--c-alert)' },
              ]}
              aria-label="Indice moyen d’équipage sur trente jours"
            />

            <div className="flex justify-between font-mono text-xs text-ink-faint">
              <span>Sol {trends.data.meanIndex[0]?.sol.toLocaleString('fr-FR')}</span>
              <span>Sol {trends.data.meanIndex.at(-1)?.sol.toLocaleString('fr-FR')}</span>
            </div>
          </GlassPanel>

          <GlassPanel
            density="thick"
            className="flex flex-col divide-y divide-hairline/50 py-7 sm:flex-row sm:divide-x sm:divide-y-0"
          >
            <Figure
              value={trends.data.sessionsPerDay.toLocaleString('fr-FR')}
              caption="séances par jour, en moyenne"
              tone="text-calm"
            />
            <Figure
              value={
                trends.data.breathingRateAfter
                  ? trends.data.breathingRateAfter.toLocaleString('fr-FR')
                  : '—'
              }
              caption={
                trends.data.breathingRateAfter
                  ? `cycles par minute après séance, contre ${trends.data.breathingRateBefore.toLocaleString('fr-FR')} avant`
                  : 'pas encore mesurée (capteur cardiaque absent)'
              }
              tone="text-calm"
            />
            <Figure
              value={`${Math.round(trends.data.amberShare * 100)} %`}
              caption="des séances en orange ou en rouge, sur trente jours"
              tone="text-watch"
            />
          </GlassPanel>

          <GlassPanel density="thin" className="flex gap-4 px-5 py-4 sm:px-6">
            <Eye
              className="mt-0.5 size-4.5 shrink-0 text-ink-faint"
              strokeWidth={1.7}
              aria-hidden
            />
            <p className="text-sm text-ink-soft">
              Ces courbes sont agrégées et anonymes. Un module de planification des quarts peut les
              consommer, à condition qu’un humain prenne la décision. L’indice de charge n’est
              jamais présenté au commandant sous forme nominative.
            </p>
          </GlassPanel>
        </>
      )}
    </div>
  );
}
