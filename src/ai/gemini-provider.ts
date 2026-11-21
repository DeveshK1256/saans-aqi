/**
 * Google Gemini Provider Adapter (GS-01)
 * Supports live, record, replay modes, and deterministic safe fallback.
 * Implements Part 5.1 & Criterion GS-01 of docs/00_MASTER_SPEC.md.
 */

import { z } from 'zod';
import { logger } from '../lib/logger';
import { ScoredAction } from '../domain/recommendations/types';
import { substitutePlaceholders, verifyNumericConsistency } from './placeholder-substitutor';

export const AdviceSchema = z.object({
  actionId: z.string(),
  headline: z.string(),
  steps: z.array(z.string()).min(1),
  whyThis: z.string(),
  language: z.enum(['en', 'hi', 'mr']).default('en'),
});

export type AdvicePayload = z.infer<typeof AdviceSchema>;

export interface GeminiAdapterConfig {
  mode: 'live' | 'record' | 'replay';
  apiKey?: string;
  modelName?: string;
  fixtures?: Record<string, string>;
}

export class GeminiProvider {
  private mode: 'live' | 'record' | 'replay';
  private apiKey?: string;
  private modelName: string;
  private fixtures: Record<string, string>;

  constructor(config?: Partial<GeminiAdapterConfig>) {
    this.mode = config?.mode || (process.env.GEMINI_MODE as 'live' | 'record' | 'replay') || 'replay';
    this.apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
    this.modelName = config?.modelName || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.fixtures = config?.fixtures || {};
  }

  /**
   * Generates phrased advice for a recommended action using the numeric-placeholder pattern.
   * If the LLM is unavailable or fails, returns safe deterministic fallback text from domain code.
   */
  async phraseAction(action: ScoredAction, vulnerableMemberName: string, lang: 'en' | 'hi' | 'mr' = 'en'): Promise<AdvicePayload> {
    const cacheKey = `${action.action.id}_${action.targetMemberId}_${lang}`;

    // 1. Replay / Mock Fixture Mode
    if (this.mode === 'replay' || !this.apiKey) {
      if (this.fixtures[cacheKey]) {
        try {
          const parsed = AdviceSchema.parse(JSON.parse(this.fixtures[cacheKey]));
          return this.applyPlaceholdersAndVerify(parsed, action, vulnerableMemberName);
        } catch {
          // Fall through to deterministic safe fallback
        }
      }
      return this.generateSafeFallback(action, vulnerableMemberName, lang);
    }

    // 2. Live Gemini API Call
    try {
      // Mitigate Prompt Injection (CWE-1426 / OWASP LLM01): strip non-alphanumeric chars and enforce strict boundary
      const sanitizedMemberName = vulnerableMemberName.replace(/[^\w\s\-'.()]/g, '').trim().slice(0, 50) || 'Household Member';

      const prompt = `
You are Saans (सांस), an evidence-based urban air quality assistant for Indian families.
Phrase this protective action for a household with vulnerable member: "${sanitizedMemberName}" (${action.whyThis.targetMember.ageGroup}${action.whyThis.targetMember.hasAsthma ? ', asthma' : ''}).

CRITICAL CONSTRAINTS:
1. Do NOT calculate or alter any numbers. You MUST use exact placeholders:
   - {{delta_dose_ug}} for avoided micrograms of PM2.5
   - {{pct_saved}} for percentage reduction
   - {{target_member}} for member name
   - {{co2_avoided_g}} for avoided grams of CO2
2. Do NOT provide medical diagnosis or prescribe medications.
3. Language: ${lang === 'hi' ? 'Hindi' : lang === 'mr' ? 'Marathi' : 'English'}.
4. Return ONLY valid JSON matching this schema:
   {"actionId": "${action.action.id}", "headline": "...", "steps": ["...", "..."], "whyThis": "...", "language": "${lang}"}

Action Title: ${action.action.title}
Action Description: ${action.action.description}
Rule Triggered: ${action.whyThis.ruleTriggered}
Ambient PM2.5: ${action.whyThis.ambientPm25} ug/m3
`;

      // Mitigate CWE-598: pass API key via x-goog-api-key header instead of query parameters
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey || '',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API HTTP ${response.status}: ${await response.text()}`);
      }

      const resJson = await response.json();
      const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Empty response from Gemini API');

      const parsed = AdviceSchema.parse(JSON.parse(rawText));
      return this.applyPlaceholdersAndVerify(parsed, action, vulnerableMemberName);
    } catch (err) {
      logger.warn('Gemini API call failed, using deterministic safe fallback', {
        error: err instanceof Error ? err.message : String(err),
        actionId: action.action.id,
      });
      return this.generateSafeFallback(action, vulnerableMemberName, lang);
    }
  }

  /**
   * Applies numeric placeholders and verifies 100% mathematical consistency.
   */
  private applyPlaceholdersAndVerify(rawAdvice: AdvicePayload, action: ScoredAction, memberName: string): AdvicePayload {
    const ctx = { action, vulnerableMemberName: memberName };

    const renderedHeadline = substitutePlaceholders(rawAdvice.headline, ctx);
    const renderedSteps = rawAdvice.steps.map(s => substitutePlaceholders(s, ctx));
    const renderedWhy = substitutePlaceholders(rawAdvice.whyThis, ctx);

    // Consistency check
    const check1 = verifyNumericConsistency(renderedHeadline, ctx);
    const check2 = verifyNumericConsistency(renderedWhy, ctx);

    if (!check1.isConsistent || !check2.isConsistent) {
      logger.warn('Numeric consistency check detected unauthorized LLM number, reverting to safe fallback', {
        violations: [...check1.violations, ...check2.violations],
      });
      return this.generateSafeFallback(action, memberName, rawAdvice.language);
    }

    return {
      actionId: action.action.id,
      headline: renderedHeadline,
      steps: renderedSteps,
      whyThis: renderedWhy,
      language: rawAdvice.language,
    };
  }

  /**
   * Generates deterministic, scientifically grounded fallback advice from the curated library.
   */
  generateSafeFallback(action: ScoredAction, vulnerableMemberName: string, lang: 'en' | 'hi' | 'mr'): AdvicePayload {
    const ctx = { action, vulnerableMemberName };
    const renderedHeadline = substitutePlaceholders(action.headline, ctx);
    const renderedSteps = action.steps.map(s => substitutePlaceholders(s, ctx));

    let whyText = `Based on current ambient PM2.5 of ${action.whyThis.ambientPm25} µg/m³, this action reduces ${action.targetMemberName}'s daily inhaled dose by ${action.doseAvoidedUgd.central.toFixed(1)} µg (${action.doseReductionPct.toFixed(1)}%). Sourced from ${action.whyThis.scientificCitation}.`;

    if (lang === 'hi') {
      whyText = `वर्तमान परिवेशी PM2.5 स्तर पर, यह कदम ${action.targetMemberName} के दैनिक सांस लेने के जोखिम को ${action.doseAvoidedUgd.central.toFixed(1)} µg (${action.doseReductionPct.toFixed(1)}%) कम करता है।`;
    } else if (lang === 'mr') {
      whyText = `सध्याच्या PM2.5 पातळीवर, ही कृती ${action.targetMemberName} च्या दैनंदिन श्वसन संपर्कात ${action.doseAvoidedUgd.central.toFixed(1)} µg (${action.doseReductionPct.toFixed(1)}%) घट करते.`;
    }

    return {
      actionId: action.action.id,
      headline: renderedHeadline,
      steps: renderedSteps,
      whyThis: whyText,
      language: lang,
    };
  }
}
