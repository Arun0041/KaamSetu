import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { BadRequest } from '../lib/errors.js';

type RequestPart = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, part: RequestPart = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      throw BadRequest(`Invalid ${part}`, details);
    }
    // Mutate the request part so downstream handlers read the parsed/coerced value.
    (req as unknown as Record<string, unknown>)[part] = result.data;
    next();
  };
}
