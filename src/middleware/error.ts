import { Context } from 'hono';

export function errorHandler(err: Error, c: Context) {
  console.error('Error:', err);

  return c.json({
    error: {
      message: err.message || 'Internal server error',
      type: 'internal_error',
    }
  }, 500);
}
