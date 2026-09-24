import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { useEffect, useRef, useState } from 'react';

import { api } from '../../../api';
import { localiserVisage } from '../lib/empreinte-visage';
import type { BoiteVisage } from '../lib/empreinte-visage';
import { messageErreurCamera } from '../lib/erreur-camera';

/**
 * L'indice facial, calculé dans le navigateur de la cabine.
 *
 * Bridé à 320×240 et 10 images par seconde. Ce n'est pas de la prudence
 * gratuite : le Pi fait tourner Chromium, la webcam et MediaPipe sur les mêmes
 * cœurs, et l'indice facial est le moins discriminant des quatre signaux. Il
 * n'a pas à prendre le CPU des trois autres.
 */

const FPS = 10;
/** Le visage est relocalisé deux fois par seconde : il bouge peu, et la
 * détection coûte plus cher que l'analyse du recadrage. */
const TOUS_LES_N_IMAGES = 5;
/** Côté du recadrage envoyé à MediaPipe, et marge autour du visage. */
const COTE_RECADRAGE = 320;
const MARGE_RECADRAGE = 2.2;

/** Un carré centré sur le visage, élargi, borné à l'image. */
function carreAutour(boite: BoiteVisage, largeur: number, hauteur: number) {
  const cote = Math.min(Math.max(boite.width, boite.height) * MARGE_RECADRAGE, largeur, hauteur);
  const cx = boite.x + boite.width / 2;
  const cy = boite.y + boite.height / 2;
  const sx = Math.min(Math.max(0, cx - cote / 2), largeur - cote);
  const sy = Math.min(Math.max(0, cy - cote / 2), hauteur - cote);
  return { sx, sy, cote };
}
const FENETRE_S = 30;
const SEUIL_CLIGNEMENT = 0.5;

function valeur(formes: { categoryName: string; score: number }[], nom: string): number {
  return formes.find((f) => f.categoryName === nom)?.score ?? 0;
}

export function useFaceIndex(sessionId: string | null, actif: boolean) {
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const clignements = useRef<number[]>([]);
  const yeuxFermes = useRef(false);
  const tensions = useRef<number[]>([]);
  const sourires = useRef<number[]>([]);
  const matrices = useRef<number[][]>([]);

  useEffect(() => {
    if (!actif || !sessionId) return;

    // Le hook est paramétré par sessionId et actif : il est conçu pour
    // survivre à un changement de séance sans démontage. Sans cette remise à
    // zéro, la fenêtre glissante de 30 s de la nouvelle séance démarrerait
    // polluée par les mesures de la précédente, et un `pret`/`erreur` périmé
    // s'afficherait le temps que le nouveau landmarker soit prêt.
    setPret(false);
    setErreur(null);
    clignements.current = [];
    yeuxFermes.current = false;
    tensions.current = [];
    sourires.current = [];
    matrices.current = [];

    let vivant = true;
    let flux: MediaStream | null = null;
    let landmarker: FaceLandmarker | null = null;
    let timerAnalyse = 0;
    let timerEnvoi = 0;

    async function demarrer() {
      try {
        const fluxLocal = await navigator.mediaDevices.getUserMedia({
          // Haute définition : le visage est ensuite recadré (voir plus bas),
          // il faut assez de pixels pour qu'un visage lointain reste net.
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: FPS },
        });
        if (!vivant) {
          // Le nettoyage est déjà passé pendant l'attente de la caméra : à ce
          // moment-là `flux` valait encore `null`, il n'a donc rien pu couper.
          // Le flux vient tout juste d'être ouvert : si on ne l'éteint pas ici,
          // le voyant de la webcam reste allumé après la fin de la séance —
          // le pire défaut possible sur une cabine qui promet de ne pas filmer.
          fluxLocal.getTracks().forEach((piste) => piste.stop());
          return;
        }
        flux = fluxLocal;

        const video = document.createElement('video');
        video.srcObject = flux;
        video.muted = true;
        await video.play();
        // `flux` est déjà assigné : si le démontage arrive ici, la fonction de
        // nettoyage du useEffect sait maintenant le couper elle-même.
        if (!vivant) return;

        // Le CDN jsDelivr n'est pas joignable à bord : le WASM est copié en
        // local dans public/wasm, servi comme n'importe quel autre asset statique.
        const fileset = await FilesetResolver.forVisionTasks('/wasm');
        const landmarkerLocal = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: '/models/face_landmarker.task' },
          outputFaceBlendshapes: true,
          minFaceDetectionConfidence: 0.3,
          outputFacialTransformationMatrixes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        if (!vivant) {
          // Même raisonnement que pour la caméra : le landmarker vient d'être
          // créé, la fonction de nettoyage ne le connaît pas encore et ne peut
          // donc pas le fermer à notre place.
          landmarkerLocal.close();
          return;
        }
        landmarker = landmarkerLocal;
        setPret(true);

        // MediaPipe ne voit pas un visage petit dans le champ (caméra grand
        // angle posée loin) : on repère le visage dans l'image entière, puis
        // on lui donne un recadrage où il remplit le cadre.
        const recadrage = document.createElement('canvas');
        recadrage.width = COTE_RECADRAGE;
        recadrage.height = COTE_RECADRAGE;
        const pinceau = recadrage.getContext('2d');
        let boite: BoiteVisage | null = null;
        let compteur = 0;
        let localisationEnCours = false;

        timerAnalyse = window.setInterval(() => {
          if (!landmarker || !pinceau || !video.videoWidth) return;
          if (compteur++ % TOUS_LES_N_IMAGES === 0 && !localisationEnCours) {
            localisationEnCours = true;
            void localiserVisage(video)
              .then((trouvee) => {
                if (trouvee) boite = trouvee;
              })
              .catch(() => undefined)
              .finally(() => {
                localisationEnCours = false;
              });
          }
          if (!boite) return;
          const { sx, sy, cote } = carreAutour(boite, video.videoWidth, video.videoHeight);
          pinceau.drawImage(video, sx, sy, cote, cote, 0, 0, COTE_RECADRAGE, COTE_RECADRAGE);
          const resultat = landmarker.detectForVideo(recadrage, performance.now());
          const formes = resultat.faceBlendshapes?.[0]?.categories ?? [];
          if (formes.length === 0) return;

          const sourcils =
            (valeur(formes, 'browDownLeft') +
              valeur(formes, 'browDownRight') +
              valeur(formes, 'browInnerUp')) /
            3;
          const bouche = (valeur(formes, 'mouthPressLeft') + valeur(formes, 'mouthPressRight')) / 2;
          tensions.current.push(sourcils * 0.7 + bouche * 0.3);
          if (tensions.current.length > FPS * FENETRE_S) tensions.current.shift();
          sourires.current.push(
            (valeur(formes, 'mouthSmileLeft') + valeur(formes, 'mouthSmileRight')) / 2,
          );
          if (sourires.current.length > FPS * FENETRE_S) sourires.current.shift();

          // Front montant seulement : sans ça, un œil fermé deux secondes
          // compterait pour vingt clignements.
          const ferme =
            Math.max(valeur(formes, 'eyeBlinkLeft'), valeur(formes, 'eyeBlinkRight')) >
            SEUIL_CLIGNEMENT;
          if (ferme && !yeuxFermes.current) clignements.current.push(Date.now());
          yeuxFermes.current = ferme;

          const matrice = resultat.facialTransformationMatrixes?.[0]?.data;
          if (matrice) {
            matrices.current.push([matrice[12], matrice[13], matrice[14]]);
            if (matrices.current.length > FPS * FENETRE_S) matrices.current.shift();
          }
        }, 1000 / FPS);

        timerEnvoi = window.setInterval(() => {
          if (tensions.current.length === 0) return;
          const limite = Date.now() - FENETRE_S * 1000;
          clignements.current = clignements.current.filter((t) => t > limite);

          const tension = tensions.current.reduce((a, b) => a + b, 0) / tensions.current.length;
          const blinkRate = (clignements.current.length * 60) / FENETRE_S;
          const stillness = calculerImmobilite(matrices.current);

          void api
            .sendFaceIndex(sessionId!, {
              at: new Date().toISOString(),
              tension: Math.min(1, Math.max(0, tension)),
              // Le sourire relève la note du visage (voir notation côté serveur).
              smile: Math.min(
                1,
                Math.max(
                  0,
                  sourires.current.reduce((x, y) => x + y, 0) /
                    Math.max(1, sourires.current.length),
                ),
              ),
              blinkRate,
              stillness,
            })
            .catch(() => {
              /* Une coupure réseau est un état, pas un échec : la passerelle
                 tamponne, l'indice facial suivant repartira. */
            });
        }, 1000);
      } catch (e) {
        if (vivant) setErreur(messageErreurCamera(e));
      }
    }

    void demarrer();

    return () => {
      vivant = false;
      window.clearInterval(timerAnalyse);
      window.clearInterval(timerEnvoi);
      landmarker?.close();
      flux?.getTracks().forEach((piste) => piste.stop());
    };
  }, [sessionId, actif]);

  return { pret, erreur };
}

function calculerImmobilite(positions: number[][]): number {
  if (positions.length < 2) return 1;
  const moyennes = [0, 1, 2].map((i) => positions.reduce((a, p) => a + p[i], 0) / positions.length);
  const variance =
    positions.reduce(
      (a, p) => a + [0, 1, 2].reduce((s, i) => s + (p[i] - moyennes[i]) ** 2, 0),
      0,
    ) / positions.length;
  return Math.min(1, Math.max(0, 1 - variance / 10));
}
