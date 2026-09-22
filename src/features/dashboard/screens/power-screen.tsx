import { useState } from 'react';
import { Cpu, Database, HeartPulse, Info, Zap } from 'lucide-react';
import { api } from '@/api';
import type { CabinMode } from '@/api';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Button } from '@/components/ui/button';
import { Dial } from '@/components/data/dial';
import { useAsync } from '@/lib/use-async';
import { cn } from '@/lib/cn';

const MODE_LABEL: Record<CabinMode, string> = {
  standby: 'Veille',
  measuring: 'Mesure',
  session: 'Séance',
  degraded: 'Dégradé',
};

const MODE_CAPTION: Record<CabinMode, string> = {
  standby: 'détection de présence seule',
  measuring: 'acquisition, soixante secondes',
  session: 'exercice en cours, lumière et son',
  degraded: 'écran et caméra coupés',
};

const MODE_TONE: Record<CabinMode, { text: string; color: string }> = {
  standby: { text: 'text-calm', color: 'var(--c-calm)' },
  measuring: { text: 'text-calm', color: 'var(--c-calm)' },
  session: { text: 'text-watch', color: 'var(--c-watch)' },
  degraded: { text: 'text-alert', color: 'var(--c-alert)' },
};

const MODES: CabinMode[] = ['standby', 'measuring', 'session', 'degraded'];

export function PowerScreen() {
  const power = useAsync(() => api.getPower(), []);
  const health = useAsync(() => api.getHealth(), []);
  const [busy, setBusy] = useState(false);

  async function applySetpoint(percent: number) {
    setBusy(true);
    try {
      await api.setPowerSetpoint(percent);
      power.reload();
      health.reload();
    } finally {
      setBusy(false);
    }
  }

  const totalFor = (mode: CabinMode) =>
    power.data?.lines.reduce((sum, line) => sum + line.byMode[mode], 0) ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Énergie</h1>
        <p className="mt-1 text-ink-soft">
          Consommation mesurée par le capteur de courant, pas estimée.
        </p>
      </header>

      {power.loading && <p className="py-10 text-center text-ink-faint">Lecture du capteur…</p>}

      {power.data && (
        <>
          <GlassPanel density="thick" className="grid grid-cols-2 gap-6 p-6 sm:p-8 lg:grid-cols-4">
            {MODES.map((mode) => {
              const watts = totalFor(mode);
              const tone = MODE_TONE[mode];
              const active = power.data!.mode === mode;
              return (
                <div key={mode} className="flex flex-col items-center gap-3">
                  <Dial
                    value={watts}
                    max={power.data!.budgetWatts}
                    color={tone.color}
                    size={148}
                    aria-label={`${MODE_LABEL[mode]} : ${watts} watts sur ${power.data!.budgetWatts}`}
                  >
                    <span className={cn('font-display text-4xl leading-none tabular', tone.text)}>
                      {watts.toLocaleString('fr-FR')}
                    </span>
                    <span className="ml-1 font-mono text-sm text-ink-faint">W</span>
                  </Dial>
                  <div className="text-center">
                    <p className={cn('font-medium', active && tone.text)}>
                      {MODE_LABEL[mode]}
                      {active && ' · en cours'}
                    </p>
                    <p className="text-balance text-sm text-ink-faint">{MODE_CAPTION[mode]}</p>
                  </div>
                </div>
              );
            })}
          </GlassPanel>

          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <GlassPanel density="thick" className="space-y-1 p-6 sm:p-8">
              <h2 className="font-medium">Budget par poste</h2>
              <p className="pb-3 text-sm text-ink-faint">
                L’ordre de coupure est fixé à l’avance : la caméra d’abord, puis l’écran, puis le
                modèle de vision. Les deux capteurs biologiques ne sont jamais coupés.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[26rem] text-sm">
                  <thead>
                    <tr className="text-ink-faint">
                      <th className="py-2 text-left font-normal">Poste</th>
                      {MODES.map((mode) => (
                        <th key={mode} className="py-2 text-right font-normal">
                          {MODE_LABEL[mode]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline/50">
                    {power.data.lines.map((line) => (
                      <tr key={line.label}>
                        <td className="py-2.5 text-ink-soft">{line.label}</td>
                        {MODES.map((mode) => (
                          <td key={mode} className="py-2.5 text-right font-mono tabular">
                            {line.byMode[mode].toLocaleString('fr-FR')}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-t-2 border-hairline">
                      <td className="py-3 font-medium">Total</td>
                      {MODES.map((mode) => (
                        <td
                          key={mode}
                          className={cn(
                            'py-3 text-right font-mono tabular',
                            mode === 'degraded' && 'text-alert',
                          )}
                        >
                          {totalFor(mode).toLocaleString('fr-FR')} W
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </GlassPanel>

            <div className="space-y-5">
              <GlassPanel density="thick" className="space-y-4 p-6">
                <div>
                  <h2 className="font-medium">Consigne du réseau</h2>
                  <p className="text-sm text-ink-faint">
                    Le vaisseau peut demander une réduction. La cabine s’y conforme en moins de deux
                    secondes.
                  </p>
                </div>

                <p className="font-display text-5xl leading-none tabular text-calm">
                  {power.data.setpointPercent}
                  <span className="ml-1.5 font-sans text-sm text-ink-faint">% du budget</span>
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={power.data.setpointPercent < 60 ? 'secondary' : 'danger'}
                    disabled={busy}
                    onClick={() => void applySetpoint(power.data!.setpointPercent < 60 ? 100 : 40)}
                  >
                    {power.data.setpointPercent < 60 ? 'Revenir à 100 %' : 'Réduire à 40 %'}
                  </Button>
                </div>
              </GlassPanel>

              <GlassPanel density="thick" className="space-y-3 p-6">
                <h2 className="font-medium">État du système</h2>
                {health.data && (
                  <ul className="space-y-3 text-sm">
                    {[
                      {
                        Icon: Database,
                        label: 'Base de données',
                        detail: health.data.database.detail,
                        ok: health.data.database.ok,
                      },
                      {
                        Icon: Cpu,
                        label: 'Modèle local',
                        detail: health.data.model.detail,
                        ok: health.data.model.ok,
                      },
                      {
                        Icon: HeartPulse,
                        label: 'Capteurs biologiques',
                        detail: `${health.data.sensors.online} sur ${health.data.sensors.total} en ligne`,
                        ok: health.data.sensors.ok,
                      },
                      {
                        Icon: Zap,
                        label: 'Tampon de secours',
                        detail:
                          health.data.buffer.pending === 0
                            ? `vide, dernier rejeu ${health.data.buffer.lastReplayAt}`
                            : `${health.data.buffer.pending} messages en attente`,
                        ok: true,
                      },
                    ].map(({ Icon, label, detail, ok }) => (
                      <li key={label} className="flex items-center gap-3">
                        <Icon
                          className={cn('size-4 shrink-0', ok ? 'text-calm' : 'text-watch')}
                          strokeWidth={1.7}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block">{label}</span>
                          <span className="block font-mono text-xs text-ink-faint">{detail}</span>
                        </span>
                        <span
                          className={cn(
                            'size-1.5 shrink-0 rounded-full',
                            ok ? 'bg-calm' : 'bg-watch',
                          )}
                          aria-hidden
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </GlassPanel>
            </div>
          </div>

          <GlassPanel density="thin" className="flex gap-4 px-5 py-4 sm:px-6">
            <Info
              className="mt-0.5 size-4.5 shrink-0 text-ink-faint"
              strokeWidth={1.7}
              aria-hidden
            />
            <p className="text-sm text-ink-soft">
              La cabine coûte {power.data.dailyCostWh} Wh par jour et ferait économiser{' '}
              {power.data.dailySavingWh} Wh, soit un bilan positif d’environ{' '}
              {power.data.dailySavingWh - power.data.dailyCostWh} Wh. Tout repose sur une hypothèse
              de 3 % de baisse du métabolisme moyen, que nous ne pouvons pas valider cette semaine.
              Nous la présentons comme une hypothèse, pas comme un résultat.
            </p>
          </GlassPanel>
        </>
      )}
    </div>
  );
}
