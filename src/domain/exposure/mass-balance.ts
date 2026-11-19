/**
 * Single-Zone Mass Balance Physical Model for Indoor Air Quality
 * Implements Part 3.3 of docs/00_MASTER_SPEC.md.
 *
 * Differential Equation:
 *   dCin/dt = P * a * Cout + S/V - (a + k + Qp/V) * Cin
 *
 * Parameters:
 *   a: Air exchange rate (h^-1)
 *   P: Penetration factor (dimensionless)
 *   k: Deposition rate (h^-1)
 *   Qp: Effective air cleaner CADR (m3/h)
 *   V: Room air volume (m3)
 *   S: Indoor emission source rate (ug/h)
 *   Cout: Ambient outdoor concentration (ug/m3)
 *   Cin: Indoor concentration (ug/m3)
 *
 * Analytical Solution:
 *   lambda = a + k + Qp/V
 *   Css = (P * a * Cout + S / V) / lambda
 *   Cin(t + dt) = Css + (Cin(t) - Css) * exp(-lambda * dt)
 */

export interface MassBalanceInput {
  airExchangeRate: number; // a (h^-1)
  penetrationFactor: number; // P (0.6 - 1.0)
  depositionRate: number; // k (h^-1)
  cadrEffectiveM3h: number; // Qp (m3/h)
  roomVolumeM3: number; // V (m3)
  indoorSourceRateUgH: number; // S (ug/h)
  outdoorConcUgM3: number; // Cout (ug/m3)
  initialIndoorConcUgM3: number; // Cin(0) (ug/m3)
  timeStepHours: number; // dt (h)
}

export interface MassBalanceOutput {
  steadyStateConcUgM3: number; // Css (ug/m3)
  finalIndoorConcUgM3: number; // Cin(t + dt) (ug/m3)
  lossRateLambda: number; // lambda = a + k + Qp/V (h^-1)
  averageConcUgM3: number; // Time-integrated average over dt
}

/**
 * Solves the single-zone mass balance equation for indoor PM2.5.
 * Pure physical calculation with no side effects.
 */
export function solveMassBalance(input: MassBalanceInput): MassBalanceOutput {
  const {
    airExchangeRate,
    penetrationFactor,
    depositionRate,
    cadrEffectiveM3h,
    roomVolumeM3,
    indoorSourceRateUgH,
    outdoorConcUgM3,
    initialIndoorConcUgM3,
    timeStepHours,
  } = input;

  if (roomVolumeM3 <= 0) {
    throw new Error('Room volume must be greater than zero');
  }

  // lambda = a + k + Qp/V (total particle removal rate)
  const lossRateLambda = airExchangeRate + depositionRate + cadrEffectiveM3h / roomVolumeM3;

  if (lossRateLambda <= 0) {
    throw new Error('Total loss rate (lambda) must be strictly positive');
  }

  // Steady-state indoor concentration (Css)
  // Generation terms: Outdoor penetration (P * a * Cout) + Indoor emissions (S / V)
  const generationRate = penetrationFactor * airExchangeRate * outdoorConcUgM3 + indoorSourceRateUgH / roomVolumeM3;
  const steadyStateConcUgM3 = generationRate / lossRateLambda;

  // Transient analytical solution at dt
  const decayTerm = Math.exp(-lossRateLambda * timeStepHours);
  const finalIndoorConcUgM3 = steadyStateConcUgM3 + (initialIndoorConcUgM3 - steadyStateConcUgM3) * decayTerm;

  // Time-weighted average concentration over interval [0, dt]:
  // C_avg = Css + (Cin(0) - Css) * (1 - exp(-lambda*dt)) / (lambda * dt)
  const avgDecay = (1 - decayTerm) / (lossRateLambda * timeStepHours);
  const averageConcUgM3 = steadyStateConcUgM3 + (initialIndoorConcUgM3 - steadyStateConcUgM3) * avgDecay;

  return {
    steadyStateConcUgM3: Math.max(0, steadyStateConcUgM3),
    finalIndoorConcUgM3: Math.max(0, finalIndoorConcUgM3),
    lossRateLambda,
    averageConcUgM3: Math.max(0, averageConcUgM3),
  };
}
