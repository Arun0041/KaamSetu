import { z } from 'zod';
import { getClient } from '../lib/groq.js';
import { env } from '../config/env.js';
import type { ExtractedTask } from '../types/index.js';
import { BadRequest, ServiceUnavailable } from '../lib/errors.js';

const taskSchema = z.object({
  title: z.string().min(1),
  assignee: z.string().nullable(),
  deadline: z.string().nullable(),
  priority: z.enum(['low', 'medium', 'high']),
  entities: z.array(z.string()),
});

const extractionSchema = z.object({
  action: taskSchema,
  clarification: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  flags: z.array(z.enum(['missing_assignee', 'ambiguous', 'low_confidence', 'policy_check'])),
});

export type ExtractionOutput = z.infer<typeof extractionSchema>;

const SYSTEM_PROMPT = `You are KaamSetu's task-extraction engine for small Indian businesses.
You receive Hindi-English code-mixed voice-note transcripts and return a single JSON object.
Extract the concrete action (task), the likely assignee, deadline, priority, and any key entities.
Rules:
- title: imperative, concise action (e.g. "Compare vendor quotations").
- assignee: person's full name if mentioned, else null.
- deadline: human readable ("Tomorrow", "By Friday") if mentioned, else null.
- priority: low/medium/high based on urgency and impact.
- entities: proper nouns (people, vendors, amounts, docs, dates).
- clarification: null unless the instruction is genuinely ambiguous and needs a human.
- confidence: 0..1 how sure you are of the extraction.
- flags: 'missing_assignee' if no assignee; 'ambiguous' if contradictory/ambiguous; 'low_confidence' if confidence < 0.6; 'policy_check' if a policy/limit is cited.
Never invent facts. If the note is not an actionable instruction, return title describing the note and low confidence.
Respond with ONLY a JSON object shaped exactly like this example:
{"action":{"title":"Compare vendor quotations","assignee":"Rahul Sharma","deadline":"Tomorrow","priority":"high","entities":["Rahul","20%","30%"]},"clarification":null,"confidence":0.8,"flags":["policy_check"]}`;

export async function extractTasks(transcript: string): Promise<ExtractionOutput> {
  if (!transcript.trim()) throw BadRequest('Transcript is empty');
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: env.GROQ_LLM_MODEL,
    temperature: 0,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
  });
  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw ServiceUnavailable('Extraction model returned an empty response');
  const parsed = JSON.parse(raw) as unknown;
  return extractionSchema.parse(parsed);
}

export function extractToTask(output: ExtractionOutput): ExtractedTask {
  return {
    title: output.action.title,
    assignee: output.action.assignee,
    deadline: output.action.deadline,
    priority: output.action.priority,
    entities: output.action.entities,
  };
}
