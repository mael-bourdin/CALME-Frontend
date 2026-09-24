import { cn } from '@/lib/cn';

interface TouchKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  className?: string;
}

/** Disposition AZERTY, sans chiffres ni accents : un prénom se tape avec ça. */
const RANGEES = [
  ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
  ['W', 'X', 'C', 'V', 'B', 'N', '-'],
];

/**
 * Un clavier applicatif, pas un `<input>` qui compte sur celui du système.
 *
 * Raspberry Pi OS n'affiche aucun clavier à l'écran en mode kiosque : sans
 * ce composant, le champ de saisie du prénom serait tout simplement
 * impossible à remplir. Chaque touche fait au moins 44 px de côté — la même
 * règle tactile que le reste de la cabine — et aucune ne dépend d'un survol,
 * qui n'existe pas au doigt.
 */
export function TouchKeyboard({ value, onChange, maxLength = 24, className }: TouchKeyboardProps) {
  function taper(lettre: string) {
    if (value.length >= maxLength) return;
    onChange(value + lettre);
  }

  function effacer() {
    onChange(value.slice(0, -1));
  }

  function espacer() {
    if (value.length === 0 || value.endsWith(' ') || value.length >= maxLength) return;
    onChange(`${value} `);
  }

  return (
    <div
      className={cn(
        'flex w-full max-w-[560px] flex-col items-center gap-2 [@media(max-height:520px)]:gap-1',
        className,
      )}
    >
      {RANGEES.map((rangee, index) => (
        <div key={index} className="flex w-full justify-center gap-1.5">
          {rangee.map((lettre) => (
            <button
              key={lettre}
              type="button"
              onClick={() => taper(lettre)}
              className="glass glass-edge grid size-11 shrink-0 place-items-center rounded-card text-base font-medium text-ink transition-colors duration-200 ease-calm active:scale-95"
            >
              {lettre}
            </button>
          ))}
        </div>
      ))}

      <div className="flex w-full justify-center gap-1.5">
        <button
          type="button"
          onClick={espacer}
          className="glass glass-edge h-11 flex-1 rounded-card text-sm text-ink-soft transition-colors duration-200 ease-calm active:scale-[0.98]"
        >
          Espace
        </button>
        <button
          type="button"
          onClick={effacer}
          disabled={value.length === 0}
          aria-label="Effacer la dernière lettre"
          className="glass glass-edge h-11 min-w-11 shrink-0 rounded-card px-4 text-sm text-ink-soft transition-colors duration-200 ease-calm active:scale-[0.98] disabled:opacity-40"
        >
          Effacer
        </button>
      </div>
    </div>
  );
}
