#!/usr/bin/env node
/**
 * Classificador de intenção do Hub.
 * Classifica uma mensagem de usuário em tipo, prioridade e personas acionadas.
 */
const intents = {
  incidente: {
    keywords: ['caiu', 'down', 'parou', 'erro crítico', 'não responde', 'fora do ar'],
    priority: 'P0',
    personas: ['ops', 'engenharia'],
    action: 'executar_runbook'
  },
  bug_critico: {
    keywords: ['bug', 'problema', 'não funciona', 'quebrou', 'erro 500'],
    priority: 'P1',
    personas: ['engenharia', 'qa'],
    action: 'corrigir_bug'
  },
  feature_new_app: {
    keywords: ['faz o app', 'cria app', 'novo app', 'novo projeto'],
    priority: 'P2',
    personas: ['produto', 'engenharia', 'qa'],
    action: 'pipeline_completo'
  },
  feature_add: {
    keywords: ['adiciona feature', 'nova funcionalidade', 'implementa', 'adicionar módulo'],
    priority: 'P2',
    personas: ['produto', 'engenharia', 'qa'],
    action: 'adicionar_feature'
  },
  manutencao: {
    keywords: ['otimiza', 'refatora', 'melhora', 'atualiza dependências'],
    priority: 'P2',
    personas: ['engenharia', 'qa'],
    action: 'manutencao'
  },
  consulta: {
    keywords: ['como está', 'status', 'relatório', 'métricas', 'lista apps'],
    priority: 'P3',
    personas: ['dados'],
    action: 'consultar'
  }
};

function classifyIntent(message) {
  const msg = message.toLowerCase();
  for (const [name, intent] of Object.entries(intents)) {
    if (intent.keywords.some(k => msg.includes(k))) {
      return {
        type: name,
        priority: intent.priority,
        personas: intent.personas,
        action: intent.action,
        original_message: message
      };
    }
  }
  return {
    type: 'consulta',
    priority: 'P3',
    personas: ['dados'],
    action: 'consultar',
    original_message: message
  };
}

// Se chamado diretamente via CLI
if (require.main === module) {
  const input = process.argv.slice(2).join(' ');
  const result = classifyIntent(input);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { classifyIntent };
