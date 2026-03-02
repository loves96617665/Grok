import { Context, Next } from 'hono';
import { Env } from '../index';

export async function rateLimiter(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    const user = c.get('user');
    const token = c.get('token');
    
    // 獲取標識符（用戶 ID 或 IP）
    const identifier = user?.id || c.req.header('cf-connecting-ip') || 'unknown';
    const key = `ratelimit:${identifier}`;

    // 從 KV 獲取當前計數
    const data = await c.env.KV.get(`ratelimit:${key}`);
    
    let count = 0;
    let resetTime = Date.now() + 86400000; // 24 小時後重置

    if (data) {
      const parsed = JSON.parse(data);
      count = parsed.count;
      resetTime = parsed.resetTime;

      // 檢查是否需要重置
      if (Date.now() > resetTime) {
        count = 0;
        resetTime = Date.now() + 86400000;
      }
    }

    // 檢查限制（每日 200 次）
    const limit = 200;
    
    if (count >= limit) {
      return c.json({
        error: {
          message: `Rate limit exceeded. Maximum ${limit} requests per day.`,
          type: 'rate_limit_error',
        }
      }, 429);
    }

    // 增加計數
    count++;
    await c.env.KV.put(`ratelimit:${key}`, JSON.stringify({
      count,
      resetTime,
    }), {
      expirationTtl: 86400, // 24 小時
    });

    // 設置響應頭
    c.header('X-RateLimit-Limit', limit.toString());
    c.header('X-RateLimit-Remaining', (limit - count).toString());
    c.header('X-RateLimit-Reset', new Date(resetTime).toISOString());

    await next();

  } catch (error: any) {
    console.error('Rate limiter error:', error);
    // 如果限流器出錯，允許請求通過
    await next();
  }
}
