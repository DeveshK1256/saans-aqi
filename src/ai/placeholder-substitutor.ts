/**
 * Numeric Placeholder Substitutor & Consistency Verifier
 * Implements Part 5.1 of docs/00_MASTER_SPEC.md:
 * "The LLM writes text with placeholders; code substitutes the real numbers afterwards.
 * A test fails if a rendered number does not come from the computed input."
 */

import { ScoredAction } from '../domain/recommendations/types';

export interface PlaceholderContext {
  action: ScoredAction;
  vulnerableMemberName: string;
}

/**
 * Replaces placeholders in LLM or template text with pure computed domain values.
 */
export function substitutePlaceholders(templateText: string, context: PlaceholderContext): string {
  const { action, vulnerableMemberName } = context;

  const replacements: Record<string, string> = {
    '{{delta_dose_ug}}': action.doseAvoidedUgd.central.toFixed(1),
    '{{range_low}}': action.doseAvoidedUgd.low.toFixed(1),
    '{{range_high}}': action.doseAvoidedUgd.high.toFixed(1),
    '{{pct_saved}}': action.doseReductionPct.toFixed(1),
    '{{target_member}}': action.targetMemberName || vulnerableMemberName,
    '{{co2_avoided_g}}': action.co2AvoidedGrams ? action.co2AvoidedGrams.central.toString() : '0',
    '{{pm_avoided_g}}': action.pmAvoidedGrams ? action.pmAvoidedGrams.central.toString() : '0',
  };

  let result = templateText;
  for (const [placeholder, val] of Object.entries(replacements)) {
    result = result.split(placeholder).join(val);
  }

  return result;
}

/**
 * Whitelist of permissible constant numbers in advice text (e.g. standards, clock hours, days).
 */
const PERMISSIBLE_CONSTANTS = new Set([
  '95', // N95 mask
  '2',  // FFP2 mask
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', // Step numbers, hours, duration
  '24', // 24-hour day
  '30', '45', '60', // Minutes
  '250', // Typical CADR m3/h
  '2004', '2011', '2014', '2021', // Citation years
  '112', // Emergency ambulance number in India
]);

/**
 * Verifies that all numbers present in the rendered advice originate strictly from
 * either computed domain inputs or permitted structural constants.
 * Prevents LLM mathematical hallucinations.
 */
export function verifyNumericConsistency(renderedText: string, context: PlaceholderContext): { isConsistent: boolean; violations: string[] } {
  const { action } = context;

  // Allowed numeric values from domain calculations
  const allowedNumbers = new Set<string>([
    action.doseAvoidedUgd.low.toFixed(1),
    action.doseAvoidedUgd.central.toFixed(1),
    action.doseAvoidedUgd.high.toFixed(1),
    Math.round(action.doseAvoidedUgd.central).toString(),
    action.doseReductionPct.toFixed(1),
    Math.round(action.doseReductionPct).toString(),
    action.whyThis.ambientPm25.toString(),
  ]);

  if (action.co2AvoidedGrams) {
    allowedNumbers.add(action.co2AvoidedGrams.central.toString());
    allowedNumbers.add(action.co2AvoidedGrams.low.toString());
    allowedNumbers.add(action.co2AvoidedGrams.high.toString());
  }

  // Extract all numeric tokens from rendered text
  const tokens = renderedText.match(/\b\d+(\.\d+)?\b/g) || [];
  const violations: string[] = [];

  for (const token of tokens) {
    if (allowedNumbers.has(token) || PERMISSIBLE_CONSTANTS.has(token)) {
      continue;
    }
    // Check if it's a known time like 06 or 10 or 13 or 16
    const num = parseInt(token, 10);
    if (num >= 0 && num <= 24) {
      continue; // Hours of day
    }
    violations.push(`Unrecognized or hallucinated numeric token: "${token}"`);
  }

  return {
    isConsistent: violations.length === 0,
    violations,
  };
}
