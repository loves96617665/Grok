import { Hono } from 'hono';
import { Env } from '../index';
import { generateSessionId } from '../utils/crypto';

export const authRouter = new Hono<{ Bindings: Env }>();

// 登入 v1（使用 email_md5）
authRouter.post('/login', async (c) => {
  try {
    const { user_name, email_md5 } = await c.req.json();

    if (!user_name || !email_md5) {
      return c.json({
        error: 'user_name and email_md5 are required'
      }, 400);
    }

    // 查找 token
    const token = await c.env.DB.prepare(
      'SELECT * FROM tokens WHERE email_md5 = ? AND status = ? LIMIT 1'
    ).bind(email_md5, 'active').first();

    if (!token) {
      return c.json({
        error: 'No active token found for this email'
      }, 404);
    }

    // 查找或創建用戶
    let user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE user_name = ?'
    ).bind(user_name).first();

    if (!user) {
      // 創建新用戶
      const result = await c.env.DB.prepare(
        'INSERT INTO users (user_name, email_md5, last_login) VALUES (?, ?, ?)'
      ).bind(user_name, email_md5, Math.floor(Date.now() / 1000)).run();

      user = await c.env.DB.prepare(
        'SELECT * FROM users WHERE id = ?'
      ).bind(result.meta.last_row_id).first();
    } else {
      // 更新最後登入時間
      await c.env.DB.prepare(
        'UPDATE users SET last_login = ? WHERE id = ?'
      ).bind(Math.floor(Date.now() / 1000), user.id).run();
    }

    // 創建會話
    const sessionId = generateSessionId();
    const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 7; // 7 天

    await c.env.DB.prepare(
      'INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(sessionId, user.id, expiresAt).run();

    // 存儲到 KV
    await c.env.SESSIONS.put(sessionId, JSON.stringify({
      user_id: user.id,
      user_name: user.user_name,
      email_md5: user.email_md5,
    }), {
      expirationTtl: 86400 * 7,
    });

    return c.json({
      success: true,
      session_id: sessionId,
      user: {
        id: user.id,
        user_name: user.user_name,
      },
      expires_at: expiresAt,
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return c.json({
      error: error.message || 'Login failed'
    }, 500);
  }
});

// 登入 v2（使用 sso_token）
authRouter.post('/login-v2', async (c) => {
  try {
    const { user_name, sso_token } = await c.req.json();

    if (!user_name || !sso_token) {
      return c.json({
        error: 'user_name and sso_token are required'
      }, 400);
    }

    // 驗證 token（可選：調用 Grok API 驗證）
    // 這裡簡化處理，直接存儲

    // 查找或創建用戶
    let user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE user_name = ?'
    ).bind(user_name).first();

    if (!user) {
      // 創建新用戶
      const result = await c.env.DB.prepare(
        'INSERT INTO users (user_name, sso_token, last_login) VALUES (?, ?, ?)'
      ).bind(user_name, sso_token, Math.floor(Date.now() / 1000)).run();

      user = await c.env.DB.prepare(
        'SELECT * FROM users WHERE id = ?'
      ).bind(result.meta.last_row_id).first();
    } else {
      // 更新 token 和最後登入時間
      await c.env.DB.prepare(
        'UPDATE users SET sso_token = ?, last_login = ? WHERE id = ?'
      ).bind(sso_token, Math.floor(Date.now() / 1000), user.id).run();
    }

    // 創建會話
    const sessionId = generateSessionId();
    const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 7; // 7 天

    await c.env.DB.prepare(
      'INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)'
    ).bind(sessionId, user.id, expiresAt).run();

    // 存儲到 KV
    await c.env.SESSIONS.put(sessionId, JSON.stringify({
      user_id: user.id,
      user_name: user.user_name,
      sso_token: sso_token,
    }), {
      expirationTtl: 86400 * 7,
    });

    return c.json({
      success: true,
      session_id: sessionId,
      user: {
        id: user.id,
        user_name: user.user_name,
      },
      expires_at: expiresAt,
    });

  } catch (error: any) {
    console.error('Login v2 error:', error);
    return c.json({
      error: error.message || 'Login failed'
    }, 500);
  }
});

// 登出
authRouter.post('/logout', async (c) => {
  try {
    const sessionId = c.req.header('X-Session-ID');

    if (sessionId) {
      // 從 KV 刪除
      await c.env.SESSIONS.delete(sessionId);

      // 從數據庫刪除
      await c.env.DB.prepare(
        'DELETE FROM sessions WHERE session_id = ?'
      ).bind(sessionId).run();
    }

    return c.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error: any) {
    console.error('Logout error:', error);
    return c.json({
      error: error.message || 'Logout failed'
    }, 500);
  }
});

// 驗證會話
authRouter.get('/verify', async (c) => {
  try {
    const sessionId = c.req.header('X-Session-ID');

    if (!sessionId) {
      return c.json({
        valid: false,
        error: 'No session ID provided'
      }, 401);
    }

    // 從 KV 獲取會話
    const sessionData = await c.env.SESSIONS.get(sessionId);

    if (!sessionData) {
      return c.json({
        valid: false,
        error: 'Session not found or expired'
      }, 401);
    }

    const session = JSON.parse(sessionData);

    return c.json({
      valid: true,
      user: {
        id: session.user_id,
        user_name: session.user_name,
      }
    });

  } catch (error: any) {
    console.error('Verify error:', error);
    return c.json({
      valid: false,
      error: error.message || 'Verification failed'
    }, 500);
  }
});
