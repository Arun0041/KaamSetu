import { groqAvailable } from '../lib/groq.js';
import { transcribeAudio } from './transcription.js';
import { extractTasks, extractToTasks } from './extraction.js';
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
  userName: string;
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
  dependsOn: string | null;
}

export async function runIngestPipeline(input: IngestInput): Promise<PipelineResult[]> {
  const capture = await createCapture(input.userId, null);

  try {
    if (!groqAvailable()) {
      return await fallbackOffline(capture.id, input.transcript);
    }

    let text: string;
    const initials = input.userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    if (input.transcript && input.transcript.trim()) {
      text = input.transcript.trim();
      await updateCapture(capture.id, { status: 'extracting', transcript: text, speaker_name: input.userName, initials });
    } else {
      if (!input.buffer) throw new Error('No audio or transcript provided');
      await updateCapture(capture.id, { status: 'transcribing' });
      const result = await transcribeAudio(input.buffer, input.filename ?? 'audio', input.mimeType);
      text = result.text;
      await updateCapture(capture.id, { status: 'extracting', transcript: text, speaker_name: input.userName, initials });
    }

    const extraction = await extractTasks(text);
    const tasksData = extractToTasks(extraction);

    await updateCapture(capture.id, {
      status: 'retrieving',
      confidence: Math.min(...tasksData.map(t => t.confidence)),
    });

    const pipelineResults: PipelineResult[] = [];
    const createdTasks = [];

    for (let i = 0; i < tasksData.length; i++) {
      const taskData = tasksData[i];
      const retrieved = await retrieveSources(`${taskData.title} ${taskData.transcript_segment}`);
      const verification = await verifyAgainstSources(taskData.transcript_segment, taskData.title, retrieved);

      const needsReview =
        verification.needs_review ||
        taskData.confidence < 0.6 ||
        taskData.flags.includes('missing_assignee');

      let dependsOnTaskId = null;
      if (taskData.depends_on_index !== null && taskData.depends_on_index >= 0 && taskData.depends_on_index < createdTasks.length) {
        dependsOnTaskId = createdTasks[taskData.depends_on_index].id;
      }

      if (needsReview) {
        await createReviewItem({
          captureId: capture.id,
          type: verification.conflicts.length > 0 ? 'conflict' : 'ambiguous',
          reason: verification.reason || taskData.clarification,
          metadata: {
            transcript: taskData.transcript_segment,
            conflicts: verification.conflicts,
            citations: verification.citations,
            flags: taskData.flags,
            extraction_confidence: taskData.confidence,
            task_index: i
          },
        });
        
        // Even if it needs review, create the task but set status to open/blocked so it can be resolved later?
        // Actually, the original code didn't create a task if it needed review. We should create a dummy task ID for dependencies to link to.
        const createdTask = await createTask({
          captureId: capture.id,
          title: taskData.title,
          assignee: taskData.assignee,
          deadline: taskData.deadline,
          priority: taskData.priority as any,
          confidence: verification.confidence,
          depends_on: dependsOnTaskId,
          step_index: i
        });
        createdTasks.push(createdTask);

        pipelineResults.push({
          captureId: createdTask.id, // Using taskId here so the UI can use it as a unique ID and dependsOn can point to it
          status: 'review',
          transcript: taskData.transcript_segment,
          task: taskData as any,
          needsReview: true,
          reviewReason: verification.reason || taskData.clarification,
          conflicts: verification.conflicts,
          citations: verification.citations,
          confidence: verification.confidence,
          dependsOn: dependsOnTaskId
        });
      } else {
        const createdTask = await createTask({
          captureId: capture.id,
          title: taskData.title,
          assignee: taskData.assignee,
          deadline: taskData.deadline,
          priority: taskData.priority as any,
          confidence: verification.confidence,
          depends_on: dependsOnTaskId,
          step_index: i
        });
        createdTasks.push(createdTask);

        pipelineResults.push({
          captureId: createdTask.id,
          status: dependsOnTaskId ? 'blocked' : 'assignable',
          transcript: taskData.transcript_segment,
          task: taskData as any,
          needsReview: false,
          reviewReason: null,
          conflicts: [],
          citations: verification.citations,
          confidence: verification.confidence,
          dependsOn: dependsOnTaskId
        });
      }
    }

    await updateCapture(capture.id, { status: 'assignable' });
    return pipelineResults;

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await updateCapture(capture.id, { status: 'failed', error: message });
    return [{
      captureId: capture.id,
      status: 'failed',
      transcript: null,
      task: null,
      needsReview: true,
      reviewReason: message,
      conflicts: [],
      citations: [],
      confidence: null,
      dependsOn: null
    }];
  }
}

async function fallbackOffline(captureId: string, transcript?: string): Promise<PipelineResult[]> {
  await updateCapture(captureId, { status: 'review' });
  
  if (transcript && transcript.includes('then')) {
    // Quick mock of multi-step for offline test
    const parts = transcript.split(/(?:\s+and\s+then\s+|\s+after\s+that\s+|\s+uske\s+baad\s+|\s+phir\s+|,\s*then\s+)/i);
    const results: PipelineResult[] = [];
    const taskIds = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const createdTask = await createTask({
        captureId,
        title: part.split(' ').slice(0,5).join(' '),
        assignee: part.includes('Anil') ? 'Anil Kapoor' : (part.includes('Ravi') ? 'Ravi Mehta' : 'Unassigned'),
        deadline: null,
        priority: 'medium',
        confidence: 0.9,
        depends_on: i > 0 ? taskIds[i - 1] : null,
        step_index: i
      });
      taskIds.push(createdTask.id);
      
      results.push({
        captureId: createdTask.id, // using Task ID for frontend tracking
        status: i > 0 ? 'blocked' : 'review',
        transcript: part,
        task: { title: createdTask.title, assignee: createdTask.assignee, deadline: null, priority: 'medium' },
        needsReview: i === 0,
        reviewReason: i === 0 ? 'Mock offline confirmation for testing' : null,
        conflicts: [],
        citations: [],
        confidence: 0.9,
        dependsOn: i > 0 ? taskIds[i - 1] : null
      });
    }
    return results;
  }

  await createReviewItem({
    captureId,
    type: 'ambiguous',
    reason: 'AI is offline. No GROQ_API_KEY configured.',
    metadata: { offline: true, transcript: transcript ?? null },
  });
  
  return [{
    captureId,
    status: 'review',
    transcript: transcript ?? null,
    task: null,
    needsReview: true,
    reviewReason: 'AI is offline. Set GROQ_API_KEY to enable real processing.',
    conflicts: [],
    citations: [],
    confidence: null,
    dependsOn: null
  }];
}
