/**
 * IntentPanel - Painel para enviar intents para o OpenClaw
 */

import { useState, FormEvent } from 'react';
import { useOpenClawAPI, IntentResult } from '../hooks/useOpenClawAPI';
import { Send, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export function IntentPanel() {
  const { sendIntent, loading, error } = useOpenClawAPI();
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<IntentResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    const response = await sendIntent(message, { origin: 'cockpit' });

    if (response.success && response.data) {
      setResult(response.data);
      setShowResult(true);
      setMessage('');
    } else if (response.error) {
      setResult({
        execution_id: '',
        status: 'error',
        plan_id: '',
        authorization: {
          decision: 'blocked',
          risk_score: 100,
          level: 'red',
          reason: response.error.message,
        },
      });
      setShowResult(true);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'blocked':
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'requires_confirmation':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = (level: string) => {
    switch (level) {
      case 'green':
        return 'bg-green-500/20 border-green-500/50 text-green-400';
      case 'yellow':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
      case 'red':
        return 'bg-red-500/20 border-red-500/50 text-red-400';
      default:
        return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
    }
  };

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Send className="w-5 h-5 text-cyan-400" />
        Enviar Intent
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua intenção... (ex: 'Criar um app de tarefas')"
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-md transition-colors flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Enviar
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}
      </form>

      {showResult && result && (
        <div className="mt-4 space-y-3">
          {/* Status Badge */}
          <div className={`flex items-center gap-2 p-3 rounded-lg border ${getStatusColor(result.authorization?.level || 'gray')}`}>
            {getStatusIcon(result.status)}
            <div>
              <span className="font-medium">
                {result.status === 'completed' && 'Autorizado'}
                {result.status === 'blocked' && 'Bloqueado'}
                {result.status === 'requires_confirmation' && 'Requer Confirmação'}
                {result.status === 'error' && 'Erro'}
              </span>
              {result.authorization && (
                <span className="ml-2 text-sm opacity-75">
                  (Score: {result.authorization.risk_score})
                </span>
              )}
            </div>
          </div>

          {/* Plan Details */}
          {result.plan && (
            <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Plan ID:</span>
                <code className="text-cyan-400 bg-gray-900 px-2 py-0.5 rounded">{result.plan_id}</code>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Risco:</span>
                <span className={`${result.plan.risk_level === 'low' ? 'text-green-400' : result.plan.risk_level === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                  {result.plan.risk_level?.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Steps:</span>
                <span className="text-white">{result.plan.steps?.length || 0}</span>
              </div>

              {result.plan.steps && result.plan.steps.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <span className="text-sm text-gray-400">Passos do Plano:</span>
                  <ul className="mt-1 space-y-1">
                    {result.plan.steps.map((step, i) => (
                      <li key={step.id} className="text-sm text-gray-300 flex items-center gap-2">
                        <span className="w-5 h-5 bg-cyan-600 rounded-full flex items-center justify-center text-xs">
                          {i + 1}
                        </span>
                        <span className="text-cyan-400">{step.target}</span>
                        <span className="text-gray-500">→</span>
                        <span>{step.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Authorization Reason */}
          {result.authorization?.reason && (
            <div className="text-sm text-gray-400">
              <span className="font-medium">Motivo:</span> {result.authorization.reason}
            </div>
          )}

          {/* Confirmation Prompt */}
          {result.confirmation_prompt && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <pre className="text-sm text-yellow-300 whitespace-pre-wrap">{result.confirmation_prompt}</pre>
              <div className="mt-3 flex gap-2">
                <button className="bg-green-600 hover:bg-green-500 text-white px-4 py-1.5 rounded-md text-sm transition-colors">
                  Confirmar
                </button>
                <button className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-md text-sm transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowResult(false)}
            className="text-sm text-gray-500 hover:text-gray-400"
          >
            Fechar resultado
          </button>
        </div>
      )}
    </div>
  );
}

export default IntentPanel;
