import Groq from 'groq-sdk';
import { env } from '../config/env.js';
import { ServiceUnavailable } from './errors.js';

let client: Groq | null = null;

function getClient(): Groq {
  if (!env.GROQ_API_KEY) {
    throw ServiceUnavailable('GROQ_API_KEY is not configured. Set it to enable AI transcription and extraction.');
  }
  if (!client) client = new Groq({ apiKey: env.GROQ_API_KEY });
  return client;
}

export function groqAvailable(): boolean {
  return Boolean(env.GROQ_API_KEY);
}

export { getClient };
