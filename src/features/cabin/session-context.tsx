import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { api } from '@/api';
import type {
  Assessment,
  ConnectionState,
  ConsentState,
  CrewMember,
  Feedback,
  Recommendation,
  SensorFrame,
  SessionOutcome,
  SessionStream,
} from '@/api';

/**
 * Le déroulé d'une séance.
 *
 * `thinking` est volontairement une étape à part : le dossier se donne trente
 * secondes entre la fin de la mesure et l'affichage de la consigne, et cette
 * attente doit être visible plutôt que subie.
 */
export type Phase = 'idle' | 'measuring' | 'thinking' | 'result' | 'exercise' | 'closing' | 'done';

interface SessionContextValue {
  phase: Phase;
  member: CrewMember | null;
  lastSessionAt: string | null;
  sessionId: string | null;

  /** Le dernier échantillon reçu, pour afficher le pouls en direct. */
  frame: SensorFrame | null;
  elapsedSeconds: number;
  totalSeconds: number;

  assessment: Assessment | null;
  recommendation: Recommendation | null;
  outcome: SessionOutcome | null;

  consent: ConsentState;
  connection: ConnectionState;
  /** Renseigné quand le serveur est injoignable ; l'écran le dit. */
  error: string | null;

  /**
   * Retient qui s'est présenté à l'accueil — reconnu par la caméra, touché
   * dans la liste de repli, ou tout juste enrôlé — et va chercher sa
   * dernière séance. L'accueil est la seule source de vérité sur « qui »,
   * plus une valeur fixe côté serveur : c'est tout le sens de la
   * reconnaissance faciale.
   */
  identify: (member: CrewMember) => Promise<void>;
  start: () => Promise<void>;
  acceptExercise: () => void;
  finishExercise: () => Promise<void>;
  sendFeedback: (feedback: Feedback) => Promise<void>;
  reset: () => void;
  toggleConsent: (key: keyof ConsentState) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [member, setMember] = useState<CrewMember | null>(null);
  const [lastSessionAt, setLastSessionAt] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [frame, setFrame] = useState<SensorFrame | null>(null);
  const [elapsedSeconds, setElapsed] = useState(0);
  const [totalSeconds, setTotal] = useState(60);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null);
  const [consent, setConsent] = useState<ConsentState>({ camera: true, microphone: true });
  const [connection, setConnection] = useState<ConnectionState>('closed');
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<SessionStream | null>(null);

  // Qui s'assoit dans la cabine n'est plus supposé d'avance : l'accueil le
  // découvre lui-même (reconnaissance faciale, puis liste, puis enrôlement —
  // voir HomeScreen). Seul le consentement est encore préchargé ici, parce
  // que l'accueil en a besoin avant même de décider s'il tente la caméra.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const storedConsent = await api.getConsent();
        if (!cancelled) setConsent(storedConsent);
      } catch (cause) {
        // Le consentement par défaut (caméra et micro ouverts) reste actif :
        // une panne ici ne prive de rien de plus que la reconnaissance
        // faciale, qui a son propre repli.
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Erreur inconnue');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const identify = useCallback(async (identified: CrewMember) => {
    setMember(identified);
    try {
      const last = await api.getLastSessionAt(identified.id);
      setLastSessionAt(last);
    } catch {
      // La dernière séance n'est qu'un confort d'affichage ; son absence ne
      // doit pas empêcher de commencer une mesure.
      setLastSessionAt(null);
    }
  }, []);

  useEffect(() => () => streamRef.current?.close(), []);

  const start = useCallback(async () => {
    if (!member) return;
    setError(null);
    setFrame(null);
    setElapsed(0);
    setAssessment(null);
    setRecommendation(null);
    setOutcome(null);

    try {
      const session = await api.openSession(member.id);
      setSessionId(session.id);
      setPhase('measuring');

      const stream = api.streamSession(session.id);
      streamRef.current = stream;
      stream.onConnectionChange(setConnection);

      stream.subscribe((event) => {
        switch (event.type) {
          case 'frame':
            setFrame(event.payload);
            break;
          case 'progress':
            setElapsed(event.payload.elapsedSeconds);
            setTotal(event.payload.totalSeconds);
            break;
          case 'assessment': {
            setAssessment(event.payload);
            setPhase('thinking');
            // La décision est prise, reste la rédaction de la consigne.
            void api
              .recommend(event.payload.id)
              .then((next) => {
                setRecommendation(next);
                setPhase('result');
              })
              .catch((cause: unknown) => {
                setError(cause instanceof Error ? cause.message : 'Consigne indisponible');
                setPhase('result');
              });
            break;
          }
          default:
            break;
        }
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible d’ouvrir une séance');
      setPhase('idle');
    }
  }, [member]);

  const acceptExercise = useCallback(() => setPhase('exercise'), []);

  const finishExercise = useCallback(async () => {
    if (!sessionId) return;
    setPhase('closing');
    try {
      const result = await api.closeSession(sessionId);
      setOutcome(result);
      setPhase('done');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Clôture impossible');
      setPhase('done');
    } finally {
      streamRef.current?.close();
      streamRef.current = null;
    }
  }, [sessionId]);

  const sendFeedback = useCallback(
    async (feedback: Feedback) => {
      if (!recommendation) return;
      try {
        await api.sendFeedback(recommendation.id, feedback);
      } catch {
        // Un retour perdu ne doit pas bloquer la sortie de la cabine.
      }
    },
    [recommendation],
  );

  const reset = useCallback(() => {
    streamRef.current?.close();
    streamRef.current = null;
    setPhase('idle');
    setSessionId(null);
    setFrame(null);
    setElapsed(0);
    setAssessment(null);
    setRecommendation(null);
    setOutcome(null);
    setConnection('closed');
    setError(null);
    // La cabine oublie qui vient de sortir : la personne suivante doit être
    // identifiée à son tour, pas hériter du prénom de la précédente.
    setMember(null);
    setLastSessionAt(null);
  }, []);

  const toggleConsent = useCallback(
    async (key: keyof ConsentState) => {
      const next = { ...consent, [key]: !consent[key] };
      setConsent(next); // optimiste : la bascule doit être immédiate
      try {
        const confirmed = await api.setConsent(sessionId ?? 'standby', next);
        setConsent(confirmed);
      } catch {
        setConsent(consent);
      }
    },
    [consent, sessionId],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      phase,
      member,
      lastSessionAt,
      sessionId,
      frame,
      elapsedSeconds,
      totalSeconds,
      assessment,
      recommendation,
      outcome,
      consent,
      connection,
      error,
      identify,
      start,
      acceptExercise,
      finishExercise,
      sendFeedback,
      reset,
      toggleConsent,
    }),
    [
      phase,
      member,
      lastSessionAt,
      sessionId,
      frame,
      elapsedSeconds,
      totalSeconds,
      assessment,
      recommendation,
      outcome,
      consent,
      connection,
      error,
      identify,
      start,
      acceptExercise,
      finishExercise,
      sendFeedback,
      reset,
      toggleConsent,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession doit être utilisé dans un SessionProvider');
  return context;
}
