import { UserPlus } from 'lucide-react';
import type { CrewMember } from '@/api';
import { cn } from '@/lib/cn';

interface CrewPickerProps {
  crew: CrewMember[];
  onSelect: (member: CrewMember) => void;
  onNew: () => void;
  /** La liste elle-même est en cours de chargement. */
  loading?: boolean;
  className?: string;
}

/**
 * Le repli de l'accueil : personne n'a été reconnu, ou la caméra n'a pas pu
 * essayer. On demande à la personne de se désigner elle-même.
 *
 * Une grille de pastilles plutôt qu'une liste verticale : huit membres
 * d'équipage tiennent sur deux lignes sur la dalle 800×480, une colonne
 * unique les aurait fait défiler hors de l'écran. Chaque pastille est une
 * cible tactile à part entière (≥44 px), pas un texte qu'on espère toucher
 * juste.
 */
export function CrewPicker({ crew, onSelect, onNew, loading, className }: CrewPickerProps) {
  return (
    <div className={cn('flex w-full flex-col items-center', className)}>
      <p className="text-sm text-ink-faint">Je ne t'ai pas reconnu. Touche ton nom.</p>

      <div
        role="list"
        aria-label="Équipage"
        aria-busy={loading}
        // `overflow-y-auto` + `max-h` : un enrôlement en direct pendant la
        // démonstration agrandit cette liste au fil de la séance, elle ne
        // doit jamais pousser le bouton « Je suis nouveau » hors de l'écran
        // 480 px de haut — elle défile plutôt que déborder.
        className="mt-6 grid w-full max-w-[640px] grid-cols-2 gap-3 overflow-y-auto [@media(max-height:520px)]:mt-3 [@media(max-height:520px)]:max-h-[168px] [@media(max-height:520px)]:gap-2 sm:grid-cols-3"
      >
        {crew.map((member) => (
          <button
            key={member.id}
            type="button"
            role="listitem"
            onClick={() => onSelect(member)}
            className="glass glass-edge flex min-h-11 items-center gap-3 rounded-panel px-4 py-3 text-left transition-colors duration-300 ease-calm active:scale-[0.98]"
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-full border border-hairline bg-overlay/60 text-xs font-medium text-ink-soft"
              aria-hidden
            >
              {member.initials}
            </span>
            <span className="min-w-0 truncate text-sm text-ink">{member.displayName}</span>
          </button>
        ))}

        {crew.length === 0 && !loading && (
          <p className="col-span-full text-center text-sm text-ink-faint">
            Personne n'est encore enrôlé.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onNew}
        className="glass glass-edge mt-6 inline-flex h-11 items-center gap-2 rounded-pill px-5 text-sm text-ink-soft transition-colors duration-300 ease-calm active:scale-[0.98] [@media(max-height:520px)]:mt-3"
      >
        <UserPlus className="size-4" strokeWidth={1.7} aria-hidden />
        Je suis nouveau
      </button>
    </div>
  );
}
