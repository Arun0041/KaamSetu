import { groqAvailable } from '../lib/groq.js';
import { transcribeAudio } from './transcription.js';
import { extractTasks, extractToTask } from './extraction.js';
import { retrieveSources } from './retrieval.js';
import { verifyAgainstSources } from './verification.js';
import {
  createCapture,
  createReviewItem,
  createTask,
  updateCapture,
} from './capture-repo.js';

export interface IngestInput {
  userId: string;
  buffer?: Buffer;
  filename?: string;
  mimeType?: string;
  transcript?: string;
}

export interface PipelineResult {
  captureId: string;
  status: string;
  transcript: string | null;
  task: { title: string; assignee: string | null; deadline: string | null; priority: string } | null;
  needsReview: boolean;
  reviewReason: string | null;
  conflicts: unknown[];
  citations: unknown[];
  confidence: number | null;
}

export async function runIngestPipeline(input: IngestInput): Promise<PipelineResult> {
  const capture = await createCapture(input.userId, null);

  try {
    if (!groqAvailable()) {
      return await fallbackOffline(capture.id, input.transcript);
    }

    let text: string;
    if (input.transcript && input.transcript.trim()) {
      text = input.transcript.trim();
      await updateCapture(capture.id, { status: 'extracting', transcript: text });
    } else {
      if (!input.buffer) throw new Error('No audio or transcript provided');
      await updateCapture(capture.id, { status: 'transcribing' });
      const result = await transcribeAudio(input.buffer, input.filename ?? 'audio', input.mimeType);
      text = result.text;
      await updateCapture(capture.id, { status: 'extracting', transcript: text });
    }

    const extraction = await extractTasks(text);
    const task = extractToTask(extraction);

    await updateCapture(capture.id, {
      status: 'retrieving',
      confidence: extraction.confidence,
    });
    const retrieved = await retrieveSources(`${task.title} ${text}`);
    const verification = await verifyAgainstSources(text, task.title, retrieved);

    const needsReview =
      verification.needs_review ||
      extraction.confidence < 0.6 ||
      (extraction.flags as string[]).includes('missing_assignee');

    if (needsReview) {
      await updateCapture(capture.id, { status: 'review', confidence: verification.confidence });
      await createReviewItem({
        captureId: capture.id,
        type: verification.conflicts.length > 0 ? 'conflict' : 'ambiguous',
        reason: verification.reason || extraction.clarification,
        metadata: {
          transcript: text,
          conflicts: verification.conflicts,
          citations: verification.citations,
          flags: extraction.flags,
          extraction_confidence: extraction.confidence,
        },
      });
      return {
        captureId: capture.id,
        status: 'review',
        transcript: text,
        task,
        needsReview: true,
        reviewReason: verification.reason || extraction.clarification,
        conflicts: verification.conflicts,
        citations: verification.citations,
        confidence: verification.confidence,
      };
    }

    await createTask({
      captureId: capture.id,
      title: task.title,
      assignee: task.assignee,
      deadline: task.deadline,
      priority: task.priority,
      confidence: verification.confidence,
    });
    await updateCapture(capture.id, { status: 'assignable', confidence: verification.confidence });

    return {
      captureId: capture.id,
      status: 'assignable',
      transcript: text,
      task,
      needsReview: false,
      reviewReason: null,
      conflicts: [],
      citations: verification.citations,
      confidence: verification.confidence,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await updateCapture(capture.id, { status: 'failed', error: message });
    return {
      captureId: capture.id,
      status: 'failed',
      transcript: null,
      task: null,
      needsReview: true,
      reviewReason: message,
      conflicts: [],
      citations: [],
      confidence: null,
    };
  }
}

async function fallbackOffline(captureId: string, transcript?: string): Promise<PipelineResult> {
  await updateCapture(captureId, { status: 'review' });
  await createReviewItem({
    captureId,
    type: 'ambiguous',
    reason: 'AI is offline. No GROQ_API_KEY configured, so the note could not be processed.',
    metadata: { offline: true, transcript: transcript ?? null },
  });
  return {
    captureId,
    status: 'review',
    transcript: transcript ?? null,
    task: null,
    needsReview: true,
    reviewReason: 'AI is offline. Set GROQ_API_KEY to enable processing.',
    conflicts: [],
    citations: [],
    confidence: null,
  };
}
