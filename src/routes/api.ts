import { Hono } from 'hono';
import { Env } from '../index';
import { adminAuth } from '../middleware/admin';

export const apiRouter = new Hono<{ Bindings: Env }>();

// 批量添加 Token（需要管理員權限）
apiRouter.post('/batch-add-grok-token', adminAuth, async (c) => {
  try {
    const { sso_token_list } = await c.req.json();

    if (!Array.isArray(sso_token_list) || sso_token_list.length === 0) {
      return c.json({
        error: 'sso_token_list must be a non-empty array'
      }, 400);
    }

    const results = [];
    const now = Math.floor(Date.now() / 1000);

    for (const sso_token of sso_token_list) {
      try {
        // 檢查是否已存在
        const existing = await c.env.DB.prepare(
          'SELECT id FROM tokens WHERE sso_token = ?'
        ).bind(sso_token).first();

        if (existing) {
          results.push({
            sso_token: sso_token.substring(0, 10) + '...',
            status: 'skipped',
            reason: 'already exists'
          });
          continue;
        }

        // 插入新 token
        await c.env.DB.prepare(
          'INSERT INTO tokens (sso_token, status, created_at, updated_at) VALUES (?, ?, ?, ?)'
        ).bind(sso_token, 'active', now, now).run();

        // 同時存儲到 KV 以加快查詢
        await c.env.TOKENS.put(sso_token, JSON.stringify({
          status: 'active',
          created_at: now,
        }));

        results.push({
          sso_token: sso_token.substring(0, 10) + '...',
          status: 'success'
        });

      } catch (error: any) {
        results.push({
          sso_token: sso_token.substring(0, 10) + '...',
          status: 'error',
          reason: error.message
        });
      }
    }

    return c.json({
      success: true,
      total: sso_token_list.length,
      results
    });

  } catch (error: any) {
    console.error('Batch add token error:', error);
    return c.json({
      error: error.message || 'Failed to add tokens'
    }, 500);
  }
});

// 獲取 Grok 列表
apiRouter.post('/get-grok-list', adminAuth, async (c) => {
  try {
    const { page = '1', page_size = '20' } = await c.req.json();

    const pageNum = parseInt(page);
    const pageSize = parseInt(page_size);
    const offset = (pageNum - 1) * pageSize;

    // 獲取總數
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM tokens'
    ).first();

    // 獲取列表
    const { results } = await c.env.DB.prepare(
      'SELECT id, sso_token, email_md5, status, usage_count, last_used, created_at FROM tokens ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(pageSize, offset).all();

    return c.json({
      success: true,
      total: countResult?.total || 0,
      page: pageNum,
      page_size: pageSize,
      data: results.map((token: any) => ({
        id: token.id,
        sso_token: token.sso_token.substring(0, 10) + '...',
        email_md5: token.email_md5,
        status: token.status,
        usage_count: token.usage_count,
        last_used: token.last_used,
        created_at: token.created_at,
      }))
    });

  } catch (error: any) {
    console.error('Get grok list error:', error);
    return c.json({
      error: error.message || 'Failed to get list'
    }, 500);
  }
});

// 刪除 Token
apiRouter.delete('/token/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id');

    // 獲取 token 信息
    const token = await c.env.DB.prepare(
      'SELECT sso_token FROM tokens WHERE id = ?'
    ).bind(id).first();

    if (!token) {
      return c.json({
        error: 'Token not found'
      }, 404);
    }

    // 從數據庫刪除
    await c.env.DB.prepare(
      'DELETE FROM tokens WHERE id = ?'
    ).bind(id).run();

    // 從 KV 刪除
    await c.env.TOKENS.delete(token.sso_token);

    return c.json({
      success: true,
      message: 'Token deleted successfully'
    });

  } catch (error: any) {
    console.error('Delete token error:', error);
    return c.json({
      error: error.message || 'Failed to delete token'
    }, 500);
  }
});

// 更新 Token 狀態
apiRouter.patch('/token/:id', adminAuth, async (c) => {
  try {
    const id = c.req.param('id');
    const { status } = await c.req.json();

    if (!['active', 'expired', 'banned'].includes(status)) {
      return c.json({
        error: 'Invalid status. Must be: active, expired, or banned'
      }, 400);
    }

    await c.env.DB.prepare(
      'UPDATE tokens SET status = ?, updated_at = ? WHERE id = ?'
    ).bind(status, Math.floor(Date.now() / 1000), id).run();

    return c.json({
      success: true,
      message: 'Token status updated successfully'
    });

  } catch (error: any) {
    console.error('Update token error:', error);
    return c.json({
      error: error.message || 'Failed to update token'
    }, 500);
  }
});

// 獲取統計信息
apiRouter.get('/stats', adminAuth, async (c) => {
  try {
    // Token 統計
    const tokenStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired,
        SUM(CASE WHEN status = 'banned' THEN 1 ELSE 0 END) as banned
      FROM tokens
    `).first();

    // 用戶統計
    const userStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
      FROM users
    `).first();

    // 今日 API 使用統計
    const today = Math.floor(Date.now() / 1000) - 86400;
    const apiStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_requests,
        SUM(request_tokens) as total_request_tokens,
        SUM(response_tokens) as total_response_tokens
      FROM api_usage
      WHERE created_at > ?
    `).bind(today).first();

    return c.json({
      success: true,
      tokens: tokenStats,
      users: userStats,
      api_usage_today: apiStats,
    });

  } catch (error: any) {
    console.error('Get stats error:', error);
    return c.json({
      error: error.message || 'Failed to get stats'
    }, 500);
  }
});
