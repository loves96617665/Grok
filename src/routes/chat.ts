import { Hono } from 'hono';
import { Env } from '../index';
import { authMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/ratelimit';
import { GrokService } from '../services/grok';
import { logApiUsage } from '../services/logger';

export const chatRouter = new Hono<{ Bindings: Env }>();

// 聊天完成 API
chatRouter.post('/chat/completions', authMiddleware, rateLimiter, async (c) => {
  try {
    const body = await c.req.json();
    const { model, messages, stream = false, conversation_id, parent_message_id } = body;

    // 驗證必填參數
    if (!model || !messages || !Array.isArray(messages)) {
      return c.json({
        error: {
          message: 'Invalid request: model and messages are required',
          type: 'invalid_request_error',
        }
      }, 400);
    }

    // 驗證模型
    const validModels = [
      'grok-2', 'grok-3', 'grok-4',
      'grok-3-thinking', 'grok-4-thinking',
      'grok-3-deepsearch', 'grok-3-deepersearch'
    ];
    
    if (!validModels.includes(model)) {
      return c.json({
        error: {
          message: `Invalid model: ${model}. Valid models: ${validModels.join(', ')}`,
          type: 'invalid_request_error',
        }
      }, 400);
    }

    // 獲取用戶信息
    const user = c.get('user');
    const token = c.get('token');

    // 創建 Grok 服務實例
    const grokService = new GrokService(c.env);

    // 調用 Grok API
    const response = await grokService.chat({
      model,
      messages,
      stream,
      conversation_id,
      parent_message_id,
      token: token.sso_token,
    });

    // 記錄 API 使用
    await logApiUsage(c.env.DB, {
      user_id: user?.id,
      token_id: token.id,
      endpoint: '/v1/chat/completions',
      model,
      status_code: 200,
      ip_address: c.req.header('cf-connecting-ip') || '',
      user_agent: c.req.header('user-agent') || '',
    });

    // 流式響應
    if (stream) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // 非流式響應
    return c.json(await response.json());

  } catch (error: any) {
    console.error('Chat completion error:', error);
    
    // 記錄錯誤
    const user = c.get('user');
    const token = c.get('token');
    await logApiUsage(c.env.DB, {
      user_id: user?.id,
      token_id: token?.id,
      endpoint: '/v1/chat/completions',
      status_code: 500,
      error_message: error.message,
      ip_address: c.req.header('cf-connecting-ip') || '',
      user_agent: c.req.header('user-agent') || '',
    });

    return c.json({
      error: {
        message: error.message || 'Internal server error',
        type: 'api_error',
      }
    }, 500);
  }
});

// 獲取模型列表
chatRouter.get('/models', async (c) => {
  return c.json({
    object: 'list',
    data: [
      { id: 'grok-2', object: 'model', created: 1677610602, owned_by: 'xai' },
      { id: 'grok-3', object: 'model', created: 1677610602, owned_by: 'xai' },
      { id: 'grok-4', object: 'model', created: 1677610602, owned_by: 'xai' },
      { id: 'grok-3-thinking', object: 'model', created: 1677610602, owned_by: 'xai' },
      { id: 'grok-4-thinking', object: 'model', created: 1677610602, owned_by: 'xai' },
      { id: 'grok-3-deepsearch', object: 'model', created: 1677610602, owned_by: 'xai' },
      { id: 'grok-3-deepersearch', object: 'model', created: 1677610602, owned_by: 'xai' },
    ]
  });
});
