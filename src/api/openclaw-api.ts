/**
 * ══════════════════════════════════════════════════════════════════════════════
 * OPENCLAW API - Porta Oficial REST para o Sistema
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Esta API é a "porta principal" do OpenClaw, substituindo dependência do Telegram.
 *
 * ENDPOINTS:
 * - POST /api/v1/intent         → Envia intenção do usuário
 * - GET  /api/v1/status         → Status do sistema
 * - GET  /api/v1/executions     → Lista execuções
 * - GET  /api/v1/executions/:id → Detalhes de uma execução
 * - GET  /api/v1/hubs           → Lista hubs disponíveis
 * - GET  /api/v1/hubs/:id       → Detalhes de um hub
 * - POST /api/v1/hubs/:id/execute → Executa workflow de um hub
 * - GET  /api/v1/health         → Health check
 */

import { IncomingMessage, ServerResponse } from 'http';
import { getOperatorAdapter, OperatorAdapter } from '../adapters/operator.adapter';
import { getAuroraAdapter, AuroraAdapter } from '../adapters/aurora.adapter';
import { getHubEnterpriseAdapter, HubEnterpriseAdapter } from '../adapters/hub.adapter';
import { getHubSupabaseAdapter, HubSupabaseAdapter } from '../adapters/hub-supabase.adapter';
import { getHubSocialAdapter, HubSocialAdapter } from '../adapters/hub-social.adapter';
import { HUB_REGISTRY, TOTAL_SKILLS_AVAILABLE } from '../adapters';
import { generateId } from '../contracts/types';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: string;
    request_id: string;
    duration_ms?: number;
  };
}

interface IntentRequest {
  message: string;
  origin?: 'cockpit' | 'api' | 'cli';
  mode?: 'dry-run' | 'real';
  context?: Record<string, any>;
}

interface ExecuteWorkflowRequest {
  workflow: string;
  params: Record<string, any>;
  mode?: 'dry-run' | 'real';
}

// ════════════════════════════════════════════════════════════════════════════
// EXECUTION STORE (in-memory para MVP)
// ════════════════════════════════════════════════════════════════════════════

interface StoredExecution {
  id: string;
  type: 'intent' | 'workflow';
  hub?: string;
  workflow?: string;
  status: 'pending' | 'authorized' | 'running' | 'completed' | 'failed' | 'blocked';
  input: any;
  output?: any;
  error?: any;
  plan_id?: string;
  authorization?: any;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

const executionStore = new Map<string, StoredExecution>();

// ════════════════════════════════════════════════════════════════════════════
// OPENCLAW API ROUTER
// ════════════════════════════════════════════════════════════════════════════

export class OpenClawAPIRouter {
  private operator: OperatorAdapter;
  private aurora: AuroraAdapter;
  private hubEnterprise: HubEnterpriseAdapter;
  private hubSupabase: HubSupabaseAdapter;
  private hubSocial: HubSocialAdapter;

  constructor() {
    this.operator = getOperatorAdapter();
    this.aurora = getAuroraAdapter();
    this.hubEnterprise = getHubEnterpriseAdapter();
    this.hubSupabase = getHubSupabaseAdapter();
    this.hubSocial = getHubSocialAdapter();
  }

  /**
   * Processa requisição HTTP
   */
  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = req.url || '';
    const method = req.method || 'GET';

    // Só processa rotas /api/v1/*
    if (!url.startsWith('/api/v1/')) {
      return false; // Não processado, deixa para outro handler
    }

    const startTime = Date.now();
    const requestId = generateId('req');

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    if (method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return true;
    }

    try {
      // Parse body para POST/PUT
      let body: any = {};
      if (method === 'POST' || method === 'PUT') {
        body = await this.parseBody(req);
      }

      // Roteamento
      const path = url.split('?')[0]; // Remove query string

      // ─────────────────────────────────────────────────────────────────────
      // GET /api/v1/health
      // ─────────────────────────────────────────────────────────────────────
      if (path === '/api/v1/health' && method === 'GET') {
        const health = await this.aurora.getHealthStatus();
        return this.send(res, 200, {
          success: true,
          data: {
            status: health,
            uptime_ms: process.uptime() * 1000,
            version: '2.0.0',
            hubs_available: Object.keys(HUB_REGISTRY).length,
            total_skills: TOTAL_SKILLS_AVAILABLE,
          },
          meta: this.createMeta(requestId, startTime),
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // GET /api/v1/status
      // ─────────────────────────────────────────────────────────────────────
      if (path === '/api/v1/status' && method === 'GET') {
        const health = await this.aurora.getHealthStatus();
        const metrics = await this.aurora.getMetrics();
        return this.send(res, 200, {
          success: true,
          data: {
            health,
            metrics,
            hubs: HUB_REGISTRY,
            active_executions: executionStore.size,
            running: Array.from(executionStore.values()).filter(e => e.status === 'running').length,
          },
          meta: this.createMeta(requestId, startTime),
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // POST /api/v1/intent
      // ─────────────────────────────────────────────────────────────────────
      if (path === '/api/v1/intent' && method === 'POST') {
        return await this.handleIntent(req, res, body as IntentRequest, requestId, startTime);
      }

      // ─────────────────────────────────────────────────────────────────────
      // GET /api/v1/executions
      // ─────────────────────────────────────────────────────────────────────
      if (path === '/api/v1/executions' && method === 'GET') {
        const executions = Array.from(executionStore.values())
          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
          .slice(0, 50); // Últimas 50

        return this.send(res, 200, {
          success: true,
          data: {
            executions: executions.map(e => ({
              id: e.id,
              type: e.type,
              hub: e.hub,
              workflow: e.workflow,
              status: e.status,
              created_at: e.created_at,
              completed_at: e.completed_at,
            })),
            total: executionStore.size,
          },
          meta: this.createMeta(requestId, startTime),
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // GET /api/v1/executions/:id
      // ─────────────────────────────────────────────────────────────────────
      const execMatch = path.match(/^\/api\/v1\/executions\/([^/]+)$/);
      if (execMatch && method === 'GET') {
        const execId = execMatch[1];
        const execution = executionStore.get(execId);

        if (!execution) {
          return this.send(res, 404, {
            success: false,
            error: { code: 'NOT_FOUND', message: `Execution ${execId} not found` },
            meta: this.createMeta(requestId, startTime),
          });
        }

        return this.send(res, 200, {
          success: true,
          data: execution,
          meta: this.createMeta(requestId, startTime),
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // GET /api/v1/hubs
      // ─────────────────────────────────────────────────────────────────────
      if (path === '/api/v1/hubs' && method === 'GET') {
        const hubs = [
          {
            id: 'enterprise',
            name: this.hubEnterprise.manifest.display_name,
            description: this.hubEnterprise.manifest.description,
            status: this.hubEnterprise.getStatus(),
            workflows: this.hubEnterprise.listWorkflows().length,
            personas: this.hubEnterprise.manifest.personas?.length || 0,
          },
          {
            id: 'supabase',
            name: this.hubSupabase.manifest.display_name,
            description: this.hubSupabase.manifest.description,
            status: this.hubSupabase.getStatus(),
            workflows: this.hubSupabase.listWorkflows().length,
            skills: this.hubSupabase.getTotalSkills(),
          },
          {
            id: 'social',
            name: this.hubSocial.manifest.display_name,
            description: this.hubSocial.manifest.description,
            status: this.hubSocial.getStatus(),
            workflows: this.hubSocial.listWorkflows().length,
            skills: this.hubSocial.getTotalSkills(),
          },
        ];

        return this.send(res, 200, {
          success: true,
          data: { hubs, total_skills: TOTAL_SKILLS_AVAILABLE },
          meta: this.createMeta(requestId, startTime),
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // GET /api/v1/hubs/:id
      // ─────────────────────────────────────────────────────────────────────
      const hubDetailMatch = path.match(/^\/api\/v1\/hubs\/([^/]+)$/);
      if (hubDetailMatch && method === 'GET') {
        const hubId = hubDetailMatch[1];
        const hub = this.getHubById(hubId);

        if (!hub) {
          return this.send(res, 404, {
            success: false,
            error: { code: 'NOT_FOUND', message: `Hub ${hubId} not found` },
            meta: this.createMeta(requestId, startTime),
          });
        }

        return this.send(res, 200, {
          success: true,
          data: {
            manifest: hub.manifest,
            workflows: hub.listWorkflows(),
            status: hub.getStatus(),
            config: hub.getConfig(),
          },
          meta: this.createMeta(requestId, startTime),
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // POST /api/v1/hubs/:id/execute
      // ─────────────────────────────────────────────────────────────────────
      const hubExecMatch = path.match(/^\/api\/v1\/hubs\/([^/]+)\/execute$/);
      if (hubExecMatch && method === 'POST') {
        const hubId = hubExecMatch[1];
        return await this.handleHubExecute(res, hubId, body as ExecuteWorkflowRequest, requestId, startTime);
      }

      // ─────────────────────────────────────────────────────────────────────
      // GET /api/v1/hubs/:id/workflows
      // ─────────────────────────────────────────────────────────────────────
      const hubWorkflowsMatch = path.match(/^\/api\/v1\/hubs\/([^/]+)\/workflows$/);
      if (hubWorkflowsMatch && method === 'GET') {
        const hubId = hubWorkflowsMatch[1];
        const hub = this.getHubById(hubId);

        if (!hub) {
          return this.send(res, 404, {
            success: false,
            error: { code: 'NOT_FOUND', message: `Hub ${hubId} not found` },
            meta: this.createMeta(requestId, startTime),
          });
        }

        return this.send(res, 200, {
          success: true,
          data: { workflows: hub.listWorkflows() },
          meta: this.createMeta(requestId, startTime),
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // 404 - Rota não encontrada
      // ─────────────────────────────────────────────────────────────────────
      return this.send(res, 404, {
        success: false,
        error: { code: 'NOT_FOUND', message: `Route ${method} ${path} not found` },
        meta: this.createMeta(requestId, startTime),
      });

    } catch (error) {
      console.error('[API] Error:', error);
      return this.send(res, 500, {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Internal server error',
        },
        meta: this.createMeta(requestId, startTime),
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  private async handleIntent(
    req: IncomingMessage,
    res: ServerResponse,
    body: IntentRequest,
    requestId: string,
    startTime: number
  ): Promise<boolean> {
    if (!body.message) {
      return this.send(res, 400, {
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'message is required' },
        meta: this.createMeta(requestId, startTime),
      });
    }

    const executionId = generateId('exec');

    // Cria execução no store
    const execution: StoredExecution = {
      id: executionId,
      type: 'intent',
      status: 'pending',
      input: body,
      created_at: new Date(),
      updated_at: new Date(),
    };
    executionStore.set(executionId, execution);

    try {
      // 1. Cria plano via Operator
      const intent = {
        intent_id: generateId('int'),
        origin: (body.origin || 'api') as 'api' | 'cockpit' | 'cli',
        raw_input: body.message,
        timestamp: new Date(),
        metadata: body.context,
      };

      const plan = await this.operator.createPlan(intent);

      execution.plan_id = plan.plan_id;
      execution.status = 'authorized';
      execution.updated_at = new Date();

      // 2. Pede autorização à Aurora
      const authRequest = this.operator.createAuthorizationRequest(plan);
      const authResponse = await this.aurora.authorize(authRequest);

      execution.authorization = {
        decision: authResponse.decision,
        risk_score: authResponse.risk_score,
        level: authResponse.level,
        reason: authResponse.reason,
      };

      if (authResponse.decision === 'blocked') {
        execution.status = 'blocked';
        execution.error = { code: 'BLOCKED', message: authResponse.reason };
        execution.completed_at = new Date();
        execution.updated_at = new Date();

        return this.send(res, 403, {
          success: false,
          data: {
            execution_id: executionId,
            status: 'blocked',
            plan_id: plan.plan_id,
            authorization: execution.authorization,
          },
          error: { code: 'BLOCKED', message: authResponse.reason || 'Request blocked by Aurora' },
          meta: this.createMeta(requestId, startTime),
        });
      }

      if (authResponse.decision === 'requires_confirmation') {
        execution.status = 'pending';
        execution.updated_at = new Date();

        return this.send(res, 202, {
          success: true,
          data: {
            execution_id: executionId,
            status: 'requires_confirmation',
            plan_id: plan.plan_id,
            plan_summary: {
              steps: plan.steps.length,
              risk_level: plan.risk_level,
            },
            authorization: execution.authorization,
            confirmation_prompt: authResponse.confirmation_prompt,
          },
          meta: this.createMeta(requestId, startTime),
        });
      }

      // 3. Autorizado - retorna plano (execução real seria async)
      execution.status = 'completed';
      execution.output = {
        plan_id: plan.plan_id,
        steps: plan.steps.length,
        risk_level: plan.risk_level,
        message: 'Intent processed successfully. Plan created.',
      };
      execution.completed_at = new Date();
      execution.updated_at = new Date();

      return this.send(res, 200, {
        success: true,
        data: {
          execution_id: executionId,
          status: 'completed',
          plan_id: plan.plan_id,
          plan: {
            steps: plan.steps.map(s => ({
              id: s.step_id,
              action: s.action_type,
              target: s.target,
              description: s.description,
            })),
            risk_level: plan.risk_level,
            estimated_duration_ms: plan.estimated_duration_ms,
          },
          authorization: execution.authorization,
        },
        meta: this.createMeta(requestId, startTime),
      });

    } catch (error) {
      execution.status = 'failed';
      execution.error = { code: 'PROCESSING_ERROR', message: error instanceof Error ? error.message : 'Unknown error' };
      execution.completed_at = new Date();
      execution.updated_at = new Date();

      return this.send(res, 500, {
        success: false,
        data: { execution_id: executionId },
        error: execution.error,
        meta: this.createMeta(requestId, startTime),
      });
    }
  }

  private async handleHubExecute(
    res: ServerResponse,
    hubId: string,
    body: ExecuteWorkflowRequest,
    requestId: string,
    startTime: number
  ): Promise<boolean> {
    const hub = this.getHubById(hubId);

    if (!hub) {
      return this.send(res, 404, {
        success: false,
        error: { code: 'NOT_FOUND', message: `Hub ${hubId} not found` },
        meta: this.createMeta(requestId, startTime),
      });
    }

    if (!body.workflow) {
      return this.send(res, 400, {
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'workflow is required' },
        meta: this.createMeta(requestId, startTime),
      });
    }

    // Valida workflow
    const workflow = hub.getWorkflow(body.workflow);
    if (!workflow) {
      return this.send(res, 400, {
        success: false,
        error: { code: 'INVALID_WORKFLOW', message: `Workflow ${body.workflow} not found in hub ${hubId}` },
        meta: this.createMeta(requestId, startTime),
      });
    }

    // Valida parâmetros
    const validation = hub.validateParams(body.workflow, body.params || {});
    if (!validation.valid) {
      return this.send(res, 400, {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: validation.errors?.map(e => e.message).join(', ') || 'Invalid parameters',
        },
        meta: this.createMeta(requestId, startTime),
      });
    }

    const executionId = generateId('exec');

    // Cria execução no store
    const execution: StoredExecution = {
      id: executionId,
      type: 'workflow',
      hub: hubId,
      workflow: body.workflow,
      status: 'running',
      input: body,
      created_at: new Date(),
      updated_at: new Date(),
    };
    executionStore.set(executionId, execution);

    try {
      // Executa workflow
      const result = await hub.executeWorkflow({
        execution_id: executionId,
        hub: hubId,
        workflow: body.workflow,
        params: body.params || {},
        operator_context: {
          plan_id: generateId('plan'),
          step_id: generateId('step'),
          session_id: requestId,
        },
      });

      execution.status = result.status === 'completed' ? 'completed' : 'failed';
      execution.output = result;
      execution.completed_at = new Date();
      execution.updated_at = new Date();

      return this.send(res, result.status === 'completed' ? 200 : 500, {
        success: result.status === 'completed',
        data: {
          execution_id: executionId,
          hub: hubId,
          workflow: body.workflow,
          status: result.status,
          output: result.output,
          step_results: result.step_results,
          metrics: result.metrics,
          error: result.error,
        },
        meta: this.createMeta(requestId, startTime),
      });

    } catch (error) {
      execution.status = 'failed';
      execution.error = { code: 'EXECUTION_ERROR', message: error instanceof Error ? error.message : 'Unknown error' };
      execution.completed_at = new Date();
      execution.updated_at = new Date();

      return this.send(res, 500, {
        success: false,
        data: { execution_id: executionId },
        error: execution.error,
        meta: this.createMeta(requestId, startTime),
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  private getHubById(id: string): HubEnterpriseAdapter | HubSupabaseAdapter | HubSocialAdapter | null {
    switch (id) {
      case 'enterprise':
        return this.hubEnterprise;
      case 'supabase':
        return this.hubSupabase;
      case 'social':
        return this.hubSocial;
      default:
        return null;
    }
  }

  private async parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch (e) {
          reject(new Error('Invalid JSON body'));
        }
      });
      req.on('error', reject);
    });
  }

  private send(res: ServerResponse, statusCode: number, response: APIResponse): boolean {
    res.writeHead(statusCode);
    res.end(JSON.stringify(response, null, 2));
    return true;
  }

  private createMeta(requestId: string, startTime: number): APIResponse['meta'] {
    return {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      duration_ms: Date.now() - startTime,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// SINGLETON
// ════════════════════════════════════════════════════════════════════════════

let apiRouterInstance: OpenClawAPIRouter | null = null;

export function getOpenClawAPIRouter(): OpenClawAPIRouter {
  if (!apiRouterInstance) {
    apiRouterInstance = new OpenClawAPIRouter();
  }
  return apiRouterInstance;
}

// ════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE HELPER (para integrar com servidor existente)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Cria middleware que pode ser usado com o servidor HTTP existente
 */
export function createAPIMiddleware() {
  const router = getOpenClawAPIRouter();

  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    return router.handle(req, res);
  };
}
