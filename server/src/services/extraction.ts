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
  tasks: z.array(z.object({
    action: taskSchema,
    clarification: z.string().nullable(),
    confidence: z.number().min(0).max(1),
    flags: z.array(z.enum(['missing_assignee', 'ambiguous', 'low_confidence', 'policy_check'])),
    depends_on_index: z.number().nullable(),
    transcript_segment: z.string(),
  }))
});

export type ExtractionOutput = z.infer<typeof extractionSchema>;

const SYSTEM_PROMPT = `You are KaamSetu's task-extraction engine for small Indian businesses.
You receive Hindi-English code-mixed voice-note transcripts.
Your job is to break down the transcript into a sequential array of actionable tasks.
For example, if the transcript says "Ask Ravi how many employees joined and then tell Anil to update the portal", you must extract TWO tasks. The second task depends on the first.
Rules:
- title: imperative, concise action.
- assignee: person's full name if mentioned, else null.
- deadline: human readable if mentioned, else null.
- priority: low/medium/high.
- entities: proper nouns.
- clarification: null unless ambiguous.
- confidence: 0..1.
- flags: 'missing_assignee', 'ambiguous', 'low_confidence', 'policy_check'.
- depends_on_index: the 0-based index of the prior task this task is waiting for, or null if it can start immediately.
- transcript_segment: the exact substring of the transcript that generated this task.
Respond with ONLY a JSON object containing a "tasks" array. Example:
{"tasks": [
  {"action":{"title":"Ask how many employees joined","assignee":"Ravi Mehta","deadline":null,"priority":"medium","entities":["Ravi Mehta"]},"clarification":null,"confidence":0.9,"flags":[],"depends_on_index":null,"transcript_segment":"Ask Ravi how many employees joined"},
  {"action":{"title":"Update the portal with employee count","assignee":"Anil Kapoor","deadline":null,"priority":"medium","entities":["Anil Kapoor","portal"]},"clarification":null,"confidence":0.9,"flags":[],"depends_on_index":0,"transcript_segment":"and then tell Anil to update the portal"}
]}`;

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

export function extractToTasks(output: ExtractionOutput): Array<ExtractedTask & { depends_on_index: number | null; transcript_segment: string; clarification: string | null; confidence: number; flags: string[] }> {
  return output.tasks.map(t => ({
    title: t.action.title,
    assignee: t.action.assignee,
    deadline: t.action.deadline,
    priority: t.action.priority,
    entities: t.action.entities,
    depends_on_index: t.depends_on_index,
    transcript_segment: t.transcript_segment,
    clarification: t.clarification,
    confidence: t.confidence,
    flags: t.flags
  }));
}
