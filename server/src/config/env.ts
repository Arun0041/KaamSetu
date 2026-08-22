import { z } from 'zod';
import 'dotenv/config';

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4010),
    DATABASE_URL: z
      .string()
      .min(1)
      .default('postgres://postgres:postgres@127.0.0.1:5432/kaamsetu'),
    CLIENT_ORIGIN: z.string().min(1).default('http://localhost:5173'),
    JWT_ACCESS_SECRET: z.string().min(1).default('dev-access-secret-change-me'),
    JWT_REFRESH_SECRET: z.string().min(1).default('dev-refresh-secret-change-me'),
    ACCESS_TOKEN_TTL: z.string().default('15m'),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    GROQ_API_KEY: z.string().optional(),
    GROQ_TRANSCRIBE_MODEL: z.string().default('whisper-large-v3'),
    GROQ_LLM_MODEL: z.string().default('openai/gpt-oss-120b'),
    AUDIO_MAX_MB: z.coerce.number().positive().default(25),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (data.JWT_ACCESS_SECRET === 'dev-access-secret-change-me' || data.JWT_ACCESS_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_ACCESS_SECRET'],
          message: 'JWT_ACCESS_SECRET must be a strong secret in production',
        });
      }
      if (data.JWT_REFRESH_SECRET === 'dev-refresh-secret-change-me' || data.JWT_REFRESH_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message: 'JWT_REFRESH_SECRET must be a strong secret in production',
        });
      }
    }
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export type Env = typeof env;
