import { useState } from 'react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { cn } from '@/lib/cn';
import type { Alert } from '@/api';
import { dateLisible } from '@/lib/date-lisible';

interface AlertBannerProps {
  alert: Alert;
  onAcknowledge?: () => Promise<void>;
  className?: string;
}

/**
 * La seule chose de l'écran qui demande une action.
 *
 * Une alerte ne transporte que qui et quand. Pas la mesure, pas la séance, pas
 * ce qui a été dit — et c'est écrit dessus, parce qu'un garde-fou qui n'est pas
 * spécifié finit toujours par sauter.
 */
export function AlertBanner({ alert, onAcknowledge, className }: AlertBannerProps) {
  const [busy, setBusy] = useState(false);

  async function acknowledge() {
    if (!onAcknowledge) return;
    setBusy(true);
    try {
      await onAcknowledge();
    } finally {
      setBusy(false);
    }
  }

  return (
    // Apparition en CSS : une alerte est la dernière chose qui a le droit de
    // rester invisible parce qu'une animation n'a pas démarré.
    <div className="animate-[fade-in_0.45s_cubic-bezier(0.16,1,0.3,1)_both]">
      <GlassPanel
        density="thick"
        className={cn(
          'flex flex-wrap items-center gap-4 border border-alert/55 px-5 py-4 sm:px-6',
          className,
        )}
      >
        <span className="h-10 w-[3px] shrink-0 rounded-full bg-alert" aria-hidden />

        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {alert.crewName}
            {alert.kind === 'threshold-crossed'
              ? ' a franchi le seuil rouge'
              : ' — capteur signalé suspect'}
          </p>
          <p className="text-sm text-ink-soft">
            {dateLisible(alert.raisedAt)}. Ni la mesure ni la séance ne te sont transmises.
          </p>
        </div>

        {onAcknowledge && (
          <button
            type="button"
            onClick={() => void acknowledge()}
            disabled={busy}
            className={cn(
              'rounded-pill border border-alert/60 bg-overlay px-5 py-2 text-sm text-alert',
              'transition-colors hover:bg-alert/10 disabled:opacity-50',
            )}
          >
            {busy ? 'Acquittement…' : 'Acquitter'}
          </button>
        )}
      </GlassPanel>
    </div>
  );
}
