/**
 * « aujourd'hui à 11:59 », « hier à 09:29 », « le 22/09 à 14:00 » plutôt que
 * la date brute du serveur (2026-09-24T11:59:08.116336+00:00), qui
 * s'affichait telle quelle dans le poste du médecin.
 *
 * Une valeur qui n'est pas une date (le transport simulé renvoie des libellés
 * déjà rédigés) est reprise telle quelle.
 */
export function dateLisible(valeur: string | null | undefined, maintenant = new Date()): string {
  if (!valeur) return '—';
  const date = new Date(valeur);
  if (Number.isNaN(date.getTime())) return valeur;

  const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const jour = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const ecartJours = Math.round((jour(maintenant) - jour(date)) / 86_400_000);
  if (ecartJours === 0) return `aujourd’hui à ${heure}`;
  if (ecartJours === 1) return `hier à ${heure}`;
  const jj = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  return `le ${jj} à ${heure}`;
}
