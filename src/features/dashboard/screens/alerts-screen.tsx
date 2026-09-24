import { api } from '@/api';
import type { Alert } from '@/api';
import { GlassPanel } from '@/components/ui/glass-panel';
import { useAsync } from '@/lib/use-async';
import { AlertBanner } from '../components/alert-banner';

/** Ce qu'il est advenu d'une alerte déjà traitée. */
function outcome(alert: Alert): string {
  const parts: string[] = [];
  if (alert.acknowledgedBy) parts.push(`acquittée par ${alert.acknowledgedBy}`);
  if (alert.note) parts.push(alert.note.replace(/\.$/, '').toLowerCase());
  return parts.join(', ') || 'acquittée';
}

/**
 * Les alertes, comme la maquette D2 les pose.
 *
 * L'alerte en cours est en haut, cerclée de rouge, avec son bouton. En dessous,
 * ce qui a été traité : qui, quand, et ce qui s'est passé ensuite. Rien de plus.
 *
 * Le garde-fou n'est pas répété dans un encadré : il est écrit dans la bannière
 * elle-même, au moment où le médecin décide. Une règle qu'on lit à l'endroit où
 * elle s'applique est une règle qui tient.
 */
export function AlertsScreen() {
  const alerts = useAsync(() => api.getAlerts(), []);
  const open = alerts.data?.filter((alert) => !alert.acknowledgedAt) ?? [];
  const closed = alerts.data?.filter((alert) => alert.acknowledgedAt) ?? [];

  return (
    <div className="space-y-5">
      {alerts.loading && <p className="py-10 text-center text-ink-faint">Lecture des alertes…</p>}
      {alerts.error && (
        <p role="alert" className="py-10 text-center text-alert">
          Alertes indisponibles : {alerts.error}
        </p>
      )}

      {open.map((alert) => (
        <AlertBanner
          key={alert.id}
          alert={alert}
          onAcknowledge={async () => {
            await api.acknowledgeAlert(alert.id);
            alerts.reload();
          }}
        />
      ))}

      {open.length === 0 && !alerts.loading && !alerts.error && (
        <GlassPanel density="thin" className="px-6 py-7 text-center">
          <p className="text-ink-soft">Rien à traiter. Tout l’équipage est sous le seuil.</p>
        </GlassPanel>
      )}

      {closed.length > 0 && (
        <GlassPanel density="thick" className="px-5 py-2 sm:px-7">
          <div className="divide-y divide-hairline/50">
            {closed.map((alert, index) => (
              <div
                key={alert.id}
                className="grid animate-[fade-in_0.4s_cubic-bezier(0.16,1,0.3,1)_both] grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 py-4 sm:grid-cols-[auto_minmax(0,12rem)_auto_1fr]"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <span className="size-1.5 rounded-full bg-ink-faint/60" aria-hidden />
                <p className="truncate">{alert.crewName}</p>
                <p className="col-start-2 font-mono text-xs text-ink-faint sm:col-start-auto">
                  {alert.raisedAt}
                </p>
                <p className="col-start-2 text-sm text-ink-soft sm:col-start-auto">
                  {outcome(alert)}
                </p>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
