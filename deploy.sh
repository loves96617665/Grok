#!/bin/bash

set -e

echo "================================"
echo "Grok Mirror Workers 部署腳本"
echo "================================"
echo ""

# 檢查是否安裝 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安裝"
    echo "請先安裝 Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 已安裝: $(node --version)"
echo ""

# 檢查是否安裝 npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安裝"
    exit 1
fi

echo "✅ npm 已安裝: $(npm --version)"
echo ""

# 安裝依賴
echo "📦 安裝依賴..."
npm install
echo "✅ 依賴安裝完成"
echo ""

# 檢查是否已登入 Cloudflare
echo "🔐 檢查 Cloudflare 登入狀態..."
if ! npx wrangler whoami &> /dev/null; then
    echo "⚠️  請先登入 Cloudflare:"
    npx wrangler login
fi

echo "✅ 已登入 Cloudflare"
echo ""

# 創建 KV 命名空間
echo "📝 創建 KV 命名空間..."

KV_ID=$(npx wrangler kv:namespace create "KV" --preview false 2>&1 | grep -oP 'id = "\K[^"]+' || echo "")
if [ -n "$KV_ID" ]; then
    echo "✅ KV 命名空間已創建: $KV_ID"
    sed -i "s/your_kv_namespace_id/$KV_ID/" wrangler.toml
fi

echo ""

# 創建 D1 數據庫
echo "📝 創建 D1 數據庫..."
DB_ID=$(npx wrangler d1 create grok-mirror-db 2>&1 | grep -oP 'database_id = "\K[^"]+' || echo "")
if [ -n "$DB_ID" ]; then
    echo "✅ D1 數據庫已創建: $DB_ID"
    sed -i "s/your_database_id/$DB_ID/" wrangler.toml
fi

echo ""

# 初始化數據庫
echo "🔐 設置密鑰..."
echo "請輸入管理員密碼:"
npx wrangler secret put ADMIN_PASSWORD

echo "請輸入 API 授權密鑰:"
npx wrangler secret put AUTHORIZATION

echo "請輸入 Grok API 密鑰（可選，按 Enter 跳過）:"
npx wrangler secret put GROK_API_KEY || echo "已跳過"

echo ""

# 部署
echo "🚀 部署到 Cloudflare Workers..."
npx wrangler deploy

echo ""
echo "================================"
echo "✅ 部署完成！"
echo "================================"
echo ""
echo "下一步："
echo "1. 在 Cloudflare Dashboard 配置自定義域名"
echo "2. 使用 POST /api/batch-add-grok-token 添加 SSO Token"
echo "3. 測試 API: curl https://your-domain.com/health"
echo ""
