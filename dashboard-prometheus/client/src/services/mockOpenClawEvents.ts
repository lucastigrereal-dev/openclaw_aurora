import { OpenClawMessage } from './openclawWebSocket';

/**
 * Mock events para testar o feed de atividades
 * Substitua pela conexão real do OpenClaw quando disponível
 */

export const mockOpenClawEvents: OpenClawMessage[] = [
  {
    type: 'skill_execution',
    event: 'skill_completed',
    data: {
      skill_name: 'browser.open',
      status: 'success',
      duration: 2100,
      input: 'https://example.com',
      output: 'Screenshot 1920x1080',
    },
  },
  {
    type: 'connection_status',
    event: 'service_connected',
    data: {
      service: 'Kommo CRM',
      status: 'online',
      latency: 145,
    },
  },
  {
    type: 'skill_execution',
    event: 'skill_completed',
    data: {
      skill_name: 'file.read',
      status: 'success',
      duration: 320,
      input: '/home/user/document.txt',
      output: '2.5KB',
    },
  },
  {
    type: 'metric',
    event: 'metric_update',
    data: {
      metric_name: 'CPU Usage',
      value: 45,
      unit: '%',
      threshold: 80,
    },
  },
  {
    type: 'notification',
    event: 'notification_sent',
    data: {
      title: 'Briefing Matinal',
      message: 'Telegram: 5 mensagens enviadas com sucesso',
      priority: 'high',
      action: 'telegram_send',
    },
  },
  {
    type: 'skill_execution',
    event: 'skill_failed',
    data: {
      skill_name: 'exec.bash',
      status: 'failed',
      duration: 1200,
      input: 'ls -la /root',
      output: 'Permission denied',
    },
  },
  {
    type: 'connection_status',
    event: 'service_degraded',
    data: {
      service: 'Notion API',
      status: 'degraded',
      latency: 850,
    },
  },
  {
    type: 'system',
    event: 'system_update',
    data: {
      action: 'cache_cleared',
      details: 'Cleared 256MB of cached data',
    },
  },
];

/**
 * Simula eventos chegando em tempo real
 * Use para testar sem conexão real com OpenClaw
 */
export function startMockEventSimulation(
  onEvent: (event: OpenClawMessage) => void,
  intervalMs: number = 8000
) {
  let eventIndex = 0;

  const interval = setInterval(() => {
    const event = mockOpenClawEvents[eventIndex % mockOpenClawEvents.length];
    onEvent(event);
    eventIndex++;
  }, intervalMs);

  return () => clearInterval(interval);
}
