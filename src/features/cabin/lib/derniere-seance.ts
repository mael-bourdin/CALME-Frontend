/**
 * « Ta dernière séance date d'il y a 3 heures. » plutôt que la date brute
 * renvoyée par le serveur (2026-09-24T10:50:32…), qui s'affichait telle
 * quelle et se lisait à voix haute chiffre par chiffre.
 *
 * Une valeur qui n'est pas une date (le transport simulé renvoie « deux
 * jours ») est reprise telle quelle.
 */
export function phraseDerniereSeance(valeur: string | null, maintenant = Date.now()): string {
  if (!valeur) return 'Première séance. Assieds-toi et pose la main sur l’accoudoir.';

  const date = Date.parse(valeur);
  if (Number.isNaN(date)) return `Ta dernière séance remonte à ${valeur}.`;

  const minutes = Math.max(0, Math.round((maintenant - date) / 60_000));
  if (minutes < 1) return 'Ta dernière séance vient de se terminer.';
  if (minutes < 60) {
    return `Ta dernière séance date d’il y a ${minutes} minute${minutes > 1 ? 's' : ''}.`;
  }
  const heures = Math.round(minutes / 60);
  if (heures < 24)
    return `Ta dernière séance date d’il y a ${heures} heure${heures > 1 ? 's' : ''}.`;
  const jours = Math.round(heures / 24);
  if (jours === 1) return 'Ta dernière séance date d’hier.';
  return `Ta dernière séance date d’il y a ${jours} jours.`;
}
