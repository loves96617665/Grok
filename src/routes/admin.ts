import { Hono } from 'hono';
import { Env } from '../index';
import { adminAuth } from '../middleware/admin';

export const adminRouter = new Hono<{ Bindings: Env }>();

// 管理後台首頁
adminRouter.get('/', adminAuth, (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Grok Mirror - 管理後台</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #f5f5f5;
          padding: 20px;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        h1 { color: #333; margin-bottom: 30px; }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
        }
        .stat-card h3 { font-size: 14px; opacity: 0.9; margin-bottom: 10px; }
        .stat-card .value { font-size: 32px; font-weight: bold; }
        .actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
          text-decoration: none;
          display: inline-block;
        }
        .btn-primary { background: #667eea; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎛️ Grok Mirror 管理後台</h1>
        
        <div class="stats">
          <div class="stat-card">
            <h3>總 Token 數</h3>
            <div class="value" id="totalTokens">-</div>
          </div>
          <div class="stat-card">
            <h3>活躍 Token</h3>
            <div class="value" id="activeTokens">-</div>
          </div>
          <div class="stat-card">
            <h3>總用戶數</h3>
            <div class="value" id="totalUsers">-</div>
          </div>
          <div class="stat-card">
            <h3>今日請求</h3>
            <div class="value" id="todayRequests">-</div>
          </div>
        </div>

        <div class="actions">
          <a href="/api/get-grok-list" class="btn btn-primary">查看 Token 列表</a>
          <a href="/docs" class="btn btn-secondary">API 文檔</a>
        </div>
      </div>

      <script>
        // 獲取統計數據
        fetch('/api/stats', {
          headers: {
            'Authorization': 'Bearer ' + prompt('請輸入管理員密碼')
          }
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            document.getElementById('totalTokens').textContent = data.tokens.total;
            document.getElementById('activeTokens').textContent = data.tokens.active;
            document.getElementById('totalUsers').textContent = data.users.total;
            document.getElementById('todayRequests').textContent = data.api_usage_today.total_requests;
          }
        })
        .catch(err => console.error('Failed to load stats:', err));
      </script>
    </body>
    </html>
  `);
});
