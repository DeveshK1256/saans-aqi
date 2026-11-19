import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rankRecommendations } from '@/domain/recommendations/action-ranker';
import { GeminiProvider } from '@/ai/gemini-provider';
import { HouseholdProfileInputSchema } from '@/domain/household/schema';

const RequestSchema = z.object({
  householdId: z.string().optional(),
  profile: HouseholdProfileInputSchema,
  ambientPm25: z.number().min(5).max(1000).default(180),
  lang: z.enum(['en', 'hi', 'mr']).default('en'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RequestSchema.parse(body);

    const recSet = rankRecommendations({
      householdId: parsed.householdId || 'hh_demo',
      profile: {
        id: parsed.householdId || 'hh_demo',
        userId: 'usr_demo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...parsed.profile,
      } as any,
      ambientPm25: parsed.ambientPm25,
    });

    const gemini = new GeminiProvider();
    const phrasedActions = await Promise.all(
      recSet.topActions.map(async action => {
        const advice = await gemini.phraseAction(action, recSet.vulnerableMemberName, parsed.lang);
        return {
          ...action,
          headline: advice.headline,
          steps: advice.steps,
          whyThisText: advice.whyThis,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        ...recSet,
        topActions: phrasedActions,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err?.message || 'Failed to evaluate recommendations',
        },
      },
      { status: 400 }
    );
  }
}
