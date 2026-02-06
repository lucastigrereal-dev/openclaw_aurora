/**
 * Supabase Archon - Approval System
 * Sistema de aprovação triplo para operações críticas
 *
 * @version 1.0.0
 * @priority P0
 * @category SECURITY
 */

import { createLogger } from './supabase-logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export enum ApprovalLevel {
  AUTO = 'auto',      // Aprovação automática (operações seguras)
  SINGLE = 'single',  // 1 aprovação necessária
  DOUBLE = 'double',  // 2 aprovações necessárias
  TRIPLE = 'triple',  // 3 aprovações necessárias (operações destrutivas)
}

export enum OperationType {
  READ = 'read',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  DROP = 'drop',
  MIGRATE = 'migrate',
  BACKUP = 'backup',
  RESTORE = 'restore',
}

export interface ApprovalRequest {
  id: string;
  operation: OperationType;
  level: ApprovalLevel;
  description: string;
  query?: string;
  affectedObjects: string[];
  requestedBy: string;
  requestedAt: string;
  approvals: ApprovalRecord[];
  status: 'pending' | 'approved' | 'rejected';
  expiresAt: string;
}

export interface ApprovalRecord {
  approver: string;
  approvedAt: string;
  comment?: string;
}

/**
 * Whitelist de comandos seguros (aprovação automática)
 */
const SAFE_COMMANDS = [
  'SELECT',
  'SHOW',
  'DESCRIBE',
  'EXPLAIN',
  'information_schema',
  'pg_catalog',
];

/**
 * Blacklist de comandos perigosos (aprovação tripla obrigatória)
 */
const DANGEROUS_COMMANDS = [
  'DROP DATABASE',
  'DROP SCHEMA',
  'DROP TABLE',
  'TRUNCATE',
  'DELETE FROM',
  'ALTER TABLE DROP',
  'REVOKE',
  'GRANT ALL',
];

export class ApprovalSystem {
  private logger = createLogger('approval-system');
  private requestsPath: string;
  private requests: Map<string, ApprovalRequest> = new Map();

  constructor(requestsPath: string = './data/approval-requests') {
    this.requestsPath = requestsPath;
    this.loadRequests();
  }

  /**
   * Analisa operação e determina nível de aprovação necessário
   */
  analyzeOperation(query: string, affectedObjects: string[]): ApprovalLevel {
    const upperQuery = query.toUpperCase();

    // Comandos perigosos: aprovação tripla
    for (const dangerous of DANGEROUS_COMMANDS) {
      if (upperQuery.includes(dangerous)) {
        this.logger.warn('Dangerous command detected', { command: dangerous });
        return ApprovalLevel.TRIPLE;
      }
    }

    // Comandos seguros: aprovação automática
    for (const safe of SAFE_COMMANDS) {
      if (upperQuery.startsWith(safe)) {
        return ApprovalLevel.AUTO;
      }
    }

    // DELETE: aprovação dupla
    if (upperQuery.includes('DELETE') && affectedObjects.length > 100) {
      return ApprovalLevel.TRIPLE;
    } else if (upperQuery.includes('DELETE')) {
      return ApprovalLevel.DOUBLE;
    }

    // UPDATE: aprovação simples/dupla
    if (upperQuery.includes('UPDATE') && affectedObjects.length > 1000) {
      return ApprovalLevel.DOUBLE;
    } else if (upperQuery.includes('UPDATE')) {
      return ApprovalLevel.SINGLE;
    }

    // CREATE/ALTER: aprovação simples
    if (upperQuery.includes('CREATE') || upperQuery.includes('ALTER')) {
      return ApprovalLevel.SINGLE;
    }

    // Default: aprovação simples
    return ApprovalLevel.SINGLE;
  }

  /**
   * Cria novo pedido de aprovação
   */
  async createRequest(
    operation: OperationType,
    description: string,
    query: string,
    affectedObjects: string[],
    requestedBy: string
  ): Promise<ApprovalRequest> {
    const level = this.analyzeOperation(query, affectedObjects);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h

    const request: ApprovalRequest = {
      id: `APR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      level,
      description,
      query,
      affectedObjects,
      requestedBy,
      requestedAt: now.toISOString(),
      approvals: [],
      status: level === ApprovalLevel.AUTO ? 'approved' : 'pending',
      expiresAt: expiresAt.toISOString(),
    };

    this.requests.set(request.id, request);
    await this.saveRequests();

    this.logger.info('Approval request created', {
      id: request.id,
      level,
      operation,
      status: request.status,
    });

    return request;
  }

  /**
   * Aprova um pedido
   */
  async approve(requestId: string, approver: string, comment?: string): Promise<boolean> {
    const request = this.requests.get(requestId);
    if (!request) {
      this.logger.error('Request not found', { requestId });
      return false;
    }

    if (request.status !== 'pending') {
      this.logger.error('Request not pending', { requestId, status: request.status });
      return false;
    }

    // Verificar se já expirou
    if (new Date() > new Date(request.expiresAt)) {
      request.status = 'rejected';
      await this.saveRequests();
      this.logger.warn('Request expired', { requestId });
      return false;
    }

    // Adicionar aprovação
    request.approvals.push({
      approver,
      approvedAt: new Date().toISOString(),
      comment,
    });

    // Verificar se atingiu número de aprovações necessário
    const requiredApprovals = this.getRequiredApprovals(request.level);
    if (request.approvals.length >= requiredApprovals) {
      request.status = 'approved';
      this.logger.info('Request approved', {
        requestId,
        approvals: request.approvals.length,
        required: requiredApprovals,
      });
    }

    await this.saveRequests();
    return true;
  }

  /**
   * Rejeita um pedido
   */
  async reject(requestId: string, approver: string, comment?: string): Promise<boolean> {
    const request = this.requests.get(requestId);
    if (!request) {
      this.logger.error('Request not found', { requestId });
      return false;
    }

    request.status = 'rejected';
    request.approvals.push({
      approver,
      approvedAt: new Date().toISOString(),
      comment: comment || 'Rejected',
    });

    await this.saveRequests();

    this.logger.warn('Request rejected', { requestId, approver, comment });
    return true;
  }

  /**
   * Verifica se operação está aprovada
   */
  isApproved(requestId: string): boolean {
    const request = this.requests.get(requestId);
    return request?.status === 'approved';
  }

  /**
   * Lista pedidos pendentes
   */
  getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.requests.values()).filter(r => r.status === 'pending');
  }

  /**
   * Obtém número de aprovações necessário por nível
   */
  private getRequiredApprovals(level: ApprovalLevel): number {
    switch (level) {
      case ApprovalLevel.AUTO:
        return 0;
      case ApprovalLevel.SINGLE:
        return 1;
      case ApprovalLevel.DOUBLE:
        return 2;
      case ApprovalLevel.TRIPLE:
        return 3;
    }
  }

  /**
   * Carrega pedidos do disco
   */
  private async loadRequests(): Promise<void> {
    try {
      const filePath = path.join(this.requestsPath, 'requests.json');
      const data = await fs.readFile(filePath, 'utf-8');
      const requests: ApprovalRequest[] = JSON.parse(data);

      for (const request of requests) {
        this.requests.set(request.id, request);
      }

      this.logger.info('Requests loaded', { count: requests.length });
    } catch (error) {
      // Arquivo não existe ainda
      this.logger.debug('No requests file found, starting fresh');
    }
  }

  /**
   * Salva pedidos no disco
   */
  private async saveRequests(): Promise<void> {
    try {
      await fs.mkdir(this.requestsPath, { recursive: true });
      const filePath = path.join(this.requestsPath, 'requests.json');
      const requests = Array.from(this.requests.values());
      await fs.writeFile(filePath, JSON.stringify(requests, null, 2), 'utf-8');

      this.logger.debug('Requests saved', { count: requests.length });
    } catch (error: any) {
      this.logger.error('Failed to save requests', { error: error.message });
    }
  }

  /**
   * Limpa pedidos expirados
   */
  async cleanupExpired(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, request] of this.requests.entries()) {
      if (new Date(request.expiresAt) < now && request.status === 'pending') {
        request.status = 'rejected';
        cleaned++;
      }
    }

    if (cleaned > 0) {
      await this.saveRequests();
      this.logger.info('Expired requests cleaned', { count: cleaned });
    }

    return cleaned;
  }
}

/**
 * Singleton instance
 */
let globalApprovalSystem: ApprovalSystem | null = null;

export function getApprovalSystem(requestsPath?: string): ApprovalSystem {
  if (!globalApprovalSystem) {
    globalApprovalSystem = new ApprovalSystem(requestsPath);
  }
  return globalApprovalSystem;
}
