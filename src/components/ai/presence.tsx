import { useEffect, useRef } from 'react';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme';

/**
 * Les six états de l'IA.
 *
 * Elle est monochrome partout sauf un : quand elle parle, elle devient
 * iridescente. La couleur est le signal qu'elle s'adresse à toi, pas une
 * décoration — c'est la seule surface colorée de l'interface.
 */
export type PresenceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'alert' | 'offline';

interface StateProfile {
  /** Amplitude de la turbulence, en fraction du rayon. */
  turbulence: number;
  /** Échelle de la sphère au repos. */
  scale: number;
  /** Vitesse de rotation, en tours par seconde. */
  spin: number;
  /** Respiration de la sphère : amplitude et période en secondes. */
  breath: readonly [number, number];
  dotScale: number;
  /** Proportion de points affichés. `offline` s'effondre. */
  density: number;
  color: 'iris' | 'quiet' | 'alert' | 'unknown' | 'accent';
  halo: number;
  micDot: boolean;
  arc: boolean;
}

const PROFILES: Record<PresenceState, StateProfile> = {
  // Elle est là, elle se tait. C'est l'état pendant l'exercice.
  idle: {
    turbulence: 0.02,
    scale: 0.9,
    spin: 0.012,
    breath: [0.008, 9],
    dotScale: 1,
    density: 1,
    color: 'quiet',
    halo: 0,
    micDot: false,
    arc: false,
  },
  // Micro ouvert. Le témoin rouge est obligatoire : la vie privée doit se voir.
  listening: {
    turbulence: 0.05,
    scale: 0.95,
    spin: 0.02,
    breath: [0.02, 3.4],
    dotScale: 1.05,
    density: 1,
    color: 'accent',
    halo: 0.1,
    micDot: true,
    arc: false,
  },
  // Les trente secondes entre la fin de la mesure et la consigne.
  thinking: {
    turbulence: 0.028,
    scale: 0.88,
    spin: 0.05,
    breath: [0.006, 5],
    dotScale: 1.08,
    density: 1,
    color: 'accent',
    halo: 0.08,
    micDot: false,
    arc: true,
  },
  // Le seul moment coloré du système.
  speaking: {
    turbulence: 0.11,
    scale: 1,
    spin: 0.035,
    breath: [0.03, 2.1],
    dotScale: 1.12,
    density: 1,
    color: 'iris',
    halo: 0.2,
    micDot: false,
    arc: false,
  },
  alert: {
    turbulence: 0.09,
    scale: 0.98,
    spin: 0.03,
    breath: [0.026, 2.4],
    dotScale: 1.14,
    density: 1,
    color: 'alert',
    halo: 0.22,
    micDot: false,
    arc: false,
  },
  // Le modèle local est coupé. Le système perd la personnalisation, pas sa
  // fonction — et il le montre plutôt que de faire semblant.
  offline: {
    turbulence: 0.02,
    scale: 0.78,
    spin: 0.006,
    breath: [0, 1],
    dotScale: 0.9,
    density: 0.42,
    color: 'unknown',
    halo: 0,
    micDot: false,
    arc: false,
  },
};

interface Particle {
  x: number;
  y: number;
  z: number;
  /** Décalage de phase, pour que les points ne turbulent pas ensemble. */
  phase: number;
  jitter: number;
  radius: number;
}

function lcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/**
 * Répartition de Fibonacci sur une sphère, puis perturbée.
 *
 * La densité au bord vient de la projection, pas d'un artifice. Sans la
 * perturbation on voit le réseau régulier, et la sphère ressemble à une grille
 * plutôt qu'à un nuage.
 */
function buildParticles(count: number): Particle[] {
  const random = lcg(20_800_417);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const particles: Particle[] = [];

  for (let i = 0; i < count; i += 1) {
    const y = Math.max(-1, Math.min(1, 1 - ((i + (random() - 0.5) * 1.6) / (count - 1)) * 2));
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i + (random() - 0.5) * 0.85;
    particles.push({
      x: Math.cos(theta) * ring,
      y,
      z: Math.sin(theta) * ring,
      phase: random() * Math.PI * 2,
      jitter: 0.8 + random() * 0.45,
      radius: 0.8 + random() * 0.45,
    });
  }
  return particles;
}

function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#7a93bc';
}

interface AIPresenceProps {
  state: PresenceState;
  /** Diamètre en pixels. */
  size?: number;
  className?: string;
  /** Nombre de points. Descendre sur les petites tailles. */
  count?: number;
}

export function AIPresence({ state, size = 180, className, count }: AIPresenceProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolved } = useTheme();
  const particleCount = count ?? (size < 80 ? 120 : size < 140 ? 260 : 440);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const profile = PROFILES[state];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    context.scale(dpr, dpr);

    const palette = {
      iris: [readVar('--c-iris-1'), readVar('--c-iris-2'), readVar('--c-iris-3')] as const,
      quiet: readVar('--c-quiet'),
      accent: readVar('--c-accent'),
      alert: readVar('--c-alert'),
      unknown: readVar('--c-unknown'),
    };

    const all = buildParticles(particleCount);
    const particles = all.slice(0, Math.round(all.length * profile.density));

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const center = size / 2;
    const baseRadius = size * 0.4;

    let frame = 0;
    const start = performance.now();

    function colorFor(projectedX: number, depth: number): string {
      const alpha = 0.32 + 0.68 * ((depth + 1) / 2);
      if (profile.color === 'iris') {
        // Les points de gauche tirent vers le rose, ceux de droite vers le cyan.
        const t = (projectedX + 1) / 2;
        const stops = palette.iris;
        const hex = t < 0.5 ? stops[0] : t < 0.85 ? stops[1] : stops[2];
        return hexToRgba(hex, alpha);
      }
      const solid =
        profile.color === 'alert'
          ? palette.alert
          : profile.color === 'unknown'
            ? palette.unknown
            : profile.color === 'accent'
              ? palette.accent
              : palette.quiet;
      return hexToRgba(solid, alpha);
    }

    function draw(now: number) {
      const elapsed = reduceMotion ? 0 : (now - start) / 1000;
      context!.clearRect(0, 0, size, size);

      const [breathAmp, breathPeriod] = profile.breath;
      const breath = 1 + Math.sin((elapsed / breathPeriod) * Math.PI * 2) * breathAmp;
      const radius = baseRadius * profile.scale * breath;
      const spin = elapsed * profile.spin * Math.PI * 2;

      if (profile.halo > 0) {
        const gradient = context!.createRadialGradient(
          center,
          center,
          0,
          center,
          center,
          size * 0.55,
        );
        const haloColor =
          profile.color === 'alert'
            ? palette.alert
            : profile.color === 'iris'
              ? palette.iris[1]
              : palette.accent;
        gradient.addColorStop(0, hexToRgba(haloColor, profile.halo));
        gradient.addColorStop(1, hexToRgba(haloColor, 0));
        context!.fillStyle = gradient;
        context!.fillRect(0, 0, size, size);
      }

      // Tri par profondeur : les points de devant se dessinent en dernier.
      const projected = particles.map((particle) => {
        const cos = Math.cos(spin);
        const sin = Math.sin(spin);
        const x = particle.x * cos - particle.z * sin;
        const z = particle.x * sin + particle.z * cos;
        const wobble =
          1 +
          profile.turbulence *
            particle.jitter *
            Math.sin(elapsed * 1.7 + particle.phase) *
            (reduceMotion ? 0.35 : 1);
        return { x: x * wobble, y: particle.y * wobble, z, radius: particle.radius };
      });
      projected.sort((a, b) => a.z - b.z);

      for (const point of projected) {
        const depthScale = 0.6 + 0.4 * ((point.z + 1) / 2);
        const dotRadius = Math.max(
          0.5,
          (size / 180) * 1.7 * profile.dotScale * point.radius * depthScale,
        );
        context!.beginPath();
        context!.arc(
          center + point.x * radius,
          center + point.y * radius,
          dotRadius,
          0,
          Math.PI * 2,
        );
        context!.fillStyle = colorFor(point.x, point.z);
        context!.fill();
      }

      // L'arc de calcul : le seul état qui ajoute un trait, parce qu'il faut
      // bien montrer que quelque chose se passe.
      if (profile.arc) {
        const arcRadius = size * 0.47;
        const sweep = Math.PI * 0.6;
        const offset = reduceMotion ? 0 : elapsed * 1.6;
        context!.beginPath();
        context!.arc(center, center, arcRadius, offset, offset + sweep);
        context!.strokeStyle = hexToRgba(palette.accent, 0.85);
        context!.lineWidth = Math.max(1.2, size / 90);
        context!.lineCap = 'round';
        context!.stroke();
      }

      // Le témoin du micro ouvert, hors de la sphère, impossible à rater.
      if (profile.micDot) {
        const dx = center + size * 0.33;
        const dy = center - size * 0.36;
        const pulse = reduceMotion ? 1 : 0.75 + 0.25 * Math.sin(elapsed * 3.2);
        const glow = context!.createRadialGradient(dx, dy, 0, dx, dy, size * 0.075);
        glow.addColorStop(0, hexToRgba(palette.alert, 0.4 * pulse));
        glow.addColorStop(1, hexToRgba(palette.alert, 0));
        context!.fillStyle = glow;
        context!.fillRect(dx - size * 0.1, dy - size * 0.1, size * 0.2, size * 0.2);

        context!.beginPath();
        context!.arc(dx, dy, Math.max(3, size * 0.024), 0, Math.PI * 2);
        context!.fillStyle = hexToRgba(palette.alert, pulse);
        context!.fill();
      }

      if (!reduceMotion) frame = requestAnimationFrame(draw);
    }

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [state, size, particleCount, resolved]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={cn('block', className)}
      role="img"
      aria-label={LABELS[state]}
    />
  );
}

const LABELS: Record<PresenceState, string> = {
  idle: 'C.A.L.M.E. est présente et silencieuse',
  listening: 'C.A.L.M.E. écoute, le micro est ouvert',
  thinking: 'C.A.L.M.E. calcule',
  speaking: 'C.A.L.M.E. parle',
  alert: 'C.A.L.M.E. signale un seuil franchi',
  offline: 'Le modèle local est indisponible',
};

/** Accepte #rgb, #rrggbb et les couleurs déjà en rgb(). */
function hexToRgba(color: string, alpha: number): string {
  if (color.startsWith('rgb')) {
    return color.replace(/rgba?\(([^)]+)\)/, (_, inner: string) => {
      const parts = inner
        .split(/[\s,/]+/)
        .filter(Boolean)
        .slice(0, 3);
      return `rgba(${parts.join(', ')}, ${alpha})`;
    });
  }
  let hex = color.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  const r = Number.parseInt(hex.slice(0, 2), 16) || 0;
  const g = Number.parseInt(hex.slice(2, 4), 16) || 0;
  const b = Number.parseInt(hex.slice(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
