/**
 * AI-powered classification for entities that don't have platform-specific APIs.
 * Uses Anthropic Claude Sonnet as the classifier.
 * Only called when free APIs can't determine category or underground score.
 */
import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

export type ClassificationResult = {
  score: number; // 1-100: 1=completely unknown, 100=household name
  category: string; // music, fashion, restaurant, art, tech, podcast, other
  reason: string;
  name?: string; // cleaned-up name if different from input
};

/**
 * Classify an entity's underground score and category.
 * Returns a 1-100 score where lower = more underground = foundable.
 */
export async function classifyEntity(params: {
  name: string;
  category?: string;
  platform?: string;
  followerCount?: number;
  description?: string;
}): Promise<ClassificationResult> {
  const anthropic = getClient();
  if (!anthropic) {
    return { score: 30, category: params.category ?? 'other', reason: 'AI classification unavailable' };
  }

  try {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: `You classify entities for an app where users discover underground/emerging things before they blow up. Rate how mainstream something is on a 1-100 scale.

Guidelines:
- 1-20: Truly unknown, local, or brand new
- 21-40: Small but has a following in their niche
- 41-60: Known in their scene, starting to break out
- 61-80: Well-established, significant following
- 81-100: Mainstream, household name, huge brand

Categories: music, fashion, restaurant, art, tech, podcast, other

Entity: ${params.name}
${params.category ? `Suspected category: ${params.category}` : ''}
${params.platform ? `Found on: ${params.platform}` : ''}
${params.followerCount ? `Known followers: ${params.followerCount.toLocaleString()}` : ''}
${params.description ? `Description: ${params.description}` : ''}

Respond ONLY with JSON, no other text: {"score": N, "category": "string", "reason": "one line", "name": "cleaned name if needed"}`,
        },
      ],
    });

    const content = res.content[0];
    if (content.type !== 'text') throw new Error('No text response');

    const parsed = JSON.parse(content.text) as ClassificationResult;
    return {
      score: Math.max(1, Math.min(100, parsed.score ?? 50)),
      category: parsed.category ?? params.category ?? 'other',
      reason: parsed.reason ?? '',
      name: parsed.name,
    };
  } catch (err) {
    console.error('AI classification failed:', err);
    return { score: 30, category: params.category ?? 'other', reason: 'Classification failed, defaulting to foundable' };
  }
}

/** Underground score threshold — below this = foundable */
export const UNDERGROUND_THRESHOLD = 60;
