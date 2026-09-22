# C.A.L.M.E. — interface

Cabine d'analyse et de limitation du métabolisme des explorateurs.
Workshop Horizon 2080 · EPSI Bachelor 3 · groupe 10.

L'astronaute s'assoit, pose la main sur l'accoudoir, et la cabine mesure pendant une minute
son rythme cardiaque, sa sudation, son visage et sa voix. Elle en déduit un indice de charge
sur 100, enchaîne sur un exercice adapté, et affiche deux chiffres à la fin : avant, après.

Ce dépôt ne contient que le client. Le serveur de bord — FastAPI, PostgreSQL, Ollama — tourne
sur une autre machine.

---

## Démarrer

```bash
npm install
cp .env.example .env
npm run dev
```

L'application tourne sur <http://localhost:5173> avec des données simulées, sans backend.

| Route      | Ce qu'on y trouve                                                         |
| ---------- | ------------------------------------------------------------------------- |
| `/`        | Le parcours complet de la cabine, du bonjour à la clôture                 |
| `/medecin` | Le tableau de bord du médecin de bord                                     |

---

## Brancher le serveur Python

Le front est autonome : il ne sait rien de l'endroit où tourne le FastAPI. Tout passe par
l'environnement.

```dotenv
VITE_USE_MOCK=false                       # bascule sur le vrai serveur
VITE_API_BASE_URL=/api/v1                 # relatif : le proxy ou le serveur de bord s'en charge
VITE_DEV_API_TARGET=http://localhost:8000 # cible du proxy de développement
```

En développement, le proxy Vite renvoie `/api` vers `VITE_DEV_API_TARGET`, ce qui évite d'ouvrir
CORS côté serveur. En production, le serveur de bord sert les fichiers statiques lui-même, donc
le chemin relatif marche aussi.

Deux implémentations vivent derrière une seule interface, `src/api/transport.ts` :

- `src/api/live.ts` parle au FastAPI ;
- `src/api/mock/transport.ts` simule tout en mémoire, y compris les défaillances.

Aucun écran ne connaît autre chose que cette interface. Passer de l'une à l'autre ne demande de
toucher à aucun composant.

### Routes attendues côté serveur

```
GET  /cabins/{id}/occupant            l'occupante courante
GET  /cabins/{id}/sensors             les quatre capteurs et leur dernière fenêtre
GET  /crew/{id}/last-session          date de la dernière séance
POST /sessions                        ouvre une séance
GET  /sessions/{id}                   état courant
POST /sessions/{id}/close             clôture, renvoie avant/après
POST /sessions/{id}/consent           caméra et micro
GET  /sessions/{id}/assessment        le dernier résultat calculé
WS   /sessions/{id}/stream            le flux temps réel
POST /assessments/{id}/recommend      déclenche la décision puis la rédaction
POST /recommendations/{id}/feedback   le retour de l'astronaute
GET  /crew/overview                   vue d'équipage
GET  /crew/{id}/history               historique individuel
GET  /alerts                          alertes
POST /alerts/{id}/acknowledge         acquittement
GET  /trends                          agrégats trente jours
GET  /power        POST /power/setpoint
GET  /health
```

Les types du contrat sont dans `src/api/types.ts`. Ils sont écrits à la main pour l'instant :
**dès que le serveur publie son schéma OpenAPI, ils doivent être générés depuis lui.** Le dossier
prévoit que le contrat ne s'écrive qu'une fois, côté serveur, pour qu'une incohérence se voie à
la compilation plutôt qu'en démonstration.

---

## Ce que le front ne fait pas

Il ne calcule aucun indice et ne décide aucun niveau. L'indice, le palier et la liste d'exercices
autorisés viennent du serveur, où du code ordinaire les fixe de façon déterministe. Le modèle de
langage ne sert qu'à choisir dans la liste et à rédiger la consigne.

Conséquence directe : quand le modèle est indisponible, l'écran continue de fonctionner et le dit.
La consigne devient générique, et c'est écrit dessus — le système perd la personnalisation, pas
sa fonction.

Il ne nomme pas non plus qui acquitte une alerte. Le serveur le déduit de la session authentifiée.
Une trace du type « accès ouvert par l'alerte acquittée par untel » ne prouve rien si c'est
l'appelant qui choisit le nom.

---

## Parti pris d'interface

**La mesure derrière la vitre.** Deux plans, toujours. Le plan arrière porte la mesure brute — le
tracé cardiaque, la courbe sur trente jours — à fond perdu, jamais dans une carte. Le plan avant
est du verre qui flotte dessus et porte l'interprétation. C'est aussi la thèse du projet : la
machine mesure, l'IA formule, et on voit à travers jusqu'à la mesure.

**La couleur est un signal.** Tout est sobre. Les trois états de l'indice portent du sens — vert
sous 40, orange entre 40 et 70, rouge au-dessus — et la sphère devient iridescente uniquement
quand l'IA parle. Pas de fond coloré, pas de dégradé décoratif.

**Une seule chose active à l'écran.** L'interface s'adresse à quelqu'un de fatigué, parfois
stressé, souvent dans la pénombre. Jamais plus d'un bouton primaire, jamais deux informations qui
bougent en même temps.

**Les seuils se voient.** 40 et 70 sont tracés sur chaque courbe et marqués sur chaque réglette.
La décision du moteur de règles doit être lisible à l'écran, pas cachée dans le code.

**La vie privée se montre.** Le micro ouvert porte un témoin rouge. Couper la caméra est un geste,
pas un réglage enfoui. Quand un signal manque, l'écran annonce sa confiance réduite au lieu de
faire comme si de rien n'était.

### Typographie

Bodoni Moda porte les grands titres et les chiffres qui ont du sens — l'indice, les deux nombres
de la clôture. IBM Plex Mono porte les relevés d'instrument. Inter porte le reste. La distinction
n'est pas décorative : `58 → 34` est un résultat que la personne doit lire, `62 bpm` est une
valeur que la machine relève.

### Thèmes

Clair par défaut, sombre disponible. Le mode sombre n'est pas décoratif : le dossier décrit
l'écran de la cabine comme devant rester sombre, parce qu'il fait partie de l'environnement de la
séance. Le poste du médecin est consulté en lumière normale. La préférence est posée avant le
premier rendu par un script dans `index.html`, sinon l'écran part en clair pendant une frame.

---

## Structure

```
src/
├── api/              contrat, client HTTP, WebSocket, transport simulé
├── app/              routeur
├── components/
│   ├── ai/           la sphère de présence et la bulle de parole
│   ├── data/         courbe, sparkline, cadran, réglette
│   └── ui/           verre, bouton, étiquette, dock, bascule de thème
├── features/
│   ├── cabin/        le parcours de la séance
│   ├── dashboard/    le poste du médecin
│   └── states/       le catalogue des écrans
├── lib/              thème, lissage de courbe, hooks
└── styles/           jetons et thèmes
```

La sphère de l'IA est rendue en canvas et pas en SVG : quatre cents points animés à soixante
images par seconde, un nœud DOM par point n'aurait pas tenu. Les points sont répartis par suite
de Fibonacci puis perturbés — sans la perturbation, le réseau régulier se voit et la sphère
ressemble à une grille.

---

## Qualité

```bash
npm run typecheck    # tsc --noEmit
npm run build        # typecheck puis build de production
npm run format       # prettier
```

L'interface respecte `prefers-reduced-motion`. C'est posé une fois pour toutes par un
`MotionConfig reducedMotion="user"` à la racine plutôt que composant par composant : les
déplacements sautent à leur état final, les fondus restent, et la boucle de la sphère s'arrête sur
une image fixe. Personne ne perd d'information en coupant le mouvement. Les cibles tactiles font au moins 44 px. Les courbes portent un
`aria-label` décrivant ce qu'elles montrent, et les réglettes sont des `role="meter"`.

---

## Déploiement

```bash
npm run build
```

`dist/` contient tout : aucune compilation n'a lieu à bord, aucun paquet n'est téléchargé. Le
serveur de bord sert ces fichiers statiques. C'est une contrainte du sujet — le vaisseau n'a ni
liaison avec la Terre ni possibilité de reconstruire quoi que ce soit.

---

## Données simulées

Huit membres d'équipage, un catalogue de huit exercices, trente jours d'historique et le budget
énergétique poste par poste du dossier. Le générateur est déterministe : une démonstration doit
être reproductible.

`VITE_MOCK_SPEED` accélère la minute de mesure simulée, à 4 par défaut. Sans effet sur le vrai
serveur.
