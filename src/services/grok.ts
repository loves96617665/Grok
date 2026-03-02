import { Env } from '../index';

export interface ChatRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  conversation_id?: string;
  parent_message_id?: string;
  token: string;
}

export class GrokService {
  private env: Env;
  private baseUrl = 'https://api.x.ai/v1';

  constructor(env: Env) {
    this.env = env;
  }

  async chat(request: ChatRequest): Promise<Response> {
    const { model, messages, stream, conversation_id, parent_message_id, token } = request;

    // 構建請求體
    const body: any = {
      model,
      messages,
      stream: stream || false,
    };

    // 如果是臨時聊天模式
    if (this.env.API_HATD === 'true') {
      if (conversation_id) {
        body.conversation_id = conversation_id;
      }
      if (parent_message_id) {
        body.parent_message_id = parent_message_id;
      }
    }

    // 調用 Grok API
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Grok API error: ${response.status} ${error}`);
    }

    return response;
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
