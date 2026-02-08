/**
 * S-32: Social Hub Approval Workflow
 *
 * Manage post approval queue:
 * - Auto-approve satellites (@agente.viaja, @memes.do.lucas, etc)
 * - Manual approval for Lucas/Família (@lucasrsmotta, @mamae.de.dois)
 * - Telegram notifications for pending approvals
 * - Approval history tracking
 *
 * @category UTIL
 * @version 1.0.0
 * @critical MEDIUM
 * @author Magnus (The Architect)
 */

import { Skill, SkillInput, SkillOutput } from './skill-base';
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ApprovalWorkflowInput extends SkillInput {
  socialHubPath: string;
  operation: 'submit' | 'approve' | 'reject' | 'list' | 'auto-process';
  post?: {
    id: string;
    pagina: string;
    videoPath: string;
    legenda: string;
    hashtags: string[];
    scheduledDate: string;
    scheduledTime: string;
  };
  approvalId?: string;            // Para approve/reject
  telegramConfig?: {
    botToken: string;
    chatId: string;
  };
}

export interface ApprovalWorkflowOutput extends SkillOutput {
  data?: {
    approvalId?: string;
    status: 'pending' | 'approved' | 'rejected' | 'auto-approved';
    requiresManualReview: boolean;
    notificationSent?: boolean;
    queue?: ApprovalQueueItem[];
    processed?: {
      autoApproved: number;
      pendingManual: number;
    };
  };
}

interface ApprovalQueueItem {
  id: string;
  pagina: string;
  videoPath: string;
  legenda: string;
  hashtags: string[];
  scheduledDate: string;
  scheduledTime: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto-approved';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  requiresManualReview: boolean;
}

export class SocialHubApprovalWorkflow extends Skill {
  private readonly AUTO_APPROVE_PAGES = [
    '@agente.viaja',
    '@memes.do.lucas',
    '@chef.lucas.motta',
    '@resolutis.tech',
  ];

  private readonly MANUAL_REVIEW_PAGES = [
    '@lucasrsmotta',
    '@mamae.de.dois',
  ];

  constructor() {
    super(
      {
        name: 'social-hub-approval-workflow',
        description: 'Manage post approval queue with auto-approve and Telegram notifications',
        version: '1.0.0',
        category: 'UTIL',
        author: 'Magnus (The Architect)',
        tags: ['instagram', 'approval', 'workflow', 'telegram'],
      },
      {
        timeout: 30000,
        retries: 1,
      }
    );
  }

  validate(input: SkillInput): boolean {
    const typed = input as ApprovalWorkflowInput;

    if (!typed.socialHubPath) {
      console.error('[ApprovalWorkflow] Missing socialHubPath');
      return false;
    }

    if (!typed.operation) {
      console.error('[ApprovalWorkflow] Missing operation');
      return false;
    }

    if (typed.operation === 'submit' && !typed.post) {
      console.error('[ApprovalWorkflow] Missing post data for submit operation');
      return false;
    }

    if (['approve', 'reject'].includes(typed.operation) && !typed.approvalId) {
      console.error('[ApprovalWorkflow] Missing approvalId for approve/reject operation');
      return false;
    }

    return true;
  }

  async execute(input: SkillInput): Promise<ApprovalWorkflowOutput> {
    const typed = input as ApprovalWorkflowInput;

    try {
      switch (typed.operation) {
        case 'submit':
          return await this.submitForApproval(typed);

        case 'approve':
          return await this.approvePost(typed);

        case 'reject':
          return await this.rejectPost(typed);

        case 'list':
          return await this.listQueue(typed);

        case 'auto-process':
          return await this.autoProcessQueue(typed);

        default:
          return {
            success: false,
            error: `Unknown operation: ${typed.operation}`,
          };
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Approval workflow failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Submete post para aprovação
   */
  private async submitForApproval(
    input: ApprovalWorkflowInput
  ): Promise<ApprovalWorkflowOutput> {
    if (!input.post) {
      return {
        success: false,
        error: 'Post data required',
      };
    }

    const requiresManualReview = this.requiresManualReview(input.post.pagina);
    const approvalId = this.generateApprovalId();

    const queueItem: ApprovalQueueItem = {
      id: approvalId,
      pagina: input.post.pagina,
      videoPath: input.post.videoPath,
      legenda: input.post.legenda,
      hashtags: input.post.hashtags,
      scheduledDate: input.post.scheduledDate,
      scheduledTime: input.post.scheduledTime,
      status: requiresManualReview ? 'pending' : 'auto-approved',
      submittedAt: new Date().toISOString(),
      requiresManualReview,
    };

    // Salvar na fila
    await this.saveToQueue(input.socialHubPath, queueItem);

    let notificationSent = false;

    // Se requer revisão manual, enviar notificação
    if (requiresManualReview && input.telegramConfig) {
      notificationSent = await this.sendTelegramNotification(
        input.telegramConfig,
        queueItem
      );
    }

    const status = requiresManualReview ? 'pending' : 'auto-approved';

    console.log(
      `[ApprovalWorkflow] Post ${approvalId} submitted - ${status}`
    );

    return {
      success: true,
      data: {
        approvalId,
        status,
        requiresManualReview,
        notificationSent,
      },
    };
  }

  /**
   * Aprova post
   */
  private async approvePost(
    input: ApprovalWorkflowInput
  ): Promise<ApprovalWorkflowOutput> {
    if (!input.approvalId) {
      return {
        success: false,
        error: 'Approval ID required',
      };
    }

    const queue = await this.loadQueue(input.socialHubPath);
    const item = queue.find(i => i.id === input.approvalId);

    if (!item) {
      return {
        success: false,
        error: `Approval not found: ${input.approvalId}`,
      };
    }

    item.status = 'approved';
    item.reviewedAt = new Date().toISOString();
    item.reviewedBy = 'manual';

    await this.updateQueue(input.socialHubPath, queue);

    console.log(`[ApprovalWorkflow] ✓ Approved: ${input.approvalId}`);

    return {
      success: true,
      data: {
        approvalId: input.approvalId,
        status: 'approved',
        requiresManualReview: false,
      },
    };
  }

  /**
   * Rejeita post
   */
  private async rejectPost(
    input: ApprovalWorkflowInput
  ): Promise<ApprovalWorkflowOutput> {
    if (!input.approvalId) {
      return {
        success: false,
        error: 'Approval ID required',
      };
    }

    const queue = await this.loadQueue(input.socialHubPath);
    const item = queue.find(i => i.id === input.approvalId);

    if (!item) {
      return {
        success: false,
        error: `Approval not found: ${input.approvalId}`,
      };
    }

    item.status = 'rejected';
    item.reviewedAt = new Date().toISOString();
    item.reviewedBy = 'manual';

    await this.updateQueue(input.socialHubPath, queue);

    console.log(`[ApprovalWorkflow] ✗ Rejected: ${input.approvalId}`);

    return {
      success: true,
      data: {
        approvalId: input.approvalId,
        status: 'rejected',
        requiresManualReview: false,
      },
    };
  }

  /**
   * Lista fila de aprovação
   */
  private async listQueue(
    input: ApprovalWorkflowInput
  ): Promise<ApprovalWorkflowOutput> {
    const queue = await this.loadQueue(input.socialHubPath);

    // Filtrar apenas pendentes
    const pending = queue.filter(i => i.status === 'pending');

    console.log(`[ApprovalWorkflow] Queue: ${pending.length} pending`);

    return {
      success: true,
      data: {
        status: 'pending',
        requiresManualReview: false,
        queue: pending,
      },
    };
  }

  /**
   * Processa automaticamente fila (auto-approve satellites)
   */
  private async autoProcessQueue(
    input: ApprovalWorkflowInput
  ): Promise<ApprovalWorkflowOutput> {
    const queue = await this.loadQueue(input.socialHubPath);

    let autoApproved = 0;
    let pendingManual = 0;

    queue.forEach(item => {
      if (item.status === 'pending' && !item.requiresManualReview) {
        item.status = 'auto-approved';
        item.reviewedAt = new Date().toISOString();
        item.reviewedBy = 'auto';
        autoApproved++;
      } else if (item.status === 'pending') {
        pendingManual++;
      }
    });

    await this.updateQueue(input.socialHubPath, queue);

    console.log(
      `[ApprovalWorkflow] Auto-processed: ${autoApproved} approved, ${pendingManual} pending manual`
    );

    return {
      success: true,
      data: {
        status: 'auto-approved',
        requiresManualReview: false,
        processed: {
          autoApproved,
          pendingManual,
        },
      },
    };
  }

  /**
   * Verifica se página requer aprovação manual
   */
  private requiresManualReview(pagina: string): boolean {
    return this.MANUAL_REVIEW_PAGES.includes(pagina);
  }

  /**
   * Gera ID único para aprovação
   */
  private generateApprovalId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `APV-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Carrega fila do arquivo
   */
  private async loadQueue(socialHubPath: string): Promise<ApprovalQueueItem[]> {
    const queuePath = path.join(socialHubPath, 'DATA', 'approval_queue.json');

    try {
      const content = await fs.readFile(queuePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // Arquivo não existe - retornar vazio
      return [];
    }
  }

  /**
   * Salva item na fila
   */
  private async saveToQueue(
    socialHubPath: string,
    item: ApprovalQueueItem
  ): Promise<void> {
    const queue = await this.loadQueue(socialHubPath);
    queue.push(item);
    await this.updateQueue(socialHubPath, queue);
  }

  /**
   * Atualiza fila completa
   */
  private async updateQueue(
    socialHubPath: string,
    queue: ApprovalQueueItem[]
  ): Promise<void> {
    const queuePath = path.join(socialHubPath, 'DATA', 'approval_queue.json');
    const dataDir = path.dirname(queuePath);

    // Criar diretório se não existir
    await fs.mkdir(dataDir, { recursive: true });

    await fs.writeFile(queuePath, JSON.stringify(queue, null, 2), 'utf-8');
  }

  /**
   * Envia notificação via Telegram
   */
  private async sendTelegramNotification(
    config: { botToken: string; chatId: string },
    item: ApprovalQueueItem
  ): Promise<boolean> {
    try {
      const message = this.formatTelegramMessage(item);

      await axios.post(
        `https://api.telegram.org/bot${config.botToken}/sendMessage`,
        {
          chat_id: config.chatId,
          text: message,
          parse_mode: 'Markdown',
        }
      );

      console.log(`[ApprovalWorkflow] Telegram notification sent for ${item.id}`);
      return true;

    } catch (error) {
      console.error(`[ApprovalWorkflow] Failed to send Telegram notification: ${error}`);
      return false;
    }
  }

  /**
   * Formata mensagem do Telegram
   */
  private formatTelegramMessage(item: ApprovalQueueItem): string {
    return `
🔔 *Novo Post para Aprovação*

📱 Página: ${item.pagina}
📅 Agendado: ${item.scheduledDate} às ${item.scheduledTime}
🆔 ID: \`${item.id}\`

📝 *Legenda:*
${item.legenda.substring(0, 200)}${item.legenda.length > 200 ? '...' : ''}

🏷️ *Hashtags:* ${item.hashtags.slice(0, 5).join(' ')}

Para aprovar/rejeitar, use:
\`/approve ${item.id}\`
\`/reject ${item.id}\`
    `.trim();
  }
}
