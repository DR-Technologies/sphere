export type CubicBezierTuple = [number, number, number, number];

function sampleCurve(a1: number, a2: number, t: number) {
  const invT = 1 - t;
  return 3 * invT * invT * t * a1 + 3 * invT * t * t * a2 + t * t * t;
}

function sampleDerivative(a1: number, a2: number, t: number) {
  const invT = 1 - t;
  return 3 * invT * invT * a1 + 6 * invT * t * (a2 - a1) + 3 * t * t * (1 - a2);
}

function solveCurveX(x: number, x1: number, x2: number) {
  let t = x;

  for (let i = 0; i < 8; i += 1) {
    const xEstimate = sampleCurve(x1, x2, t) - x;
    const derivative = sampleDerivative(x1, x2, t);
    if (Math.abs(xEstimate) < 1e-6 || Math.abs(derivative) < 1e-6) {
      return t;
    }
    t -= xEstimate / derivative;
  }

  let t0 = 0;
  let t1 = 1;
  t = x;

  while (t0 < t1) {
    const xEstimate = sampleCurve(x1, x2, t);
    if (Math.abs(xEstimate - x) < 1e-6) {
      return t;
    }
    if (x > xEstimate) {
      t0 = t;
    } else {
      t1 = t;
    }
    t = (t1 - t0) * 0.5 + t0;
    if (Math.abs(t1 - t0) < 1e-6) {
      return t;
    }
  }

  return t;
}

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function evaluateCubicBezier(tuple: CubicBezierTuple, progress: number) {
  const [x1, y1, x2, y2] = tuple;
  const bounded = clamp01(progress);
  const t = solveCurveX(bounded, x1, x2);
  return clamp01(sampleCurve(y1, y2, t));
}
