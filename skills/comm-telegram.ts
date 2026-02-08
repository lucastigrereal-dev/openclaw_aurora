/**
 * Skill: telegram.send
 * Envia mensagens via Telegram Bot API
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';

export class TelegramSendSkill extends Skill {
  private botToken: string;
  private baseUrl: string;

  constructor(botToken?: string) {
    super(
      {
        name: 'telegram.send',
        description: 'Envia mensagens pelo Telegram',
        version: '1.0.0',
        category: 'COMM',
        tags: ['telegram', 'message', 'chat', 'bot'],
      },
      {
        timeout: 30000,
        retries: 3,
      }
    );
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  validate(input: SkillInput): boolean {
    if (!this.botToken) {
      console.error('[telegram.send] Bot token not configured');
      return false;
    }
    if (!input.chatId) {
      return false;
    }
    if (!input.text && !input.photo && !input.document) {
      return false;
    }
    return true;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { chatId, text, photo, document, parseMode = 'HTML', replyToMessageId } = input;

    try {
      let endpoint: string;
      let body: any;

      if (photo) {
        endpoint = 'sendPhoto';
        body = {
          chat_id: chatId,
          photo,
          caption: text,
          parse_mode: parseMode,
        };
      } else if (document) {
        endpoint = 'sendDocument';
        body = {
          chat_id: chatId,
          document,
          caption: text,
          parse_mode: parseMode,
        };
      } else {
        endpoint = 'sendMessage';
        body = {
          chat_id: chatId,
          text,
          parse_mode: parseMode,
        };
      }

      if (replyToMessageId) {
        body.reply_to_message_id = replyToMessageId;
      }

      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: any = await response.json();

      if (!data.ok) {
        throw new Error(data.description || 'Telegram API error');
      }

      return {
        success: true,
        data: {
          messageId: data.result.message_id,
          chatId: data.result.chat.id,
          date: data.result.date,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

// ============================================================================
// TELEGRAM.GET_UPDATES
// ============================================================================

export class TelegramGetUpdatesSkill extends Skill {
  private botToken: string;
  private baseUrl: string;

  constructor(botToken?: string) {
    super(
      {
        name: 'telegram.getUpdates',
        description: 'Obtém atualizações do bot Telegram',
        version: '1.0.0',
        category: 'COMM',
        tags: ['telegram', 'updates', 'polling'],
      },
      { timeout: 60000 }
    );
    this.botToken = botToken || process.env.TELEGRAM_BOT_TOKEN || '';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  validate(input: SkillInput): boolean {
    return !!this.botToken;
  }

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { offset, limit = 100, timeout = 30 } = input;

    try {
      const params = new URLSearchParams({
        limit: String(limit),
        timeout: String(timeout),
      });

      if (offset) {
        params.set('offset', String(offset));
      }

      const response = await fetch(`${this.baseUrl}/getUpdates?${params}`);
      const data: any = await response.json();

      if (!data.ok) {
        throw new Error(data.description || 'Telegram API error');
      }

      return {
        success: true,
        data: {
          updates: data.result,
          count: data.result.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
