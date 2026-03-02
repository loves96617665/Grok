import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { chatRouter } from './routes/chat';
import { authRouter } from './routes/auth';
import { adminRouter } from './routes/admin';
import { apiRouter } from './routes/api';
import { errorHandler } from './middleware/error';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/ratelimit';

export interface Env {
  // 環境變量
  ENVIRONMENT: string;
  ADMIN_PASSWORD: string;
  AUTHORIZATION: string;
  GROK_API_KEY: string;
  ENABLE_MIRROR_API: string;
  API_HATD: string;
  
  // KV 命名空間
  KV: KVNamespace;
  
  // D1 數據庫
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

// 全局中間件
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
}));

// 錯誤處理
app.onError(errorHandler);

// 健康檢查
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: Date.now(),
    environment: c.env.ENVIRONMENT,
  });
});

// 首頁
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Grok Mirror - Cloudflare Workers</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          line-height: 1.6;
        }
        h1 { color: #333; }
        .status { color: #28a745; font-weight: bold; }
        .endpoint { background: #f4f4f4; padding: 10px; margin: 10px 0; border-radius: 5px; }
        code { background: #e9ecef; padding: 2px 6px; border-radius: 3px; }
      </style>
    </head>
    <body>
      <h1>🚀 Grok Mirror</h1>
      <p class="status">✅ 服務運行中 (Cloudflare Workers)</p>
      
      <h2>API 端點</h2>
      <div class="endpoint">
        <strong>POST</strong> <code>/v1/chat/completions</code><br>
        OpenAI 格式的聊天 API
      </div>
      
      <div class="endpoint">
        <strong>POST</strong> <code>/api/login</code><br>
        用戶登入
      </div>
      
      <div class="endpoint">
        <strong>POST</strong> <code>/api/login-v2</code><br>
        用戶登入 v2（使用 SSO Token）
      </div>
      
      <div class="endpoint">
        <strong>POST</strong> <code>/api/batch-add-grok-token</code><br>
        批量添加 Token（需要管理員權限）
      </div>
      
      <h2>文檔</h2>
      <p>查看完整 API 文檔：<a href="/docs">/docs</a></p>
      
      <hr>
      <p style="color: #666; font-size: 14px;">
        Powered by Cloudflare Workers | 
        <a href="https://github.com/dairoot/Grok-Mirror">GitHub</a>
      </p>
    </body>
    </html>
  `);
});

// 路由
app.route('/v1', chatRouter);
app.route('/api', apiRouter);
app.route('/auth', authRouter);
app.route('/admin', adminRouter);

// 404 處理
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

export default app;
