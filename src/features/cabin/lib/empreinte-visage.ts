import * as faceapi from '@vladmandic/face-api';

import { messageErreurCamera } from './erreur-camera';

/**
 * Calcule une empreinte faciale sur place, sans jamais faire sortir l'image
 * du navigateur — c'est l'engagement central du projet.
 *
 * Trois modèles locaux, servis depuis `public/models-face` (jamais un CDN,
 * la cabine doit fonctionner hors ligne) : le détecteur (tiny, pensé pour du
 * temps réel sur du matériel modeste comme le Pi), les 68 points du visage
 * (pour aligner le visage avant de le décrire) et le descripteur à 128
 * flottants qui sert ensuite de base à la comparaison — au seuil euclidien
 * de 0,6, la convention documentée par face-api et déjà appliquée côté
 * serveur (voir Backend/app/services/visage.py).
 *
 * Une empreinte est la moyenne de plusieurs descripteurs pris sur des images
 * successives, pas un seul : une image isolée (yeux mi-clos, tête tournée,
 * flou de mouvement) suffisait à faire rater une reconnaissance, ou à enrôler
 * une empreinte médiocre qui ratait ensuite toutes les suivantes.
 */

const DOSSIER_MODELES = '/models-face';

/** Le visage doit être vu dans cette fenêtre, sinon on abandonne : la
 * reconnaissance ne doit pas retenir la caméra si personne ne se présente. */
const DELAI_MAX_MS = 6000;
const INTERVALLE_ESSAI_MS = 200;

/** 416 plutôt que 320 par défaut (multiple de 32 exigé) : un visage à un
 * mètre dans une image 640×480 reste détecté. Seuil abaissé pour la lumière
 * tamisée de la cabine ; le descripteur, lui, reste aussi exigeant. */
const OPTIONS_DETECTEUR = new faceapi.TinyFaceDetectorOptions({
  inputSize: 416,
  scoreThreshold: 0.4,
});

export type ResultatEmpreinte = { ok: true; empreinte: number[] } | { ok: false; raison: string };

let chargement: Promise<void> | null = null;

/** Les trois modèles ne sont chargés qu'une fois, même si l'empreinte est
 * calculée plusieurs fois dans la même page (arrivée, puis enrôlement). */
function chargerModeles(): Promise<void> {
  if (!chargement) {
    chargement = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(DOSSIER_MODELES),
      faceapi.nets.faceLandmark68Net.loadFromUri(DOSSIER_MODELES),
      faceapi.nets.faceRecognitionNet.loadFromUri(DOSSIER_MODELES),
    ]).then(() => undefined);
    // Un échec de chargement (réseau coupé au mauvais moment) ne doit pas
    // condamner les essais suivants de la même page.
    chargement.catch(() => {
      chargement = null;
    });
  }
  return chargement;
}

function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function moyenne(descripteurs: Float32Array[]): number[] {
  const somme = new Array<number>(descripteurs[0].length).fill(0);
  for (const d of descripteurs) for (let i = 0; i < d.length; i++) somme[i] += d[i];
  return somme.map((v) => v / descripteurs.length);
}

/**
 * Ouvre la caméra, prend `echantillons` descripteurs, coupe la caméra et
 * renvoie leur moyenne. Si la fenêtre se termine avec au moins un
 * descripteur, on s'en contente. Ne lève jamais d'exception : l'échec porte
 * une raison lisible, à afficher telle quelle.
 */
export async function capturerEmpreinteDetaillee(echantillons = 3): Promise<ResultatEmpreinte> {
  let flux: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;

  try {
    try {
      await chargerModeles();
    } catch {
      return { ok: false, raison: 'modèles de reconnaissance introuvables' };
    }

    try {
      flux = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
    } catch (e) {
      return { ok: false, raison: messageErreurCamera(e) };
    }

    video = document.createElement('video');
    video.srcObject = flux;
    video.muted = true;
    video.playsInline = true;
    await video.play();

    const echeance = Date.now() + DELAI_MAX_MS;
    const descripteurs: Float32Array[] = [];

    while (Date.now() < echeance && descripteurs.length < echantillons) {
      try {
        // Une image ratée (métadonnées vidéo pas encore prêtes, sursaut du
        // pilote de la caméra) ne doit pas interrompre toute la fenêtre
        // d'essai : on retente à l'image suivante.
        const resultat = await faceapi
          .detectSingleFace(video, OPTIONS_DETECTEUR)
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (resultat) descripteurs.push(resultat.descriptor);
      } catch {
        /* retenté à la prochaine itération */
      }
      await attendre(INTERVALLE_ESSAI_MS);
    }

    if (descripteurs.length === 0) {
      return { ok: false, raison: 'visage non détecté — place-toi face à la caméra, bien éclairé' };
    }
    return { ok: true, empreinte: moyenne(descripteurs) };
  } catch (e) {
    return { ok: false, raison: messageErreurCamera(e) };
  } finally {
    // Libération immédiate, dans tous les cas : le voyant de la webcam ne
    // doit jamais rester allumé après cette fonction.
    flux?.getTracks().forEach((piste) => piste.stop());
    if (video) video.srcObject = null;
  }
}

/** Forme courte : l'empreinte, ou `null` pour n'importe quelle raison. */
export async function capturerEmpreinte(echantillons = 3): Promise<number[] | null> {
  const resultat = await capturerEmpreinteDetaillee(echantillons);
  return resultat.ok ? resultat.empreinte : null;
}
