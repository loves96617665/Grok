import { Context, Next } from 'hono';
import { Env } from '../index';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        error: {
          message: 'Missing or invalid Authorization header',
          type: 'authentication_error',
        }
      }, 401);
    }

    const token = authHeader.substring(7); // 移除 "Bearer "

    // 檢查是否是環境變量中的 AUTHORIZATION
    if (token === c.env.AUTHORIZATION) {
      // 使用輪詢 token
      const activeToken = await getActiveToken(c.env);
      
      if (!activeToken) {
        return c.json({
          error: {
            message: 'No active tokens available',
            type: 'authentication_error',
          }
        }, 503);
      }

      c.set('token', activeToken);
      c.set('user', null);
      await next();
      return;
    }

    // 檢查是否是 SSO Token
    const tokenData = await c.env.KV.get(`token:${token}`);
    
    if (!tokenData) {
      // 從數據庫查詢
      const dbToken = await c.env.DB.prepare(
        'SELECT * FROM tokens WHERE sso_token = ? AND status = ?'
      ).bind(token, 'active').first();

      if (!dbToken) {
        return c.json({
          error: {
            message: 'Invalid or expired token',
            type: 'authentication_error',
          }
        }, 401);
      }

      // 更新使用次數和最後使用時間
      await c.env.DB.prepare(
        'UPDATE tokens SET usage_count = usage_count + 1, last_used = ? WHERE id = ?'
      ).bind(Math.floor(Date.now() / 1000), dbToken.id).run();

      c.set('token', dbToken);
      c.set('user', null);
      await next();
      return;
    }

    const parsedToken = JSON.parse(tokenData);
    c.set('token', { sso_token: token, ...parsedToken });
    c.set('user', null);
    await next();

  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return c.json({
      error: {
        message: 'Authentication failed',
        type: 'authentication_error',
      }
    }, 500);
  }
}

// 獲取活躍的 token（輪詢）
async function getActiveToken(env: Env) {
  // 從數據庫獲取所有活躍的 token
  const { results } = await env.DB.prepare(
    'SELECT * FROM tokens WHERE status = ? ORDER BY usage_count ASC, last_used ASC LIMIT 1'
  ).bind('active').all();

  if (results.length === 0) {
    return null;
  }

  const token = results[0];

  // 更新使用次數
  await env.DB.prepare(
    'UPDATE tokens SET usage_count = usage_count + 1, last_used = ? WHERE id = ?'
  ).bind(Math.floor(Date.now() / 1000), token.id).run();

  return token;
}
