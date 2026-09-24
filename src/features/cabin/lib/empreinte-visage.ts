import * as faceapi from '@vladmandic/face-api';

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
 */

const DOSSIER_MODELES = '/models-face';

/** Le visage doit être détecté dans cette fenêtre, sinon on abandonne : la
 * reconnaissance n'a droit qu'à une tentative par arrivée, elle ne doit pas
 * retenir la caméra ouverte indéfiniment si personne ne se présente. */
const DELAI_MAX_MS = 4000;
const INTERVALLE_ESSAI_MS = 250;

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
  }
  return chargement;
}

function attendre(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ouvre la caméra, prend une seule empreinte et coupe la caméra aussitôt —
 * avant même que l'appelant ait fini d'utiliser le résultat.
 *
 * Ne lève jamais d'exception : `null` veut dire « pas d'empreinte », pour
 * n'importe quelle raison (caméra refusée, modèles indisponibles, aucun
 * visage détecté à temps). C'est à l'appelant de décider quoi faire du
 * repli ; cette fonction ne fait que le rendre possible.
 */
export async function capturerEmpreinte(): Promise<number[] | null> {
  let flux: MediaStream | null = null;
  let video: HTMLVideoElement | null = null;

  try {
    await chargerModeles();

    flux = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240 },
    });

    video = document.createElement('video');
    video.srcObject = flux;
    video.muted = true;
    await video.play();

    const echeance = Date.now() + DELAI_MAX_MS;
    const options = new faceapi.TinyFaceDetectorOptions();

    while (Date.now() < echeance) {
      try {
        // Une image ratée (métadonnées vidéo pas encore prêtes, sursaut du
        // pilote de la caméra) ne doit pas interrompre toute la fenêtre
        // d'essai : seul l'échec de l'ouverture de la caméra, plus haut, est
        // définitif. Ici, on retente à l'image suivante.
        const resultat = await faceapi
          .detectSingleFace(video, options)
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (resultat) return Array.from(resultat.descriptor);
      } catch {
        // Retenté à la prochaine itération, voir ci-dessus.
      }
      await attendre(INTERVALLE_ESSAI_MS);
    }

    return null; // personne détecté à temps : pas un échec, juste rien à décrire
  } catch {
    return null;
  } finally {
    // Libération immédiate, dans tous les cas — visage trouvé, délai
    // écoulé, ou erreur en cours de route : le voyant de la webcam ne doit
    // jamais rester allumé après cette fonction.
    flux?.getTracks().forEach((piste) => piste.stop());
    if (video) video.srcObject = null;
  }
}
