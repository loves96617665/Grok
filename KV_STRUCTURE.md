# KV 存儲結構說明

本項目使用單一 KV 命名空間，通過 key 前綴來區分不同類型的數據。

## KV 命名空間

- **綁定名稱**: `KV`
- **用途**: 存儲 Token、Session 和緩存數據

## Key 命名規範

### 1. Token 存儲

**Key 格式**: `token:{sso_token}`

**示例**:
```
token:abc123def456...
```

**值結構**:
```json
{
  "status": "active",
  "created_at": 1234567890
}
```

**用途**: 快速驗證 SSO Token 是否有效

### 2. Session 存儲

**Key 格式**: `session:{session_id}`

**示例**:
```
session:a1b2c3d4e5f6...
```

**值結構**:
```json
{
  "user_id": 123,
  "user_name": "test_user",
  "email_md5": "abc123...",
  "sso_token": "token123..."
}
```

**TTL**: 7 天（604800 秒）

**用途**: 存儲用戶會話信息

### 3. 速率限制

**Key 格式**: `ratelimit:{identifier}`

**示例**:
```
ratelimit:user_123
ratelimit:192.168.1.1
```

**值結構**:
```json
{
  "count": 50,
  "resetTime": 1234567890000
}
```

**TTL**: 24 小時（86400 秒）

**用途**: 追蹤 API 請求次數，實現速率限制

## 操作示例

### 寫入數據

```typescript
// 存儲 Token
await env.KV.put(`token:${sso_token}`, JSON.stringify({
  status: 'active',
  created_at: Date.now()
}));

// 存儲 Session（帶過期時間）
await env.KV.put(`session:${sessionId}`, JSON.stringify({
  user_id: 123,
  user_name: 'test'
}), {
  expirationTtl: 86400 * 7  // 7 天
});
```

### 讀取數據

```typescript
// 讀取 Token
const tokenData = await env.KV.get(`token:${sso_token}`);
if (tokenData) {
  const token = JSON.parse(tokenData);
  console.log(token.status);
}

// 讀取 Session
const sessionData = await env.KV.get(`session:${sessionId}`);
if (sessionData) {
  const session = JSON.parse(sessionData);
  console.log(session.user_id);
}
```

### 刪除數據

```typescript
// 刪除 Token
await env.KV.delete(`token:${sso_token}`);

// 刪除 Session
await env.KV.delete(`session:${sessionId}`);
```

### 列出所有 Key

```bash
# 列出所有 token
npx wrangler kv:key list --namespace-id=YOUR_KV_ID --prefix="token:"

# 列出所有 session
npx wrangler kv:key list --namespace-id=YOUR_KV_ID --prefix="session:"

# 列出所有 ratelimit
npx wrangler kv:key list --namespace-id=YOUR_KV_ID --prefix="ratelimit:"
```

## 數據清理

### 手動清理過期數據

```bash
# 刪除特定 token
npx wrangler kv:key delete "token:abc123..." --namespace-id=YOUR_KV_ID

# 刪除特定 session
npx wrangler kv:key delete "session:xyz789..." --namespace-id=YOUR_KV_ID
```

### 批量清理（使用腳本）

創建 `cleanup.js`:

```javascript
// 清理所有過期的 ratelimit 記錄
const keys = await env.KV.list({ prefix: 'ratelimit:' });
for (const key of keys.keys) {
  const data = await env.KV.get(key.name);
  if (data) {
    const parsed = JSON.parse(data);
    if (Date.now() > parsed.resetTime) {
      await env.KV.delete(key.name);
    }
  }
}
```

## 最佳實踐

1. **使用前綴**: 始終使用明確的前綴來區分不同類型的數據
2. **設置 TTL**: 為臨時數據設置過期時間，避免手動清理
3. **JSON 格式**: 統一使用 JSON 格式存儲複雜數據
4. **錯誤處理**: 讀取時檢查 null 值
5. **命名規範**: 使用小寫字母和冒號分隔符

## 監控

### 查看 KV 使用情況

在 Cloudflare Dashboard:
1. 進入 Workers & Pages
2. 選擇 KV
3. 查看存儲使用量和請求統計

### 命令行查看

```bash
# 查看 KV 命名空間列表
npx wrangler kv:namespace list

# 查看特定命名空間的 key 數量
npx wrangler kv:key list --namespace-id=YOUR_KV_ID | wc -l
```

## 成本

- 讀取：免費 100,000 次/天，超出 $0.50/百萬次
- 寫入：免費 1,000 次/天，超出 $5.00/百萬次
- 存儲：免費 1 GB，超出 $0.50/GB/月
- 刪除：免費

## 限制

- Key 大小：最大 512 字節
- Value 大小：最大 25 MB
- 每個命名空間：無限制 key 數量
- 列表操作：每次最多返回 1000 個 key
