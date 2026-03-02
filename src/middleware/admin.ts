import { Context, Next } from 'hono';
import { Env } from '../index';

export async function adminAuth(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        error: 'Missing or invalid Authorization header'
      }, 401);
    }

    const token = authHeader.substring(7);

    // 驗證管理員密碼
    if (token !== c.env.ADMIN_PASSWORD) {
      return c.json({
        error: 'Invalid admin credentials'
      }, 403);
    }

    await next();

  } catch (error: any) {
    console.error('Admin auth error:', error);
    return c.json({
      error: 'Authentication failed'
    }, 500);
  }
}
