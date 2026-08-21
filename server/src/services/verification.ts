import { z } from 'zod';
import { getClient } from '../lib/groq.js';
import { env } from '../config/env.js';
import type { VerificationResult } from '../types/index.js';
import type { RetrievedSource } from './retrieval.js';

const conflictSchema = z.object({
  source_id: z.string(),
  source_title: z.string(),
  quote: z.string(),
  contradicts: z.string(),
});

const verificationSchema = z.object({
  needs_review: z.boolean(),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  conflicts: z.array(conflictSchema),
  citations: z.array(
    z.object({ source_id: z.string(), source_title: z.string(), quote: z.string() }),
  ),
});

function buildPrompt(transcript: string, task: string, sources: RetrievedSource[]): string {
  const sourceBlock = sources
    .map((s) => `[${s.id}] ${s.title}\n> ${s.content}`)
    .join('\n\n');
  return `Voice note: "${transcript}"
Extracted action: "${task}"
Private sources:
${sourceBlock || '(no sources retrieved)'}

Determine whether the extracted action conflicts with any of the private sources.
- conflicts: list each contradiction with the source id/title, the conflicting quote from the source, and what it contradicts.
- citations: list the sources that support or are directly relevant to the action.
- needs_review: true if any conflict exists OR the action depends on a policy/limit that differs between sources.
- confidence: 0..1 confidence that the action is safe to auto-assign.
- reason: one sentence explaining the review decision.
Return ONLY valid JSON.`;
}

export async function verifyAgainstSources(
  transcript: string,
  task: string,
  sources: RetrievedSource[],
): Promise<VerificationResult> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: env.GROQ_LLM_MODEL,
    temperature: 0,
    messages: [
      {
        role: 'system',
        content:
          'You are a contradiction and citation verifier. Detect whether an extracted action conflicts with provided private sources and cite evidence. Respond with ONLY a JSON object shaped exactly like this example: {"needs_review":true,"reason":"Finance policy allows 20% but the vendor quote requests 30%","confidence":0.3,"conflicts":[{"source_id":"<id>","source_title":"Finance Policy v3","quote":"Advance payment must not exceed 20%","contradicts":"vendor requests 30% advance"}],"citations":[{"source_id":"<id>","source_title":"Finance Policy v3","quote":"Advance payment must not exceed 20%"}]}',
      },
      { role: 'user', content: buildPrompt(transcript, task, sources) },
    ],
    response_format: { type: 'json_object' },
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    return {
      needs_review: true,
      reason: 'Verification model returned an empty response.',
      confidence: 0,
      conflicts: [],
      citations: sources.map((s) => ({
        source_id: s.id,
        source_title: s.title,
        quote: s.content.slice(0, 160),
      })),
    };
  }
  const parsed = verificationSchema.parse(JSON.parse(raw));
  return {
    needs_review: parsed.needs_review,
    reason: parsed.reason,
    confidence: parsed.confidence,
    conflicts: parsed.conflicts,
    citations: parsed.citations,
  };
}
