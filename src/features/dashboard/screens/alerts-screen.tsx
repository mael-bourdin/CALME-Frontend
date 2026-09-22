import { motion } from 'motion/react';
import { ShieldCheck } from 'lucide-react';
import { api } from '@/api';
import { GlassPanel } from '@/components/ui/glass-panel';
import { useAsync } from '@/lib/use-async';
import { AlertBanner } from '../components/alert-banner';

export function AlertsScreen() {
  const alerts = useAsync(() => api.getAlerts(), []);
  const open = alerts.data?.filter((alert) => !alert.acknowledgedAt) ?? [];
  const closed = alerts.data?.filter((alert) => alert.acknowledgedAt) ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">Alertes</h1>
        <p className="mt-1 text-ink-soft">Une alerte part quand un indice franchit 70.</p>
      </header>

      {/* Le garde-fou, écrit à l'écran plutôt qu'en note de bas de page. */}
      <GlassPanel density="thin" className="flex gap-4 px-5 py-4 sm:px-6">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-calm" strokeWidth={1.7} aria-hidden />
        <p className="text-sm text-ink-soft">
          Une alerte ne transporte que qui, et quand. Pas la mesure, pas la séance, pas ce qui a été
          dit. Le détail ne s’ouvre qu’après acquittement, ou avec l’accord explicite de la personne.
          Techniquement rien ne nous empêcherait d’en montrer davantage — nous avons décidé de ne pas
          le faire.
        </p>
      </GlassPanel>

      {alerts.loading && <p className="py-8 text-center text-ink-faint">Lecture des alertes…</p>}

      {open.map((alert) => (
        <AlertBanner
          key={alert.id}
          alert={alert}
          onAcknowledge={async () => {
            await api.acknowledgeAlert(alert.id, 'Dr. Benali');
            alerts.reload();
          }}
        />
      ))}

      {open.length === 0 && !alerts.loading && (
        <GlassPanel density="thin" className="px-6 py-8 text-center">
          <p className="text-ink-soft">Rien à traiter. Tout l’équipage est sous le seuil.</p>
        </GlassPanel>
      )}

      {closed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm text-ink-faint">Acquittées</h2>
          <GlassPanel density="thick" className="divide-y divide-hairline/50 px-5 sm:px-6">
            {closed.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.75 }}
                transition={{ delay: index * 0.04 }}
                className="flex flex-wrap items-center gap-x-5 gap-y-1 py-4"
              >
                <span className="size-2 shrink-0 rounded-full bg-unknown/60" aria-hidden />
                <p className="min-w-0 flex-1 truncate text-ink-soft">{alert.crewName}</p>
                <p className="font-mono text-xs text-ink-faint">{alert.raisedAt}</p>
                <p className="w-full text-sm text-ink-faint sm:w-auto">
                  {alert.note ?? `acquittée par ${alert.acknowledgedBy}`}
                </p>
              </motion.div>
            ))}
          </GlassPanel>
        </section>
      )}
    </div>
  );
}
