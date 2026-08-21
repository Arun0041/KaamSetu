import { toFile } from 'groq-sdk';
import { getClient } from '../lib/groq.js';
import { env } from '../config/env.js';
import { ServiceUnavailable } from '../lib/errors.js';

export interface TranscriptionResult {
  text: string;
  language: string;
  duration: number | null;
}

export async function transcribeAudio(buffer: Buffer, filename: string, mimeType?: string): Promise<TranscriptionResult> {
  const client = getClient();
  const file = await toFile(buffer, filename, { type: mimeType });
  const response = await client.audio.transcriptions.create({
    file,
    model: env.GROQ_TRANSCRIBE_MODEL,
    language: 'hi',
    response_format: 'verbose_json',
  });
  const verbose = response as unknown as {
    text: string;
    language?: string;
    segments?: Array<{ end?: number }>;
  };
  const segments = verbose.segments ?? [];
  const duration = segments.length > 0 ? segments[segments.length - 1]?.end ?? null : null;
  return {
    text: verbose.text.trim(),
    language: verbose.language ?? 'hi',
    duration,
  };
}

export function assertAiAvailable(): void {
  if (!env.GROQ_API_KEY) {
    throw ServiceUnavailable('AI transcription unavailable: GROQ_API_KEY is not set.');
  }
}
