/**
 * Map a value to a percentage of the [min, max] gauge range.
 * A degenerate or inverted range (max <= min) has no meaningful span, so it
 * resolves to a defined 0% instead of producing 0/0 = NaN (or -0), which would
 * otherwise leak into the needle angle as an invalid `rotate(NaNdeg)`.
 */
export function computeGaugePercentage(value: number, min: number, max: number): number {
  if (max <= min) {
    return 0;
  }
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
}

/** Map a gauge percentage to a half-circle needle angle in degrees. */
export function computeGaugeAngle(percentage: number): number {
  return (percentage / 100) * 180 - 90;
}
