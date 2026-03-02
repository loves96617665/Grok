-- 用戶表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_name TEXT NOT NULL UNIQUE,
    email_md5 TEXT,
    sso_token TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    last_login INTEGER,
    is_active INTEGER DEFAULT 1
);

CREATE INDEX idx_users_email_md5 ON users(email_md5);
CREATE INDEX idx_users_user_name ON users(user_name);

-- Token 表
CREATE TABLE IF NOT EXISTS tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sso_token TEXT NOT NULL UNIQUE,
    email_md5 TEXT,
    status TEXT DEFAULT 'active', -- active, expired, banned
    usage_count INTEGER DEFAULT 0,
    last_used INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER,
    metadata TEXT -- JSON 格式的額外信息
);

CREATE INDEX idx_tokens_sso_token ON tokens(sso_token);
CREATE INDEX idx_tokens_status ON tokens(status);
CREATE INDEX idx_tokens_email_md5 ON tokens(email_md5);

-- 會話表
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    conversation_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER NOT NULL,
    last_activity INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    metadata TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- API 使用記錄表
CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    token_id INTEGER,
    endpoint TEXT NOT NULL,
    model TEXT,
    request_tokens INTEGER DEFAULT 0,
    response_tokens INTEGER DEFAULT 0,
    status_code INTEGER,
    error_message TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (token_id) REFERENCES tokens(id)
);

CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_token_id ON api_usage(token_id);
CREATE INDEX idx_api_usage_created_at ON api_usage(created_at);

-- 對話歷史表
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    title TEXT,
    model TEXT,
    message_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_conversations_conversation_id ON conversations(conversation_id);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id TEXT NOT NULL UNIQUE,
    conversation_id TEXT NOT NULL,
    parent_message_id TEXT,
    role TEXT NOT NULL, -- user, assistant, system
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id)
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_parent_message_id ON messages(parent_message_id);

-- 系統配置表
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- 插入默認配置
INSERT OR IGNORE INTO config (key, value, description) VALUES
    ('daily_request_limit', '200', '每日請求限制'),
    ('max_tokens_per_request', '4096', '單次請求最大 token 數'),
    ('enable_registration', 'true', '是否允許新用戶註冊'),
    ('maintenance_mode', 'false', '維護模式');
