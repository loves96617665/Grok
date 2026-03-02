# Grok Mirror - Cloudflare Workers 版本

完全 Serverless 架構的 Grok Mirror，運行在 Cloudflare Workers 上。

## 特點

- ✅ 全球 CDN 邊緣計算（300+ 數據中心）
- ✅ 零服務器維護
- ✅ 自動擴展
- ✅ 極低延遲（<50ms）
- ✅ 成本極低（免費額度：100k 請求/天）
- ✅ 自動 HTTPS
- ✅ DDoS 防護

## 技術棧

- Runtime：Cloudflare Workers (V8 引擎)
- 語言：TypeScript
- 框架：Hono
- 數據庫：Cloudflare D1 (SQLite)
- KV 存儲：Cloudflare KV

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 登入 Cloudflare

```bash
npx wrangler login
```

### 3. 創建資源

```bash
# 創建 KV 命名空間
npx wrangler kv:namespace create "KV"

# 創建 D1 數據庫
npx wrangler d1 create grok-mirror-db
```

### 4. 更新配置

編輯 `wrangler.toml`，填入上一步創建的資源 ID。

### 5. 初始化數據庫

```bash
npx wrangler d1 execute grok-mirror-db --file=./schema.sql
```

### 6. 設置密鑰

```bash
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put AUTHORIZATION
```

### 7. 部署

```bash
npx wrangler deploy
```

或使用自動化腳本：

```bash
chmod +x deploy.sh
./deploy.sh
```

## 本地開發

```bash
npm run dev
```

訪問 `http://localhost:8787`

## API 端點

### 聊天 API

```bash
POST /v1/chat/completions
```

請求示例：

```bash
curl -X POST https://your-worker.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "model": "grok-3",
    "messages": [{"role": "user", "content": "你好"}],
    "stream": false
  }'
```

### 用戶登入

```bash
POST /auth/login-v2
```

請求示例：

```bash
curl -X POST https://your-worker.workers.dev/auth/login-v2 \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "test_user",
    "sso_token": "YOUR_SSO_TOKEN"
  }'
```

### 批量添加 Token（管理員）

```bash
POST /api/batch-add-grok-token
```

請求示例：

```bash
curl -X POST https://your-worker.workers.dev/api/batch-add-grok-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_PASSWORD" \
  -d '{
    "sso_token_list": ["token1", "token2", "token3"]
  }'
```

### 獲取統計信息（管理員）

```bash
GET /api/stats
```

請求示例：

```bash
curl https://your-worker.workers.dev/api/stats \
  -H "Authorization: Bearer YOUR_ADMIN_PASSWORD"
```

## 配置自定義域名

1. 進入 Cloudflare Dashboard
2. 選擇你的 Worker
3. 點擊 "Triggers" 標籤
4. 添加自定義域名
5. 等待 DNS 生效

## 環境變量

在 `wrangler.toml` 中配置：

```toml
[vars]
ENVIRONMENT = "production"
ENABLE_MIRROR_API = "true"
API_HATD = "true"
```

密鑰使用 `wrangler secret` 設置：

- `ADMIN_PASSWORD`：管理員密碼
- `AUTHORIZATION`：API 授權密鑰
- `GROK_API_KEY`：Grok API 密鑰（可選）

## 監控和日誌

### 查看日誌

```bash
npx wrangler tail
```

### 查看分析

訪問 Cloudflare Dashboard > Workers > Analytics

## 成本估算

### 免費額度（每天）

- Workers 請求：100,000 次
- KV 讀取：100,000 次
- KV 寫入：1,000 次
- D1 讀取：500 萬行

### 付費價格（超出免費額度）

- Workers：$5/月（10M 請求）
- KV：$0.50/月（1M 讀取）
- D1：$5/月（2500 萬行讀取）

## 限制

- CPU 時間：50ms (免費) / 30s (付費)
- 內存：128 MB
- 請求大小：100 MB
- 響應大小：無限制（流式）

## 故障排除

### 部署失敗

```bash
# 檢查配置
npx wrangler whoami

# 重新登入
npx wrangler login

# 查看詳細錯誤
npx wrangler deploy --verbose
```

### 數據庫錯誤

```bash
# 重新初始化數據庫
npx wrangler d1 execute grok-mirror-db --file=./schema.sql

# 查看數據庫內容
npx wrangler d1 execute grok-mirror-db --command="SELECT * FROM tokens LIMIT 10"
```

### KV 錯誤

```bash
# 列出所有 KV 命名空間
npx wrangler kv:namespace list

# 查看 KV 內容
npx wrangler kv:key list --namespace-id=YOUR_KV_ID
```

## 更新

```bash
# 拉取最新代碼
git pull

# 安裝依賴
npm install

# 部署
npx wrangler deploy
```

## 參考資料

- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [Hono 框架文檔](https://hono.dev/)
- [D1 數據庫文檔](https://developers.cloudflare.com/d1/)
- [KV 存儲文檔](https://developers.cloudflare.com/kv/)

## 許可證

MIT
