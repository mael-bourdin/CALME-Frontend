import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import { App } from './App';
import { installerDeverrouillageAudio } from './features/cabin/audio/lecteur';

const container = document.getElementById('root');
if (!container) throw new Error('Élément racine introuvable');

// Le premier toucher, quel qu'il soit, autorise la cabine à parler ensuite.
installerDeverrouillageAudio();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
