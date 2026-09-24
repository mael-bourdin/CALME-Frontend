import { useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { api } from '@/api';
import type { Level } from '@/api';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Curve } from '@/components/data/curve';
import { levelClasses } from '@/components/ui/tag';
import { useAsync } from '@/lib/use-async';
import { cn } from '@/lib/cn';
import { dateLisible } from '@/lib/date-lisible';

/** Note de bien-être sur 100 (100 = le mieux) : vert dès 60, rouge sous 35. */
function levelFor(index: number): Level {
  if (index >= 60) return 'green';
  if (index >= 35) return 'amber';
  return 'red';
}

const FEEDBACK_LABEL = {
  helped: 'ça a servi',
  'not-really': 'pas vraiment',
} as const;

/**
 * Le détail d'une personne.
 *
 * Le bandeau qui justifie l'ouverture de l'accès est la première chose lue,
 * avant même le nom. Hors alerte acquittée, ce détail demande l'accord explicite
 * de la personne, et l'ouverture est journalisée.
 */
export function MemberScreen() {
  const { crewId } = useParams();
  // Sans identifiant dans l'adresse (entrée par le dock), on ouvre le premier
  // membre réellement enrôlé plutôt qu'un identifiant de démonstration.
  const history = useAsync(async () => {
    const id = crewId ?? (await api.getCrewOverview())[0]?.member.id;
    if (!id) throw new Error('Aucun membre d’équipage enrôlé pour l’instant.');
    return api.getCrewHistory(id);
  }, [crewId]);

  if (history.loading) {
    return <p className="py-16 text-center text-ink-faint">Ouverture du dossier…</p>;
  }
  if (history.error || !history.data) {
    return <p className="py-16 text-center text-alert">{history.error ?? 'Dossier introuvable'}</p>;
  }

  const { member, points, sessions, accessGrant } = history.data;
  const current = points.at(-1)?.index ?? 0;
  const tone = levelClasses(levelFor(current));

  return (
    <div className="space-y-5">
      <GlassPanel
        density="thick"
        className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-alert/45 px-5 py-4 sm:px-6"
      >
        <Lock className="size-4 shrink-0 text-alert" strokeWidth={1.7} aria-hidden />
        <p className="min-w-0 flex-1 text-sm">
          {accessGrant.reason === 'alert-acknowledged'
            ? `Accès ouvert par l’alerte du ${dateLisible(accessGrant.grantedAt)}, acquittée par ${accessGrant.acknowledgedBy}.`
            : `Accès ouvert ${dateLisible(accessGrant.grantedAt)} avec l’accord explicite de la personne.`}
        </p>
        {/* La règle est écrite à côté de l'exception, pas dans une politique
            que personne n'ouvre : c'est ici qu'on est en train d'en profiter. */}
        <p className="text-sm text-ink-faint">Hors alerte, il faut l’accord de la personne.</p>
      </GlassPanel>

      <GlassPanel density="thick" className="flex flex-wrap items-center gap-5 p-6 sm:p-7">
        <span
          className={cn(
            'grid size-14 shrink-0 place-items-center rounded-full border-2 bg-overlay font-medium',
            tone.text,
            tone.border,
          )}
          aria-hidden
        >
          {member.initials}
        </span>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">{member.displayName}</h1>
          <p className="text-sm text-ink-soft">{member.role}</p>
        </div>

        <p className={cn('font-display text-5xl leading-none tabular', tone.text)}>
          {current}
          <span className="ml-2 font-sans text-sm text-ink-faint">sur 100</span>
        </p>
      </GlassPanel>

      <GlassPanel density="thick" className="space-y-4 p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-medium">Trente derniers jours</h2>
          <p className="text-sm text-ink-faint">
            C’est le type de dégradation lente que le système cherche à rendre visible tôt.
          </p>
        </div>

        <Curve
          values={points.map((point) => point.index)}
          min={10}
          max={90}
          color={
            levelFor(current) === 'red'
              ? 'var(--c-alert)'
              : levelFor(current) === 'amber'
                ? 'var(--c-watch)'
                : 'var(--c-calm)'
          }
          height={200}
          thresholds={[
            { value: 60, color: 'var(--c-watch)' },
            { value: 35, color: 'var(--c-alert)' },
          ]}
          aria-label={`Indice de ${member.displayName} sur trente jours`}
        />
      </GlassPanel>

      <GlassPanel density="thick" className="px-5 py-2 sm:px-6">
        <div className="divide-y divide-hairline/50">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-1 py-4 sm:grid-cols-[10rem_auto_1fr_auto]"
            >
              <p className="font-mono text-xs text-ink-faint">{dateLisible(session.at)}</p>

              <p className="flex items-center gap-2 font-mono tabular">
                <span className={levelClasses(levelFor(session.indexBefore)).text}>
                  {session.indexBefore}
                </span>
                <span className="text-ink-faint">→</span>
                <span
                  className={
                    session.indexAfter === null
                      ? 'text-ink-faint'
                      : levelClasses(levelFor(session.indexAfter)).text
                  }
                >
                  {session.indexAfter ?? '—'}
                </span>
              </p>

              <p className="col-span-2 text-sm sm:col-span-1">{session.exerciseName}</p>

              <p className="col-span-2 text-sm text-ink-faint sm:col-span-1 sm:text-right">
                {session.feedback ? FEEDBACK_LABEL[session.feedback] : 'interrompue'}
              </p>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
