/**
 * Hook para comunicação com a API OpenClaw v2
 */

import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

interface APIResponse<T = unknown> {
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

interface Hub {
  id: string;
  name: string;
  description: string;
  status: string;
  workflows: number;
  personas?: number;
  skills?: number;
}

interface Execution {
  id: string;
  type: 'intent' | 'workflow';
  hub?: string;
  workflow?: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

interface IntentResult {
  execution_id: string;
  status: string;
  plan_id: string;
  plan?: {
    steps: Array<{
      id: string;
      action: string;
      target: string;
      description: string;
    }>;
    risk_level: string;
    estimated_duration_ms?: number;
  };
  authorization?: {
    decision: string;
    risk_score: number;
    level: string;
    reason: string;
  };
  confirmation_prompt?: string;
}

interface WorkflowResult {
  execution_id: string;
  hub: string;
  workflow: string;
  status: string;
  output: Record<string, unknown>;
  step_results: Array<{
    step_id: string;
    status: string;
    output?: unknown;
    error?: string;
    duration_ms: number;
  }>;
  metrics: {
    total_duration_ms: number;
    steps_executed: number;
    steps_failed: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

interface HealthData {
  status: string;
  uptime_ms: number;
  version: string;
  hubs_available: number;
  total_skills: number;
}

interface StatusData {
  health: string;
  metrics: Record<string, unknown>;
  hubs: Record<string, { adapter: string; skills: number; workflows: number }>;
  active_executions: number;
  running: number;
}

export function useOpenClawAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(async <T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<APIResponse<T>> => {
    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE}${path}`;
      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (!data.success && data.error) {
        setError(data.error.message);
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setError(message);
      return {
        success: false,
        error: { code: 'NETWORK_ERROR', message },
      };
    } finally {
      setLoading(false);
    }
  }, []);

  // Health check
  const getHealth = useCallback(async () => {
    return request<HealthData>('GET', '/api/v1/health');
  }, [request]);

  // Status
  const getStatus = useCallback(async () => {
    return request<StatusData>('GET', '/api/v1/status');
  }, [request]);

  // Hubs
  const getHubs = useCallback(async () => {
    return request<{ hubs: Hub[]; total_skills: number }>('GET', '/api/v1/hubs');
  }, [request]);

  const getHub = useCallback(async (hubId: string) => {
    return request<{
      manifest: Record<string, unknown>;
      workflows: Array<Record<string, unknown>>;
      status: string;
      config: Record<string, unknown>;
    }>('GET', `/api/v1/hubs/${hubId}`);
  }, [request]);

  const getHubWorkflows = useCallback(async (hubId: string) => {
    return request<{ workflows: Array<Record<string, unknown>> }>(
      'GET',
      `/api/v1/hubs/${hubId}/workflows`
    );
  }, [request]);

  // Intents
  const sendIntent = useCallback(async (
    message: string,
    options?: { origin?: 'cockpit' | 'api' | 'cli'; mode?: 'dry-run' | 'real'; context?: Record<string, unknown> }
  ) => {
    return request<IntentResult>('POST', '/api/v1/intent', {
      message,
      origin: options?.origin || 'cockpit',
      mode: options?.mode || 'real',
      context: options?.context,
    });
  }, [request]);

  // Executions
  const getExecutions = useCallback(async () => {
    return request<{ executions: Execution[]; total: number }>('GET', '/api/v1/executions');
  }, [request]);

  const getExecution = useCallback(async (executionId: string) => {
    return request<Execution>('GET', `/api/v1/executions/${executionId}`);
  }, [request]);

  // Execute Hub Workflow
  const executeWorkflow = useCallback(async (
    hubId: string,
    workflow: string,
    params: Record<string, unknown>
  ) => {
    return request<WorkflowResult>('POST', `/api/v1/hubs/${hubId}/execute`, {
      workflow,
      params,
    });
  }, [request]);

  return {
    loading,
    error,
    // Methods
    getHealth,
    getStatus,
    getHubs,
    getHub,
    getHubWorkflows,
    sendIntent,
    getExecutions,
    getExecution,
    executeWorkflow,
  };
}

export type { Hub, Execution, IntentResult, WorkflowResult, HealthData, StatusData };
