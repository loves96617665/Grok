export interface ApiUsageLog {
  user_id?: number;
  token_id?: number;
  endpoint: string;
  model?: string;
  request_tokens?: number;
  response_tokens?: number;
  status_code: number;
  error_message?: string;
  ip_address: string;
  user_agent: string;
}

export async function logApiUsage(db: D1Database, log: ApiUsageLog) {
  try {
    await db.prepare(`
      INSERT INTO api_usage (
        user_id, token_id, endpoint, model, 
        request_tokens, response_tokens, status_code, 
        error_message, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      log.user_id || null,
      log.token_id || null,
      log.endpoint,
      log.model || null,
      log.request_tokens || 0,
      log.response_tokens || 0,
      log.status_code,
      log.error_message || null,
      log.ip_address,
      log.user_agent,
      Math.floor(Date.now() / 1000)
    ).run();
  } catch (error) {
    console.error('Failed to log API usage:', error);
  }
}
