/**
 * Encodeur WAV, isolé sans aucune dépendance au DOM.
 *
 * Le serveur de bord décode l'audio avec `soundfile`, qui lit le WAV, le FLAC
 * et l'OGG mais pas le webm/opus que produirait un `MediaRecorder`. On
 * fabrique donc nous-mêmes un fichier WAV (PCM 16 bits, mono) à partir du flux
 * brut capturé dans le navigateur.
 *
 * Cette fonction ne dépend que d'`ArrayBuffer`, `DataView`, `Uint8Array` et
 * `Float32Array` — rien qui exige un navigateur. C'est volontaire : ni caméra
 * ni micro ne sont accessibles en développement sur ce poste, donc la seule
 * façon de vérifier que l'en-tête RIFF est correct est de la faire tourner
 * seule, sous Node, sur un signal de synthèse, puis de poster le résultat au
 * vrai serveur (voir le rapport de la tâche 23 pour cette vérification).
 */
export function pcmVersWav(blocs: Float32Array[], sampleRate: number): Uint8Array<ArrayBuffer> {
  const OCTETS_PAR_ECHANTILLON = 2; // PCM 16 bits
  const TAILLE_ENTETE = 44;

  const nombreEchantillons = blocs.reduce((total, bloc) => total + bloc.length, 0);
  const tailleDonnees = nombreEchantillons * OCTETS_PAR_ECHANTILLON;
  const tampon = new ArrayBuffer(TAILLE_ENTETE + tailleDonnees);
  const vue = new DataView(tampon);

  function ecrireChaine(offset: number, texte: string): void {
    for (let i = 0; i < texte.length; i++) vue.setUint8(offset + i, texte.charCodeAt(i));
  }

  // -- En-tête RIFF -----------------------------------------------------------
  ecrireChaine(0, 'RIFF');
  vue.setUint32(4, TAILLE_ENTETE + tailleDonnees - 8, true); // taille totale moins ces 8 octets
  ecrireChaine(8, 'WAVE');

  // -- Sous-bloc de format (« fmt ») --------------------------------------------
  ecrireChaine(12, 'fmt ');
  vue.setUint32(16, 16, true); // longueur du sous-bloc fmt : 16 pour du PCM non compressé
  vue.setUint16(20, 1, true); // format 1 = PCM entier
  vue.setUint16(22, 1, true); // un seul canal : on mesure une voix, pas une scène stéréo
  vue.setUint32(24, sampleRate, true);
  vue.setUint32(28, sampleRate * OCTETS_PAR_ECHANTILLON, true); // débit d'octets par seconde
  vue.setUint16(32, OCTETS_PAR_ECHANTILLON, true); // taille d'une trame (ici un seul canal)
  vue.setUint16(34, 16, true); // bits par échantillon

  // -- Sous-bloc de données -----------------------------------------------------
  ecrireChaine(36, 'data');
  vue.setUint32(40, tailleDonnees, true);

  // -- Échantillons, flottant [-1, 1] converti en entier 16 bits signé ---------
  let position = TAILLE_ENTETE;
  for (const bloc of blocs) {
    for (let i = 0; i < bloc.length; i++) {
      // Écrêtage avant conversion : un flux micro dépasse parfois [-1, 1] de
      // peu (crête d'un mot lancé fort), et le laisser passer ferait déborder
      // l'entier signé et inverserait le signe de l'échantillon converti.
      const echantillon = Math.max(-1, Math.min(1, bloc[i]));
      // Deux facteurs, un par signe : 32767 (2^15 - 1) côté positif et 32768
      // (2^15) côté négatif, pour que les deux bornes de [-1, 1] retombent
      // exactement sur les bornes de l'entier 16 bits signé.
      const entier16 = Math.round(echantillon < 0 ? echantillon * 0x8000 : echantillon * 0x7fff);
      vue.setInt16(position, entier16, true); // true = little-endian
      position += OCTETS_PAR_ECHANTILLON;
    }
  }

  return new Uint8Array(tampon);
}
