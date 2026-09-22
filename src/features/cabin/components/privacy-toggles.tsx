import { Camera, CameraOff, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ConsentState } from '@/api';

interface PrivacyTogglesProps {
  consent: ConsentState;
  onToggle: (key: keyof ConsentState) => void;
  className?: string;
}

/**
 * Deux pastilles, visibles pendant toute la mesure.
 *
 * L'astronaute coupe la caméra ou le micro d'un geste, de façon durable ; le
 * système continue sur les deux capteurs biologiques et annonce sa confiance
 * réduite. Le témoin rouge sur le micro ouvert n'est pas décoratif : une cabine
 * perçue comme un mouchard ne sera pas utilisée, et une cabine vide ne mesure
 * rien.
 */
export function PrivacyToggles({ consent, onToggle, className }: PrivacyTogglesProps) {
  const items = [
    {
      key: 'camera' as const,
      label: 'Caméra',
      on: consent.camera,
      Icon: consent.camera ? Camera : CameraOff,
    },
    {
      key: 'microphone' as const,
      label: 'Micro',
      on: consent.microphone,
      Icon: consent.microphone ? Mic : MicOff,
    },
  ];

  return (
    <div className={cn('flex items-center justify-center gap-[14px]', className)}>
      {items.map(({ key, label, on, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onToggle(key)}
          aria-pressed={on}
          className={cn(
            // Relevé sur C2 : 44,5 de haut, 17 de rembourrage, 9 entre l'icône
            // et le mot, et le mot en gris moyen même quand le capteur est ouvert.
            'glass glass-edge inline-flex h-[44.5px] items-center gap-[9px] rounded-pill px-[17px]',
            'text-sm leading-5 transition-all duration-300 ease-calm hover:bg-overlay/70',
            on ? 'text-ink-soft' : 'text-unknown',
          )}
        >
          <Icon className="size-[17px]" strokeWidth={1.7} aria-hidden />
          {label}
          <span className="sr-only">
            {on ? ' activé, appuyer pour couper' : ' coupé, appuyer pour activer'}
          </span>
          {key === 'microphone' && on && (
            <span
              className="size-2 rounded-full bg-alert"
              style={{ animation: 'pulse-dot 2s ease-in-out infinite' }}
              aria-hidden
            />
          )}
        </button>
      ))}
    </div>
  );
}
