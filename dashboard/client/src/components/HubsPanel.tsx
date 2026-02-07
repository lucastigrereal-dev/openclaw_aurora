/**
 * HubsPanel - Painel para visualizar e executar workflows dos Hubs
 */

import { useState, useEffect } from 'react';
import { useOpenClawAPI, Hub, WorkflowResult } from '../hooks/useOpenClawAPI';
import {
  Building2,
  Database,
  Share2,
  Play,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Loader2,
  Clock
} from 'lucide-react';

interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: Array<{ id: string; description: string }>;
  risk_level: string;
  estimated_duration_ms: number;
  input_schema: Record<string, { type: string; description: string; required: boolean }>;
}

export function HubsPanel() {
  const { getHubs, getHub, executeWorkflow, loading, error } = useOpenClawAPI();
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [expandedHub, setExpandedHub] = useState<string | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [workflowParams, setWorkflowParams] = useState<Record<string, string>>({});
  const [executionResult, setExecutionResult] = useState<WorkflowResult | null>(null);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    loadHubs();
  }, []);

  const loadHubs = async () => {
    const response = await getHubs();
    if (response.success && response.data) {
      setHubs(response.data.hubs);
    }
  };

  const loadHubWorkflows = async (hubId: string) => {
    if (expandedHub === hubId) {
      setExpandedHub(null);
      setWorkflows([]);
      return;
    }

    const response = await getHub(hubId);
    if (response.success && response.data) {
      setWorkflows(response.data.workflows as Workflow[]);
      setExpandedHub(hubId);
      setSelectedWorkflow(null);
      setWorkflowParams({});
      setExecutionResult(null);
    }
  };

  const handleExecute = async () => {
    if (!expandedHub || !selectedWorkflow) return;

    setExecuting(true);
    setExecutionResult(null);

    const response = await executeWorkflow(expandedHub, selectedWorkflow, workflowParams);

    if (response.data) {
      setExecutionResult(response.data);
    }

    setExecuting(false);
  };

  const getHubIcon = (hubId: string) => {
    switch (hubId) {
      case 'enterprise':
        return <Building2 className="w-5 h-5 text-purple-400" />;
      case 'supabase':
        return <Database className="w-5 h-5 text-green-400" />;
      case 'social':
        return <Share2 className="w-5 h-5 text-pink-400" />;
      default:
        return <Building2 className="w-5 h-5 text-gray-400" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const selectedWorkflowData = workflows.find(w => w.id === selectedWorkflow);

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Building2 className="w-5 h-5 text-purple-400" />
        Hubs & Workflows
      </h3>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Hubs List */}
      <div className="space-y-2">
        {hubs.map((hub) => (
          <div key={hub.id} className="bg-gray-800/50 rounded-lg overflow-hidden">
            {/* Hub Header */}
            <button
              onClick={() => loadHubWorkflows(hub.id)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {getHubIcon(hub.id)}
                <div className="text-left">
                  <div className="text-white font-medium">{hub.name}</div>
                  <div className="text-sm text-gray-400">
                    {hub.workflows} workflows • {hub.skills || hub.personas || 0} {hub.personas ? 'personas' : 'skills'}
                  </div>
                </div>
              </div>
              {expandedHub === hub.id ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* Workflows */}
            {expandedHub === hub.id && (
              <div className="border-t border-gray-700 p-3 space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2">
                      {workflows.map((workflow) => (
                        <button
                          key={workflow.id}
                          onClick={() => {
                            setSelectedWorkflow(workflow.id);
                            setWorkflowParams({});
                            setExecutionResult(null);
                          }}
                          className={`text-left p-2 rounded-md border transition-colors ${
                            selectedWorkflow === workflow.id
                              ? 'bg-cyan-600/20 border-cyan-500/50'
                              : 'bg-gray-900/50 border-gray-700 hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium">{workflow.name}</span>
                            <span className={`text-xs ${getRiskColor(workflow.risk_level)}`}>
                              {workflow.risk_level?.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400 mt-1">{workflow.description}</div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span>{workflow.steps?.length || 0} steps</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {Math.round((workflow.estimated_duration_ms || 0) / 1000)}s
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Workflow Params & Execute */}
                    {selectedWorkflowData && (
                      <div className="mt-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                        <div className="text-sm font-medium text-white mb-3">
                          Parâmetros para: {selectedWorkflowData.name}
                        </div>

                        {Object.entries(selectedWorkflowData.input_schema || {}).map(([key, schema]) => (
                          <div key={key} className="mb-3">
                            <label className="block text-sm text-gray-400 mb-1">
                              {key}
                              {schema.required && <span className="text-red-400 ml-1">*</span>}
                              <span className="text-gray-600 text-xs ml-2">({schema.type})</span>
                            </label>
                            <input
                              type="text"
                              value={workflowParams[key] || ''}
                              onChange={(e) => setWorkflowParams({ ...workflowParams, [key]: e.target.value })}
                              placeholder={schema.description}
                              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                            />
                          </div>
                        ))}

                        <button
                          onClick={handleExecute}
                          disabled={executing}
                          className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded-md flex items-center justify-center gap-2 transition-colors"
                        >
                          {executing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          {executing ? 'Executando...' : 'Executar Workflow'}
                        </button>

                        {/* Execution Result */}
                        {executionResult && (
                          <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
                            <div className="flex items-center gap-2 mb-3">
                              {executionResult.status === 'completed' ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                              <span className={`font-medium ${executionResult.status === 'completed' ? 'text-green-400' : 'text-red-400'}`}>
                                {executionResult.status === 'completed' ? 'Sucesso' : 'Falhou'}
                              </span>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Execution ID:</span>
                                <code className="text-cyan-400">{executionResult.execution_id}</code>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Steps:</span>
                                <span className="text-white">
                                  {executionResult.metrics?.steps_executed || 0} executados, {executionResult.metrics?.steps_failed || 0} falharam
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Duração:</span>
                                <span className="text-white">{executionResult.metrics?.total_duration_ms || 0}ms</span>
                              </div>
                            </div>

                            {executionResult.error && (
                              <div className="mt-3 p-2 bg-red-500/20 rounded text-red-400 text-sm">
                                {executionResult.error.message}
                              </div>
                            )}

                            {executionResult.step_results && executionResult.step_results.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-700">
                                <div className="text-xs text-gray-400 mb-2">Steps:</div>
                                {executionResult.step_results.map((step) => (
                                  <div key={step.step_id} className="flex items-center gap-2 text-sm py-1">
                                    {step.status === 'completed' ? (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-500" />
                                    )}
                                    <span className="text-gray-300">{step.step_id}</span>
                                    <span className="text-gray-500 ml-auto">{step.duration_ms}ms</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {hubs.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-8">
          Nenhum hub disponível. Inicie a API primeiro.
        </div>
      )}
    </div>
  );
}

export default HubsPanel;
