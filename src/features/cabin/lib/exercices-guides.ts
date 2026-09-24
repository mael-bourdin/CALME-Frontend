/**
 * Le contenu des exercices : les rythmes de respiration, et ce que Lila dit
 * pendant les exercices guidés à la voix.
 *
 * Les identifiants sont ceux du catalogue du serveur
 * (Backend/app/services/exercices.py). Un exercice absent d'ici retombe sur
 * la cohérence cardiaque, jamais sur un écran vide.
 *
 * Les scripts sont minutés en secondes depuis le début. Ils couvrent la durée
 * prévue au catalogue : la dernière réplique arrive avant la fin, pour laisser
 * un temps de silence avant l'écran de clôture.
 */

export interface EtapeRespiration {
  label: string;
  seconds: number;
}

export const RESPIRATIONS: Record<string, EtapeRespiration[]> = {
  cc365: [
    { label: 'Inspire', seconds: 5 },
    { label: 'Expire', seconds: 5 },
  ],
  // 6-6-6-6 et non 4-4-4-4 : c'est le tempo de la piste jouée dessous
  // (80 BPM, conçue pour une respiration au carré de six temps).
  carre: [
    { label: 'Inspire', seconds: 6 },
    { label: 'Retiens', seconds: 6 },
    { label: 'Expire', seconds: 6 },
    { label: 'Attends', seconds: 6 },
  ],
  '478': [
    { label: 'Inspire', seconds: 4 },
    { label: 'Retiens', seconds: 7 },
    { label: 'Expire', seconds: 8 },
  ],
  soupir: [
    { label: 'Inspire', seconds: 2 },
    { label: 'Encore un peu', seconds: 1 },
    { label: 'Expire longuement', seconds: 6 },
    { label: 'Repos', seconds: 3 },
  ],
};

export const RESPIRATION_PAR_DEFAUT = RESPIRATIONS.cc365;

/** Ce que Lila dit avant la première respiration. */
export const INTRO_RESPIRATION: Record<string, string> = {
  cc365:
    'Suis le cercle. Il se remplit quand tu inspires, il se vide quand tu expires. Cinq secondes chacun.',
  carre:
    'Respire au rythme de la musique. Six temps pour inspirer, six pour retenir, six pour expirer, six pour attendre.',
  '478':
    'Inspire par le nez sur quatre temps, retiens sur sept, et expire lentement par la bouche sur huit.',
  soupir:
    'Deux inspirations par le nez, la deuxième plus courte, pour bien remplir. Puis une longue expiration par la bouche.',
};

export interface Replique {
  /** Secondes depuis le début de l'exercice. */
  t: number;
  texte: string;
}

export const SCRIPTS: Record<string, Replique[]> = {
  visage: [
    {
      t: 0,
      texte: 'Installe-toi confortablement. On va détendre ton visage, une zone après l’autre.',
    },
    { t: 12, texte: 'Fronce fort les sourcils. Tiens trois secondes.' },
    { t: 19, texte: 'Et relâche. Sens ton front devenir lisse.' },
    { t: 34, texte: 'Ferme les paupières en serrant, doucement mais fermement.' },
    { t: 41, texte: 'Relâche. Laisse tes yeux se reposer.' },
    { t: 56, texte: 'Serre les dents, sens ta mâchoire se contracter.' },
    { t: 63, texte: 'Relâche. Laisse ta bouche s’entrouvrir légèrement.' },
    { t: 80, texte: 'Pose ta langue contre le palais, et laisse tes joues tomber.' },
    { t: 102, texte: 'Une dernière fois : fronce, serre les yeux, serre la mâchoire… maintenant.' },
    { t: 110, texte: 'Et relâche tout d’un coup.' },
    { t: 128, texte: 'Respire lentement par le nez. Ton visage est lourd et détendu.' },
    { t: 162, texte: 'Garde cette sensation. Quand tu es prêt, ouvre les yeux.' },
  ],
  jacobson: [
    {
      t: 0,
      texte:
        'On va contracter puis relâcher chaque partie du corps. Cinq secondes de tension, puis on lâche tout.',
    },
    { t: 15, texte: 'Serre fort les poings.' },
    { t: 21, texte: 'Relâche. Sens la chaleur descendre dans tes mains.' },
    { t: 55, texte: 'Plie les bras et contracte-les, comme pour montrer tes muscles.' },
    { t: 61, texte: 'Relâche. Laisse tes bras retomber, lourds.' },
    { t: 95, texte: 'Monte les épaules jusqu’aux oreilles.' },
    { t: 101, texte: 'Et laisse-les tomber d’un coup.' },
    { t: 135, texte: 'Fronce le visage, serre les yeux et la mâchoire.' },
    { t: 141, texte: 'Relâche. Ton visage s’adoucit.' },
    { t: 180, texte: 'Rentre le ventre et contracte-le.' },
    { t: 186, texte: 'Relâche. Laisse ta respiration revenir d’elle-même.' },
    { t: 225, texte: 'Serre les cuisses l’une contre l’autre.' },
    { t: 231, texte: 'Relâche. Tes jambes deviennent lourdes.' },
    { t: 270, texte: 'Tire les pointes de pied vers toi.' },
    { t: 276, texte: 'Et relâche. Tout ton corps est posé.' },
    {
      t: 320,
      texte:
        'Parcours ton corps des pieds à la tête. S’il reste une tension quelque part, respire vers elle.',
    },
    { t: 400, texte: 'Reste encore un moment dans cette détente.' },
    { t: 450, texte: 'Doucement, bouge les doigts, les pieds. Tu peux revenir.' },
  ],
  scan: [
    {
      t: 0,
      texte:
        'Ferme les yeux si tu le veux. On va simplement porter l’attention dans le corps, sans rien changer.',
    },
    { t: 25, texte: 'Sens ta respiration. L’air qui entre, l’air qui sort.' },
    { t: 60, texte: 'Porte ton attention sur tes pieds. Le contact avec le sol, la température.' },
    { t: 95, texte: 'Remonte dans les jambes. Les mollets, les genoux, les cuisses.' },
    { t: 130, texte: 'Le bassin, posé sur le siège. Laisse-le peser.' },
    { t: 165, texte: 'Le ventre, qui monte et descend avec la respiration.' },
    { t: 200, texte: 'La poitrine, le cœur. Remarque son rythme, sans le juger.' },
    { t: 235, texte: 'Le dos, tout le long de la colonne.' },
    { t: 270, texte: 'Les épaules, les bras, jusqu’au bout des doigts.' },
    { t: 305, texte: 'La nuque, puis le visage. La mâchoire, les yeux, le front.' },
    { t: 345, texte: 'Et maintenant tout le corps, en même temps, comme un seul espace calme.' },
    { t: 395, texte: 'Prends une grande inspiration. Quand tu es prêt, ouvre les yeux.' },
  ],
  ancrage5432: [
    { t: 0, texte: 'On revient ici, dans la cabine. Pas besoin de répondre à voix haute.' },
    { t: 12, texte: 'Regarde autour de toi. Nomme cinq choses que tu vois.' },
    { t: 60, texte: 'Écoute. Nomme quatre choses que tu entends.' },
    { t: 110, texte: 'Touche. Trois choses que tu sens sous tes mains, sous ton corps.' },
    { t: 160, texte: 'Deux odeurs, même très légères.' },
    { t: 205, texte: 'Et une chose que tu goûtes, ou que tu aimerais goûter.' },
    { t: 250, texte: 'Tu es ici, maintenant. Respire lentement.' },
    { t: 285, texte: 'Quand tu es prêt, on termine.' },
  ],
  recul: [
    {
      t: 0,
      texte:
        'Prenons un peu de recul, sans chercher la bonne réponse. Pense à ce qui t’a pesé aujourd’hui.',
    },
    {
      t: 40,
      texte:
        'Dans cette situation, qu’est-ce qui dépendait vraiment de toi ? Et qu’est-ce qui n’en dépendait pas ?',
    },
    { t: 110, texte: 'Si un coéquipier vivait exactement la même chose, que lui dirais-tu ?' },
    { t: 180, texte: 'Est-ce que ce sera encore important dans une semaine ? Dans un mois ?' },
    { t: 240, texte: 'Choisis une seule petite chose que tu peux faire demain à ce sujet.' },
    { t: 280, texte: 'Merci. Respire profondément. Faire le point, c’est déjà beaucoup.' },
  ],
  visualisation: [
    {
      t: 0,
      texte: 'Ferme les yeux. Imagine que tu te lèves et que tu marches jusqu’au grand hublot.',
    },
    { t: 40, texte: 'Dehors, la Terre. Immense, bleue, silencieuse.' },
    { t: 80, texte: 'Le soleil se lève sur son bord. Une fine ligne dorée qui s’élargit.' },
    { t: 125, texte: 'Cherche un endroit que tu aimes. Une ville, une côte, une maison.' },
    { t: 170, texte: 'Imagine ce qu’on y entend en ce moment. Des voix, le vent, la mer.' },
    { t: 215, texte: 'Quelqu’un là-bas pense peut-être à toi, à cet instant.' },
    { t: 265, texte: 'Garde cette image. Elle est à toi, tu peux y revenir quand tu veux.' },
    { t: 320, texte: 'Doucement, reviens dans la cabine. Ouvre les yeux quand tu es prêt.' },
  ],
  playlist: [
    {
      t: 0,
      texte: 'Tu n’as rien à faire. Laisse la musique ralentir, et ta respiration avec elle.',
    },
    { t: 300, texte: 'Continue simplement d’écouter.' },
    { t: 570, texte: 'La musique va bientôt s’arrêter. Prends ton temps.' },
  ],
  circadien: [
    {
      t: 0,
      texte:
        'La lumière de la cabine va suivre l’heure de bord. Laisse tes yeux s’y habituer, sans effort.',
    },
    { t: 420, texte: 'Continue de respirer calmement.' },
    { t: 860, texte: 'La séquence se termine. Reviens doucement.' },
  ],
  sieste: [
    {
      t: 0,
      texte:
        'Ferme les yeux. Tu peux dormir, la cabine veille et te réveillera dans vingt minutes.',
    },
    { t: 30, texte: 'Laisse ton corps s’alourdir. Il n’y a rien d’autre à faire.' },
    { t: 1140, texte: 'C’est l’heure de revenir. Doucement. Bouge les doigts, étire-toi.' },
  ],
  journal: [
    {
      t: 0,
      texte:
        'Raconte ta journée à voix haute, comme elle te vient. Personne ne l’écoutera, rien n’est enregistré.',
    },
    { t: 120, texte: 'Qu’est-ce qui t’a surpris aujourd’hui ?' },
    { t: 240, texte: 'À qui as-tu pensé ?' },
    { t: 360, texte: 'Qu’aimerais-tu dire que tu n’as pas dit ?' },
    { t: 450, texte: 'Merci. On termine doucement.' },
  ],
};

/** Crédits obligatoires des pistes sous licence Creative Commons BY. */
export const CREDITS_MUSIQUE: Record<string, string> = {
  '/audio/respiration-carree-80bpm.ogg':
    'Musique : « Box Breathing & Binaural Beats », Breathwork Beats by Touek — CC BY',
};
