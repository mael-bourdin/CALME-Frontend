export type Point = readonly [number, number];

/**
 * Catmull-Rom converti en béziers cubiques.
 *
 * La courbe passe par tous les points et n'a plus un seul angle. C'est ce qui
 * distingue un relevé d'une ligne brisée — et les relevés physiologiques ne
 * sautent pas d'une valeur à l'autre, ils dérivent.
 */
export function smoothPath(points: readonly Point[], tension = 0.5): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;

  const k = tension / 3;
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1[0] + (p2[0] - p0[0]) * k;
    const c1y = p1[1] + (p2[1] - p0[1]) * k;
    const c2x = p2[0] - (p3[0] - p1[0]) * k;
    const c2y = p2[1] - (p3[1] - p1[1]) * k;

    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }

  return d;
}

/** Projette des valeurs sur une boîte, avec une marge pour ne pas toucher les bords. */
export function toPoints(
  values: readonly number[],
  width: number,
  height: number,
  options: { min?: number; max?: number; pad?: number } = {},
): Point[] {
  if (values.length === 0) return [];
  const min = options.min ?? Math.min(...values);
  const max = options.max ?? Math.max(...values);
  const span = max - min || 1;
  const pad = options.pad ?? 3;
  const usable = height - pad * 2;

  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - pad - ((value - min) / span) * usable;
    return [x, y] as Point;
  });
}

/** Un arc de cercle en coordonnées SVG. 0 degré est en haut, sens horaire. */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const at = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)] as const;
  };
  const [sx, sy] = at(startDeg);
  const [ex, ey] = at(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}
